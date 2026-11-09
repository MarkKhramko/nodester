# NQL query-plan architecture

Nodester treats a request as a plan with explicit stages:

```text
HTTP query
   ↓
QueryLexer → NQL AST
   ↓
Filter validation
   ↓
mandatory policy/context constraints
   ↓
cursor predicate + root pagination
   ↓
Sequelize options
   ↓
execute → items + page_info
```

The AST remains a plain model tree so existing `traverse(ast, filter)` users
keep their current API. `createPlan(ast, filter, { context })` uses the same
traversal pipeline and adds cursor decoding, scope validation, probe limits,
and page metadata. It is available as:

```js
const createPlan = require('nodester/query/plan');
const plan = createPlan(req.nquery, filter, { context });
const { items, page_info } = await plan.execute();
```

`traverse()` remains useful when an application needs raw Sequelize options
or offset pagination. Cursor routes should execute the returned plan so the
framework can fetch one extra root row, calculate `has_next_page`, and encode
the boundary values.

The planner validates names before compiling them: model attributes, Filter
attributes, include names, operators, order fields, group fields, aggregate
arguments, cursor model/order/scope, and supported clauses. Values remain
values in Sequelize options; they are not concatenated into SQL.

For a root cursor query with collection joins, Nodester makes root pagination
explicit with a subquery/distinct plan and separates optional HasMany
hydration. Required associations remain in the root filtering path so they
are evaluated before the root page limit. This keeps a post from being
counted once per comment and keeps mandatory association filters effective.

See [cursor pagination and server constraints →](Pagination.md) for the
application-facing configuration and request examples.
