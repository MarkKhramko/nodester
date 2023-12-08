# Filter | nodester

## Basic examples

```js
const Country = require('#models/Country');
const City = require('#models/City');
const Area = require('#models/Area');

const filter = new Filter(Country, {
  attributes: [
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

Static override values from the query with set values.

They should be used as way to limit access or amount of requests.

```js
const filter = new Filter(City, {
  ...,
  statics: {
    attributes: {
      country_id: 17
    },
    clauses: {
      limit: 10
    }
  }
});
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
