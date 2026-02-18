---
"funkcia": patch
---

Fix type signatures for `Brand.of` and `Option.fn` to match their runtime behavior.

Update `Result.match` on `Error` results to call the `Error` handler directly, without defect wrapping.
