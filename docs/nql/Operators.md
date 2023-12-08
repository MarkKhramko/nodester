# Operators | nodester Query Language (NQL)

## In

* `GET` request:
```
http://localhost:8080/api/v1/cities?country_id=[14,52]
```


## Not a value (Except)

* `GET` request:
```
http://localhost:8080/api/v1/countries?name=not(Belgium)
```

* Short version:
```
http://localhost:8080/api/v1/countries?name=!(Belgium)
```



## Like value

To emulate SQL's `like %value%` use `?<key>=like(<value>)` in the query.

* `GET` request:
```
http://localhost:8080/api/v1/countries?name=like(Belg)
```

### NotLike value

To emulate SQL's `not like %value%` use `?<key>=notLike(<value>)` in the query.

* `GET` request:
```
http://localhost:8080/api/v1/countries?name=notLike(Belg)
```

* Short version:
```
http://localhost:8080/api/v1/countries?name=!like(Belg)
```


## Or

To emulate SQL's `where <key>=<value> or <key>=<value>` use `?<key>=or(<value1>,<value2>)` in the query.
* ! Note: don't use `spaces` between values.

* `GET` request:
```
http://localhost:8080/api/v1/countries?name=or(Belgium,Denmark)
```

* Short version:
```
http://localhost:8080/api/v1/countries?name=|(Belgium,Denmark)
```

## Inequality

### Greater than

* `GET` request:
```
http://localhost:8080/api/v1/countries?updated_at=gt(2022)
```

### Greater than or equal to

* `GET` request:
```
http://localhost:8080/api/v1/countries?updated_at=gte(2022)
```

### Lower than

* `GET` request:
```
http://localhost:8080/api/v1/countries?updated_at=lt(2022)
```

### Lower than or equal to

* `GET` request:
```
http://localhost:8080/api/v1/countries?updated_at=lte(2022)
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
