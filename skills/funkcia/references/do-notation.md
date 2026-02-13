# Do Notation

Use `Result.Do` / `Option.Do` when you need to accumulate named context values (`bind`, `let`, `bindTo`) across steps.

For most business flows, prefer generator style in `references/generators.md`.  
Use `Do` when the intermediate context object itself is the point.

## Result.Do for Context Accumulation

```ts
import { Result } from 'funkcia';

function buildCheckoutContext(userId: string) {
  return Result.Do
    .bind('user', () =>
      Result.fromNullable(
        userStore.get(userId),
        () => new Error(`User ${userId} not found`),
      ),
    )
    .bind('cart', (ctx) =>
      Result.fromNullable(
        cartStore.getActiveByUser(ctx.user.id),
        () => new Error(`Active cart not found for user ${ctx.user.id}`),
      ),
    )
    .bind('shippingAddress', (ctx) =>
      Result.fromNullable(
        addressStore.getDefaultForUser(ctx.user.id),
        () => new Error(`Default address not found for user ${ctx.user.id}`),
      ),
    )
    .bind('shippingQuote', (ctx) =>
      Result.fromNullable(
        shippingService.quote({
          items: ctx.cart.items,
          destinationZip: ctx.shippingAddress.zipCode,
        }),
        () => new Error(`Failed to quote shipping for user ${ctx.user.id}`),
      ),
    )
    .let('subtotal', (ctx) => ctx.cart.items.reduce((acc, item) => acc + item.total, 0))
    .let('tax', (ctx) => ctx.subtotal * 0.08)
    .let('total', (ctx) => ctx.subtotal + ctx.tax + ctx.shippingQuote.amount);
}
```

## Option.Do for Optional Context

```ts
import { Option } from 'funkcia';

function buildPublicProfile(userId: string) {
  return Option.Do
    .bind('user', () => Option.fromNullable(userRepo.get(userId)))
    .bind('profile', (ctx) => Option.fromNullable(ctx.user.profile))
    .bind('organization', (ctx) => Option.fromNullable(orgRepo.get(ctx.user.orgId)))
    .let('displayName', (ctx) => `${ctx.profile.firstName} ${ctx.profile.lastName}`)
    .let('avatar', (ctx) => ctx.profile.avatarUrl ?? '/default-avatar.png')
    .let('organizationName', (ctx) => ctx.organization.name);
}
```

## bindTo for Existing Values

```ts
import { Result } from 'funkcia';

function enrichSession(sessionToken: string) {
  return Result.fromNullable(sessionStore.get(sessionToken), () => new Error('Session missing'))
    .bindTo('session')
    .bind('user', (ctx) =>
      Result.fromNullable(userStore.get(ctx.session.userId), () => new Error('User missing')),
    )
    .bind('permissions', (ctx) =>
      Result.fromNullable(
        permissionsStore.getByRole(ctx.user.role),
        () => new Error(`Permissions missing for role ${ctx.user.role}`),
      ),
    );
}
```

## When to Choose `Do` vs `use`

- Choose `use` when you care about linear control flow and final output.
- Choose `Do` when you need a typed context object with many named intermediates.
- Do not mix styles in the same function unless it clearly improves readability.
