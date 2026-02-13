# Exceptions Module

`funkcia/exceptions` provides typed exception primitives that integrate with `Result` and `Option`.

## Built-In Types

- `UnhandledException`: default error wrapper when `Result.try`/`ResultAsync.try` catches unknown exceptions.
- `NoValueError`: default failure for nullable/falsy conversions in `Result`.
- `FailedPredicateError<T>`: emitted by `Result.predicate`/`filter` when criteria fails without a custom error.
- `Panic`: non-recoverable defect signal used by `panic(...)`.

## Real-World Use

### Wrapping third-party parsing failures

```ts
import { Result, UnhandledException } from 'funkcia';

const parsed = Result.use(function* () {
  const claims = yield* Result.try(() => sdk.decodeToken(token));
  return Result.ok(claims);
});

parsed.match({
  Ok(claims) {
    return claims;
  },
  Error(error) {
    if (UnhandledException.is(error)) {
      audit.warn({ message: 'Token decode failed', reason: error.message });
    }
    return null;
  },
});
```

### Explicit fallback for missing configuration

```ts
import { Result, NoValueError } from 'funkcia';

const configResult = Result.use(function* () {
  const apiKey = yield* Result.fromNullable(process.env.PAYMENTS_API_KEY);
  return Result.ok(apiKey);
});

if (configResult.isError() && NoValueError.is(configResult.unwrapError())) {
  throw new Error('PAYMENTS_API_KEY must be configured');
}
```

### Escalate impossible states with `panic`

```ts
import { panic } from 'funkcia/exceptions';

function exhaustive(status: never): never {
  return panic(`Unreachable status: ${String(status)}`);
}
```

## Practical Guidelines

- Treat `Panic` as a bug marker, not a recoverable business error.
- Prefer custom `TaggedError` classes for application-level failures.
- Use built-ins as defaults and progressively replace with domain errors where helpful.
- Model expected failures as `None`/`Error`; do not throw expected business failures.

## Defects vs Domain Errors

| API | Domain behavior | Defect behavior |
| --- | --- | --- |
| `Option` / `Result` | Return `Option.none()` / `Result.error(...)` | Throws in combinator callbacks are escalated as `Panic` |
| `OptionAsync` | `try` and `let` rejection/nullable resolves to `None` | Throw/reject in `tap` escalates as `Panic` |
| `ResultAsync` | `try` rejection resolves to `Result.Error(UnhandledException)` or mapped error | Throw/reject in `let`, `tap`, and `tapError` escalates as `Panic` |
