# Functions | nodester Query Language (NQL)


### Count

To count, for example, number of `cities` inside each country, use `count(cities)` inside a `query`.

Argument inside `count()` must match the name of the include exactly.

* `GET` request:
```
http://localhost:8080/api/v1/countries?fn=count(cities)
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
