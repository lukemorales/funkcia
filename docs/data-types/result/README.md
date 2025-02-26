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

### Constructors

#### ok

Constructs an `Ok` `Result` with the provided value.

```typescript
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

```typescript
import { Result } from 'funkcia';

//      ┌─── Result<number, never>
//      ▼
const result = Result.of(10);
```

#### error

Constructs an `Error` result with the provided value.

```typescript
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

```typescript
import { Result } from 'funkcia';

declare const user: User | null;

//      ┌─── Result<User, NoValueError>
//      ▼
const result = Result.fromNullable(user);

//            ┌─── Result<string, UserNotFoundError>
//            ▼
const resultWithCustomError = Result.fromNullable(
  user,
  () => new UserNotFoundError(),
);
```

#### fromFalsy

Constructs a `Result` from a _falsy_ value.

If the value is _falsy_, it returns a `Result.Error` result with a `NoValueError` error,  or with the value returned by the  provided `onFalsy` callback. Otherwise, it returns a `Result.Ok`.

```typescript
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

#### try

Constructs a `Result` from a function that may throw.

If the function executes successfully, it returns a `Result.Ok`. Otherwise, it returns a `Result.Error` containing an `UnknownError` with the thrown exception, or with the value returned by the  provided `onThrow` callback.

```typescript
import { Result } from 'funkcia';

//     ┌─── Result<URL, UnknownError>
//     ▼
const url = Result.try(() => new URL('example.com'));
// Output: Error(UnknownError)

//     ┌─── Result<URL, Error>
//     ▼
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
</code></pre>

#### fun

{% hint style="success" %}
This method improves the inference of the function's return value and guarantees that it will always return a `Result`. It is extremely useful when your function can return multiple errors.
{% endhint %}

Declare a function that always returns a `Result`.

```typescript
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

// When using the `fun` method, the return type is always `Result<T, E>`
const improvedHasAcceptedTermsOfService = Result.fun(hasAcceptedTermsOfService);

//       ┌─── Result<'ACCEPTED', 'REJECTED' | 'NOT ACCEPTED'>
//       ▼
const result = improvedHasAcceptedTermsOfService(user);
```

#### enhance

Converts a function that may throw an exception to a function that returns a `Result`.

```typescript
import { Result } from 'funkcia';

//         ┌─── (text: string, reviver?: Function) => Result<any, TypeError>
//         ▼
const safeJsonParse = Result.enhance(
  JSON.parse,
  (error) => new TypeError('Invalid JSON'),
);

//       ┌─── Result<any, TypeError>
//       ▼
const result = safeJsonParse('{ "name": "John Doe" }');
// Output: Ok({ name: 'John Doe' })
```

#### values

Given an array of `Result`s, returns an array containing only the values inside `Result.Ok`.

```typescript
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

```typescript
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

```typescript
import { Result } from 'funkcia';

//       ┌─── Result<number, never>
//       ▼
const result = Result.ok(10).map(number => number * 2);
// Output: Ok(20)
```

#### mapError

Applies a callback function to the value of the `Result` when it is `Error`, returning a new `Result` containing the new error value.

```typescript
import { Result } from 'funkcia';

//       ┌─── Result<string, UserMissingInformationError>
//       ▼
const result = Result.fromNullable(user.lastName).mapError(
  (error) => new UserMissingInformationError()
//   ▲
//   └─── NoValueError
);
```

#### mapBoth

Maps both the `Result` value and the `Result` error to new values.

```typescript
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

```typescript
import { Result } from 'funkcia';

declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;

//       ┌─── Result<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
//       ▼
const result = readFile('data.json').andThen(parseJsonFile);
```

#### filter

Asserts that the `Result` value passes the test implemented by the provided function. Can narrow types and customize error handling.

```typescript
import { Result } from 'funkcia';

declare const input: Shape;

//       ┌─── Result<Circle, FailedPredicateError<Square>>
//       ▼
const result = Result.of(input).filter(
  (shape): shape is Circle => shape.kind === 'CIRCLE',
);

//       ┌─── Result<Circle, Error>
//       ▼
const result = Result.of(input).filter(
  (shape): shape is Circle => shape.kind === 'CIRCLE',
  (shape) => new Error(`Expected Circle, received ${shape.kind}`),
//   ▲
//   └─── Square
);
```

#### or

Replaces the current `Result` with the provided fallback `Result` when it is `Error`.

```typescript
import { Result } from 'funkcia';

