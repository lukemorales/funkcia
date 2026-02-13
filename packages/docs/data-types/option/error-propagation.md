---
icon: sparkles
---

# Error Propagation

Funkcia offers a concise and convenient way to write your code in a more imperative style that utilizes the native scope provided by the generator syntax. This syntax is more linear and resembles normal synchronous code.

Drawing primarily from Rust's `?` operator for error propagation, and inspired by Gleam's [`use` expressions](https://gleam.run/news/v0.25-introducing-use-expressions/), [neverthrow's `safeTry`](https://github.com/supermacro/neverthrow?tab=readme-ov-file#safetry), and [Effect's `gen`](https://effect.website/docs/getting-started/using-generators/#_top) functions, the following functions provide a clean way to handle sequential operations while maintaining proper error handling and type safety.

#### use

Evaluates a generator early returning when an `Option.None` is propagated or returning the `Option` returned by the generator.

* Each `yield*` automatically unwraps the `Option` value or propagates `None`.
* If any operation returns `Option.None`, the entire generator exits early.

<pre class="language-typescript" data-overflow="wrap"><code class="lang-typescript">import { Option } from 'funkcia';

declare const safeParseInt: (string: string, radix?: number) => Option&#x3C;number>;

//       ┌─── Option&#x3C;number>
//       ▼
const option = Option.use(function* () {
  const x: number = yield* safeParseInt('10');
<strong>  const y: number = yield* safeParseInt('invalid'); // breaks the circuit, returning Option.None
</strong>
  return Option.some(x + y); // doesn't run
});
// Output: None
</code></pre>

#### fn

Returns a function that evaluates a generator when called with the declared arguments, early returning when an `Option.None` is propagated or returning the `Option` returned by the generator.

* Each `yield*` automatically unwraps the `Option` value or propagates `None`.
* If any operation returns `Option.None`, the entire generator exits early.

{% code overflow="wrap" %}
```typescript
import { Option } from 'funkcia';

declare const safeParseInt: (string: string, radix?: number) => Option<number>;

//           ┌─── (a: string, b: string) => Option<number>
//           ▼
const sumParsedIntegers = Option.fn(function* (a: string, b: string) {
  const x: number = yield* safeParseInt(a);
  const y: number = yield* safeParseInt(b);

  return Option.some(x + y);
});

const option = sumParsedIntegers('10', '20');
// Output: Some(30)
```
{% endcode %}

### Understanding the use method

The `use` method provides a way to write sequential operations that might fail, similar to Rust's `?` operator. It lets you write code that looks synchronous while safely handling potential failures.

It essentially creates a "safe context" where you can work with values as if they were guaranteed to exist, while maintaining all the safety guarantees of `Option`. If anything fails, the failure propagates automatically. Like an electronic relay that controls current flow, ⁠relay controls computation flow: ⁠`Option.Some` continues, ⁠`Option.None` breaks the circuit.

Here's a practical example:

<pre class="language-typescript"><code class="lang-typescript">import { Option } from 'funkcia';

declare function findUser(id: string): Option&#x3C;User>;
declare function getUserPermissions(user: User): Option&#x3C;Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): Option&#x3C;Access>;

const access = Option.use(function* () {
  // First, try to find the user
  const <a data-footnote-ref href="#user-content-fn-1">user</a> = yield* findUser('user_123');
  // If user is found (`findUser` returns `Option.Some(User)`, get their permissions
  const permissions = yield* getUserPermissions(user);

  // If all steps succeed, we can use the accumulated context to check access to specific resource
  return checkAccess(permissions, 'api-key');
});
</code></pre>

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

[^1]: user: User
