# nodester Queries API

## Like value

To emulate MySQL's `like %value% ` query in URL,
pass `?key=like(value)` in the query.

* Example:
`http://localhost:5001/api/v1/countries?name=like(Engl)`


## NotLike value

* Example:
`http://localhost:5001/api/v1/countries?name=notLike(Engl)`


## Or

To emulate MySQL's `where key=value or key=value` query in URL,
pass `?key=or(value1,value2)` in the query.
* ! Note: don't use `spaces` between values.

* Example:
`http://localhost:5001/api/v1/countries?name=or(England,Germany)`


## Count

MySQL's `select count(value)` query is run by default in facade's `getMany` function

* Response Example:
```JSON
{
	"count": 10,
	"countries": [ ... ],
	"limit": 10,
	"skip": 0,
	"total_count": 195
}
```

## Order (Sorting)


#### Top level

`order_by` & `order` arguments can be set in `query`
`http://localhost:5001/api/v1/countries?order_by=id&order=desc`

Above `query` will sort Countries[] by it's id.


#### Nested (Includes)

`http://localhost:5001/api/v1/countries?includes=cities(order_by=id&order=desc)`

Above `query` will sort Cities[] by it's id inside every Country object.

It can also do this:
`http://localhost:5001/api/v1/countries?includes=cities(order_by=id&order=desc).areas`
