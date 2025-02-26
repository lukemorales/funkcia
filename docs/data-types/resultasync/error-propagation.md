---
icon: sparkles
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

# Error Propagation

Funkcia offers a concise and convenient way to write your code in a more imperative style that utilizes the native scope provided by the generator syntax. This syntax is more linear and resembles normal synchronous code.

Drawing primarily from Rust's `?` operator for error propagation, and inspired by Gleam's [`use` expressions](https://gleam.run/news/v0.25-introducing-use-expressions/), [neverthrow's `safeTry`](https://github.com/supermacro/neverthrow?tab=readme-ov-file#safetry), and [Effect's `gen`](https://effect.website/docs/getting-started/using-generators/#_top) functions, the following functions provide a clean way to handle sequential operations while maintaining proper error handling and type safety.

#### use

Evaluates an _async_ generator early returning when a `Result.Error` is propagated or returning the `ResultAsync` returned by the generator.

* Each `yield*` automatically awaits and unwraps the `ResultAsync` value or propagates `Error`.
* If any operation resolves to `Result.Error`, the entire generator exits early.

<pre class="language-typescript" data-overflow="wrap"><code class="lang-typescript">import { ResultAsync } from 'funkcia';

declare const safeReadFile: (path: string) => ResultAsync<string, NodeFSError>;
declare const safeWriteFile: (path: string, content: string) => ResultAsync<string, NodeFSError>;

//          ┌─── ResultAsync<string, NodeFSError>
//          ▼
const mergedContent = ResultAsync.use(async function* () {
  const <a data-footnote-ref href="#user-content-fn-1">fileA</a> = yield* safeReadFile('data.txt');
<strong>  const <a data-footnote-ref href="#user-content-fn-2">fileB</a> = yield* safeReadFile('non-existent-file.txt'); // returns ResultAsync.Error immediately
</strong>
  return safeWriteFile('output.txt', `${fileA}\n${fileB}`); // doesn't run
});
// Output: Promise<Error(NodeFSError)>
</code></pre>

#### createUse

Returns a function that evaluates an _async_ generator when called with the defined arguments, early returning when a `Result.Error` is propagated or returning the `ResultAsync` returned by the generator.

* Each `yield*` automatically awaits and unwraps the `ResultAsync` value or propagates `Error`.
* If any operation resolves to `Result.Error`, the entire generator exits early.

<pre class="language-typescript"><code class="lang-typescript">import { ResultAsync } from 'funkcia';

declare const safeReadFile: (path: string) => ResultAsync<string, NodeFSError>;
declare const safeWriteFile: (path: string, content: string) => ResultAsync<string, NodeFSError>;

//          ┌─── (output: string, pathA: string, pathB: string) => ResultAsync<string, NodeFSError>
//          ▼
const safeMergeFiles = ResultAsync.createUse(async function* (output: string, pathA: string, pathB: string) {
  const <a data-footnote-ref href="#user-content-fn-1">fileA</a> = yield* safeReadFile(pathA);
  const <a data-footnote-ref href="#user-content-fn-2">fileB</a> = yield* safeReadFile(pathB);

  return safeWriteFile(output, `${fileA}\n${fileB}`);
});

const mergedContent = safeMergeFiles('output.txt', 'data.txt', 'updated-data.txt');
// Output: Promise<Ok('[ERROR] Failed to connect\n[INFO] Connection restored')>

</code></pre>

### Understanding the use method

The `use` method provides a way to write sequential operations that might fail, similar to Rust's `?` operator. It lets you write code that looks synchronous while safely handling potential failures.

It essentially creates a "safe context" where you can work with values as if they were guaranteed to exist, while maintaining all the safety guarantees of `AsyncResult`. If anything fails, the failure propagates automatically. Like an electronic relay that controls current flow, ⁠relay controls computation flow: ⁠`Result.Ok` continues, ⁠`Result.Error` breaks the circuit.

Here's a practical example:

```typescript
import { ResultAsync } from 'funkcia';

declare function rateLimit(clientId: ClientId, ip: IpAddress): ResultAsync<ClientId, RateLimitError>;
declare function findUserByEmail(email: Email): ResultAsync<User, UserNotFoundError>;

const userPreferences = ResultAsync.use(function* () {
  // First, check if API rate limit is allowed
  yield* rateLimit(req.headers['x-client-id'], req.ip);
  // If rate-limit is not blocked, get the user
  const user = yield* findUserByEmail(req.query.email);

  // If all steps succeed, we can use the accumulated context to get user preferences
  return ResultAsync.ok(user.preferences);
});
```

The equivalent code without `use` would be much more nested:

```typescript
import { ResultAsync } from 'funkcia';

declare function rateLimit(clientId: ClientId, ip: IpAddress): ResultAsync<ClientId, RateLimitError>;
declare function findUserByEmail(email: Email): ResultAsync<User, UserNotFoundError>;

const userPreferences = rateLimit(req.headers['x-client-id'], req.ip)
  .andThen(() =>
    findUserByEmail(req.query.email)
      .map(user => user.preferences)
  );
```

Or with intermediate variables:

{% code fullWidth="false" %}
```typescript
import { ResultAsync } from 'funkcia';

declare function rateLimit(clientId: ClientId, ip: IpAddress): ResultAsync<ClientId, RateLimitError>;
declare function findUserByEmail(email: Email): ResultAsync<User, UserNotFoundError>;

const rateLimitResult = rateLimit(req.headers['x-client-id'], req.ip);
const user = rateLimitResult.andThen(() => findUserByEmail(req.query.email));

const userPreferences = user.map(user => user.preferences);
```
{% endcode %}



[^1]: const fileA: string

[^2]: const fileB: string
