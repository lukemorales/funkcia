# Do Notation

A `do notation` syntax allows writing code in a more declarative style, similar to the `do notation` in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`, piping the returned values into a context object.

#### Do

Initiates a `do notation` for the `Option` type.

<pre class="language-typescript"><code class="lang-typescript">import { Option } from 'funkcia';

declare function findUserById(id: string): Option<User>;
declare function getUserScore(user: User): Option<UserScore>;
declare function getUserLevel(user: User, score: UserScore): UserLevel;

//        ┌─── Option<UserLevel>
//        ▼
const userLevel = Option.Do
  .bind('user', () => findUserById('user_123'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => getUserScore(ctx.user))
  .map((ctx) => getUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### bindTo

Initiates a `do notation` with the current `Option`, binding it to a context object with the provided key.

<pre class="language-typescript"><code class="lang-typescript">import { Option } from 'funkcia';

declare function findUserById(id: string): Option<User>;
declare function getUserScore(user: User): Option<UserScore>;
declare function getUserLevel(user: User, score: UserScore): UserLevel;

//        ┌─── Option<UserLevel>
//        ▼
const userLevel = findUserById('user_123')
<strong>  .bindTo('user')
</strong>  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => getUserScore(ctx.user))
  .map((ctx) => getUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### bind

Binds an `Option` to the context object in a `do notation`.

If the `Option` is `Some`, the value is assigned to the key in the context object. If the `Option` is `None`, the parent `Option` running the `Do` simulation becomes a `None`.

<pre class="language-typescript"><code class="lang-typescript">import { Option } from 'funkcia';

declare function findUserById(id: string): Option<User>;
declare function getUserScore(user: User): Option<UserScore>;
declare function getUserLevel(user: User, score: UserScore): UserLevel;

//        ┌─── Option<UserLevel>
//        ▼
const userLevel = Option.Do
  .bind('user', () => findUserById('user_123'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => getUserScore(ctx.user))
  .map((ctx) => getUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### let

Binds a raw value to the context object in a `Do-notation`.

If the value is not nullable, the value is assigned to the key in the context object. If the value is `null` or `undefined`, the parent `Option` running the `Do` simulation becomes a `None`.

<pre class="language-typescript"><code class="lang-typescript">import { Option } from 'funkcia';

//      ┌─── Option<number>
//      ▼
const orderTotal = Option.Do
  .let('subtotal', () => 120)
//               ┌─── { subtotal: number }
//               ▼
  .let('tax', (ctx) => ctx.subtotal * 0.08)
  .map((ctx) => ctx.subtotal + ctx.tax);
//      ▲
//      └─── { subtotal: number; tax: number }
</code></pre>

### Understanding the do notation

Do notation provides a clean way to handle sequences of operations that might fail, where each step depends on the success of all previous steps. Think of it as a chain of dominoes - if any domino falls incorrectly (returns `None`), the entire sequence stops.

Here's a practical example:

```ts
import { Option } from 'funkcia';

declare function findUser(id: string): Option<User>;
declare function getUserPermissions(user: User): Option<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): Option<Access>;

const access = Option.Do
  // First, try to find the user
  .bind('user', () => findUser('user_123'))
  // If user is found, get their permissions
  .bind('permissions', (ctx) => getUserPermissions(ctx.user))
  // If all steps succeed, we can use the accumulated context to check access to specific resource
  .andThen((ctx) => checkAccess(ctx.permissions, 'api-key'));
```

The equivalent code would be much more nested:

```ts
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

```ts
import { Option } from 'funkcia';

declare function findUser(id: string): Option<User>;
declare function getUserPermissions(user: User): Option<Permissions>;
declare function checkAccess(permissions: Permissions, resource: string): Option<Access>;

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
