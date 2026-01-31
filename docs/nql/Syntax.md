# Syntax | nodester Query Language (NQL)

NQL queries are parsed character-by-character, building a tree structure that represents your query intent. Understanding the syntax rules will help you craft more effective queries.

## Query Structure

A NQL query consists of **key-value pairs** separated by `&`:

```
?key1=value1&key2=value2&key3=value3
```

Each key can be:
- A **parameter** (like `attributes`, `includes`, `limit`)
- A **model attribute** (like `id`, `name`, `created_at`)
- A **clause** (like `order_by`, `skip`)

## Special Characters

NQL uses special characters to express different query operations:

| Character | Purpose | Example |
|-----------|---------|---------|
| `=` | Separates parameter name from value | `id=10` |
| `&` | Separates query parameters | `id=10&limit=5` |
| `,` | Horizontal includes or array values | `includes=users,posts` or `id=[1,2,3]` |
| `.` | Vertical includes (nested associations) | `includes=users.posts` |
| `+` | Horizontal include in subquery | `includes=users.posts+comments` |
| `(` | Starts operator, function, or subquery | `name=like(test)` or `includes=users(id=5)` |
| `)` | Ends operator, function, or subquery | `name=like(test))` or `includes=users(id=5))` |
| `[` | Starts array (for `in` operator) | `id=[1,2,3]` |
| `]` | Ends array (for `in` operator) | `id=[1,2,3]` |

## Parameter Names

### Full Names

- `attributes` - Select specific columns
- `includes` - Include associated models
- `functions` - Apply aggregate functions
- `limit` - Limit number of results
- `skip` - Skip number of results (offset)
- `order_by` - Column to order by
- `order` - Order direction (asc/desc)
- `group_by` - Group results by column

### Short Names (Aliases)

For convenience, NQL provides short aliases:

- `a` → `attributes`
- `in` → `includes`
- `fn` → `functions`
- `l` → `limit`
- `s` → `skip`
- `o` → `order`
- `oby` → `order_by`

**Example:**
```
?a=id,name&in=users&l=10&s=5&oby=created_at&o=desc
```

This is equivalent to:
```
?attributes=id,name&includes=users&limit=10&skip=5&order_by=created_at&order=desc
```

## Value Types

### Simple Values
Plain text values for exact matches:
```
?id=10
?name=Belgium
```

### Arrays
Use brackets `[]` for array values (used with `in` operator):
```
?id=[1,2,3,4,5]
```

### Operators
Use parentheses for operators:
```
?name=like(Belg)
?age=gt(18)
?id=not(5)
```

### Functions
Use parentheses for function arguments:
```
?fn=count(cities)
```

### Subqueries
Use parentheses for nested queries on includes:
```
?includes=users(id=5&limit=10)
```

## URL Encoding

NQL automatically handles URL-encoded characters. Special characters in values should be URL-encoded:

- Space: `%20` or `+`
- `&`: `%26`
- `=`: `%3D`
- `(`: `%28`
- `)`: `%29`
- `[`: `%5B`
- `]`: `%5D`

**Example:**
```
?name=like(New%20York)  // Searches for "New York"
```

**International Characters:**

NQL supports UTF-8 characters including Cyrillic, diacritics, Chinese, and emoji. See the full documentation:
[Decoder documentation →](Decoder.md)


## Query Parsing Flow

1. **Decode**: URL-encoded characters are decoded
2. **Lex**: Query string is parsed character-by-character
3. **Build Tree**: A tree structure is created representing the query
4. **Traverse**: The tree is converted to Sequelize query format

The parser is context-aware - the same character can mean different things depending on context:
- `(` can start an operator, function, or subquery
- `,` can separate array values, horizontal includes, or function arguments
- `.` can be part of a value or indicate a vertical include

## Common Patterns

### Simple Filter
```
?id=10&name=Belgium
```

### With Attributes
```
?attributes=id,name&id=10
```

### With Includes
```
?includes=users.posts&id=10
```

### With Operators
```
?name=like(Belg)&age=gte(18)
```

### Complex Query
```
?attributes=id,name&includes=users(id=5&limit=10).posts(order_by=created_at&order=desc)&limit=20&skip=0&order_by=id&order=asc
```

## Error Handling

If the query syntax is invalid, NQL will return a `422 Unprocessable Entity` error with details about what went wrong:

- **Unexpected character**: Character found where it shouldn't be
- **Missing character**: Required character (like closing `)`) is missing
- **Invalid token**: Unknown operator, function, or parameter name

## Best Practices

1. **Use short names** for cleaner URLs when appropriate
2. **URL-encode special characters** in values
3. **Group related parameters** logically
4. **Use subqueries** for complex nested filtering
5. **Test queries incrementally** - start simple and add complexity

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)

