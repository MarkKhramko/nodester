# Changelog

All notable changes to this project are documented in this file.

## 0.8.0

### Breaking

- **Root `count()` alias now matches the output collection key for multi-word models.**
  Previously the root-model `count()` alias was built with `plural.toLowerCase()`,
  which does not snake_case a PascalCase plural. For a model like `InvoiceParse`
  (plural `InvoiceParses`) this emitted `invoiceparses_count`, while the records
  themselves were returned under `invoice_parses`. The alias is now derived the
  same way as the response collection key, so it is always
  `` `${output_plural}_count` ``:
  - `invoiceparses_count` → `invoice_parses_count` (default / `output: 'underscored'`)
  - `invoiceParses_count` under `nodester.output: 'camelcased'`

  Single-word models are unaffected (`products_count` stays `products_count`).

  **Migration:** any consumer reading the old smashed key (e.g. `invoiceparses_count`)
  for a multi-word model must switch to the underscored/camelCased form. No
  dual-alias shim is emitted; if you need a deprecation window, add one in your
  own layer.

### Internal

- The "output collection name for a model" derivation is now a single shared
  helper (`nodester/utils/models#outputNameForModel`), used by both the CRUD
  facade (response key) and the COUNT mapper (alias), so the two can no longer
  diverge.
