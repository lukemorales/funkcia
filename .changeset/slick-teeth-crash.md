---
'funkcia': major
---

Rewrite the core data types with a new implementation while preserving the Option/Result model and flow.

### New modules and entry points

- Added dedicated subpath exports for the core types: `funkcia/option`, `funkcia/option-async`, `funkcia/result`, and `funkcia/result-async`.
- Added `funkcia/pattern-matching` for type-safe branching utilities.
- Added `funkcia/brand` with branded type constructors and parsing helpers (`Brand.of`, `Brand.unbrand`, `parse`, `safeParse`).
- Added `funkcia/runes` with runic collections (`$array`, `$map`, `RunicArray`, `RunicMap`) that return `Option` values for lookup-style operations.

### New APIs and features

- `Option.fromResult` for converting `Result` into `Option`.
- `Result.fromOption` for converting `Option` into `Result`.
- `Result.partition` and `Result.hydrate` helpers for grouping and re-hydrating `Result` values.
- `exhaustive` and `exhaustive.tag` for exhaustive matching across literal unions and tagged unions.
- `corrupt` helper for unreachable/default branches when impossible values are encountered.
- `OptionAsync` adds richer constructors/conversions: `fromOption`, `fromResult`, `fromResultAsync`, and `resource`.
- `ResultAsync` adds richer constructors/conversions: `fromResult`, `fromOption`, `fromOptionAsync`, and `resource`.

### Method and naming updates

- Renamed function declaration helpers:
  - `Option.fun` -> `Option.fn`
  - `Result.fun` -> `Result.fn`
- Renamed function lifting helpers:
  - `Option.liftFun` -> `Option.lift`
  - `Result.liftFun` -> `Result.lift`
- Renamed generator flow helpers:
  - `Option.relay` -> `Option.use`
  - `Result.relay` -> `Result.use`
  - `AsyncOption.relay` -> `OptionAsync.use`
  - `AsyncResult.relay` -> `ResultAsync.use`
- Async type naming was standardized:
  - `AsyncOption` -> `OptionAsync`
  - `AsyncResult` -> `ResultAsync`
