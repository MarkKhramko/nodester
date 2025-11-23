# Introduction | nodester Query Language (NQL)

**NQL (nodester Query Language)** is an extension of standard REST API syntax that brings SQL-like querying capabilities into HTTP requests. It allows you to craft complex queries with hierarchical associations, filtering, sorting, and aggregation - all through URL query parameters.

## What is NQL?

NQL transforms simple REST endpoints into powerful query interfaces. Instead of creating multiple endpoints for different data needs, you can use a single endpoint with query parameters to:

- Filter data by any attribute
- Include related models (associations)
- Sort and paginate results
- Apply aggregate functions
- Create complex nested queries

## How It Works

When a request with query parameters reaches a nodester application:

1. **Query Parsing**: The query string is parsed character-by-character into a tree structure
2. **Filter Validation**: The parsed query is validated against your Filter configuration
3. **Query Building**: The validated query is converted to Sequelize query format
4. **Execution**: The database query is executed and results are returned

See [Syntax documentation →](Syntax.md) for details on how queries are parsed.

## Example Database Structure

Let's imagine you created a database with the following structure:

```
• countries
  ┣ id
  ┗ name

• cities
  ┣ id
  ┣ country_id
  ┗ name

• areas
  ┣ id
  ┣ city_id
  ┗ name

• languages
  ┣ id
  ┣ name
  ┗ code

• language_to_country_relations
  ┣ language_id
  ┗ country_id

• language_to_city_relations
  ┣ language_id
  ┗ city_id
```

## Quick Start

### Basic Query

To get a list of `countries`, use the main endpoint:

`GET` request:
```
example.com/api/v1/countries
```


### Based on the attribute (column) value

`GET` request:
```
example.com/api/v1/countries?name=Belgium
```

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 17,
        "name": "Belgium"
      }
    ],
    "count": 1
  },
  "error": null
}
```

You can also setup a route `/countries/:id` and access it as follows:

`GET` request:
```
example.com/api/v1/countries/17
```

Will output you:

```js
{
  "content": {
    "country": {
      "id": 17,
      "name": "Belgium"
    },
    "count": 1
  },
  "error": null
}
```


## Includes

To get `countries` with `cities` you will use the route with it's name.

`GET` request:
```
example.com/api/v1/countries?includes=cities
```

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": "Algeria",

        "cities": [
          {
            "id": 1,
            "name": "Adrar",
          },
          ...
        ]
      }
    ],
    "count": ...
  },
  "error": null
}
```

### Subincludes
To also include `areas` you will use a dot after the parent model.

`GET` request:
```
example.com/api/v1/countries?includes=cities.areas
```

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": "Algeria",

        "cities": [
          {
            "id": 1,
            "name": "Adrar",

            "areas": [
              {
                "id": 434,
                "name": "Adrar District"
              },
              ...
            ]
          },
          ...
        ]
      }
    ],
    "count": ...
  },
  "error": null
}
```



## Horizontal includes

The term "Horizontal include" means include of associations on the same level of the hierarchy.

Use `,` token to include additional models.

`GET` request:
```
example.com/api/v1/countries?limit=1&includes=cities,languages
```

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": "Algeria",

        "cities": [
          {
            "id": 1,
            "name": "Adrar"
          },
          ...
        ],
        "languages": [
          {
            "id": 37,
            "code": "ara",
            "name": "Arabic"
          },
          ...
        ]
      }
    ],
    "count": 1
  },
  "error": null
}
```

You can also use horizontal include in subquery with the `+` token.

`GET` request:
```
example.com/api/v1/countries?limit=1&includes=cities.areas+languages
```

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": "Algeria",

        "cities": [
          {
            "id": 1,
            "name": "Adrar",

            "areas": [
              {
                "id": 434,
                "name": "Adrar District"
              },
              ...
            ],

            "languages": [
              {
                "id": 37,
                "code": "ara",
                "name": "Arabic"
              },
              ...
            ]
          },
          ...
        ]
      }
    ],
    "count": 1
  },
  "error": null
}
```


## Limit
Will limit amount of results to certain `N`. Default is 3.

`GET` request:
```
example.com/api/v1/countries?limit=10
```

### Nested (inside `includes`)

`GET` request:
```
example.com/api/v1/countries?includes=cities(limit=2)
```

### Subquery

`GET` request:
```
example.com/api/v1/countries?includes=cities.areas(limit=2)
```

### All simultaneously

`GET` request:
```
example.com/api/v1/countries?limit=3&includes=cities(limit=4).areas(limit=2)
```



## Skip (offset)
Will skip first `N` results from the table. Default is 0.

`GET` request:
```
example.com/api/v1/countries?skip=5
```

### Nested (inside `includes`)
`GET` request:
```
example.com/api/v1/countries?includes=cities(skip=4)
```

### Subquery

`GET` request:
```
example.com/api/v1/countries?includes=cities.areas(skip=3)
```

### All simultaneously

`GET` request:
```
example.com/api/v1/countries?skip=5&includes=cities(skip=4).areas(skip=3)
```


## Order (Sorting)

### Top level

`order_by` & `order` arguments can be set in the `query`.

`GET` request:
```
example.com/api/v1/countries?order_by=id&order=desc
```

Above `query` will sort `countries[]` by it's `id`.


### Nested (inside `includes`)

`GET` request:
```
example.com/api/v1/countries?includes=cities(order_by=id&order=desc)
```

Above `query` will sort `cities[]` by it's `id` inside every `country` object.


### Order in subincludes

`GET` request:
```
example.com/api/v1/countries?includes=cities.areas(order_by=id&order=desc)
```

Above `query` will sort `areas[]` by it's `id` inside every `city` inside every `country` object.


## Documentation Structure

NQL documentation is organized into several topics:

### Core Concepts
- **[Syntax →](Syntax.md)** - Understanding query syntax and special characters
- **[Parameters →](Parameters.md)** - All available parameters and their usage
- **[Subqueries →](Subqueries.md)** - Working with nested queries

### Query Features
- **[Operators →](Operators.md)** - Filtering operators (like, in, gt, etc.)
- **[Functions →](Functions.md)** - Aggregate functions (count, avg, etc.)

## Operators

NQL provides powerful operators for filtering data. See the full documentation:
[Operators documentation →](Operators.md)

**Quick example:**

`GET` request:
```
example.com/api/v1/countries?name=like(Belg)&id=gt(10)
```

## Functions

Aggregate functions allow you to perform calculations on related data. Functions are called using `functions` or `fn` (short form).

**Example:**

`GET` request:
```
example.com/api/v1/countries?fn=count(cities)
```

See the full documentation:
[Functions documentation →](Functions.md)

## Next Steps

1. **Learn the syntax**: Start with [Syntax documentation →](Syntax.md) to understand how queries are structured
2. **Explore parameters**: Check [Parameters documentation →](Parameters.md) for all available options
3. **Master subqueries**: Learn advanced techniques in [Subqueries documentation →](Subqueries.md)
4. **Use operators**: Discover filtering capabilities in [Operators documentation →](Operators.md)
5. **Apply functions**: Learn aggregation in [Functions documentation →](Functions.md)

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
