# Root Filtering | nodester Query Language (NQL)

Root filtering allows you to filter the root model based on conditions applied to included models. This is equivalent to using an INNER JOIN in SQL.

## The Caret (^) Operator

Use the `^` character before an attribute name in a subquery to indicate that the root model should be filtered by this condition.

**Syntax:**
```
?includes=model(^attribute=value)
```

**Example:**

`GET` request:
```
example.com/api/v1/products?includes=order(^is_filled=1)
```

This returns only `products` that have an associated `order` where `is_filled=1`.

**SQL Equivalent:**
```sql
SELECT * FROM products
INNER JOIN orders ON orders.product_id = products.id
WHERE orders.is_filled = 1
```

## How It Works

When you use `^` before an attribute:
1. The attribute filter is applied to the included model
2. The include is marked as `required: true` (INNER JOIN)
3. The `required` flag propagates up through all parent includes
4. Only root records with matching included records are returned

## Nested Root Filtering

Root filtering works with nested includes. The `required` flag propagates up the entire include chain.

**Example:**

`GET` request:
```
example.com/api/v1/products?includes=category.subcategory(^is_active=1)
```

This returns only `products` that have:
- A `category` that has
- A `subcategory` where `is_active=1`

Both `category` and `subcategory` will be marked as `required: true`.

## Multiple Conditions

You can use multiple `^` conditions in the same subquery:

**Example:**

`GET` request:
```
example.com/api/v1/products?includes=order(^is_filled=1&^amount=gt(100))
```

This returns only `products` with an `order` where:
- `is_filled=1` AND
- `amount > 100`

## Combining with Regular Filters

You can mix root filtering (`^`) with regular include filters:

**Example:**

`GET` request:
```
example.com/api/v1/products?includes=order(^is_filled=1&limit=1)
```

This:
- Filters `products` to only those with `is_filled=1` orders (INNER JOIN)
- Limits the returned orders to 1 per product

## Important Notes

1. **INNER JOIN Behavior**: Using `^` creates an INNER JOIN, which means:
   - Root records without matching includes are excluded
   - This is different from regular includes which use LEFT JOIN by default

2. **Propagation**: The `required` flag propagates up the include tree:
   ```
   products.category.subcategory(^is_active=1)
   ```
   Results in:
   - `subcategory.required = true`
   - `category.required = true` (propagated)

3. **Filter Validation**: The framework validates that root filtering is allowed on the model according to your Filter configuration.

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
