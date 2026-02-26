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

# Result

`Result` represents the result of an operation that can either be successful (`Ok`) or a failure (`Error`). It's commonly used to represent the result of a function that may fail, such as a network request, a file read, or a database query.

### Defects vs Domain Errors

- Domain errors are expected failures represented with `Result.error(...)`.
- Defects are unexpected exceptions thrown inside callbacks and are surfaced as `Panic`.
- Best practice: expected failures should be returned as `Error`, not thrown.

| Scenario | Behavior |
| --- | --- |
| Domain validation or business failure | Return `Result.error(...)` |
| Callback throws inside combinators (`map`, `mapError`, `mapBoth`, `andThen`, `filter`, `or`, `match`, `unwrapOr`, `contains`, `tap`, `tapError`, do-notation helpers) | Treated as a defect and throws `Panic` |
| `Result.try(() => ...)` callback throws | Returns `Result.Error(UnhandledException)` or your mapped custom error |

### Static Methods

#### ok

Constructs an `Ok` `Result` with the provided value.

```ts
import { Result } from 'funkcia';

//      ┌─── Result<number, never>
//      ▼
const result = Result.ok(10);
```

#### of

{% hint style="info" %}
Alias of `Result.ok`
{% endhint %}

Constructs an `Ok` `Result` with the provided value.

```ts
import { Result } from 'funkcia';

//      ┌─── Result<number, never>
//      ▼
const result = Result.of(10);
```

#### error

Constructs an `Error` result with the provided value.

```ts
import { Result } from 'funkcia';

function divide(dividend: number, divisor: number): Result<number, InvalidDivisor> {
  if (divisor === 0) {
    return Result.error(new InvalidDivisor());
  }

  return Result.ok(dividend / divisor);
}
```

#### fromNullable

Constructs a `Result` from a nullable value.

If the value is `null` or `undefined`, it returns a `Result.Error` with a `NoValueError` error, or with the value returned by the  provided `onNullable` callback. Otherwise, it returns a `Result.Ok`.

```ts
import { Result } from 'funkcia';

declare const user: User | null;

//      ┌─── Result<User, NoValueError>
//      ▼
const result = Result.fromNullable(user);

//            ┌─── Result<User, UserNotFound>
//            ▼
const resultWithCustomError = Result.fromNullable(
  user,
  () => new UserNotFound(),
);

const fromNullableUser = Result.fromNullable(() => new UserNotFound());

//            ┌─── Result<User, UserNotFound>
//            ▼
const resultFromCurriedApi = fromNullableUser(user);
```

#### fromFalsy

Constructs a `Result` from a _falsy_ value.

If the value is _falsy_, it returns a `Result.Error` result with a `NoValueError` error,  or with the value returned by the  provided `onFalsy` callback. Otherwise, it returns a `Result.Ok`.

```ts
import { Result } from 'funkcia';

interface User {
  id: string;
  firstName: string;
  lastName: string | null;
}

//      ┌─── Result<string, NoValueError>
//      ▼
const result = Result.fromFalsy(user.lastName?.trim());

//            ┌─── Result<string, Error>
//            ▼
const resultWithCustomError = Result.fromFalsy(
  user.lastName?.trim(),
  () => new Error('User missing last name'),
);
```

#### fromOption

Converts a `Result` from an `Option`.

If `Option` is `Some`, returns a `Result.Ok`. If `Option` is `None`, returns a `Result.Error` with a `NoValueError` or a custom error.

```ts
import { Result } from 'funkcia';

declare function findUserById(id: string): Option<User>;

//          ┌─── Result<User, NoValueError>
//          ▼
const authorizedUser = Result.fromOption(findUserById('user_123'));

//          ┌─── Result<User, UserNotFound>
//          ▼
const authorizedUser = Result.fromOption(
  findUserById('user_123'),
  () => new UserNotFound('user_123'),
);
```

#### try

Constructs a `Result` from a function that may throw.

If the function executes successfully, it returns a `Result.Ok`. Otherwise, it returns a `Result.Error` containing an `UnhandledException` with the thrown exception, or with the value returned by the  provided `onThrow` callback.

```ts
import { Result } from 'funkcia';

//     ┌─── Result<URL, UnhandledException>
//     ▼
const url = Result.try(() => new URL('example.com'));
// Output: Error(UnhandledException)

//          ┌─── Result<URL, Error>
//          ▼
const urlWithCustomError = Result.try(
  () => new URL('example.com'),
  (error) => new Error('Invalid URL'),
);
// Output: Error('Invalid URL')
```

#### predicate

Returns a function that asserts that a value passes the test implemented by the provided function, creating a `Result.Ok`, with the value tested, if the predicate is fulfilled.

