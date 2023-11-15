# Filter | nodester

## Basic examples

```js
const filter = new Filter({
	fields: [
		'id',
		'country_id'
		'name',
	],
	clauses: [		
		'skip',
		'limit',

		'order',
		'order_by',
	],
	includes: {
		countries: new Filter(Country)
	},
	bounds: {
		clauses: {
			limit: {
				min: 1,
				max: 30
			}
		}
	}
});
```

## Statics

```js
new Filter({
	statics: {
		attributes: {},
		clauses: {
			limit: 10
		}
	}
});
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
