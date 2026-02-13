# Generators (Preferred Style)

`Result.use`, `Option.use`, `ResultAsync.use`, and `OptionAsync.use` are the preferred style for multi-step application flows.

## Why Prefer Generators

- Reads top-to-bottom like imperative code.
- Preserves full type inference for propagated failures.
- Avoids deeply nested `andThen` chains.

## Result.use (sync)

```ts
import { Result } from 'funkcia';

function buildInvoiceSummary(orderId: string) {
  return Result.use(function* () {
    const order = yield* Result.fromNullable(
      orderStore.get(orderId),
      () => new Error(`Order ${orderId} not found`),
    );

    const customer = yield* Result.fromNullable(
      customerStore.get(order.customerId),
      () => new Error(`Customer ${order.customerId} not found`),
    );

    return Result.ok({
      orderId: order.id,
      customerEmail: customer.email,
      total: order.total,
    });
  });
}
```

## Option.use (sync)

```ts
import { Option } from 'funkcia';

function findUserAvatar(userId: string) {
  return Option.use(function* () {
    const user = yield* Option.fromNullable(userRepo.get(userId));
    const profile = yield* Option.fromNullable(user.profile);
    const avatar = yield* Option.fromNullable(profile.avatarUrl);

    return Option.some(avatar);
  });
}
```

## ResultAsync.use (async)

```ts
import { ResultAsync } from 'funkcia';

function prepareShipment(orderId: string) {
  return ResultAsync.use(async function* () {
    const order = yield* ResultAsync.try(
      () => shippingApi.fetchOrder(orderId),
      () => new Error(`Failed to fetch order ${orderId}`),
    );

    const label = yield* ResultAsync.try(
      () => shippingApi.createLabel(order),
      () => new Error(`Failed to create label for order ${order.id}`),
    );

    return ResultAsync.ok(label);
  });
}
```

## OptionAsync.use (async)

```ts
import { OptionAsync } from 'funkcia';

function getFeatureFlags(userId: string) {
  return OptionAsync.use(async function* () {
    const user = yield* OptionAsync.try(() => cache.getUser(userId));
    const org = yield* OptionAsync.try(() => cache.getOrg(user.orgId));
    const flags = yield* OptionAsync.fromNullable(org.featureFlags);

    return OptionAsync.some(flags);
  });
}
```

## Guidelines

- Use `yield*` for every `Option*` / `Result*` step.
- Return `Result.ok(...)`, `Option.some(...)`, `ResultAsync.ok(...)`, or `OptionAsync.some(...)` from the generator.
- Use `fromNullable` / `fromFalsy` inside `use` to normalize boundary data early.