If the test fails, returns a `Result.Error` with a `FailedPredicateError` instead, or with the value returned by the  provided `onUnfulfilled` callback.

<pre class="language-typescript"><code class="lang-typescript">import { Result } from 'funkcia';

// With type guard
//          ┌─── (shape: Shape) => Result<Circle, InvalidShapeError>
//          ▼
const ensureCircle = Result.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
  (<a data-footnote-ref href="#user-content-fn-1">shape</a>) => new InvalidShapeError(shape.kind),
);

// With regular predicate
//          ┌─── (value: number) => Result<number, InvalidNumberError>
//          ▼
const ensurePositive = Result.predicate(
  (value: number) => value > 0,
  (value) => new InvalidNumberError(value),
);

// Direct style
//       ┌─── Result<number, FailedPredicateError<number>>
//       ▼
const directResult = Result.predicate(10, (value) => value > 0);

// Direct style with custom error
//       ┌─── Result<number, InvalidNumberError>
//       ▼
const directResultWithCustomError = Result.predicate(
  10,
  (value) => value > 0,
  (value) => new InvalidNumberError(value),
);
</code></pre>

#### fn

{% hint style="success" %}
This method improves the inference of the function's return value and guarantees that it will always return a `Result`. It is extremely useful when your function can return multiple errors.
{% endhint %}

Declare a function that always returns a `Result`.

```ts
import { Result } from 'funkcia';

// When defining a normal function allowing typescript to infer the return type,
// the return type is always a union of `Result<T, never>` and `Result<never, E>`
function hasAcceptedTermsOfService(user: User) {
  if (typeof user.termsOfService !== 'boolean') {
    return Result.error('NOT ACCEPTED' as const);
  }

  return user.termsOfService ?
      Result.ok('ACCEPTED' as const)
    : Result.error('REJECTED' as cons);
}

//       ┌─── Result<'ACCEPTED', never> | Result<never, 'REJECTED'> | Result<never, 'NOT ACCEPTED'>
//       ▼
const result = hasAcceptedTermsOfService(user);

// When using the `fn` method, the return type is always `Result<T, E>`
const improvedHasAcceptedTermsOfService = Result.fn(hasAcceptedTermsOfService);

//       ┌─── Result<'ACCEPTED', 'REJECTED' | 'NOT ACCEPTED'>
//       ▼
const result = improvedHasAcceptedTermsOfService(user);
```

#### lift

Converts a function that may throw an exception to a function that returns a `Result`.

```ts
import { Result } from 'funkcia';

//         ┌─── (text: string, reviver?: Function) => Result<any, TypeError>
//         ▼
const safeJsonParse = Result.lift(
  JSON.parse,
  (error) => new TypeError('Invalid JSON'),
);

//       ┌─── Result<any, TypeError>
//       ▼
const result = safeJsonParse('{ "name": "John Doe" }');
// Output: Ok({ name: 'John Doe' })
```

#### partition

Given an array of `Result`s, returns a tuple where:

- index `0` contains all values from `Result.Ok`
- index `1` contains all values from `Result.Error`

```ts
import { Result } from 'funkcia';

const [values, errors] = Result.partition([
  Result.ok(1),
  Result.error('Missing name'),
  Result.ok(3),
  Result.error('Missing email'),
]);

// values: [1, 3]
// errors: ['Missing name', 'Missing email']
```

#### values

Given an array of `Result`s, returns an array containing only the values inside `Result.Ok`.

```ts
import { Result } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = Result.values([
  Result.ok(1),
  Result.error<number>('Failed computation'),
  Result.ok(3),
]);
// Output: [1, 3]
```

#### is

Asserts that an _unknown_ value is a `Result`.

```ts
import { Result } from 'funkcia';

declare const maybeAResultWithUser: unknown;

if (Result.is(maybeAResultWithUser)) {
//                     ┌─── Result<unknown, unknown>
//                     ▼
  const user = maybeAResultWithUser.filter(isUser);
//        ▲
//        └─── Result<User, FailedPredicateError<unknown>>
}
```

### Instance methods

#### map

Applies a callback function to the value of the `Result` when it is `Ok`, returning a new `Result` containing the new value.

```ts
import { Result } from 'funkcia';

//       ┌─── Result<number, never>
//       ▼
const result = Result.ok(10).map(number => number * 2);
// Output: Ok(20)
```

#### mapError

Applies a callback function to the value of the `Result` when it is `Error`, returning a new `Result` containing the new error value.

```ts
import { Result } from 'funkcia';

declare const user: User | null;

//       ┌─── Result<User, UserNotFound>
//       ▼
const result = Result.fromNullable(user).mapError(
  (error) => new UserNotFound()
//   ▲
//   └─── NoValueError
);
```

#### mapBoth

Maps both the `Result` value and the `Result` error to new values.

