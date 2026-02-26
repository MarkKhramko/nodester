# Functions | nodester Query Language (NQL)

Functions allow you to perform aggregate operations on your data. They extend your queries with SQL aggregate functions that can operate on the root model or associated models.

## Using Functions

Functions are called using the `functions` parameter or its short alias `fn`.

**Syntax:**
```
?functions=function_name(argument)
?fn=function_name(argument)  // Short form
```

**Multiple functions:**
```
?fn=count(cities),avg(population)
```

## Available Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `count()` | Counts records | `fn=count()` or `fn=count(comments)` |
| `sum()` | Calculates total sum | `fn=sum(price)` or `fn=sum(items.price)` |
| `avg()` | Calculates average value | `fn=avg(score)` or `fn=avg(reviews.rating)` |
| `min()` | Finds minimum value | `fn=min(age)` or `fn=min(posts.created_at)` |
| `max()` | Finds maximum value | `fn=max(price)` or `fn=max(items.quantity)` |

### Count

Counts the number of records. When used with an include name, it counts related records for each parent record. When used without arguments, it counts root model records.

**Syntax:**
```
?fn=count()              // Root model count
?fn=count(include_name)  // Association count
```

**Example (Association):**

`GET` request:
```
example.com/api/v1/countries?fn=count(cities)
```

**Output:**
```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": "Algeria",
        "cities_count": 8001
      },
      {
        "id": 2,
        "name": "Angola",
        "cities_count": 5432
      },
      ...
    ]
  },
  "error": null
}
```

**Important Notes:**
- For associations, the argument must match the include name **exactly**.
- Association result is added as `{include_name}_count`.
- Root count result is added as `{plural_model}_count`.
- Count uses a raw SQL subquery for associations to avoid row duplication.

### Sum

Calculates the total sum of a numeric attribute.

**Syntax:**
```
?fn=sum(attribute)               // Root model sum
?fn=sum(include_name.attribute)  // Association sum
```

**Example (Root):**

`GET` request:
```
example.com/api/v1/products?fn=sum(price)
```

**Output:**
```js
{
  "content": {
    "products": [
      {
        "id": 1,
        "name": "Widget",
        "price_sum": 5000
      },
      ...
    ]
  },
  "error": null
}
```

**Example (Association):**

`GET` request:
```
example.com/api/v1/orders?fn=sum(items.price)
```

**Output:**
```js
{
  "content": {
    "orders": [
      {
        "id": 1,
        "items_sum_price": 450
      },
      ...
    ]
  },
  "error": null
}
```

### Average (avg)

Calculates the average value of a numeric attribute.

**Syntax:**
```
?fn=avg(attribute)               // Root model average
?fn=avg(include_name.attribute)  // Association average
```

**Example:**

`GET` request:
```
example.com/api/v1/countries?fn=avg(population)
```

**Output:**
```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": "Algeria",
        "population_avg": 2500000
      },
      ...
    ]
  },
  "error": null
}
```

### Minimum (min) and Maximum (max)

Finds the minimum or maximum value of an attribute.

**Syntax:**
```
?fn=min(attribute)
?fn=max(include_name.attribute)
```

**Example:**

`GET` request:
```
example.com/api/v1/products?fn=min(price),max(price)
```

**Output:**
```js
{
  "content": {
    "products": [
      {
        "id": 1,
        "price_min": 10,
        "price_max": 1000
      },
      ...
    ]
  },
  "error": null
}
```

## Function Requirements

### Filter Configuration

Functions must be explicitly enabled in your Filter configuration:

```js
const filter = new Filter(Country, {
  attributes: ['id', 'name'],
  includes: {
    cities: new Filter(City, { ... })
  },
  functions: {
    count: true,
    sum: true,
    avg: true,
    min: true,
    max: true
  }
});
```

### Function Arguments

- **For `count()`**: Argument can be empty (root) or an include name.
- **For `sum`, `avg`, `min`, `max`**: Argument must be an attribute name or `include.attribute`.

## Function Results

Results are added to each record in the response using the following naming conventions:

- **Root aggregates**: `{attribute}_{fn}` (e.g., `price_sum`)
- **Association count**: `{include}_count` (e.g., `cities_count`)
- **Association aggregates**: `{include}_{fn}_{attribute}` (e.g., `items_sum_price`)

## Combining with Other Parameters

Functions work seamlessly with `attributes`, `limit`, `order_by`, and other NQL parameters.

**Example:**
`example.com/api/v1/countries?a=id,name&fn=count(cities)&limit=10&oby=name`

## Best Practices

1. **Enable functions in Filter**: Aggregates are disabled by default for security.
2. **Use dot notation for associations**: Access attributes of related models via `include.attribute`.
3. **Combine with attributes**: Limit returned data to improve performance.
4. **Performance**: Be aware that association aggregates use subqueries.

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
