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

# OptionAsync

`AsyncOption` represents a `Promise` that **never** rejects of an asynchronous optional value.

Every `AsyncOption` resolves to either `Option.Some`, containing a value, or `Option.None`, which is empty. It allows you to chain the same methods as an `Option`, but in an asynchronous context.

### Constructors

#### some

Constructs an `AsyncOption` that resolves to an `Option.Some` containing a value.

```typescript
import { AsyncOption } from 'funkcia';

//       ┌─── AsyncOption<number>
//       ▼
const option = AsyncOption.some(10);
// Output: Promise<Some(10)>
```

#### of

{% hint style="info" %}
Alias of `AsyncOption.some`
{% endhint %}

Constructs an `AsyncOption` that resolves to a `Some` `Option` containing a value.

```typescript
import { AsyncOption } from 'funkcia';

declare const divisor: number;

//       ┌─── AsyncOption<number>
//       ▼
const option = AsyncOption.of(10);
```

#### none

Constructs an `AsyncOption` that resolves to a `None` `Option`.

```typescript
import { AsyncOption } from 'funkcia';

function rateLimit(clientId: ClientId, ip: IpAddress): AsyncOption<ClientId> {
  const attempts = cache.get(`ratelimit:${clientId}:${ip}`)

  if (attempts.total > 10) {
    return AsyncOption.none();
  }

  return AsyncOption.some(clientId);
}
```

#### fromNullable

Constructs an `AsyncOption` from a nullable value.

If the value is `null` or `undefined`, resolves to an `Option.None`. Otherwise, resolves to an `Option.Some` with the value.

```typescript
import { AsyncOption } from 'funkcia';

declare const user: User | null

//       ┌─── AsyncOption<User>
//       ▼
const option = AsyncOption.fromNullable(user);
```

#### fromFalsy

Constructs an `AsyncOption` from a falsy value.

If the value is falsy, resolves to a `None`. Otherwise, resolves to a `Some` with the value.

```typescript
import { AsyncOption } from 'funkcia';

function getEnv(variable: string): string {
  return process.env[variable] ?? '';
}

//       ┌─── AsyncOption<string>
//       ▼
const option = AsyncOption.fromFalsy(getEnv('BASE_URL'));
```

#### try

Constructs an `AsyncOption` from a `Promise` that may reject.

If the promise rejects, or resolves to `null` or `undefined`, resolves to an `Option.None`. Otherwise, resolves to an `Option.Some` with the value.

```typescript
import { AsyncOption } from 'funkcia';

declare async function findUserById(id: string): Promise<User | null>

//      ┌─── AsyncOption<User>
//      ▼
const option = AsyncOption.try(() => findUserById('user_01'));
// Output: Promise<Some(User)>
```

#### promise

Constructs an `AsyncOption` from a `Promise` that returns an `Option`, and never rejects.

```typescript
import { AsyncOption } from 'funkcia';

declare async function findUserById(id: string): Promise<Option<User>>

//      ┌─── AsyncOption<User>
//      ▼
const option = AsyncOption.promise(() => findUserById('user_01'));
// Output: Promise<Some(User)>
```

#### liftPromise

Lifts a `Promise` that resolves to an `Option` or nullable value to a function that returns an `AsyncOption`.

```typescript
import { AsyncOption } from 'funkcia';

// With Option return type
declare async function findUserById(id: string): Promise<Option<User>>

//           ┌─── (id: string) => AsyncOption<User>
//           ▼
const safeFindUserById = AsyncOption.liftPromise(findUserById);

//     ┌─── AsyncOption<User>
//     ▼
const user = safeFindUserById('user_01');

// With nullable return type
declare async function findUserById(id: string): Promise<User | null>

//           ┌─── (id: string) => AsyncOption<User>
//           ▼
const safeFindUserById = AsyncOption.liftPromise(findUserById);

//     ┌─── AsyncOption<User>
//     ▼
const user = safeFindUserById('user_01');
```

#### predicate

Returns a function that asserts that a value passes the test implemented by the provided function. Can create an `AsyncOption` that resolves to either `Some` with a narrowed type or `None`.

```typescript
import { AsyncOption } from 'funkcia';

// With type guard
declare const input: Shape;

//         ┌─── (shape: Shape) => AsyncOption<Circle>
//         ▼
const ensureCircle = AsyncOption.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
);

//       ┌─── AsyncOption<Circle>
//       ▼
const option = ensureCircle(input);

// With regular predicate
//          ┌─── (value: number) => AsyncOption<number>
//          ▼
const ensurePositive = AsyncOption.predicate(
  (value: number) => value > 0,
);

//       ┌─── AsyncOption<number>
//       ▼
const option = ensurePositive(input);
```