```ts
import { Result } from 'funkcia';

//       ┌─── Result<string, UserMissingInformationError>
//       ▼
const result = Result.fromNullable(user.lastName).mapBoth({
  Ok: (lastName) => `Hello, Mr. ${lastName}`,
  Error: (error) => new UserMissingInformationError(),
//          ▲
//          └─── NoValueError
});
```

#### andThen

Applies a callback function to the value of the `Result` when it is `Ok`, and returns the new value. Similar to `chain` (also known as `flatMap`).

```ts
import { Result } from 'funkcia';

declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;

//       ┌─── Result<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
//       ▼
const result = readFile('data.json').andThen(parseJsonFile);
```

#### filter

Asserts that the `Result` value passes the test implemented by the provided function. Can narrow types and customize error handling.

```ts
import { Result } from 'funkcia';

declare const input: Shape;

//       ┌─── Result<Circle, FailedPredicateError<Square>>
//       ▼
const result = Result.of(input).filter(
  (shape): shape is Circle => shape.kind === 'CIRCLE',
);

//            ┌─── Result<Circle, Error>
//            ▼
const resultWithCustomError = Result.of(input).filter(
  (shape): shape is Circle => shape.kind === 'CIRCLE',
  (shape) => new Error(`Expected Circle, received ${shape.kind}`),
//   ▲
//   └─── Square
);
```

#### or

Replaces the current `Result` with the provided fallback `Result` when it is `Error`.

```ts
import { Result } from 'funkcia';

const personalEmail = Result.ok('alex@gmail.com')
  .or(() => Result.ok('alex@acme.com'))
  .unwrap();
// Output: 'alex@gmail.com'

const workEmail = Result.error(new Error('Missing personal email'))
  .or(() => Result.ok('alex@acme.com'))
  .unwrap();
// Output: 'alex@acme.com'
```

#### swap

Swaps the `Result` value and error. If `Ok`, returns `Error` with the value. If `Error`, returns `Ok` with the error.

```ts
import { Result } from 'funkcia';

declare function getCachedUser(email: Email): Result<User, CacheMissError<Email>>;
declare function findOrCreateUserByEmail(email: Email): User;

//       ┌─── Result<User, User>
//       ▼
const result = getCachedUser('customer@acme.com')
  .swap() // Result<CacheMissError<Email>, User>
  .map((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input));
//         ▲
//         └─── CacheMissError<Email>
```

#### zip

Combines two `Result`s into a single `Result` containing a tuple of their values, if both `Result`s are `Ok` variants, otherwise, returns `Result.Error`.

```ts
import { Result } from 'funkcia';

const firstName = Result.ok('Jane');
const lastName = Result.ok('Doe');

//       ┌─── Result<[string, string], never>
//       ▼
const strings = firstName.zip(lastName);
// Output: Ok(['Jane', 'Doe'])
```

#### zipWith

Combines two `Result`s into a single `Result`. The new value is produced by applying the given function to both values, if both `Result`s are `Ok` variants, otherwise, returns `Error`.

```ts
import { Result } from 'funkcia';

const firstName = Result.ok('Jane');
const lastName = Result.ok('Doe');

//        ┌─── Result<string, never>
//        ▼
const greeting = firstName.zipWith(lastName, (a, b) => `${a} ${b}`);
// Output: Ok('Jane Doe')
```

#### match

Compare the `Result` against the possible patterns and then execute code based on which pattern matches.

```ts
import { Result } from 'funkcia';

declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;

declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
declare function processFile(contents: FileContent): string;

//     ┌─── string
//     ▼
const data = readFile('data.json')
  .andThen(parseJsonFile)
  .match({
    Ok(contents) {
      return processFile(contents);
    },
//          ┌─── FileNotFoundError | FileReadError | InvalidJsonError
//          ▼
    Error(error) {
      return 'File is invalid JSON';
    },
  });
```

#### unwrap

{% hint style="danger" %}
Throws `Panic` if the `Result` is `Error`.
{% endhint %}

Unwraps the `Result` value.

```ts
import { Result } from 'funkcia';

//      ┌─── number
//      ▼
const number = Result.ok(10).unwrap();

Result.error(new Error('¯\_(ツ)_/¯')).unwrap();
// Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
```

#### unwrapError

{% hint style="danger" %}
Throws `Panic` if the `Result` is `Ok`.
{% endhint %}

Unwraps the `Result` error.

```ts
import { Result } from 'funkcia';

const result = Result.error(new UserNotFound());

if (result.isError()) {
  const error = result.unwrapError();
//        ▲
//        └─── UserNotFound
}
```

#### unwrapOr

Returns the value of the `Result`. If the `Result` is `Error`, returns the fallback value.