//       ┌─── string
//       ▼
const option = Result.ok('Smith')
  .or(() => Result.ok('John'))
  .unwrap();
// Output: 'Smith'

const greeting = Result.error(new Error('Missing user'))
  .or(() => Result.ok('John'))
  .unwrap();
// Output: 'John'
```

#### swap

Swaps the `Result` value and error. If `Ok`, returns `Error` with the value. If `Error`, returns `Ok` with the error.

```typescript
import { Result } from 'funkcia';

declare function getCachedUser(email: Email): Result<User, CacheMissError<Email>>;
declare function getOrCreateUserByEmail(email: Email): User;

//       ┌─── Result<User, User>
//       ▼
const result = getCachedUser('johndoe@example.com')
  .swap() // Result<CacheMissError<Email>, User>
  .map((cacheMiss) => getOrCreateUserByEmail(cacheMiss.input));
//         ▲
//         └─── CacheMissError<Email>
```

#### zip

Combines two `Result`s into a single `Result` containing a tuple of their values, if both `Result`s are `Ok` variants, otherwise, returns `Result.Error`.

```typescript
import { Result } from 'funkcia';

const first = Result.some('hello');
const second = Result.some('world');

//       ┌─── Result<[string, string], never>
//       ▼
const strings = first.zip(second);
// Output: Ok(['hello', 'world'])
```

#### zipWith

Combines two `Result`s into a single `Result`. The new value is produced by applying the given function to both values, if both `Result`s are `Ok` variants, otherwise, returns `Error`.

```typescript
import { Result } from 'funkcia';

const first = Result.some('hello');
const second = Result.some('world');

//        ┌─── Result<string, never>
//        ▼
const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
// Output: Ok('hello world')
```

#### match

Compare the `Result` against the possible patterns and then execute code based on which pattern matches.

```typescript
import { Result } from 'funkcia';

declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;

