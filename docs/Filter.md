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
    'group_by',

    'skip',
    'limit',

    'order',
    'order_by',
  ],
  includes: {
    cities: new Filter(City, {
      attributes: [
        'id',
        'country_id',
        'name',
      ],
      includes: {
        areas: new Filter(Area)
      }
    })
  }
});
```

## Bounds

Bounds are used to set `clauses` within a certain range.

```js
const filter = new Filter(City, {
  ...,
  bounds: {
    clauses: {
      limit: {
        min: 1,
        max: 30
      },
      skip: {
        min: 0,
        max: 10
      }
    }
  }
});
```

## Statics

Statics override [client's](CoreConcepts.md#client) query values with your configured values.

> They should be used as a way to limit access to data or to manage the number of requests.

**Important:** Statics have the highest precedence - they override any query parameters provided by the client.

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

**Example:**
Even if a client requests `?country_id=5&limit=20`, the Filter will enforce `country_id=17` and `limit=10`.

## How Filters Work with Queries

When a query is processed:

1. **Attribute Validation**: Only attributes defined in the Filter's `attributes` array are allowed. If a query requests an attribute not in the Filter, an error is returned.

2. **Attribute Selection**: 
   - If no attributes are requested in the query, all Filter attributes are returned
   - If attributes are requested, only those that are both in the query AND in the Filter are returned
   - At least one attribute must be selected, or a function must be used

3. **Clause Validation**: Only clauses defined in the Filter's `clauses` array are allowed.

4. **Bounds Application**: Values for `limit` and `skip` are automatically adjusted to fit within the bounds:
   - Values below `min` are raised to `min`
   - Values above `max` are lowered to `max`
   - If no limit is provided and bounds are set, the default limit becomes `bounds.max` (or 3 if not specified)

5. **Statics Override**: After processing query parameters, statics are applied and override any conflicting values.

6. **Include Validation**: Only includes defined in the Filter's `includes` object are allowed. Each include must have a corresponding Filter configuration.

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