### Combinators

#### values

Given an array of `AsyncOption`s, returns an array containing only the values inside `Some`.

```typescript
import { AsyncOption } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await AsyncOption.values([
  AsyncOption.some(1),
  AsyncOption.none<number>(),
  AsyncOption.some(3),
]);
// Output: [1, 3]
```

#### zip

Combines two `AsyncOption`s into a single `AsyncOption` containing a tuple of their values, if both `AsyncOption`s are `Some` variants, otherwise, returns `None`.

```typescript
import { AsyncOption } from 'funkcia';

const first = AsyncOption.some('hello');
const second = AsyncOption.some('world');

//       ┌─── AsyncOption<[string, string]>
//       ▼
const strings = first.zip(second);
// Output: Promise<Some(['hello', 'world'])>
```

#### zipWith

Combines two `AsyncOption`s into a single `AsyncOption`. The new value is produced by applying the given function to both values, if both `AsyncOption`s are `Some` variants, otherwise, returns `None`.

```typescript
import { AsyncOption } from 'funkcia';

const first = AsyncOption.some('hello');
const second = AsyncOption.some('world');

//        ┌─── AsyncOption<string>
//        ▼
const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
// Output: Promise<Some('hello world')>
```

### Conversions

#### then

Attaches a callback for the resolution of the Promise inside the `AsyncOption`.

```typescript
import { AsyncOption } from 'funkcia';

declare function findUserById(id: string): AsyncOption<User>

//       ┌─── Option<User>
//       ▼
const option = await AsyncOption.of(user);
// Output: Some(User)
```

#### match

Returns a promise that compares the underlying `Option` against the possible patterns, and then execute code based on which pattern matches.

```typescript
import { AsyncOption } from 'funkcia';

declare function readFile(path: string): AsyncOption<string>;
declare function parseJsonFile(contents: string): AsyncOption<FileContent>;

//         ┌─── string
//         ▼
const userGreeting = await readFile('data.json')
  .andThen(parseJsonFile)
  .match({
    Some(contents) {
      return processFile(contents);
    },
    None() {
      return 'File is invalid JSON';
    },
  });
```

#### unwrap

{% hint style="danger" %}
Rejects the promise with `UnwrapError` if the `Option` is `None`.
{% endhint %}

Returns a promise that unwraps the underlying `Option` value.

```typescript
import { AsyncOption } from 'funkcia';

//     ┌─── User
//     ▼
const user = await AsyncOption.some(databaseUser).unwrap();

const team = await AsyncOption.none().unwrap();
// Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
```

#### unwrapOr

Returns a promise that unwraps the underlying `Option` value.

If the promise resolves to an `Option.None`, returns the result of the provided callback.

```typescript
import { AsyncOption } from 'funkcia';

//       ┌─── string
//       ▼
const baseUrl = await AsyncOption.some(process.env.BASE_URL)
  .unwrapOr(() => 'http://localhost:3000');
// Output: 'https://funkcia.lukemorales.io'

const apiKey = await AsyncOption.none()
  .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
// Output: 'sk_test_9FK7CiUnKaU'
```

#### unwrapOrNull

Returns a promise that unwraps the value of the underlying `Option` if it is an `Option.Some`, otherwise returns `null`.

```typescript
import { AsyncOption } from 'funkcia';

//     ┌─── User | null
//     ▼
const user = await AsyncOption.some(databaseUser).unwrapOrNull();
```

#### unwrapOrUndefined

Returns a promise that unwraps the value of the underlying `Option` if it is an `Option.Some`, otherwise returns `undefined`.

```typescript
import { AsyncOption } from 'funkcia';

//     ┌─── User | undefined
//     ▼
const user = await AsyncOption.some(databaseUser).unwrapOrUndefined();
```

#### expect

{% hint style="danger" %}
Rejects the promise with the provided Error if the `Option` is `None`.
{% endhint %}

Returns a promise that unwraps the underlying `Option` value.

```typescript
import { AsyncOption } from 'funkcia';

declare function findUserById(id: string): AsyncOption<User>;

//     ┌─── User
//     ▼
const user = await findUserById('user_01').expect(
  () => new UserNotFound(userId),
);

const anotherUser = await findUserById('invalid_id').expect(
  () => new UserNotFound('team_01'),
);
// Output: Uncaught exception: 'User not found: "user_01"'
```

#### contains

Returns a Promise that verifies if the `Option` contains a value that passes the test implemented by the provided function.

