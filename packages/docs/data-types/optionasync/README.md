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

`OptionAsync` represents a `Promise` that **never** rejects of an asynchronous optional value.

Every `OptionAsync` resolves to either `Option.Some`, containing a value, or `Option.None`, which is empty. It allows you to chain the same methods as an `Option`, but in an asynchronous context.

### Static Methods

#### some

Constructs an `OptionAsync` that resolves to an `Option.Some` containing a value.

```ts
import { OptionAsync } from 'funkcia';

//         ┌─── OptionAsync<number>
//         ▼
const asyncOption = OptionAsync.some(10);

const option = await asyncOption;
//       ▲
//       └─── Option<number>
```

#### of

{% hint style="info" %}
Alias of `OptionAsync.some`
{% endhint %}

Constructs an `OptionAsync` that resolves to a `Some` `Option` containing a value.

```ts
import { OptionAsync } from 'funkcia';

//         ┌─── OptionAsync<number>
//         ▼
const asyncOption = OptionAsync.of(10);

const option = await asyncOption;
//       ▲
//       └─── Option<number>
```

#### none

Constructs an `OptionAsync` that resolves to a `None` `Option`.

```ts
import { OptionAsync } from 'funkcia';

//         ┌─── OptionAsync<number>
//         ▼
const asyncOption = OptionAsync.none<number>();

const option = await asyncOption;
//       ▲
//       └─── Option<number>
```

#### fromNullable

Constructs an `OptionAsync` from a nullable value.

If the value is `null` or `undefined`, resolves to an `Option.None`. Otherwise, resolves to an `Option.Some` with the value.

```ts
import { OptionAsync } from 'funkcia';

declare const user: User | null;

//       ┌─── OptionAsync<User>
//       ▼
const option = OptionAsync.fromNullable(user);
```

#### fromFalsy

Constructs an `OptionAsync` from a falsy value.

If the value is falsy, resolves to a `None`. Otherwise, resolves to a `Some` with the value.

```ts
import { OptionAsync } from 'funkcia';

//       ┌─── OptionAsync<string>
//       ▼
const option = OptionAsync.fromFalsy(process.env.BASE_URL ?? '');
```

#### try

Constructs an `OptionAsync` from a `Promise` that may reject.

If the promise rejects, or resolves to `null` or `undefined`, resolves to an `Option.None`. Otherwise, resolves to an `Option.Some` with the value.

```ts
import { OptionAsync } from 'funkcia';

declare async function findUserById(id: string): Promise<User | null>

//      ┌─── OptionAsync<User>
//      ▼
const option = OptionAsync.try(() => findUserById('user_123'));
// Output: OptionAsync(User)>
```

#### fn

Declares a promise that must return an `Option`, returning a new function that returns an `OptionAsync` and never rejects.

```ts
import { OptionAsync } from 'funkcia';

declare async function findUserById(id: string): Promise<Option<User>>

//      ┌─── (id: string) => OptionAsync<User>
//      ▼
const safeFindUserById = OptionAsync.fn((id: string) => findUserById(id));

//     ┌─── OptionAsync<User>
//     ▼
const user = safeFindUserById('user_123');
// Output: OptionAsync(User)>
```

#### fromOption

Converts an `OptionAsync` from an `Option`.

```ts
import { OptionAsync, Option } from 'funkcia';

//      ┌─── OptionAsync<number>
//      ▼
const option = OptionAsync.fromOption(Option.some(1));
```

#### fromResult

Converts an `OptionAsync` from a `Result`.

```ts
import { OptionAsync, Result } from 'funkcia';

declare function findUserById(id: string): Result<User, NoValueError>;

//      ┌─── OptionAsync<User>
//      ▼
const option = OptionAsync.fromResult(findUserById('user_123'));
```

#### fromResultAsync

Converts an `OptionAsync` from a `ResultAsync`.

```ts
import { OptionAsync, ResultAsync } from 'funkcia';

declare function readFile(path: string): ResultAsync<string, FileNotFoundError>;

//      ┌─── OptionAsync<string>
//      ▼
const option = OptionAsync.fromResultAsync(readFile('data.json'));
```

#### resource

Wraps a resource and provides a safe way to use it with error handling.

```ts
import { OptionAsync } from 'funkcia';

declare const database: Database;

//      ┌─── OptionAsync.Resource<Database>
//      ▼
const db = OptionAsync.resource(database);

//      ┌─── OptionAsync<string>
//      ▼
const result = db.run(async (pg) => {
  return await pg.query('SELECT * FROM users');
});
```

