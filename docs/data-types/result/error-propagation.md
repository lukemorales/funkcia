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

Evaluates a generator early returning when a `Result.Error` is propagated or returning the `Result` returned by the generator.

* Each `yield*` automatically unwraps the `Result` value or propagates `Error`s.
* If any operation returns `Result.Error`, the entire generator exits early.

<pre class="language-typescript" data-overflow="wrap"><code class="lang-typescript">import { Result } from 'funkcia';

declare const safeParseInt: (string: string, radix?: number) => Result<number, TypeError>;

//       ┌─── Result<number, TypeError>
//       ▼
const result = Result.use(function* () {
  const <a data-footnote-ref href="#user-content-fn-1">x</a> = yield* safeParseInt('10');
<strong>  const <a data-footnote-ref href="#user-content-fn-2">y</a> = yield* safeParseInt('invalid'); // breaks the circuit, returning Result.Error
</strong>
  return Result.ok(x + y); // doesn't run
});
// Output: Error(TypeError)
</code></pre>

#### createUse

Returns a function that evaluates a generator when called with the declared arguments, early returning when a `Result.Error` is propagated or returning the `Result` returned by the generator.

* Each `yield*` automatically unwraps the `Result` value or propagates `Error`.
* If any operation returns `Result.Error`, the entire generator exits early.

<pre class="language-typescript" data-overflow="wrap"><code class="lang-typescript">import { Result } from 'funkcia';

declare const safeParseInt: (string: string, radix?: number) => Result<number, TypeError>;

//           ┌─── (a: string, b: string) => Result<number, TypeError>
//           ▼
const sumParsedIntegers = Result.createUse(function* (a: string, b: string) {
  const <a data-footnote-ref href="#user-content-fn-1">x</a> = yield* safeParseInt(a);
  const <a data-footnote-ref href="#user-content-fn-2">y</a> = yield* safeParseInt(b);

  return Result.ok(x + y);
});

const result = sumParsedIntegers('10', '20');
// Output: Ok(30)
</code></pre>

### Understanding the use method

The `use` method provides a way to write sequential operations that might fail, similar to Rust's `?` operator. It lets you write code that looks synchronous while safely handling potential failures.

It essentially creates a "safe context" where you can work with values as if they were guaranteed to exist, while maintaining all the safety guarantees of `Result`. If anything fails, the failure propagates automatically. Like an electronic relay that controls current flow, ⁠relay controls computation flow: ⁠`Result.Ok` continues, ⁠`Result.Error` breaks the circuit.

Here's a practical example:

```typescript
import { Result } from 'funkcia';

declare function findUser(id: string): Result<User, UserNotFoundError>;
declare function getUserPermissions(user: User): Result<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): Result<Access, InsuficientPermissionsError>;

const access = Result.use(function* () {
  // First, try to find the user
  const user = yield* findUser('user_123');
  // If user is found (`findUser` returns `Result.Ok(User)`, get their permissions
  const permissions = yield* getUserPermissions(user);

  // If all steps succeed, we can use the accumulated context to check access to specific resource
  return checkAccess(permissions, 'api-key');
});
```

The equivalent code without `use` would be much more nested:

```typescript
import { Result } from 'funkcia';

declare function findUser(id: string): Result<User, UserNotFoundError>;
declare function getUserPermissions(user: User): Result<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): Result<Access, InsuficientPermissionsError>;

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
import { Result } from 'funkcia';

declare function findUser(id: string): Result<User, UserNotFoundError>;
declare function getUserPermissions(user: User): Result<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): Result<Access, InsuficientPermissionsError>;

const maybeUser = findUser('user_123');
const maybePermissions = maybeUser.andThen(getUserPermissions);

const access = maybePermissions.andThen(permissions => {
  return checkAccess(permissions, 'api-key');
});
```
{% endcode %}



[^1]: const x: number

[^2]: const y: number
