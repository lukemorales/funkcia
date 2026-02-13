# Do Notation

A `do notation` syntax allows writing code in a more declarative style, similar to the `do notation` in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`, piping the returned values into a context object.

#### Do

Initiates a `do notation` for the `ResultAsync` type.

<pre class="language-typescript"><code class="lang-typescript">import { ResultAsync } from 'funkcia';

declare function findUserById(id: string): ResultAsync&#x3C;User, UserNotFound>;
declare function calculateUserScore(user: User): ResultAsync&#x3C;UserScore, UserNotScored>;
declare function rankUserLevel(user: User, score: UserScore): ResultAsync&#x3C;UserLevel, InvalidRanking>;

//        ┌─── ResultAsync&#x3C;UserLevel, UserNotFound | UserNotScored | InvalidRanking>
//        ▼
const userLevel = ResultAsync.Do
  .bind('user', () => findUserById('user_123'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => calculateUserScore(ctx.user))
  .map((ctx) => rankUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### bindTo

Initiates a `do notation` with the current `ResultAsync`, binding it to a context object with the provided key.

<pre class="language-typescript"><code class="lang-typescript">import { ResultAsync } from 'funkcia';

declare function findUserById(id: string): ResultAsync&#x3C;User, UserNotFound>;
declare function calculateUserScore(user: User): ResultAsync&#x3C;UserScore, UserNotScored>;
declare function rankUserLevel(user: User, score: UserScore): ResultAsync&#x3C;UserLevel, InvalidRanking>;

//        ┌─── ResultAsync&#x3C;UserLevel, UserNotFound | UserNotScored | InvalidRanking>
//        ▼
const userLevel = findUserById('user_123')
<strong>  .bindTo('user')
</strong>  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => calculateUserScore(ctx.user))
  .map((ctx) => rankUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### bind

Binds an `ResultAsync` to the context object in a `do notation`.

If the `ResultAsync` is `Ok`, the value is assigned to the key in the context object. If the `ResultAsync` is `Error`, the parent `ResultAsync` running the `Do` simulation becomes an `Error`.

<pre class="language-typescript"><code class="lang-typescript">import { ResultAsync } from 'funkcia';

declare function findUserById(id: string): ResultAsync&#x3C;User, UserNotFound>;
declare function calculateUserScore(user: User): ResultAsync&#x3C;UserScore, UserNotScored>;
declare function rankUserLevel(user: User, score: UserScore): ResultAsync&#x3C;UserLevel, InvalidRanking>;

//        ┌─── ResultAsync&#x3C;UserLevel, UserNotFound | UserNotScored | InvalidRanking>
//        ▼
const userLevel = ResultAsync.Do
  .bind('user', () => findUserById('user_123'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => calculateUserScore(ctx.user))
  .map((ctx) => rankUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### let

{% hint style="warning" %}
Ensure you know what you're doing when binding a promise using `let`, otherwise a thrown exception will not be caught and break your app
{% endhint %}

Binds non-rejecting promise to the context object in a `do notation`.

```typescript
import { ResultAsync } from 'funkcia';

//      ┌─── ResultAsync<number, never>
//      ▼
const result = ResultAsync.Do
  .let('subtotal', () => Promise.resolve(120))
//               ┌─── { subtotal: number }
//               ▼
  .let('tax', (ctx) => Promise.resolve(ctx.subtotal * 0.08))
  .map((ctx) => ctx.subtotal + ctx.tax);
//      ▲
//      └─── { subtotal: number; tax: number }
```

### Understanding the do notation

Do notation provides a clean way to handle sequences of operations that might fail, where each step depends on the success of all previous steps. Think of it as a chain of dominoes - if any domino falls incorrectly (returns `None`), the entire sequence stops.

Here's a practical example:

```ts
import { ResultAsync } from 'funkcia';

declare function findUser(id: string): ResultAsync<User, UserNotFound>;
declare function getUserPermissions(user: User): ResultAsync<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): ResultAsync<Access, InsuficientPermissionsError>;

const access = ResultAsync.Do
  // First, try to find the user
  .bind('user', () => findUser('user_123'))
  // If user is found, get their permissions
  .bind('permissions', (ctx) => getUserPermissions(ctx.user))
  // If all steps succeed, we can use the accumulated context to check access to specific resource
  .andThen((ctx) => checkAccess(ctx.permissions, 'api-key'));
```

The equivalent code would be much more nested:

```ts
import { ResultAsync } from 'funkcia';

declare function findUser(id: string): ResultAsync<User, UserNotFound>;
declare function getUserPermissions(user: User): ResultAsync<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): ResultAsync<Access, InsuficientPermissionsError>;

const access = findUser('user_123')
  .andThen(user =>
    getUserPermissions(user)
      .andThen(permissions =>
        checkAccess(permissions, 'api-key')
      )
  );
```

Or with intermediate variables:

```ts
import { ResultAsync } from 'funkcia';

declare function findUser(id: string): ResultAsync<User, UserNotFound>;
declare function getUserPermissions(user: User): ResultAsync<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): ResultAsync<Access, InsuficientPermissionsError>;

const user = findUser('user_123');
const permissions = user.andThen(getUserPermissions);

const access = permissions.andThen(permissions => {
  return checkAccess(permissions, 'admin-panel');
});
```

[^1]: (parameter) ctx: {\
    readonly user: User;\
    }
