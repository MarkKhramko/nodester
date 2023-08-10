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
```

_Even though, naming of models should start with the capital case, querying on them must be done with the lower and snake case._

## Basics

To get list of `Countries` you will use it's main endpoint.

* Example:
`http://localhost:5001/api/v1/countries`

### Based on the column value

* Example:
`http://localhost:5001/api/v1/countries?name=England`

### Limit
Will limit amount of results to `N`. Default is 3.

* Example:
`http://localhost:5001/api/v1/countries?limit=10`.

### Skip or offset
Will skip first `N` results from the table. Default is 0.

* Example:
`http://localhost:5001/api/v1/countries?skip=10`.


## Includes

To get `Countries` with `Cities` you will use the route with it's name.

* Example:
`http://localhost:5001/api/v1/countries?includes=cities`

### Subincludes
To subinclude Areas you will use dot and name of the submodel.

* Example:
`http://localhost:5001/api/v1/countries?includes=cities.areas`


## Not a value

* Example:
`http://localhost:5001/api/v1/countries?name=not(England)`


## Like value

To emulate SQL's `like %value%` use `?key=like(value)` in the query.

* Example:
`http://localhost:5001/api/v1/countries?name=like(Engl)`


### NotLike value

* Example:
`http://localhost:5001/api/v1/countries?name=notLike(Engl)`


## Or

To emulate SQL's `where key=value or key=value` use `?key=or(value1,value2)` in the query.
* ! Note: don't use `spaces` between values.

* Example:
`http://localhost:5001/api/v1/countries?name=or(England,Germany)`
* Short version:
`http://localhost:5001/api/v1/countries?name=|(England,Germany)`


## Order (Sorting)

### Top level

`order_by` & `order` arguments can be set in the `query`.

* Example:
`http://localhost:5001/api/v1/countries?order_by=id&order=desc`

Above `query` will sort `Countries[]` by it's `id`.


### Nested (Includes)

* Example:
`http://localhost:5001/api/v1/countries?includes=cities(order_by=id&order=desc)`

Above `query` will sort `Cities[]` by it's `id` inside every `Country` object.


#### Order in subincludes

* Example:
`http://localhost:5001/api/v1/countries?includes=cities.areas(order_by=id&order=desc)`

Above `query` will sort `Areas[]` by it's `id` inside every `City` inside every `Country` object.


## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
