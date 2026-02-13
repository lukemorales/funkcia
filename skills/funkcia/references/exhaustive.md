# Exhaustive Matching

Use `funkcia/exhaustive` for explicit, type-safe branching over unions and tagged unions.

## Exports

- `exhaustive`: requires full coverage (or explicit `_` fallback).
- `corrupt`: helper for impossible/default branches in `switch` statements.

## `exhaustive` with String/Boolean Unions

```ts
import { exhaustive } from 'funkcia/exhaustive';

type Role = 'ADMIN' | 'VIEWER';

const label = (role: Role) =>
  exhaustive(role, {
    ADMIN: () => 'Admin',
    VIEWER: () => 'Viewer',
  });
```

## `exhaustive` with Tagged Unions (`_tag` default)

```ts
import { exhaustive } from 'funkcia/exhaustive';

type CheckoutError =
  | { _tag: 'UserNotFoundError'; userId: string }
  | { _tag: 'InvalidCouponError'; code: string };

const status = (error: CheckoutError) =>
  exhaustive(error, {
    UserNotFoundError: (value) => ({ status: 404, code: value._tag }),
    InvalidCouponError: (value) => ({ status: 422, code: value._tag }),
  });
```

## `corrupt` in Switch Defaults

```ts
import { corrupt } from 'funkcia/exhaustive';

type Day = 'Monday' | 'Tuesday';

const isWeekend = (day: Day) => {
  switch (day) {
    case 'Monday':
      return false;
    case 'Tuesday':
      return false;
    default:
      return corrupt(day);
  }
};
```
