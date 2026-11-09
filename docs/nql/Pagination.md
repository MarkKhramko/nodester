# Query plans, cursor pagination, and server constraints

NQL has two pagination styles:

- `limit` + `skip` is the existing offset style and remains available.
- cursor pagination is the stable style for feeds and changing data sets.

Cursor pagination is configured by the server in the `Filter`. A client can
request a page size and pass an opaque cursor, but cannot choose the cursor
order or remove server constraints.

The request shape selects the pagination mode:

- `limit` without a positive `skip` starts a cursor page when the Filter
  enables cursor pagination.
- `after` or `before` continues cursor pagination.
- A positive `skip` selects the existing offset path, even if the Filter also
  contains cursor configuration.
- `after`/`before` combined with a positive `skip` is rejected.
- `count()` cannot be combined with cursor pagination; aggregate requests must
  use the legacy executor.

## A posts/comments feed

The following example describes a generic `Post` feed with a nested
`comments` association. The same configuration can be used for any model;
the names are only examples.

```js
const Filter = require('nodester/filter');
const createPlan = require('nodester/query/plan');
const { createHmacCursorCodec } = require('nodester/query/cursor');
const { Op } = require('sequelize');

const cursorCodec = createHmacCursorCodec(process.env.FEED_CURSOR_SECRET);

const commentFilter = new Filter(Comment, {
  attributes: ['id', 'post_id', 'body', 'created_at'],
  clauses: ['limit', 'skip', 'order', 'order_by'],
});

const postFilter = new Filter(Post, {
  attributes: ['id', 'status', 'published_at', 'title', 'body'],
  includes: { comments: commentFilter },

  pagination: {
    mode: 'cursor',
    order: [
      { field: 'published_at', direction: 'DESC' },
      { field: 'id', direction: 'DESC' },
    ],
    unique: ['id'],
    maxPageSize: 50,
    codec: cursorCodec,
  },

  // These predicates are always ANDed with client predicates.
  constraints: {
    where: ({ snapshotTime } = {}) => ({
      status: 'PUBLISHED',
      published_at: { [Op.lte]: snapshotTime },
    }),
  },
});
```

The route parses NQL, builds the framework plan, and executes it:

```js
async function getFeed(req, res) {
  const ast = req.nquery;
  const plan = createPlan(ast, postFilter, {
    context: {
      // Create this once for the first request and carry it in the signed
      // request context used by subsequent requests.
      snapshotTime: req.feedSnapshotTime,
    },
  });

  const result = await plan.execute();
  return res.json(result);
}
```

In a real application, the NQL middleware already puts the AST in
`req.nquery`, so the route normally uses `createPlan(req.nquery, postFilter,
{ context })`.

## HTTP requests

The first page has no cursor:

```text
GET /posts?limit=20&includes=comments
```

The response contains page metadata:

```json
{
  "items": [
    { "id": 42, "title": "...", "comments": [] }
  ],
  "page_info": {
    "has_next_page": true,
    "has_previous_page": false,
    "next_cursor": "eyJ2IjoxLCJtb2RlbCI6...",
    "previous_cursor": null
  }
}
```

The next request sends that value back unchanged:

```text
GET /posts?limit=20&after=eyJ2IjoxLCJtb2RlbCI6...&includes=comments
```

The cursor is opaque. Do not parse it in frontend code or construct one by
concatenating database values.

## Why two order fields?

`published_at` alone is not unique. If two posts have the same timestamp, the
`id` tie-breaker makes the order deterministic. For the order
`published_at DESC, id DESC`, an `after` cursor produces the equivalent of:

```sql
published_at < :published_at
OR (published_at = :published_at AND id < :id)
```

Every value remains a Sequelize bind value; cursor data is never interpolated
into SQL. Mixed ASC/DESC orders use the corresponding comparison per field.

If `unique` is omitted, Nodester appends the model's single primary key as a
tie-breaker. If there is no usable primary key, configuration is rejected.
Nullable order fields are rejected by the built-in planner. Materialize a
non-null sort key if the application needs nullable source data.

Random ordering and aggregate/function ordering are not valid in cursor mode.
`skip` cannot be combined with `after` or `before`.

## Mandatory filters and associations

Client predicates are never allowed to replace a server predicate. For
example, this client request:

```text
GET /posts?status=DRAFT
```

still produces `client_status AND status = 'PUBLISHED'`.

Mandatory association filters are declared in the same generic policy tree.
The association is added even when the client omits it:

```js
const followerFilter = new Filter(User, {
  attributes: ['id'],
});

const pubFilter = new Filter(Pub, {
  attributes: ['id', 'name'],
  includes: { followers: followerFilter },
});

const postFilter = new Filter(Post, {
  attributes: ['id', 'pub_id', 'status', 'published_at'],
  includes: { pub: pubFilter },
  constraints: {
    includes: {
      pub: {
        required: true,
        includes: {
          followers: {
            required: true,
            where: ({ currentUserId } = {}) => ({ id: currentUserId }),
          },
        },
      },
    },
  },
});
```

This means `Post -> Pub -> followers(id = currentUserId)` is an INNER JOIN
policy. A request cannot remove `pub`, make it optional, or bypass the
follower predicate by omitting `includes=pub` or requesting another include.

The policy may be nested with `where`, `required`, and `includes`. Values may
be functions of the request context, which is useful for the current user and
for a snapshot value.

## Snapshots

Cursor pagination does not invent a feed snapshot. The application chooses a
snapshot value, such as the first request's current time, and passes it through
the signed request context. The constraint function reapplies it on every
page:

```js
constraints: {
  where: ({ snapshotTime }) => ({
    published_at: { [Op.lte]: snapshotTime },
  }),
}
```

This makes posts scheduled after the snapshot invisible to all pages in that
feed, even if they are published while the user is scrolling. Validate the
snapshot context at the application boundary and include it in the signed
context or cursor scope.

## Codec contract and security

The framework accepts any codec with this contract:

```js
{
  encode(payload) { return opaqueString; },
  decode(opaqueString) { return payload; }
}
```

`decode()` must reject malformed or tampered values. The built-in
`createHmacCursorCodec(secret)` is a convenient signed implementation; the
secret is supplied by the application and is never generated or stored by
Nodester. Cursor payloads include a version, model identity, order, query
scope, and typed order values. Mismatched model, order, scope, version, bad
types, or invalid signatures return a 422 error.

## Includes and root pagination

The root page size applies to root records, not joined rows. Required
associations are applied as root constraints before the page is returned.
HasMany includes are hydrated by Sequelize's association handling; an
included HasMany's own `limit`/`order` is a child collection concern and does
not paginate the root feed. Applications should use `separate` child loading
when they need a separately ordered or limited HasMany collection.

The plan also selects cursor order fields when they were not requested in
`attributes`, because they are needed to create the next cursor. Treat those
fields as planner metadata and omit them in the response serializer if they
are not part of the public representation.

## Migration from offset pagination

Existing requests continue to work:

```text
GET /posts?limit=20&skip=40&order_by=created_at&order=desc
```

To migrate a changing feed:

1. Add a unique, deterministic `pagination.order` and an application codec.
2. Move visibility/user-scope rules into `constraints`.
3. Create the first page without `after`.
4. Store and forward `page_info.next_cursor`.
5. Stop sending `skip` for that route.

Unknown fields, clauses, include names, order fields, and operators are
rejected instead of silently becoming SQL predicates.
