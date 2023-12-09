# Filter | nodester
Filter is a set of rules on how to process [Client's](CoreConcepts.md#client) input.

## Basic examples

```js
const Filter = require('nodester/filter');

const Country = require('#models/Country');
const City = require('#models/City');
const Area = require('#models/Area');

const filter = new Filter(Country, {
  attributes: [
    'id',
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
      attributes: [
        'id',
        'country_id'
        'name',
      ],
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

Statics override [client's](CoreConcepts.md#client) query values with your configured values.

> They should be used as way to limit access or amount of requests.

```js
const filter = new Filter(City, {
  ...,
  statics: {
    attributes: {
      country_id: 17
    },
    clauses: {
      limit: 10,
      skip: 2
    }
  }
});
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
