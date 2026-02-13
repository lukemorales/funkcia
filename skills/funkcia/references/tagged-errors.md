# Tagged Errors

Use `TaggedError` to represent application failures as explicit, typed values.

## Why Tagged Errors

- Keep domain failures predictable and inspectable.
- Avoid stringly-typed error handling.
- Preserve root causes for infrastructure failures.

## Defining Domain Errors

```ts
import { TaggedError } from 'funkcia/exceptions';

export class UserNotFoundError extends TaggedError('UserNotFoundError') {
  readonly userId: string;

  constructor(userId: string) {
    super(`User ${userId} was not found`);
    this.userId = userId;
  }
}

export class InvalidCouponError extends TaggedError('InvalidCouponError') {
  readonly code: string;

  constructor(code: string) {
    super(`Coupon "${code}" is invalid or expired`);
    this.code = code;
  }
}

export class PaymentGatewayError extends TaggedError('PaymentGatewayError') {
  readonly gateway: 'stripe' | 'polar';

  constructor(gateway: 'stripe' | 'polar', cause: unknown) {
    super(`Payment gateway request failed for ${gateway}`, { cause });
    this.gateway = gateway;
  }
}
```

## Use in `Result` / `ResultAsync`

```ts
import { Result, ResultAsync } from 'funkcia';

type CheckoutError =
  | UserNotFoundError
  | InvalidCouponError
  | PaymentGatewayError;

function loadUser(userId: string): Result<User, UserNotFoundError> {
  return Result.fromNullable(
    users.get(userId),
    () => new UserNotFoundError(userId),
  );
}

function validateCoupon(code: string): Result<Coupon, InvalidCouponError> {
  return Result.use(function* () {
    const normalizedCode = yield* Result.fromFalsy(
      code.trim(),
      () => new InvalidCouponError(code),
    );

    const coupon = yield* Result.fromNullable(
      coupons.get(normalizedCode),
      () => new InvalidCouponError(normalizedCode),
    );

    return Result.ok(coupon);
  });
}

function charge(
  gateway: 'stripe' | 'polar',
  input: ChargeInput,
): ResultAsync<ChargeReceipt, PaymentGatewayError> {
  return ResultAsync.use(async function* () {
    const receipt = yield* ResultAsync.try(
      () => paymentClient[gateway].charge(input),
      (cause) => new PaymentGatewayError(gateway, cause),
    );

    return ResultAsync.ok(receipt);
  });
}
```

## Match Errors Exhaustively

```ts
import { exhaustive } from 'funkcia/exhaustive';

const response = result.match({
  Ok(value) {
    return { status: 200, body: value };
  },
  Error(error) {
    return exhaustive(error, {
      UserNotFoundError: (err) => ({
        status: 404,
        body: { code: err._tag, userId: err.userId },
      }),
      InvalidCouponError: (err) => ({
        status: 422,
        body: { code: err._tag, coupon: err.code },
      }),
      PaymentGatewayError: (err) => ({
        status: 502,
        body: { code: err._tag },
      }),
    });
  },
});
```

## Global Tagged Error Guard

```ts
import { TaggedError } from 'funkcia/exceptions';

function logFailure(error: unknown) {
  if (TaggedError.is(error)) {
    logger.error({ tag: error._tag, message: error.message });
    return;
  }

  logger.error({ tag: 'UnknownError', value: String(error) });
}
```

## Practical Guidelines

- Prefer one class per business failure category.
- Include operational context as readonly fields (`userId`, `gateway`, `orderId`).
- Preserve the original cause on infrastructure wrappers.
- Return typed errors in `Result` signatures; do not return `string` errors.
