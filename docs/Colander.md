# Colander | nodester

## Basic examples

```js
const colander = new Colander({
	fields: [
		'id',
		'country_id'
		'name',
	],
	clauses: [
		'count',
		
		'skip',
		'limit',

		'order',
		'order_by',
	],
	includes: {
		countries: new Colander(Country)
	},
	statics: {
		clauses: {
			limit: 10
		}
	}
});
```

## Statics

```js
new Colander({
	statics: {
		attributes: {},
		clauses: {},
	}
});
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
