---
hidden: true
icon: bullseye-arrow
---

# Quickstart

This quickstart shows the core Funkcia flow: model expected failures with `Option`/`Result`, then use `OptionAsync`/`ResultAsync` for async workflows.

### Install

```bash
pnpm add funkcia
```

### Import what you need

```ts
import { Option, Result } from 'funkcia';
import { OptionAsync } from 'funkcia/option-async';
import { ResultAsync } from 'funkcia/result-async';
```

### Start with `Option`

Use `Option` for missing values without throwing.

```ts
import { Option } from 'funkcia';

declare function findUserEmail(userId: string): string | null;

const email = Option.fromNullable(findUserEmail('user_123'))
  .filter((value) => value.includes('@'))
  .unwrapOr(() => 'guest@example.com');
```

### Use `Result` for typed failures

Use `Result` when you want explicit error payloads.

```ts
import { Result } from 'funkcia';
import { TaggedError } from 'funkcia/exceptions';

class InvalidCouponError extends TaggedError('InvalidCouponError') {}

function validateCoupon(code: string) {
  return code.length > 5
    ? Result.ok(code)
    : Result.error(new InvalidCouponError('Coupon code is too short'));
}
```

### Move to async with `OptionAsync` and `ResultAsync`

```ts
import { OptionAsync } from 'funkcia/option-async';
import { ResultAsync } from 'funkcia/result-async';

declare function readToken(): Promise<string | null>;
declare function fetchUser(token: string): Promise<{ id: string }>;

const token = OptionAsync.try(() => readToken());

const user = token
  .andThen((value) => OptionAsync.fromNullable(value))
  .andThen((value) => OptionAsync.try(() => fetchUser(value)));

const safeUser = ResultAsync.try(() => fetchUser('token'));
```

### Next steps

- Learn do-notation:
  - [Option Do Notation](../data-types/option/do-notation.md)
  - [Result Do Notation](../data-types/result/do-notation.md)
  - [OptionAsync Do Notation](../data-types/optionasync/do-notation.md)
  - [ResultAsync Do Notation](../data-types/resultasync/do-notation.md)
- Learn error propagation:
  - [Option Error Propagation](../data-types/option/error-propagation.md)
  - [Result Error Propagation](../data-types/result/error-propagation.md)
  - [OptionAsync Error Propagation](../data-types/optionasync/error-propagation.md)
  - [ResultAsync Error Propagation](../data-types/resultasync/error-propagation.md)
