# Safe Functions

Use safe wrappers to avoid uncaught runtime exceptions in request pipelines.

## SafeJSON

`SafeJSON.parse` and `SafeJSON.stringify` return `Result` values instead of throwing.

### Real-World Example: ingest webhook payload

```ts
import { Result } from 'funkcia';
import { SafeJSON } from 'funkcia/json';

function parseWebhookBody(rawBody: string) {
  const ensureObject = Result.predicate(
    (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null,
    () => new Error('Webhook body must be an object'),
  );

  return Result.use(function* () {
    const parsed = yield* SafeJSON.parse(rawBody);
    const body = yield* ensureObject(parsed);

    return Result.ok(body);
  });
}
```

## SafeURI

`SafeURI` wraps URI encoding/decoding operations in `Result`.

### Real-World Example: build search query parameter

```ts
import { SafeURI } from 'funkcia/uri';

function encodeSearchQuery(query: string) {
  return SafeURI.encodeURIComponent(query.trim());
}
```

### Real-World Example: decode redirect parameter safely

```ts
import { SafeURI } from 'funkcia/uri';

function decodeRedirectTarget(input: string) {
  return SafeURI.decodeURIComponent(input);
}
```

## SafeURL

`SafeURL.of` wraps `new URL(...)` in `Result<URL, TypeError>`.

### Real-World Example: validate callback URL

```ts
import { Result } from 'funkcia';
import { SafeURL } from 'funkcia/url';

function parseCallbackUrl(raw: string, base: string) {
  return SafeURL.of(raw, base).filter(
    (url) => url.protocol === 'https:',
    () => new Error('Callback URL must use HTTPS'),
  );
}
```

## Composition Example

```ts
import { SafeJSON } from 'funkcia/json';
import { SafeURI } from 'funkcia/uri';
import { SafeURL } from 'funkcia/url';

function buildPaymentRedirect(rawConfig: string, customerEmail: string) {
  return Result.use(function* () {
    const config = yield* SafeJSON.parse(rawConfig);
    const baseUrl = yield* SafeURL.of(String((config as any).baseUrl));
    const encodedEmail = yield* SafeURI.encodeURIComponent(customerEmail);

    baseUrl.searchParams.set('email', encodedEmail);
    return Result.ok(baseUrl.toString());
  });
}
```
