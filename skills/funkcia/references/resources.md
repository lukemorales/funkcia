# Resources

Use `ResultAsync.resource` to wrap shared clients (database, external APIs, queues) so operations consistently return `ResultAsync<Output, ResourceError>`.

## Why Use Resource Wrappers

- Centralize failure mapping for a client.
- Guarantee non-throwing call sites.
- Keep service code focused on business logic with generator style.

## Database Resource Wrapper

```ts
import { ResultAsync } from 'funkcia';
import { TaggedError } from 'funkcia/exceptions';

class DatabaseResourceError extends TaggedError('DatabaseResourceError') {
  constructor(cause: unknown) {
    super('Database operation failed', { cause });
  }
}

const dbResource = ResultAsync.resource(
  prisma,
  (cause) => new DatabaseResourceError(cause),
);

export function findOrder(orderId: string) {
  return dbResource.run((db) =>
    db.order.findUniqueOrThrow({
      where: { id: orderId },
    }),
  );
}
// ResultAsync<Order, DatabaseResourceError>
```

## API Client Resource Wrapper

```ts
import { ResultAsync } from 'funkcia';
import { TaggedError } from 'funkcia/exceptions';

class BillingApiError extends TaggedError('BillingApiError') {
  constructor(cause: unknown) {
    super('Billing API request failed', { cause });
  }
}

const billingResource = ResultAsync.resource(
  billingClient,
  (cause) => new BillingApiError(cause),
);

export function fetchInvoice(invoiceId: string) {
  return billingResource.run((api) => api.invoices.get(invoiceId));
}
// ResultAsync<Invoice, BillingApiError>
```

## Compose Resources with Generators

```ts
type CheckoutResourceError = DatabaseResourceError | BillingApiError;

function getCheckoutStatus(orderId: string): ResultAsync<CheckoutStatus, CheckoutResourceError> {
  return ResultAsync.use(async function* () {
    const order = yield* findOrder(orderId);
    const invoice = yield* fetchInvoice(order.invoiceId);

    return ResultAsync.ok({
      orderId: order.id,
      paymentStatus: invoice.status,
      amount: invoice.total,
    });
  });
}
```

## Team Pattern: Resource Modules

Wrap each infrastructure dependency once and export typed operations from that module:

- `infra/database-resource.ts` exports `findOrder`, `createOrder`, `updatePaymentStatus`
- `infra/billing-resource.ts` exports `fetchInvoice`, `createCharge`, `refundCharge`

Each exported operation returns `ResultAsync<ExpectedOutput, PredefinedResourceError>`.

## Practical Rules

- Define one resource-level error class per dependency (`DatabaseResourceError`, `BillingApiError`).
- Convert resource throws/rejections inside `ResultAsync.resource`, not at every callsite.
- Keep domain validation separate; use `Result.fromNullable`, `Result.predicate`, or custom domain errors after resource calls.

