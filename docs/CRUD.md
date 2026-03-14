# CRUD Operations | nodester

Every model defined with `defineModel` automatically receives CRUD methods via the `implementsCRUD` mixin. These methods are invoked by the **Facade** layer, which is called by the **Controller** layer.

Data flow: `Controller → Facade → Model CRUD mixin`

---

## createOne / createWithIncludes

Creates a new record. If the request body contains nested association data, the mixin handles it according to the **association type**.

```
POST /murals
Body: { name: "Wall Art", skills: [{ id: 1 }], images: [{ url_x2: "..." }] }
```

### Association handling during creation

| Association Type | Behavior |
|---|---|
| **HasMany** | Creates child records in the associated table, setting the `foreignKey` to the new parent's `id`. If a child has an `id`, it updates the existing record. If a child has `should_delete: true`, it deletes it. |
| **HasOne** | Same as HasMany, but for a single record. |
| **BelongsToMany** | Links **existing** records via the junction table. Each item must already exist (verified via `findByPk`). If any item is not found, a **406** error is returned: *"Before you can associate {name} with {model}, {name} must be created separately."* |

---

## updateOne

Finds an existing record by `where` clause, then updates it and its associations.

```
PUT /murals/:id
Body: { name: "New Name", skills: [{ id: 1 }, { id: 3 }] }
```

### Association handling during update

| Association Type | Behavior |
|---|---|
| **HasMany** | For each item: if it has an `id`, update it; if not, create it (with `findOrCreate`). Sending an **empty array `[]`** destroys all existing child records for this parent. |
| **HasOne** | Same as HasMany but for a single record. Sending `null` destroys the existing child. |
| **BelongsToMany** | **Replaces the full set** of associations using Sequelize's `set` accessor (e.g., `instance.setSkills([1, 3])`). Each item must already exist. Sending an **empty array `[]`** removes all associations from the junction table. |

> [!IMPORTANT]
> **BelongsToMany uses "set" semantics.** The list you send is the complete desired state. Any previously linked records not in the new list will be unlinked. Any new records in the list will be linked. The associated records themselves are never created or deleted — only the junction table rows are affected.

> [!WARNING]
> **BelongsToMany does not create associated records.** If you send `skills: [{ id: 999 }]` and Skill `999` does not exist, you will receive a `406 Not Acceptable` error. Create the Skill first, then associate it.

---

## getOne / getMany

Standard Sequelize `findOne` / `findAll` with query parameters processed through the [Filter](./Filter.md) and NQL traverse pipeline.

```
GET /murals/1?includes=images,skills
GET /murals?limit=20&skip=0&order=desc&order_by=id
```

---

## deleteOne

Performs a soft delete (`paranoid: true`) or hard delete depending on the model configuration.

```
DELETE /murals/1
```

Returns `{ count: 1 }` on success, or a `404` if the record was not found.

---

## Body Extraction

Before CRUD methods are called, request data passes through the `extract` function (from `nodester/body/extract`).

The extract function:
1. Iterates over each key in `req.body`.
2. **Attributes**: Validates the key exists in the model and the filter allows it. Sanitizes the value based on the column's data type.
3. **Includes**: Recursively extracts nested association data using the include's sub-filter.
4. **Static attributes**: Overrides any values that are defined as `statics` in the filter (e.g., forcing a `country_id`).
5. **Unknown keys**: Throws a `406 Not Acceptable` error.

---

## Model Includes Tree

The `getIncludesTree(data)` method (defined on every model) builds the Sequelize `include` config for CRUD operations:

```js
const include = this.model.getIncludesTree(data);
// Result: [{ association: 'skills' }, { association: 'images', include: [...] }]
```

This tree is passed to both `create` and `updateOne`, ensuring the framework knows which associations to process.

---

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
