# Queries & Querying (NQR) | nodester

Let's imagine you created a database with the following structure:

```
• Countries
  ┣ id
  ┗ name

• Cities
  ┣ id
  ┣ country_id
  ┗ name

• Areas
  ┣ id
  ┣ city_id
  ┗ name

• Languages
  ┣ id
  ┣ name
  ┗ code

• LanguageToCountryRelations
  ┣ id
  ┣ language_id
  ┗ country_id

 • LanguageToCityRelations
  ┣ id
  ┣ language_id
  ┗ city_id
```

_Even though, naming of models should start with the capital case, querying on them must be done with the lower and snake case._

## Basics

To get list of `Countries` you will use it's main endpoint.

* Example `GET` request:
`http://localhost:8080/api/v1/countries`


### Based on the column value

* Example `GET` request:
`http://localhost:8080/api/v1/countries?name=England`



## Includes

To get `Countries` with `Cities` you will use the route with it's name.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities`

### Subincludes
To also include `Areas` you will use a dot after the parent model.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities.areas`

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": 'Algeria',

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
    "count": 1
  },
  "error": null
}
```



## Horizontal includes

The term "Horizontal include" means include of associations on the same level of the hierarchy.
To achieve it, use `,` token.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?limit=1&includes=cities,languages`

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": 'Algeria',

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

* Example `GET` request:
`http://localhost:8080/api/v1/countries?limit=1&includes=cities.areas+languages`

Will output you:

```js
{
  "content": {
    "countries": [
      {
        "id": 1,
        "name": 'Algeria',

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

* Example `GET` request:
`http://localhost:8080/api/v1/countries?limit=10`.

### Nested (inside `includes`)

* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities(limit=2)`.

### Subquery

* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities.areas(limit=2)`.

### All simultaneously

* Example `GET` request:
`http://localhost:8080/api/v1/countries?limit=3&includes=cities(limit=4).areas(limit=2)`.



## Skip (offset)
Will skip first `N` results from the table. Default is 0.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?skip=5`.

### Nested (inside `includes`)
* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities(skip=4)`.

### Subquery

* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities.areas(skip=3)`.

### All simultaneously

* Example `GET` request:
`http://localhost:8080/api/v1/countries?skip=5&includes=cities(skip=4).areas(skip=3)`.



## Not a value (Except)

* Example `GET` request:
`http://localhost:8080/api/v1/countries?name=not(England)`

* Short version:
`http://localhost:8080/api/v1/countries?name=!(England)`



## Like value

To emulate SQL's `like %value%` use `?key=like(value)` in the query.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?name=like(Engl)`


### NotLike value

* Example `GET` request:
`http://localhost:8080/api/v1/countries?name=notLike(Engl)`



## Or

To emulate SQL's `where key=value or key=value` use `?key=or(value1,value2)` in the query.
* ! Note: don't use `spaces` between values.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?name=or(England,Germany)`
* Short version:
`http://localhost:8080/api/v1/countries?name=|(England,Germany)`



## Order (Sorting)

### Top level

`order_by` & `order` arguments can be set in the `query`.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?order_by=id&order=desc`

Above `query` will sort `Countries[]` by it's `id`.


### Nested (inside `includes`)

* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities(order_by=id&order=desc)`

Above `query` will sort `Cities[]` by it's `id` inside every `Country` object.


### Order in subincludes

* Example `GET` request:
`http://localhost:8080/api/v1/countries?includes=cities.areas(order_by=id&order=desc)`

Above `query` will sort `Areas[]` by it's `id` inside every `City` inside every `Country` object.


## Count

To count, for example, number of `Cities` inside each country, use `count(cities)` inside a `query`.
Argument inside `count()` must match the name of the include exactly.

* Example `GET` request:
`http://localhost:8080/api/v1/countries?count(cities)`

Will return array of `countries` with the number of cities inside a `cities_count` key.


## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
