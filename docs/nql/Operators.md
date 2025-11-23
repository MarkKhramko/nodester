# Operators | nodester Query Language (NQL)

Operators allow you to filter data using various comparison and logical operations. They extend standard REST query parameters with SQL-like capabilities.

## Exact Match

The simplest operator is an exact match - just provide the value:

**Example:**
```
example.com/api/v1/countries?name=Belgium
```

This matches countries where `name` exactly equals "Belgium".

## In (Array Match)

Check if a value is in a list of values. Use square brackets `[]` to define an array.

**Syntax:**
```
?attribute=[value1,value2,value3]
```

**Example:**

`GET` request:
```
example.com/api/v1/cities?country_id=[14,52,100]
```

This returns cities where `country_id` is 14, 52, or 100.

**Equivalent SQL:**
```sql
WHERE country_id IN (14, 52, 100)
```

### Not In

Use `!` or `not` prefix before the array:

**Example:**
```
example.com/api/v1/cities?country_id=![14,52]

// Short form:
example.com/api/v1/cities?country_id=not[14,52]
```

This returns cities where `country_id` is NOT 14 or 52.

* `GET` request:
```
example.com/api/v1/cities?country_id=[14,52]
```


## Not (Exclude Value)

Exclude a specific value from results.

**Syntax:**
```
?attribute=not(value)
?attribute=!(value)  // Short form
```

**Example:**
```
example.com/api/v1/countries?name=not(Belgium)

// Short form:
example.com/api/v1/countries?name=!(Belgium)
```

This returns all countries except where `name` equals "Belgium".

**Equivalent SQL:**
```sql
WHERE name != 'Belgium'
```



## Like (Pattern Match)

Search for values that contain a pattern. Emulates SQL's `LIKE %value%`.

**Syntax:**
```
?attribute=like(pattern)
```

**Example:**
```
example.com/api/v1/countries?name=like(Belg)
```

This returns countries where `name` contains "Belg" (e.g., "Belgium", "Belgian").

**Equivalent SQL:**
```sql
WHERE name LIKE '%Belg%'
```

### Not Like

Exclude values that match a pattern.

**Syntax:**
```
?attribute=notLike(pattern)

// Short form:
?attribute=!like(pattern)
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?name=notLike(Belg)

// Short form:
example.com/api/v1/countries?name=!like(Belg)
```

This returns countries where `name` does NOT contain "Belg".

**Equivalent SQL:**
```sql
WHERE name NOT LIKE '%Belg%'
```

## And (Multiple Conditions)

Apply multiple conditions to the same attribute using AND logic. Separate conditions with commas `,`.

**Syntax:**
```
?attribute=condition1,condition2,condition3
```

**Example:**
```
example.com/api/v1/countries?name=like(Slov),notLike(Slovakia)
```

This returns countries where:
- `name` contains "Slov" AND
- `name` does NOT contain "Slovakia"

**Equivalent SQL:**
```sql
WHERE name LIKE '%Slov%' AND name NOT LIKE '%Slovakia%'
```

**Note:** Multiple conditions on the same attribute are combined with AND. For OR logic, use the `or()` operator.


## Or (Alternative Values)

Match if the attribute equals any of the provided values.

**Syntax:**
```
?attribute=or(value1,value2,value3)

// Short form:
?attribute=|(value1,value2,value3)
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?name=or(Belgium,Denmark,Netherlands)

// Short form:
example.com/api/v1/countries?name=|(Belgium,Denmark,Netherlands)
```

This returns countries where `name` is "Belgium" OR "Denmark" OR "Netherlands".

**Equivalent SQL:**
```sql
WHERE name = 'Belgium' OR name = 'Denmark' OR name = 'Netherlands'
```

**Note:** Do not use spaces between values in the `or()` function.

## Comparison Operators

Compare numeric values, dates, or strings using comparison operators.

### Greater Than

**Syntax:**
```
?attribute=gt(value)
```

**Example:**
```
example.com/api/v1/countries?updated_at=gt(2022-01-01)
example.com/api/v1/users?age=gt(18)
```

**Equivalent SQL:**
```sql
WHERE updated_at > '2022-01-01'
WHERE age > 18
```

### Greater Than or Equal To

**Syntax:**
```
?attribute=gte(value)
```

**Example:**
```
example.com/api/v1/countries?updated_at=gte(2022-01-01)
example.com/api/v1/users?age=gte(18)
```

**Equivalent SQL:**
```sql
WHERE updated_at >= '2022-01-01'
WHERE age >= 18
```

### Less Than

**Syntax:**
```
?attribute=lt(value)
```

**Example:**
```
example.com/api/v1/countries?updated_at=lt(2022-01-01)
example.com/api/v1/users?age=lt(65)
```

**Equivalent SQL:**
```sql
WHERE updated_at < '2022-01-01'
WHERE age < 65
```

### Less Than or Equal To

**Syntax:**
```
?attribute=lte(value)
```

**Example:**
```
example.com/api/v1/countries?updated_at=lte(2022-01-01)
example.com/api/v1/users?age=lte(65)
```

**Equivalent SQL:**
```sql
WHERE updated_at <= '2022-01-01'
WHERE age <= 65
```

## Operator Combinations

Operators can be combined for complex queries:

**Example:**
```
example.com/api/v1/countries?name=like(Belg),notLike(Belgium)&updated_at=gte(2020-01-01)&id=gt(10)
```

This returns countries where:
- `name` contains "Belg" AND does NOT contain "Belgium"
- `updated_at` is greater than or equal to 2020-01-01
- `id` is greater than 10

**Equivalent SQL:**
```sql
WHERE name LIKE '%Belg%' 
  AND name NOT LIKE '%Belgium%'
  AND updated_at >= '2020-01-01'
  AND id > 10
```

## Operator Precedence

When multiple operators are used:
1. Conditions on the same attribute with commas `,` are combined with AND
2. Different attributes are combined with AND
3. Use `or()` for OR logic within the same attribute

## Date Handling

When using comparison operators (`gt`, `gte`, `lt`, `lte`) with date attributes, NQL automatically converts string values to Date objects for proper comparison.

**Example:**
```
example.com/api/v1/countries?created_at=gte(2020-01-01)
```

The string `"2020-01-01"` is automatically converted to a JavaScript Date object before the comparison.

**Supported date types:**
- `DATE` - Full date and time
- `DATEONLY` - Date only (no time component)

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