#### predicate

Returns a function that asserts that a value passes the test implemented by the provided function. Can create an `OptionAsync` that resolves to either `Some` with a narrowed type or `None`.

```ts
import { OptionAsync } from 'funkcia';

// With type guard
declare const input: Shape;

//         ┌─── (shape: Shape) => OptionAsync<Circle>
//         ▼
const ensureCircle = OptionAsync.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
);

//       ┌─── OptionAsync<Circle>
//       ▼
const option = ensureCircle(input);

// With regular predicate
//          ┌─── (value: number) => OptionAsync<number>
//          ▼
const ensurePositive = OptionAsync.predicate(
  (value: number) => value > 0,
);

//       ┌─── OptionAsync<number>
//       ▼
const option = ensurePositive(input);
```

### Combinators

#### values

Given an array of `OptionAsync`s, returns an array containing only the values inside `Some`.

```ts
import { OptionAsync } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await OptionAsync.values([
  OptionAsync.some(1),
  OptionAsync.none<number>(),
  OptionAsync.some(3),
]);
// Output: [1, 3]
```

#### zip

Combines two `OptionAsync`s into a single `OptionAsync` containing a tuple of their values, if both `OptionAsync`s are `Some` variants, otherwise, returns `None`.

```ts
import { OptionAsync } from 'funkcia';

const first = OptionAsync.some('hello');
const second = OptionAsync.some('world');

//       ┌─── OptionAsync<[string, string]>
//       ▼
const strings = first.zip(second);
// Output: OptionAsync(['hello', 'world'])>
```

#### zipWith

Combines two `OptionAsync`s into a single `OptionAsync`. The new value is produced by applying the given function to both values, if both `OptionAsync`s are `Some` variants, otherwise, returns `None`.

```ts
import { OptionAsync } from 'funkcia';

const first = OptionAsync.some('hello');
const second = OptionAsync.some('world');

//        ┌─── OptionAsync<string>
//        ▼
const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
// Output: OptionAsync('hello world')>
```

### Conversions

#### then

Attaches a callback for the resolution of the Promise inside the `OptionAsync`.

```ts
import { OptionAsync } from 'funkcia';

declare function findUserById(id: string): OptionAsync<User>

//       ┌─── Option<User>
//       ▼
const option = await OptionAsync.of(user);
// Output: Some(User)
```

#### match

Returns a promise that compares the underlying `Option` against the possible patterns, and then execute code based on which pattern matches.

```ts
import { OptionAsync } from 'funkcia';

declare function readFile(path: string): OptionAsync<string>;
declare function parseJsonFile(contents: string): OptionAsync<FileContent>;

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
Rejects the promise with `Panic` if the `Option` is `None`.
{% endhint %}

Returns a promise that unwraps the underlying `Option` value.

```ts
import { OptionAsync } from 'funkcia';

//     ┌─── User
//     ▼
const user = await OptionAsync.some(databaseUser).unwrap();

const team = await OptionAsync.none<Team>().unwrap();
// Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
```

#### unwrapOr

Returns a promise that unwraps the underlying `Option` value.

If the promise resolves to an `Option.None`, returns the result of the provided callback.

```ts
import { OptionAsync } from 'funkcia';

//       ┌─── string
//       ▼
const baseUrl = await OptionAsync.some(process.env.BASE_URL)
  .unwrapOr(() => 'http://localhost:3000');
// Output: 'https://funkcia.lukemorales.io'

const apiKey = await OptionAsync.none<string>()
  .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
// Output: 'sk_test_9FK7CiUnKaU'
```

#### unwrapOrNull

Returns a promise that unwraps the value of the underlying `Option` if it is an `Option.Some`, otherwise returns `null`.

```ts
import { OptionAsync } from 'funkcia';

//     ┌─── User | null
//     ▼
const user = await OptionAsync.some(databaseUser).unwrapOrNull();
```

#### unwrapOrUndefined

Returns a promise that unwraps the value of the underlying `Option` if it is an `Option.Some`, otherwise returns `undefined`.

```ts
import { OptionAsync } from 'funkcia';

//     ┌─── User | undefined
//     ▼
const user = await OptionAsync.some(databaseUser).unwrapOrUndefined();
```

#### expect

{% hint style="danger" %}
Rejects the promise with the provided Error if the `Option` is `None`.
{% endhint %}

Returns a promise that unwraps the underlying `Option` value.

```ts
import { OptionAsync } from 'funkcia';

