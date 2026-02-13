# Brand Module

Use `Brand` to prevent mixing semantically different primitives.

## Real-World Scenario

In a user onboarding flow, `userId` and `email` are both strings, and retry limits are plain numbers. Without branding, it is easy to swap fields or pass invalid retry counts.

## Define Branded Types and Parsers

```ts
import { Brand } from 'funkcia/brand';
import { TaggedError } from 'funkcia/exceptions';

type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;
type PositiveInteger = Brand<number, 'PositiveInteger'>;

class InvalidUserIdError extends TaggedError('InvalidUserIdError') {
  constructor(value: string) {
    super(`Invalid user id format: ${value}`);
  }
}

class InvalidEmailError extends TaggedError('InvalidEmailError') {
  constructor(value: string) {
    super(`Invalid email format: ${value}`);
  }
}

class InvalidPositiveIntegerError extends TaggedError('InvalidPositiveIntegerError') {
  constructor(value: number) {
    super(`Expected a positive integer, received: ${String(value)}`);
  }
}

export const UserId = Brand.of<UserId, InvalidUserIdError>(
  (value) => /^usr_[a-z0-9]{8,}$/i.test(value),
  (value) => new InvalidUserIdError(value),
);

export const Email = Brand.of<Email, InvalidEmailError>(
  (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  (value) => new InvalidEmailError(value),
);

export const PositiveInteger = Brand.of<PositiveInteger, InvalidPositiveIntegerError>(
  (value) => Number.isInteger(value) && value > 0,
  (value) => new InvalidPositiveIntegerError(value),
);
```

## Safe Parsing at API Boundary

```ts
import { Result } from 'funkcia';

function parseSignupInput(input: { userId: string; email: string; retryCount: string }) {
  return Result.use(function* () {
    const userId = yield* UserId.safeParse(input.userId);
    const email = yield* Email.safeParse(input.email.trim().toLowerCase());
    const retryCount = yield* PositiveInteger.safeParse(
      Number.parseInt(input.retryCount, 10),
    );

    return Result.ok({ userId, email, retryCount });
  });
}
```

## Use in Domain Services

```ts
function createWelcomeJob(userId: UserId, email: Email, maxRetries: PositiveInteger) {
  return jobs.enqueue({
    userId: Brand.unbrand(userId),
    email: Brand.unbrand(email),
    maxRetries: Brand.unbrand(maxRetries),
  });
}
```

## Unbrand Only at Integration Boundaries

```ts
const payload = {
  userId: Brand.unbrand(userId),
  email: Brand.unbrand(email),
  retryCount: Brand.unbrand(retryCount),
};
```

## Practical Guidelines

- Create one parser per brand.
- Use `.safeParse` for application flow; use `.parse` only when throwing is acceptable.
- Avoid `as Brand<...>` casts in application code; parse instead.
