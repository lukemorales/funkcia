# funkcia

## 1.0.2

### Patch Changes

- [`dcbf75c`](https://github.com/lukemorales/funkcia/commit/dcbf75c0105eb345d44dce9d873417e9a597571a) Thanks [@lukemorales](https://github.com/lukemorales)! - Add README.md

## 1.0.1

### Patch Changes

- [`7545a9f`](https://github.com/lukemorales/funkcia/commit/7545a9f12e93f54313c8c17a03ae1d52d89da14c) Thanks [@lukemorales](https://github.com/lukemorales)! - Fix type signatures for `Brand.of` and `Option.fn` to match their runtime behavior.

  Update `Result.match` on `Error` results to call the `Error` handler directly, without defect wrapping.

## 1.0.0

### Major Changes

- [#18](https://github.com/lukemorales/funkcia/pull/18) [`d15f511`](https://github.com/lukemorales/funkcia/commit/d15f5110863490502024fee86fcff4b86e442fe9) Thanks [@lukemorales](https://github.com/lukemorales)! - Rewrite the core data types with a new implementation while preserving the Option/Result model and flow.

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