declare function findUserById(id: string): OptionAsync<User>;

//     ┌─── User
//     ▼
const user = await findUserById('user_123').expect(
  () => new UserNotFound(userId),
);

const anotherUser = await findUserById('invalid_id').expect(
  () => new UserNotFound('team_123'),
);
// Output: Uncaught exception: 'User not found: "user_123"'
```

#### contains

Returns a Promise that verifies if the `Option` contains a value that passes the test implemented by the provided function.

```ts
import { OptionAsync } from 'funkcia';

//         ┌─── boolean
//         ▼
const isPositive = await OptionAsync.some(10).contains(num => num > 0);
// Output: true
```

#### toArray

Returns a Promise that converts the underlying `Option` to an array.

```ts
import { OptionAsync } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await OptionAsync.some(10).toArray();
// Output: [10]
```

### Transformations

#### map

Applies a callback function to the value of the `OptionAsync` when it is `Some`, returning a new `OptionAsync` containing the new value.

```ts
import { OptionAsync } from 'funkcia';

//       ┌─── OptionAsync<number>
//       ▼
const option = OptionAsync.some(10).map(number => number * 2);
// Output: OptionAsync(20)>
```

#### andThen

Applies a callback function to the value of the `OptionAsync` when it is `Some`, and returns the new value. Can work with both `Option` and `OptionAsync` returns.

```ts
import { OptionAsync } from 'funkcia';

// With Option return
declare function readFile(path: string): OptionAsync<string>;
declare function parseJsonFile(contents: string): Option<FileContent>;

//       ┌─── OptionAsync<FileContent>
//       ▼
const option = readFile('data.json').andThen(parseJsonFile);

// With OptionAsync return
declare function parseJsonFileAsync(contents: string): OptionAsync<FileContent>;

//       ┌─── OptionAsync<FileContent>
//       ▼
const option = readFile('data.json').andThen(parseJsonFileAsync);
```

#### filter

Asserts that the `OptionAsync` value passes the test implemented by the provided function. Can narrow types.

```ts
import { OptionAsync } from 'funkcia';

// With type guard
declare const input: Shape;

//      ┌─── OptionAsync<Circle>
//      ▼
const circle = OptionAsync.of(input).filter(
  (shape): shape is Circle => shape.kind === 'circle',
);

// With regular predicate
//       ┌─── OptionAsync<User>
//       ▼
const option = OptionAsync.of(user).filter((user) => user.age >= 21);
```

### Fallbacks

#### or

Replaces the current `OptionAsync` with the provided fallback `OptionAsync` when it is `None`.

```ts
import { OptionAsync } from 'funkcia';

// Output: OptionAsync('Paul')>
const option = OptionAsync.some('Paul')
  .or(() => OptionAsync.some('John'));

// Output: OptionAsync('John')>
const greeting = OptionAsync.none<string>()
  .or(() => OptionAsync.some('John'));
```

#### firstSomeOf

Resolves to the first `OptionAsync.Some` value in the iterable. If all values are `OptionAsync.None`, resolves to `None`.

```ts
import { OptionAsync } from 'funkcia';

interface Contacts {
  primary: OptionAsync<string>;
  secondary: OptionAsync<string>;
  emergency: OptionAsync<string>;
}

declare const contacts: Contacts;

//       ┌─── OptionAsync<string>
//       ▼
const option = OptionAsync.firstSomeOf([
  contacts.primary,
  contacts.secondary,
  contacts.emergency,
]);
```

### Comparisons

#### isOptionAsync

Asserts that an _unknown_ value is an `OptionAsync`.

```ts
import { isOptionAsync } from 'funkcia';

declare const maybeAnOptionAsyncWithUser: unknown;

if (isOptionAsync(maybeAnOptionAsyncWithUser)) {
//                     ┌─── OptionAsync<unknown>
//                     ▼
  const user = maybeAnOptionAsyncWithUser.filter(isUser);
//        ▲
//        └─── OptionAsync<User>
}
```

### Other

#### tap

Calls the function with the `OptionAsync` value, then returns the `OptionAsync` itself. The return value of the provided function is ignored.

```ts
import { OptionAsync } from 'funkcia';

//       ┌─── OptionAsync<number>
//       ▼
const option = OptionAsync.some(10).tap((value) => console.log(value)); // LOG: 10
```
