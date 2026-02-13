---
layout:
  title:
    visible: true
  description:
    visible: false
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
---

# Pattern Matching

The pattern matching module provides exhaustive branching helpers for unions and tagged unions.

## Exports

- `exhaustive`: exhaustive matching over literal unions and tagged unions.
- `exhaustive.tag`: exhaustive matching using an explicit tag key.
- `corrupt`: helper for unreachable/default branches in `switch` statements.

## exhaustive

Use `exhaustive` when all variants must be handled.

```typescript
import { exhaustive } from 'funkcia/pattern-matching';

type State = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

function message(state: State) {
  return exhaustive(state, {
    IDLE: () => 'Idle',
    LOADING: () => 'Loading',
    SUCCESS: () => 'Success',
    ERROR: () => 'Error',
  });
}
```

### Tagged unions with `_tag`

When the union has a `_tag` field, `exhaustive` matches by `_tag` automatically.

```typescript
import { TaggedError } from 'funkcia/exceptions';
import { exhaustive } from 'funkcia/pattern-matching';

class UserNotFoundError extends TaggedError('UserNotFoundError') {
  readonly userId: string;

  constructor(userId: string) {
    super(`User ${userId} was not found`);
    this.userId = userId;
  }
}

class InvalidCouponError extends TaggedError('InvalidCouponError') {
  readonly code: string;

  constructor(code: string) {
    super(`Coupon ${code} is invalid`);
    this.code = code;
  }
}

type CheckoutError = UserNotFoundError | InvalidCouponError;

function toStatus(error: CheckoutError) {
  return exhaustive(error, {
    UserNotFoundError: () => 404,
    InvalidCouponError: () => 422,
  });
}
```

### Fallback case

You can provide `_` as a runtime fallback.

```typescript
import { exhaustive } from 'funkcia/pattern-matching';

type Mode = 'ON' | 'OFF';

function toBool(mode: Mode) {
  return exhaustive(mode, {
    ON: () => true,
    OFF: () => false,
    _: () => false,
  });
}
```

## exhaustive.tag

Use `exhaustive.tag` when the discriminant key is not `_tag`.

```typescript
import { exhaustive } from 'funkcia/pattern-matching';

type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number };

function area(shape: Shape) {
  return exhaustive.tag(shape, 'kind', {
    circle: (value) => Math.PI * value.radius ** 2,
    square: (value) => value.size ** 2,
  });
}
```

## corrupt

Use `corrupt` in `switch` defaults to guard impossible branches.

```typescript
import { corrupt } from 'funkcia/pattern-matching';

type Role = 'ADMIN' | 'VIEWER';

function canWrite(role: Role) {
  switch (role) {
    case 'ADMIN':
      return true;
    case 'VIEWER':
      return false;
    default:
      return corrupt(role);
  }
}
```
