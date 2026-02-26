---
"funkcia": minor
---

Add dual-call predicate APIs across `Option`, `Result`, `OptionAsync`, and `ResultAsync` while preserving curried usage.

Add dual-call `Result.fromNullable` support so it can be used as either `Result.fromNullable(value, onNullable)` or `Result.fromNullable(onNullable)(value)`.

Add no-arg overloads for `ResultAsync.ok()` and `ResultAsync.of()` returning `ResultAsync<void, never>`.