```typescript
import { AsyncOption } from 'funkcia';

//         ┌─── boolean
//         ▼
const isPositive = await AsyncOption.some(10).contains(num => num > 0);
// Output: true
```

#### toAsyncResult

Converts the `AsyncOption` to an `AsyncResult`. Can provide custom error handling.

```typescript
import { AsyncOption } from 'funkcia';

declare function readFile(path: string): AsyncOption<string>;
declare function parseJsonFile(contents: string): AsyncOption<FileContent>;

//       ┌─── AsyncResult<FileContent, NoValueError>
//       ▼
const asyncFile = readFile('data.json')
  .andThen(parseJsonFile)
  .toAsyncResult();
// Output: Promise<Ok(FileContent)>

//       ┌─── AsyncResult<FileContent, InvalidFile>
//       ▼
const asyncFile = readFile('data.json')
  .andThen(parseJsonFile)
  .toAsyncResult(() => new InvalidFile('data.json'));
// Output: Promise<Ok(FileContent)>
```

#### toArray

Returns a Promise that converts the underlying `Option` to an array.

```typescript
import { AsyncOption } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await AsyncOption.some(10).toArray();
// Output: [10]
```

### Transformations

#### map

Applies a callback function to the value of the `AsyncOption` when it is `Some`, returning a new `AsyncOption` containing the new value.

```typescript
import { AsyncOption } from 'funkcia';

//       ┌─── AsyncOption<number>
//       ▼
const option = AsyncOption.some(10).map(number => number * 2);
// Output: Promise<Some(20)>
```

#### andThen

Applies a callback function to the value of the `AsyncOption` when it is `Some`, and returns the new value. Can work with both `Option` and `AsyncOption` returns.

```typescript
import { AsyncOption } from 'funkcia';

// With Option return
declare function readFile(path: string): AsyncOption<string>;
declare function parseJsonFile(contents: string): Option<FileContent>;

//       ┌─── AsyncOption<FileContent>
//       ▼
const option = readFile('data.json').andThen(parseJsonFile);

// With AsyncOption return
declare function parseJsonFileAsync(contents: string): AsyncOption<FileContent>;

//       ┌─── AsyncOption<FileContent>
//       ▼
const option = readFile('data.json').andThen(parseJsonFileAsync);
```

#### filter

Asserts that the `AsyncOption` value passes the test implemented by the provided function. Can narrow types.

```typescript
import { AsyncOption } from 'funkcia';

// With type guard
declare const input: Shape;

//      ┌─── AsyncOption<Circle>
//      ▼
const circle = AsyncOption.of(input).filter(
  (shape): shape is Circle => shape.kind === 'circle',
);

// With regular predicate
//       ┌─── AsyncOption<User>
//       ▼
const option = AsyncOption.of(user).filter((user) => user.age >= 21);
```

### Fallbacks

#### or

Replaces the current `AsyncOption` with the provided fallback `AsyncOption` when it is `None`.

```typescript
import { AsyncOption } from 'funkcia';

// Output: Promise<Some('Paul')>
const option = AsyncOption.some('Paul')
  .or(() => AsyncOption.some('John'));

// Output: Promise<Some('John')>
const greeting = AsyncOption.none()
  .or(() => AsyncOption.some('John'));
```

#### firstSomeOf

Resolves to the first `AsyncOption.Some` value in the iterable. If all values are `AsyncOption.None`, resolves to `None`.

```typescript
import { AsyncOption } from 'funkcia';

interface Contacts {
  primary: AsyncOption<string>;
  secondary: AsyncOption<string>;
  emergency: AsyncOption<string>;
}

declare const contacts: Contacts;

//       ┌─── AsyncOption<string>
//       ▼
const option = AsyncOption.firstSomeOf([
  contacts.primary,
  contacts.secondary,
  contacts.emergency,
]);
```

### Comparisons

#### is

Asserts that an _unknown_ value is an `AsyncOption`.

```typescript
import { AsyncOption } from 'funkcia';

declare const maybeAnAsyncOptionWithUser: unknown;

if (AsyncOption.is(maybeAnAsyncOptionWithUser)) {
//                     ┌─── AsyncOption<unknown>
//                     ▼
  const user = maybeAnAsyncOptionWithUser.filter(isUser);
//        ▲
//        └─── AsyncOption<User>
}
```

### Other

#### tap

Calls the function with the `AsyncOption` value, then returns the `AsyncOption` itself. The return value of the provided function is ignored.

```typescript
import { AsyncOption } from 'funkcia';

//       ┌─── AsyncOption<number>
//       ▼
const option = AsyncOption.some(10).tap((value) => console.log(value)); // LOG: 10
```