```ts
import { Result } from 'funkcia';

//       ┌─── string
//       ▼
const baseUrl = Result.ok('https://app.acme.com')
  .unwrapOr(() => 'http://localhost:3000');
// Output: 'https://app.acme.com'

const apiKey = Result.error('Missing API key')
  .unwrapOr(() => 'api_test_acme_123');
// Output: 'api_test_acme_123'
```

#### unwrapOrNull

{% hint style="info" %}
Use this method at the edges of the system, when storing values in a database or serializing to JSON.
{% endhint %}

Unwraps the value of the `Result` if it is a `Ok`, otherwise returns `null`.

```ts
import { Result } from 'funkcia';

declare const findUserById: (id: string) => Result<User, UserNotFound>;

//     ┌─── User | null
//     ▼
const user = findUserById('user_123').unwrapOrNull();
```

#### unwrapOrUndefined

{% hint style="info" %}
Use this method at the edges of the system, when storing values in a database or serializing to JSON.
{% endhint %}

Unwraps the value of the `Result` if it is a `Ok`, otherwise returns `undefined`.

```ts
import { Result } from 'funkcia';

declare const findUserById: (id: string) => Result<User, UserNotFound>;

//     ┌─── User | undefined
//     ▼
const user = findUserById('user_123').unwrapOrUndefined();
```

#### expect

{% hint style="danger" %}
Throws the provided Error if the `Result` is `Error`.
{% endhint %}

Unwraps the `Result` value.

```ts
import { Result } from 'funkcia';

declare function findUserById(id: string): Result<User, NoValueError>;

const userId = 'user_123';

//     ┌─── User
//     ▼
const user = findUserById(userId).expect(
  (error) => new UserNotFound(userId)
//   ▲
//   └─── NoValueError
);
```

#### merge

Returns the value inside the `Result`. If `Ok`, returns the value; if `Error`, returns the error.

```ts
import { Result } from 'funkcia';

declare function getCachedUser(email: Email): Result<User, CacheMissError<Email>>;
declare function getOrCreateUserByEmail(email: Email): User;

//       ┌─── User
//       ▼
const result = getCachedUser('customer@acme.com')
  .swap() // Result<CacheMissError<Email>, User>
  .map((cacheMiss) => getOrCreateUserByEmail(cacheMiss.input)) // Result<User, User>
  .merge();
// Output: { id: 'user_123', email: 'customer@acme.com' }
```

#### contains

Returns `true` if the predicate is fulfilled by the wrapped value. If the predicate is not fulfilled or the `Result` is `Error`, it returns `false`.

```ts
import { Result } from 'funkcia';

//         ┌─── boolean
//         ▼
const isPositive = Result.ok(10).contains(num => num > 0);
// Output: true

const isNegative = Result.error(10).contains(num => num < 0);
// Output: false
```

#### toArray

Converts a `Result` to an array. If `Result` is `Ok`, returns an array with the value. If `Result` is `Error`, returns an empty array.

```ts
import { Result } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = Result.ok(10).toArray();
// Output: [10]
```

#### tap

Calls the function with the `Result` value, then returns the `Result` itself, ignoring the returned value of the provided function.

This allows "tapping into" a function sequence in a pipe, to perform side effects on intermediate results.

```ts
import { Result } from 'funkcia';

//       ┌─── Result<number, never>
//       ▼
const result = Result.ok(10).tap(
  (value) => console.log(value), // Console output: 10
);
```

#### tapError

Calls the function with the `Result` error, then returns the `Result` itself, ignoring the returned value of the provided function.

This allows "tapping into" a function sequence in a pipe, to perform side effects on intermediate results.

```ts
import { Result } from 'funkcia';

declare function findUserById(id: string): Result<User, UserNotFound>;

//       ┌─── Result<User, UserNotFound>
//       ▼
const result = findUserById('invalid_id').tapError(
  (error) => console.log(error), // Console output: UserNotFound
);
```

#### isOk

Returns `true` if the `Result` contains a value.

```ts
import { Option } from 'funkcia';

declare function findUserById(id: string): Result<User, UserNotFound>;

const user = findUserById('user_123');

if (user.isOk()) {
  return user.unwrap(); // `unwrap` will not throw
}
```

#### isError

Returns `true` if the `Result` contains an error.

```ts
import { Option } from 'funkcia';

declare function findUserById(id: string): Result<User, UserNotFound>;

const user = findUserById('invalid_id');

if (user.isError()) {
  const error = user.unwrapError(); // `unwrapError` will not throw
  // ...process error
}

return user.unwrap();
```

#### equals

Compares the `Result` with another `Result` and returns `true` if they are equal.

```ts
import { Result } from 'funkcia';

const result = Result.of(10).equals(Result.ok(10));
// Output: true
```

[^1]: (parameter) shape: Square
