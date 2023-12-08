# Introduction | nodester Query Language (NQL)

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
  ┣ id
  ┣ language_id
  ┗ country_id

 • language_to_city_relations
  ┣ id
  ┣ language_id
  ┗ city_id
```

## Basics

To get list of `countries` you will use it's main endpoint.

* `GET` request:
```
http://localhost:8080/api/v1/countries
```


### Based on the attribute (column) value

* `GET` request:
```
http://localhost:8080/api/v1/countries?name=Belgium
```

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 17,
        "name": 'Belgium'
      }
    ],
    "count": 1
  },
  "error": null
}
```

You can also setup a route `/countries/:id` and access it as follows:

* `GET` request:
```
http://localhost:8080/api/v1/countries/17
```

Will output you:

```js
{
  "content": {
    "country": {
      "id": 17,
      "name": 'Belgium'
    },
    "count": 1
  },
  "error": null
}
```


## Includes

To get `countries` with `cities` you will use the route with it's name.

* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities
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

* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities.areas
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

* `GET` request:
```
http://localhost:8080/api/v1/countries?limit=1&includes=cities,languages
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

* `GET` request:
```
http://localhost:8080/api/v1/countries?limit=1&includes=cities.areas+languages
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

* `GET` request:
```
http://localhost:8080/api/v1/countries?limit=10
```

### Nested (inside `includes`)

* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities(limit=2)
```

### Subquery

* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities.areas(limit=2)
```

### All simultaneously

* `GET` request:
```
http://localhost:8080/api/v1/countries?limit=3&includes=cities(limit=4).areas(limit=2)
```



## Skip (offset)
Will skip first `N` results from the table. Default is 0.

* `GET` request:
```
http://localhost:8080/api/v1/countries?skip=5
```

### Nested (inside `includes`)
* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities(skip=4)
```

### Subquery

* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities.areas(skip=3)
```

### All simultaneously

* `GET` request:
```
http://localhost:8080/api/v1/countries?skip=5&includes=cities(skip=4).areas(skip=3)
```


## Order (Sorting)

### Top level

`order_by` & `order` arguments can be set in the `query`.

* `GET` request:
```
http://localhost:8080/api/v1/countries?order_by=id&order=desc
```

Above `query` will sort `countries[]` by it's `id`.


### Nested (inside `includes`)

* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities(order_by=id&order=desc)
```

Above `query` will sort `cities[]` by it's `id` inside every `country` object.


### Order in subincludes

* `GET` request:
```
http://localhost:8080/api/v1/countries?includes=cities.areas(order_by=id&order=desc)
```

Above `query` will sort `areas[]` by it's `id` inside every `city` inside every `country` object.


## Operators

See the full operators documentation here:
[Go to the operators documentation ➡️](Operators.md)


## Functions

### Count

To count, for example, number of `cities` inside each country, use `count(cities)` inside a `query`.

Argument inside `count()` must match the name of the include exactly.

* `GET` request:
```
http://localhost:8080/api/v1/countries?count(cities)
```

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": "Algeria",
        "cities_count": 8001
      },
      ...
    ],
    "count": ...
  },
  "error": null
}
```


## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
