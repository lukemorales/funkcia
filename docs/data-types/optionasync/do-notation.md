# Do Notation

A `do notation` syntax allows writing code in a more declarative style, similar to the `do notation` in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`, piping the returned values into a context object.

#### Do

Initiates a `Do-notation` for the `AsyncOption` type.

<pre class="language-typescript"><code class="lang-typescript">import { AsyncOption } from 'funkcia';

declare function findUserById(id: string): AsyncOption<User>;
declare function calculateUserScore(user: User): AsyncOption<UserScore>;
declare function rankUserLevel(user: User, score: UserScore): AsyncOption<UserLevel>;

//        ┌─── AsyncOption<UserLevel>
//        ▼
const userLevel = AsyncOption.Do
  .bind('user', () => findUserById('user_123'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => calculateUserScore(ctx.user))
  .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
//           ▲
//           └─── { user: User; score: UserScore }
</code></pre>

#### bindTo

Initiates a `Do-notation` with the current `AsyncOption`, binding it to a context object with the provided key.

<pre class="language-typescript"><code class="lang-typescript">import { AsyncOption } from 'funkcia';

declare function findUserById(id: string): AsyncOption<User>;
declare function calculateUserScore(user: User): AsyncOption<UserScore>;
declare function rankUserLevel(user: User, score: UserScore): AsyncOption<UserLevel>;

//        ┌─── AsyncOption<UserLevel>
//        ▼
const userLevel = findUserById('user_123')
<strong>  .bindTo('user')
</strong>  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => getUserScore(ctx.user))
  .andThen((ctx) => getUserLevel(ctx.user, ctx.score));
//           ▲
//           └─── { user: User; score: UserScore }
</code></pre>

#### bind

Binds an `AsyncOption` to the context object in a `Do-notation`.

If the `AsyncOption` resolves to `Some`, the value is assigned to the key in the context object. If the `AsyncOption` resolves to `None`, the parent `AsyncOption` running the `Do` simulation becomes a `None`.

<pre class="language-typescript"><code class="lang-typescript">import { AsyncOption } from 'funkcia';

declare function findUserById(id: string): AsyncOption<User>;
declare function calculateUserScore(user: User): AsyncOption<UserScore>;
declare function rankUserLevel(user: User, score: UserScore): AsyncOption<UserLevel>;

//        ┌─── AsyncOption<UserLevel>
//        ▼
const userLevel = AsyncOption.Do
  .bind('user', () => findUserById('user_123'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => calculateUserScore(ctx.user))
  .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
//           ▲
//           └─── { user: User; score: UserScore }
</code></pre>

#### let

{% hint style="warning" %}
Ensure you know what you're doing when binding a promise using `let`, otherwise a thrown exception will not be caught and break your app
{% endhint %}

Binds a non-rejecting promise to the context object in a `do notation`.

If the promise resolves to a non-nullable value, the value is assigned to the key in the context object. If the promise resolves to `null` or `undefined`, the parent `AsyncOption` running the `Do` simulation becomes a `None`.

<pre class="language-typescript"><code class="lang-typescript">import { AsyncOption } from 'funkcia';

const option = AsyncOption.Do
  .let('a', () => 10)
  .let('b', (<a data-footnote-ref href="#user-content-fn-2">ctx</a>) => Promise.resolve(ctx.a * 2))
  .map((ctx) => a + b);
//       ▲
//       └─── { a: number; b: number }
</code></pre>

### Understanding the do notation

Do notation provides a clean way to handle sequences of operations that might fail, where each step depends on the success of all previous steps. Think of it as a chain of dominoes - if any domino falls incorrectly (resolves to `Option.None`), the entire sequence stops.

Here's a practical example:

```typescript
import { AsyncOption } from 'funkcia';

declare function findUser(id: string): AsyncOption<User>;
declare function getUserPermissions(user: User): AsyncOption<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): AsyncOption<Access>;

const access = AsyncOption.Do
  // First, try to find the user
  .bind('user', () => findUser('user_123'))
  // If user is found, get their permissions
  .bind('permissions', (ctx) => getUserPermissions(ctx.user))
  // If all steps succeed, we can use the accumulated context to check access to specific resource
  .andThen((ctx) => checkAccess(ctx.permissions, 'api-key'));
```

The equivalent code would be much more nested:

```typescript
import { AsyncOption } from 'funkcia';

declare function findUser(id: string): AsyncOption<User>;
declare function getUserPermissions(user: User): AsyncOption<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): AsyncOption<Access>;

const access = findUser('user_123')
  .andThen(user =>
    getUserPermissions(user)
      .andThen(permissions =>
        checkAccess(permissions, 'api-key')
      )
  );
```

Or with intermediate variables:

```typescript
import { AsyncOption } from 'funkcia';

declare function findUser(id: string): AsyncOption<User>;
declare function getUserPermissions(user: User): AsyncOption<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): AsyncOption<Access>;

const user = findUser('user_123');
const permissions = user.andThen(getUserPermissions);

const access = permissions.andThen(permissions => {
  return checkAccess(permissions, 'admin-panel');
});
```





[^1]: (parameter) ctx: { \
    &#x20; readonly user: User;\
    }

[^2]: (parameter) ctx: { \
    &#x20; readonly a: number;\
    }
