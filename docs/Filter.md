# Filter | nodester

## Basic examples

```js
const Country = require('#models/Country');
const City = require('#models/City');
const Area = require('#models/Area');

const filter = new Filter(Country, {
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
		cities: new Filter(City, {
			includes: {
				areas: new Filter(Area)
			}
		})
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
const filter = new Filter({
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
