# Functions | nodester Query Language (NQL)

Functions allow you to perform aggregate operations on related data. They extend your queries with SQL-like aggregate functions.

## Using Functions

Functions are called using the `functions` parameter or its short alias `fn`.

**Syntax:**
```
?functions=function_name(argument)
?fn=function_name(argument)  // Short form
```

**Multiple functions:**
```
?functions=count(cities),avg(population)
```

## Available Functions

### Count

Counts the number of related records for each parent record.

**Syntax:**
```
?fn=count(include_name)
```

**Example:**

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
    ],
    "count": ...
  },
  "error": null
}
```

**Important Notes:**
- The argument inside `count()` must match the name of the include **exactly**
- The result is added as `{include_name}_count` (e.g., `cities_count`)
- The function must be enabled in your Filter's `functions` configuration
- Count works on associations (includes), not on attributes
- For associations, count uses a raw SQL subquery: `(SELECT COUNT(*) FROM table WHERE foreign_key = parent.id)`
- For root model count, it uses Sequelize's `COUNT()` function on the first attribute

**With Filter Configuration:**
```js
const filter = new Filter(Country, {
  attributes: ['id', 'name'],
  includes: {
    cities: new Filter(City, { ... })
  },
  functions: {
    count: true  // Enable count function
  }
});
```

**Multiple Counts:**

`GET` request:
```
example.com/api/v1/countries?fn=count(cities),count(languages)
```

This will add both `cities_count` and `languages_count` to each country.

### Average (avg)

Calculates the average value of a numeric attribute across related records.

**Syntax:**
```
?fn=avg(attribute_name)
```

**Note:** The `avg` function may require additional configuration in your Filter. Check your Filter's `functions` configuration to ensure it's enabled.

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
    ],
    "count": ...
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
    cities: new Filter(City, {
      attributes: ['id', 'name', 'population']
    })
  },
  functions: {
    count: true,  // Enable count function
    avg: true     // Enable avg function (if supported)
  }
});
```

### Function Arguments

- **For `count()`**: The argument must be the exact name of an include defined in your Filter
- **For `avg()`**: The argument must be a valid attribute name of the related model

**Example:**
```js
// Model associations
Country.hasMany(City, { as: 'cities' });
Country.hasMany(Language, { as: 'languages' });

// Filter configuration
const filter = new Filter(Country, {
  includes: {
    cities: new Filter(City, { ... }),
    languages: new Filter(Language, { ... })
  },
  functions: {
    count: true
  }
});
````

✅ Valid query

`GET` request:
```
example.com/api/v1/countries?fn=count(cities)  // ✅ 'cities' matches include name
```

❌ Invalid query

`GET` request:
```
example.com/api/v1/countries?fn=count(city)    // ❌ 'city' doesn't match 'cities'
```

## Combining Functions with Other Parameters

Functions can be combined with other query parameters:

**Example:**

`GET` request:
```
example.com/api/v1/countries?attributes=id,name&fn=count(cities)&limit=10&order_by=name
```

This query:
- Selects only `id` and `name` attributes
- Counts related cities
- Limits results to 10
- Orders by name

## Function Results

Function results are added to each record in the response:

- **Count**: `{include_name}_count` (e.g., `cities_count`)
- **Average**: `{attribute_name}_avg` (e.g., `population_avg`)

The function results are separate from the main attributes and are always included when functions are used.

## Error Handling

If a function is not enabled in the Filter, you'll receive an error in response:

```js
{
  "content": null,
  "error": {
    "message": "Function 'count' is not allowed."
  }
}
```

If the function argument doesn't match an include name, you'll receive an error in response:

```js
{
  "content": null,
  "error": {
    "message": "No include named 'city'"
  }
}
```

## Best Practices

1. **Enable functions in Filter**: Always configure functions in your Filter before using them
2. **Match include names exactly**: Function arguments must match include names case-sensitively
3. **Use with attributes**: Combine functions with `attributes` to limit returned data
4. **Consider performance**: Aggregate functions can be expensive on large datasets
5. **Test incrementally**: Start with simple functions and add complexity gradually

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
