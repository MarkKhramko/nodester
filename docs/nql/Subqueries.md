# Subqueries | nodester Query Language (NQL)

Subqueries allow you to apply filters, clauses, and configurations to nested includes. They enable fine-grained control over associated data retrieval.

## Basic Concept

A subquery is a query configuration applied to an included model. It's defined using parentheses `()` after the model name in an `includes` parameter.

**Syntax:**
```
?includes=model_name(parameter=value&parameter2=value2)
```

## Simple Subquery

Apply a filter to an included model:

**Example:**

`GET` request:
```
example.com/api/v1/countries?includes=cities(id=5)
```

This returns countries with only the city where `id=5` included.

## Subquery with Multiple Parameters

Combine multiple parameters in a subquery:

**Example:**

`GET` request:
```
example.com/api/v1/countries?includes=cities(id=5&limit=10&order_by=name&order=asc)
```

This includes cities where:
- `id=5` (filter)
- Limited to 10 results
- Ordered by `name` in ascending order

## Nested Subqueries

Subqueries can be nested for deep associations:

**Example:**

`GET` request:
```
example.com/api/v1/countries?includes=cities(id=5&limit=10).areas(limit=5&order_by=name)
```

This query:
1. Includes cities where `id=5`, limited to 10, ordered by name
2. For each city, includes areas limited to 5, ordered by name

## Subquery Parameters

All standard query parameters can be used in subqueries:

### Filtering
```
?includes=users(id=5&role=admin)
```

### Attributes
```
?includes=users(attributes=id,name,email)
```

### Clauses
```
?includes=users(limit=10&skip=5&order_by=created_at&order=desc)
```

### Operators
```
?includes=users(age=gte(18)&name=like(John))
```

### Functions
```
?includes=users(fn=count(posts))
```

### Nested Includes
```
?includes=users(id=5).posts(limit=10).comments(limit=5)
```

## Horizontal Includes in Subqueries

Use the `+` token to include sibling models at the same level within a subquery:

**Example:**

`GET` request:
```
example.com/api/v1/countries?includes=cities.areas+languages
```

This includes:
- `cities` with their `areas` (vertical)
- `languages` at the same level as `cities` (horizontal)

**More complex:**

`GET` request:
```
example.com/api/v1/countries?includes=cities(id=5&limit=10).areas+languages(code=en)
```

This includes:
- Cities where `id=5`, limited to 10
- For each city: areas (vertical) and languages where `code=en` (horizontal)

## Restrictions

### Cannot Use `includes` Parameter

Inside a subquery, you cannot use the `includes` parameter. Instead, use:
- `.` for vertical includes: `users.posts`
- `+` for horizontal includes: `users.posts+photos`

**❌ Invalid:**
```
?includes=users(includes=posts)
```

**✅ Valid:**
```
?includes=users.posts
```

## Real-World Examples

### Paginated Comments on Posts

`GET` request:
```
example.com/api/v1/posts?includes=comments(limit=20&skip=0&order_by=created_at&order=desc)
```

### Filtered User Posts

`GET` request:
```
example.com/api/v1/users?includes=posts(status=published&limit=10&order_by=created_at&order=desc)
```

### Complex Nested Query

`GET` request:
```
example.com/api/v1/countries?includes=
  cities(
    id=gt(100)&
    limit=5&
    order_by=population&
    order=desc
  ).
  areas(
    limit=3&
    order_by=name
  )+
  languages(
    code=or(en,fr)&
    limit=2
  )
```

### Multiple Horizontal Includes

`GET` request:
```
example.com/api/v1/posts?includes=comments(limit=10),likes(limit=5),shares(limit=5)
```

## How Subqueries Work

1. **Parsing**: The query parser recognizes `(` after a model name as the start of a subquery
2. **Tree Building**: A new node is created in the query tree for the subquery
3. **Context Switching**: The parser switches context to the subquery node
4. **Parameter Processing**: Parameters are applied to the subquery node
5. **Context Return**: When `)` is encountered, context returns to the parent

## Best Practices

1. **Keep subqueries focused** - Apply only necessary filters and clauses
2. **Use limits** - Always limit subquery results to prevent large responses
3. **Order nested data** - Use `order_by` and `order` for predictable results
4. **Combine with attributes** - Select only needed attributes in subqueries
5. **Test incrementally** - Build complex subqueries step by step

## Common Patterns

### Pagination Pattern
```
?includes=comments(limit=20&skip=0)
?includes=comments(limit=20&skip=20)  // Page 2
?includes=comments(limit=20&skip=40)    // Page 3
```

### Recent Items Pattern
```
?includes=posts(limit=10&order_by=created_at&order=desc)
```

### Filtered Association Pattern
```
?includes=users(role=admin&status=active&limit=50)
```

### Deep Nesting Pattern
```
?includes=users.posts.comments(limit=5&order_by=created_at&order=desc)
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)

