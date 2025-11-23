# Parameters | nodester Query Language (NQL)

NQL supports various parameters to control query behavior. This document describes all available parameters and their usage.

## Core Parameters

### `attributes` (alias: `a`)

Selects specific columns to return from the model.

**Syntax:**
```
?attributes=column1,column2,column3
```

**Short form:**
```
?a=column1,column2,column3
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?attributes=id,name
```

**Behavior:**
- If not specified, all attributes allowed by the Filter are returned
- Only attributes defined in the Filter's `attributes` array are allowed
- If an attribute is not in the Filter, an error is returned

**Note:** At least one attribute must be selected, or a function must be used.

---

### `includes` (alias: `in`)

Includes associated models in the response. Supports both vertical (nested) and horizontal (sibling) includes.

**Syntax:**
```
?includes=model1,model2,model3
```

**Short form:**
```
?in=model1,model2,model3
```

**Vertical includes (nested):**
```
?includes=users.posts.comments
```

**Horizontal includes (sibling):**
```
?includes=users,posts,comments
```

**Mixed:**
```
?includes=users.posts,comments
```

**With subqueries:**
```
?includes=users(id=5&limit=10).posts(order_by=created_at)
```

**Behavior:**
- Only associations defined in the model are allowed
- Each include must have a corresponding Filter configuration
- Subqueries allow filtering and configuring nested includes
- Cannot use `includes` parameter inside a subquery (use `.` or `+` instead)
- For `HasMany` associations with ordering, separate queries are used automatically (Sequelize limitation)

---

### `functions` (alias: `fn`)

Applies aggregate functions to the query.

**Syntax:**
```
?functions=function_name(argument)
```

**Short form:**
```
?fn=function_name(argument)
```

**Multiple functions:**
```
?functions=count(cities),avg(population)
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?fn=count(cities)
```

**Available functions:**
- `count(include_name)` - Counts related records
- `avg(attribute_name)` - Calculates average (if supported)

**Behavior:**
- Functions must be enabled in the Filter's `functions` configuration
- Function arguments must match include names or attribute names exactly
- Results are added to the response with a suffix (e.g., `cities_count`)

See [Functions documentation →](Functions.md) for details.

---

## Clauses

### `limit` (alias: `l`)

Limits the number of results returned.

**Syntax:**
```
?limit=10
```

**Short form:**
```
?l=10
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?limit=5
```

**Behavior:**
- Must be a positive integer
- Can be bounded by Filter's `bounds.clauses.limit`
- Values are automatically adjusted to fit within bounds (min/max)
- Default is typically 3 (if bounds are set)
- If bounds are set and no limit is provided, uses `bounds.max` (or default of 3)

**In subqueries:**
```
?includes=cities(limit=10)
```

---

### `skip` (alias: `s`)

Skips a number of results (offset for pagination).

**Syntax:**
```
?skip=20
```

**Short form:**
```
?s=20
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?skip=10&limit=5
```

**Behavior:**
- Must be a non-negative integer
- Can be bounded by Filter's `bounds.clauses.skip`
- Values are automatically adjusted to fit within bounds (min/max)
- If value is 0 or negative, it's ignored
- Used for pagination: `skip = (page - 1) * limit`

**In subqueries:**
```
?includes=cities(skip=5&limit=10)
```

---

### `order_by` (alias: `oby`)

Specifies the column to order results by.

**Syntax:**
```
?order_by=column_name
```

**Short form:**
```
?oby=column_name
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?order_by=name
```

**Behavior:**
- Must be a valid attribute of the model
- Works together with `order` parameter
- Can be used with special values like `rand` or `random` for random ordering
- If the value is undefined, the clause is ignored

**In subqueries:**
```
?includes=cities(order_by=name)
```

---

### `order` (alias: `o`)

Specifies the sort direction.

**Syntax:**
```
?order=asc
?order=desc
```

**Short form:**
```
?o=asc
?o=desc
```

**Values:**
- `asc` - Ascending order
- `desc` - Descending order
- `rand` or `random` - Random order (ignores `order_by`)
- `max` or `max-asc` - Order by maximum value, ascending
- `min` or `min-asc` - Order by minimum value, ascending
- `max-desc` - Order by maximum value, descending
- `min-desc` - Order by minimum value, descending

**Example:**

`GET` request:
```
example.com/api/v1/countries?order_by=name&order=asc
```

**Random ordering:**

`GET` request:
```
example.com/api/v1/countries?order=rand
```

**Behavior:**
- Works together with `order_by` parameter
- If `order_by` is not specified, `order` may be ignored
- Special values like `rand` can work without `order_by`
- If the value is undefined, the clause is ignored
- For `max`/`min` ordering, Sequelize functions are used

**In subqueries:**
```
?includes=cities(order_by=name&order=desc)
```

---

### `group_by`

Groups results by a specific column.

**Syntax:**
```
?group_by=column_name
```

**Example:**

`GET` request:
```
example.com/api/v1/cities?group_by=country_id
```

**Behavior:**
- Must be a valid attribute of the model
- Must be enabled in [Filter](../Filter.md)'s `clauses` array
- The attribute must exist in the model's table attributes
- Typically used with aggregate functions
- If the value is undefined, the clause is ignored

---

## Attribute Parameters

Any model attribute can be used as a parameter for filtering:

**Syntax:**
```
?attribute_name=value
```

**Examples:**
```
?id=10
?name=Belgium
?created_at=2024-01-01
```

**With operators:**
```
?name=like(Belg)
?age=gte(18)
?id=not(5)
?id=[1,2,3]
```

**Multiple conditions (AND):**
```
?name=like(Belg),notLike(Belgium)
```

**Multiple conditions (OR):**
```
?name=or(Belgium,Denmark)
```

See [Operators documentation →](Operators.md) for all available operators.

---

## Parameter Precedence

When the same parameter appears multiple times or conflicts with [Filter](../Filter.md) settings:

1. **Filter statics** override query parameters (highest precedence)
2. **Query parameters** override [Filter](../Filter.md) defaults
3. **Multiple query parameters** are combined (AND logic for attributes, OR logic for operators)
4. **Bounds** are applied to `limit` and `skip` values automatically

**Example:**
If Filter has `statics: { limit: 10 }` and query has `limit=20`, the result will be `limit=10` (Filter statics win).

If Filter has `bounds: { clauses: { limit: { min: 1, max: 50 } } }` and query has `limit=100`, the result will be `limit=50` (bounded to max).

**Example:**
If Filter has `statics: { limit: 10 }` and query has `limit=20`, the result will be `limit=10` (Filter statics win).

---

## Parameter Combinations

Parameters can be combined in various ways:

**Basic query:**
```
?id=10&attributes=id,name&limit=5
```

**With includes:**
```
?id=10&includes=users.posts&limit=5
```

**Complex query:**
```
?attributes=id,name&includes=users(id=5&limit=10).posts(order_by=created_at&order=desc)&limit=20&skip=0&order_by=id&order=asc&fn=count(posts)
```

---

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)