//     ┌─── string
//     ▼
const data = readFile('data.json')
  .andThen(parseJsonFile)
  .match({
    Ok(contents) {
      return 'File is valid JSON';
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
Throws `UnwrapError` if the `Result` is `Error`.
{% endhint %}

Unwraps the `Result` value.

```typescript
import { Result } from 'funkcia';

//     ┌─── User
//     ▼
const user = Result.ok(databaseUser).unwrap();

const team = Result.error(new TeamNotFound()).unwrap();
// Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
```

#### unwrapError

{% hint style="danger" %}
Throws `UnwrapError` if the `Result` is `Ok`.
{% endhint %}

Unwraps the `Result` error.

```typescript
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

```typescript
import { Result } from 'funkcia';

//       ┌─── string
//       ▼
const baseUrl = Result.ok(process.env.BASE_URL)
  .unwrapOr(() => 'http://localhost:3000');
// Output: 'https://funkcia.lukemorales.io'

const apiKey = Result.error('Missing API key')
  .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
// Output: 'sk_test_9FK7CiUnKaU'
```

#### unwrapOrNull

{% hint style="info" %}
Use this method at the edges of the system, when storing values in a database or serializing to JSON.
{% endhint %}

Unwraps the value of the `Result` if it is a `Ok`, otherwise returns `null`.

```typescript
import { Result } from 'funkcia';

declare const findUserById: (id: string) => Result<User, UserNotFoundError>;

//     ┌─── User | null
//     ▼
const user = findUserById('user_123').unwrapOrNull();
```

#### unwrapOrUndefined

{% hint style="info" %}
Use this method at the edges of the system, when storing values in a database or serializing to JSON.
{% endhint %}

Unwraps the value of the `Result` if it is a `Ok`, otherwise returns `undefined`.

```typescript
import { Result } from 'funkcia';

declare const findUserById: (id: string) => Result<User, UserNotFoundError>;

//     ┌─── User | undefined
//     ▼
const user = findUserById('user_123').unwrapOrUndefined();
```

#### expect

{% hint style="danger" %}
Throws the provided Error if the `Result` is `Error`.
{% endhint %}

Unwraps the `Result` value.

```typescript
import { Result } from 'funkcia';

declare function findUserById(id: string): Result<User, NoValueError>;

//     ┌─── User
//     ▼
const user = findUserById(userId).expect(
  (error) => new UserNotFoundError(userId)
//   ▲
//   └─── NoValueError
);
```

#### merge

Returns the value inside the `Result`. If `Ok`, returns the value; if `Error`, returns the error.

```typescript
import { Result } from 'funkcia';

declare function getCachedUser(email: Email): Result<User, CacheMissError<Email>>;
declare function getOrCreateUserByEmail(email: Email): User;

//       ┌─── User
//       ▼
const result = getCachedUser('johndoe@example.com')
  .swap() // Result<CacheMissError<Email>, User>
  .map((cacheMiss) => getOrCreateUserByEmail(cacheMiss.input)) // Result<User, User>
  .merge();
// Output: { id: 'user_01', email: 'johndoe@example.com' }
```

#### contains

Returns `true` if the predicate is fulfilled by the wrapped value. If the predicate is not fulfilled or the `Result` is `Error`, it returns `false`.

```typescript
import { Result } from 'funkcia';

//         ┌─── boolean
//         ▼
const isPositive = Result.ok(10).contains(num => num > 0);
// Output: true

const isNegative = Result.error(10).contains(num => num > 0);
// Output: false
```

#### toArray

Converts a `Result` to an array. If `Result` is `Ok`, returns an array with the value. If `Result` is `Error`, returns an empty array.

```typescript
import { Result } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = Result.ok(10).toArray();
// Output: [10]
```

#### toOption

Converts a `Result` to an `Option`. If `Result` is `Ok`, returns an `Option.Some`. If `Result` is `Error`, returns an `Option.None`.

```typescript
import { Result } from 'funkcia';

declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;

//          ┌─── Option<FileContent>
//          ▼
const fileContents = readFile('data.json')
  .andThen(parseJsonFile)
  .toOption();
```

#### toAsyncOption

Converts the `Result` to an `AsyncOption`.

```typescript
import { Result } from 'funkcia';

declare function readFile(path: string): Result<string, FileNotFound>;
declare function parseJsonFile(contents: string): Result<FileContent, ParseError>;

//       ┌─── AsyncOption<FileContent>
//       ▼
const asyncFile = readFile('data.json')
  .andThen(parseJsonFile)
  .toAsyncOption();
// Output: Promise<Some(FileContent)>
```

#### toAsyncResult

Converts the `Result` to an `AsyncResult`.

```typescript
import { Result } from 'funkcia';

declare function readFile(path: string): Result<string, FileNotFound>;
declare function parseJsonFile(contents: string): Result<FileContent, ParseError>;

//       ┌─── AsyncResult<FileContent, FileNotFound | ParseError>
//       ▼
const asyncFile = readFile('data.json')
  .andThen(parseJsonFile)
  .toAsyncResult();
// Output: Promise<Ok(FileContent)>
```

#### tap

Calls the function with the `Result` value, then returns the `Result` itself, ignoring the returned value of the provided function.

This allows "tapping into" a function sequence in a pipe, to perform side effects on intermediate results.

```typescript
import { Result } from 'funkcia';

//       ┌─── Result<number, never>
//       ▼
const result = Result.some(10).tap(
  (value) => console.log(value), // Console output: 10
);
```

#### tapError

Calls the function with the `Result` error, then returns the `Result` itself, ignoring the returned value of the provided function.

This allows "tapping into" a function sequence in a pipe, to perform side effects on intermediate results.

```typescript
import { Result } from 'funkcia';

declare function findUserById(id: string): Result<User, UserNotFoundError>;

//       ┌─── Result<User, UserNotFoundError>
//       ▼
const result = findUserById('invalid_id').tapError(
  (error) => console.log(error), // Console output: UserNotFoundError
);
```

#### isOk

Returns `true` if the `Result` contains a value.

```typescript
import { Option } from 'funkcia';

declare function findUserById(id: string): Result<User, UserNotFoundError>;

const user = findUserById('user_01');

if (user.isOk()) {
  return user.unwrap(); // `unwrap` will not throw
}
```

#### isError

Returns `true` if the `Result` contains an error.

```typescript
import { Option } from 'funkcia';

declare function findUserById(id: string): Result<User, UserNotFoundError>;

const user = findUserById('invalid_id');

if (user.isError()) {
  const error = user.unwrapError(); // `unwrapError` will not throw
  // ...process error
}

return user.unwrap();
```

#### equals

Compares the `Result` with another `Result` and returns `true` if they are equal.

```typescript
import { Result } from 'funkcia';

const result = Result.of(10).equals(Result.ok(10));
// Output: true
```

[^1]: (parameter) shape: Square
