---
icon: sparkles
---

# Error Propagation

Funkcia offers a concise and convenient way to write your code in a more imperative style that utilizes the native scope provided by the generator syntax. This syntax is more linear and resembles normal synchronous code.

Drawing primarily from Rust's `?` operator for error propagation, and inspired by Gleam's [`use` expressions](https://gleam.run/news/v0.25-introducing-use-expressions/), [neverthrow's `safeTry`](https://github.com/supermacro/neverthrow?tab=readme-ov-file#safetry), and [Effect's `gen`](https://effect.website/docs/getting-started/using-generators/#_top) functions, the following functions provide a clean way to handle sequential operations while maintaining proper error handling and type safety.

#### use

Evaluates an _async_ generator early returning when an `Option.None` is propagated or returning the `OptionAsync` returned by the generator.

* Each `yield*` automatically awaits and unwraps the `OptionAsync` value or propagates `None`.
* If any operation resolves to `Option.None`, the entire generator exits early.

<pre class="language-typescript" data-overflow="wrap"><code class="lang-typescript">import { OptionAsync } from 'funkcia';

declare const safeReadFile: (path: string) => OptionAsync<string>;
declare const safeWriteFile: (path: string, content: string) => OptionAsync<string>;

//          ┌─── OptionAsync<string>
//          ▼
const mergedContent = OptionAsync.use(async function* () {
  const <a data-footnote-ref href="#user-content-fn-1">fileA</a> = yield* safeReadFile('data.txt');
  const <a data-footnote-ref href="#user-content-fn-2">fileB</a> = yield* safeReadFile('non-existent-file.txt'); // returns OptionAsync.None immediately

  return safeWriteFile('output.txt', `${fileA}\n${fileB}`); // doesn't run
});
// Output: Promise<None>
</code></pre>

#### fn

Returns a function that evaluates an _async_ generator when called with the defined arguments, early returning when an `Option.None` is propagated or returning the `OptionAsync` returned by the generator.

* Each `yield*` automatically awaits and unwraps the `OptionAsync` value or propagates `None`.
* If any operation resolves to `Option.None`, the entire generator exits early.

<pre class="language-typescript"><code class="lang-typescript">import { OptionAsync } from 'funkcia';

declare const safeReadFile: (path: string) => OptionAsync<string>;
declare const safeWriteFile: (path: string, content: string) => OptionAsync<string>;

//          ┌─── (output: string, pathA: string, pathB: string) => OptionAsync<string>
//          ▼
const safeMergeFiles = OptionAsync.fn(async function* (output: string, pathA: string, pathB: string) {
  const <a data-footnote-ref href="#user-content-fn-1">fileA</a> = yield* safeReadFile(pathA);
  const <a data-footnote-ref href="#user-content-fn-2">fileB</a> = yield* safeReadFile(pathB);

  return safeWriteFile(output, `${fileA}\n${fileB}`);
});

const mergedContent = safeMergeFiles('output.txt', 'data.txt', 'updated-data.txt');
// Output: Promise<Some('[ERROR] Failed to connect\n[INFO] Connection restored')>
</code></pre>

### Understanding the use method

The `use` method provides a way to write sequential operations that might fail, similar to Rust's `?` operator. It lets you write code that looks synchronous while safely handling potential failures.

It essentially creates a "safe context" where you can work with values as if they were guaranteed to exist, while maintaining all the safety guarantees of `OptionAsync`. If anything fails, the failure propagates automatically. Like an electronic relay that controls current flow, ⁠relay controls computation flow: ⁠`Option.Some` continues, ⁠`Option.None` breaks the circuit.

Here's a practical example:

```typescript
import { OptionAsync } from 'funkcia';

declare function findUser(id: string): OptionAsync<User>;
declare function getUserPermissions(user: User): OptionAsync<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): OptionAsync<Access>;

const access = OptionAsync.use(async function* () {
  // First, try to find the user
  const user = yield* findUser('user_123');
  // If user is found (`findUser` returns `OptionAsync.Some(User)`, get their permissions
  const permissions = yield* getUserPermissions(user);

  // If all steps succeed, we can use the accumulated context to check access to specific resource
  return checkAccess(permissions, 'api-key');
});
```

The equivalent code without `use` would be much more nested:

```typescript
import { Option } from 'funkcia';

declare function findUser(id: string): Option<User>;
declare function getUserPermissions(user: User): Option<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): Option<Access>;

const access = findUser('user_123')
  .andThen(user =>
    getUserPermissions(user)
      .andThen(permissions =>
        checkAccess(permissions, 'api-key')
      )
  );
```

Or with intermediate variables:

{% code fullWidth="false" %}
```typescript
import { Option } from 'funkcia';

declare function findUser(id: string): Option<User>;
declare function getUserPermissions(user: User): Option<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): Option<Access>;

const maybeUser = findUser('user_123');
const maybePermissions = maybeUser.andThen(getUserPermissions);

const access = maybePermissions.andThen(permissions => {
  return checkAccess(permissions, 'api-key');
});
```
{% endcode %}



[^1]: const fileA: string

[^2]: const fileB: string
