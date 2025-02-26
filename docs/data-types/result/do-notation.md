---
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

# Do Notation

A `do notation` syntax allows writing code in a more declarative style, similar to the `do notation` in other programming languages. It provides a way to define variables and perform operations on them using functions like `bind` and `let`, piping the returned values into a context object.

#### Do

Initiates a `do notation` for the `Result` type.

<pre class="language-typescript"><code class="lang-typescript">import { Result } from 'funkcia';

declare function getUser(id: string): Result<User, UserNotFoundError>;
declare function getUserScore(user: User): Result<UserScore, UserNotScoredError>;
declare function getUserLevel(user: User, score: UserScore): UserLevel;

//        ┌─── Result<UserLevel, UserNotFoundError | UserNotScoredError>
//        ▼
const userLevel = Result.Do
  .bind('user', () => getUser('user_01'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => getUserScore(ctx.user))
  .map((ctx) => getUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### bindTo

Initiates a `do notation` with the current `Result`, binding it to a context object with the provided key.

<pre class="language-typescript"><code class="lang-typescript">import { Result } from 'funkcia';

declare function getUser(id: string): Result<User, UserNotFoundError>;
declare function getUserScore(user: User): Result<UserScore, UserNotScoredError>;
declare function getUserLevel(user: User, score: UserScore): UserLevel;

//        ┌─── Result<UserLevel, UserNotFoundError | UserNotScoredError>
//        ▼
const userLevel = getUser('user_01')
<strong>  .bindTo('user')
</strong>  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => getUserScore(ctx.user))
  .map((ctx) => getUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### bind

Binds a `Result` to the context object in a `do notation`.

If the `Result` is `Ok`, the value is assigned to the key in the context object. If the `Result` is `Error`, the parent `Result` running the `Do` simulation becomes an `Error`.

<pre class="language-typescript"><code class="lang-typescript">import { Result } from 'funkcia';

declare function getUser(id: string): Result<User, UserNotFoundError>;
declare function getUserScore(user: User): Result<UserScore, UserNotScoredError>;
declare function getUserLevel(user: User, score: UserScore): UserLevel;

//        ┌─── Result<UserLevel, UserNotFoundError | UserNotScoredError>
//        ▼
const userLevel = Result.Do
  .bind('user', () => getUser('user_01'))
  .bind('score', (<a data-footnote-ref href="#user-content-fn-1">ctx</a>) => getUserScore(ctx.user))
  .map((ctx) => getUserLevel(ctx.user, ctx.score));
//       ▲
//       └─── { user: User; score: UserScore }
</code></pre>

#### let

{% hint style="warning" %}
Ensure you know what you're doing when binding a raw value using `let`, otherwise a thrown exception will not be caught and break your app
{% endhint %}

Binds a raw value to the context object in a `Do-notation`.

<pre class="language-typescript"><code class="lang-typescript">import { Result } from 'funkcia';

const result = Result.Do
  .let('a', () => 10)
  .let('b', (<a data-footnote-ref href="#user-content-fn-2">ctx</a>) => ctx.a * 2)
  .map((ctx) => a + b);
//       ▲
//       └─── { a: number; b: number }
</code></pre>

### Understanding the do notation

Do notation provides a clean way to handle sequences of operations that might fail, where each step depends on the success of all previous steps. Think of it as a chain of dominoes - if any domino falls incorrectly (returns `None`), the entire sequence stops.

Here's a practical example:

```typescript
import { Result } from 'funkcia';

declare function findUser(id: string): Result<User, UserNotFoundError>;
declare function getUserPermissions(user: User): Result<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): Result<Access, InsuficientPermissionsError>;

const access = Result.Do
  // First, try to find the user
  .bind('user', () => findUser('user_123'))
  // If user is found, get their permissions
  .bind('permissions', (ctx) => getUserPermissions(ctx.user))
  // If all steps succeed, we can use the accumulated context to check access to specific resource
  .andThen((ctx) => checkAccess(ctx.permissions, 'api-key'));
```

The equivalent code would be much more nested:

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

```typescript
import { Result } from 'funkcia';

declare function findUser(id: string): Result<User, UserNotFoundError>;
declare function getUserPermissions(user: User): Result<Permissions, MissingPermissionsError>;
declare function checkAccess(permissions: Permissions, resource: string): Result<Access, InsuficientPermissionsError>;

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
