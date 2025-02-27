# ResultAsync

`AsyncResult` represents a `Promise` that **never** rejects of an operation that can either succeed (`Ok`) or return an error (`Error`). Every `AsyncResult` resolves to a `Result.Ok` when successful or `Result.Error` when it fails.

An `AsyncResult` allows you to chain the same methods as a `Result`, but in an asynchronous context. This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.

By awaiting the `AsyncResult`, the Promise inside will resolve to the underlying `Result`.

### Constructors

#### ok

Constructs an `AsyncResult` that resolves to a `Result.Ok` with the provided value.

```typescript
import { AsyncResult } from 'funkcia';

//      ┌─── AsyncResult<number, never>
//      ▼
const result = AsyncResult.ok(10);
// Promise<Ok(10)>
```

#### of

{% hint style="info" %}
Alias of `AsyncResult.ok`
{% endhint %}

Constructs an `AsyncResult` that resolves to a `Result.Ok` with the provided value.

```typescript
import { AsyncResult } from 'funkcia';

//      ┌─── AsyncResult<number, never>
//      ▼
const result = AsyncResult.of(10);
// Promise<Ok(10)>
```

#### error

Constructs an `AsyncResult` that resolves to a `Result.Error` with the provided value.

```typescript
import { AsyncResult } from 'funkcia';

async function rateLimit(clientId: ClientId, ip: IpAddress): AsyncResult<ClientId, RateLimitError> {
  const attempts = await cache.get(`ratelimit:${clientId}:${ip}`)

  if (attempts.total > 10) {
    return AsyncResult.error(new RateLimitError({ clientId, ip }));
  }

  return AsyncOption.ok(clientId);
}
```

#### fromNullable

Constructs an `AsyncResult` from a nullable value.

If the value is `null` or `undefined`, it resolves to a `Result.Error` with a `NoValueError` exception or a custom error. Otherwise, it resolves to a `Result.Ok`.

```typescript
import { AsyncResult } from 'funkcia';

// With default error handling
//      ┌─── AsyncResult<string, NoValueError>
//      ▼
const result = AsyncResult.fromNullable(localStorage.getItem('@app/theme'));

// With custom error handling
//      ┌─── AsyncResult<string, Error>
//      ▼
const result = AsyncResult.fromNullable(
  localStorage.getItem('@app/theme'),
  () => new Error('Theme not set'),
);
```

#### fromFalsy

Constructs an `AsyncResult` from a falsy value.

If the value is falsy, it resolves to a `Result.Error` with a `NoValueError` exception or a custom error. Otherwise, it resolves to a `Result.Ok`.

```typescript
import { AsyncResult } from 'funkcia';

interface User {
  id: string;
  firstName: string;
  lastName: string | null;
}

// With default error handling
//      ┌─── AsyncResult<string, NoValueError>
//      ▼
const result = AsyncResult.fromFalsy(user.lastName?.trim());

// With custom error handling
//      ┌─── AsyncResult<string, Error>
//      ▼
const result = AsyncResult.fromFalsy(
  user.lastName?.trim(),
  () => new Error('User missing last name'),
);
```

#### try

Constructs an `AsyncResult` from a promise that may reject or return a `Result`.

Provides multiple overloads for different promise return types and error handling strategies.

```typescript
import { AsyncResult } from 'funkcia';

// With Result-returning promise
declare async function findUserById(id: string): Promise<Result<User, UserNotFound>>;

//     ┌─── AsyncResult<User, UserNotFound | UnknownError>
//     ▼
const url = AsyncResult.try(() => findUserById('user_123'));
// Output: Promise<Ok(User)>

// With value-returning promise
declare async function findUserByIdOrThrow(id: string): Promise<User>;

//     ┌─── AsyncResult<User, UnknownError>
//     ▼
const url = AsyncResult.try(() => findUserByIdOrThrow('user_123'));
// Output: Promise<Error(UnknownError)>

// With custom error handling
//     ┌─── AsyncResult<User, UserNotFound | DatabaseFailureError>
//     ▼
const url = AsyncResult.try(
  () => findUserByIdOrThrow('user_123'),
  (error) => UserNotFound.is(error) ? error : new DatabaseFailureError(error),
);
// Output: Promise<Error(DatabaseFailureError('Error: Failed to connect to the database'))>
```

#### promise

Constructs an `AsyncResult` from a `Promise` that returns a `Result`, and never rejects.

```typescript
import { AsyncResult } from 'funkcia';

declare async function findUserById(id: string): Promise<Result<User, UserNotFound | DatabaseFailureError>>;

//      ┌─── AsyncResult<User, UserNotFound | DatabaseFailureError>
//      ▼
const result = AsyncResult.promise(() => findUserById('user_123'));
// Output: Promise<Ok(User)>
```

#### liftPromise

Lifts a `Promise` that may fail or resolve to a `Result` to a function that returns an `AsyncResult`. Provides multiple overloads for different promise return types and error handling strategies.

```typescript
import { AsyncResult } from 'funkcia';

// With Result-returning promise
declare async function findUserById(id: string): Promise<Result<User, UserNotFound>>;

//           ┌─── (id: string) => AsyncResult<User, UserNotFound | UnknownError>
//           ▼
const safeFindUserById = AsyncResult.liftPromise(findUserById);

// With value-returning promise
declare async function findUserByIdOrThrow(id: string): Promise<User>;

//           ┌─── (id: string) => AsyncResult<User, UnknownError>
//           ▼
const safeFindUserById = AsyncResult.liftPromise(findUserByIdOrThrow);

// With custom error handling
//           ┌─── (id: string) => AsyncResult<User, UserNotFound | DatabaseFailureError>
//           ▼
const safeFindUserById = AsyncResult.liftPromise(
  findUserByIdOrThrow,
  (error) => UserNotFound.is(error) ? error : new DatabaseFailureError(error),
);
```

#### predicate

Returns a function that asserts that a value passes the test implemented by the provided function. Provides multiple overloads for type guards and regular predicates, with optional custom error handling.

```typescript
import { AsyncResult } from 'funkcia';

// With type guard
declare const input: Shape;

//         ┌─── (shape: Shape) => AsyncResult<Circle, FailedPredicateError<Square>>
//         ▼
const ensureCircle = AsyncResult.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
);

//       ┌─── AsyncResult<Circle, FailedPredicateError<Square>>
//       ▼
const result = ensureCircle(input);

// With regular predicate
//          ┌─── (value: number) => AsyncResult<number, FailedPredicateError<number>>
//          ▼
const ensurePositive = AsyncResult.predicate(
  (value: number) => value > 0,
);

//       ┌─── AsyncResult<number, FailedPredicateError<number>>
//       ▼
const result = ensurePositive(10);
// Output: Ok(10)

// With custom error handling
//          ┌─── (shape: Shape) => AsyncResult<Circle, InvalidShapeError>
//          ▼
const ensureCircle = AsyncResult.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
//   ┌─── Square
//   ▼
  (shape) => new InvalidShapeError(shape.kind),
);
```

### Combinators

#### values

Given an array of `AsyncResult`s, returns an array containing only the values inside `Result.Ok`.

```typescript
import { AsyncResult } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await AsyncResult.values([
  AsyncResult.ok(1),
  AsyncResult.error<number>('Failed computation'),
  AsyncResult.ok(3),
]);
// Output: [1, 3]
```

#### zip

Combines two `AsyncResult`s into a single `AsyncResult` containing a tuple of their values, if both `AsyncResult`s resolve to `Result.Ok` variants, otherwise, resolves to `Result.Error`.

```typescript
import { AsyncResult } from 'funkcia';

const first = AsyncResult.some('hello');
const second = AsyncResult.some('world');

//       ┌─── AsyncResult<[string, string], never>
//       ▼
const strings = first.zip(second);
// Output: Promise<Ok(['hello', 'world'])>
```

#### zipWith

Combines two `AsyncResult`s into a single `AsyncResult`. The new value is produced by applying the given function to both values, if both `AsyncResult`s resolve to `Result.Ok` variants, otherwise, resolves to `Result.Error`.

```typescript
import { AsyncResult } from 'funkcia';

const first = AsyncResult.some('hello');
const second = AsyncResult.some('world');

//        ┌─── AsyncResult<string, never>
//        ▼
const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
// Output: Promise<Ok('hello world')>
```

### Conversions

#### then

Attaches a callback for the resolution of the Promise inside the `AsyncResult`.

#### match

Returns a promise that compares the underlying `Result` against the possible patterns, and then execute code based on which pattern matches.

```typescript
import { AsyncResult } from 'funkcia';
import { readFileSync } from 'node:fs';

declare function readFile(path: string): AsyncResult<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): AsyncResult<FileContent, InvalidJsonError>;

//     ┌─── string
//     ▼
const data = await readFile('data.json')
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

Returns a promise that unwraps the underlying `AsyncResult` value. Throws `UnwrapError` if the `Result` is `Error`.

```typescript
import { AsyncResult } from 'funkcia';

//     ┌─── User
//     ▼
const user = await AsyncResult.ok(databaseUser).unwrap();

const team = await AsyncResult.error(new TeamNotFound()).unwrap();
// Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
```

#### unwrapError

Returns a promise that unwraps the underlying `Result` error. Throws `UnwrapError` if the `Result` is `Ok`.

```typescript
import { AsyncResult } from 'funkcia';

//      ┌─── UserNotFound
//      ▼
const error = await AsyncResult.error(new UserNotFound()).unwrapError();
```

#### unwrapOr

Returns a promise that unwraps the underlying `Result`. If the promise resolves to a `Result.Error`, returns the result of the provided callback.

```typescript
import { AsyncResult } from 'funkcia';

//       ┌─── string
//       ▼
const baseUrl = await AsyncResult.ok(process.env.BASE_URL)
  .unwrapOr(() => 'http://localhost:3000');
// Output: 'https://funkcia.lukemorales.io'

const apiKey = await AsyncResult.error('Missing API key')
  .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
// Output: 'sk_test_9FK7CiUnKaU'
```

#### unwrapOrNull

Returns a promise that unwraps the value of the underlying `Result` if it is a `Result.Ok`, otherwise returns `null`.

```typescript
import { AsyncResult } from 'funkcia';

//     ┌─── User | null
//     ▼
const user = await AsyncResult.ok(databaseUser).unwrapOrNull();
```

#### unwrapOrUndefined

Returns a promise that unwraps the value of the underlying `Result` if it is a `Result.Ok`, otherwise returns `undefined`.

```typescript
import { AsyncResult } from 'funkcia';

//     ┌─── User | undefined
//     ▼
const user = await AsyncResult.ok(databaseUser).unwrapOrUndefined();
```

#### expect

Returns a promise that unwraps the underlying `Result` value. Throws the provided Error if the `Result` is `Error`.

```typescript
import { AsyncResult } from 'funkcia';

declare function findUserById(id: string): AsyncResult<User, DatabaseFailureError>;

//     ┌─── User
//     ▼
const user = await findUserById('user_123').expect(
  (error) => new UserNotFound(userId),
//   ▲
//   └─── DatabaseFailureError
);

const anotherUser = await findUserById('invalid_id').expect(
  (error) => new UserNotFound('team_123'),
//   ▲
//   └─── DatabaseFailureError
);
// Output: Uncaught exception: 'User not found: "user_123"'
```

#### merge

Returns a promise that unwraps the underlying `Result`. If the `Result` is `Ok`, resolves to the value inside the `Ok` variant. If the `Result` is `Error`, resolves to the value inside the `Error` variant.

```typescript
import { AsyncResult } from 'funkcia';

declare function getCachedUser(email: Email): AsyncResult<User, CacheMissError<Email>>;
declare function findOrCreateUserByEmail(email: Email): AsyncResult<User, never>;

//       ┌─── User
//       ▼
const result = await getCachedUser('johndoe@example.com')
  .swap() // AsyncResult<CacheMissError<Email>, User>
  .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input)) // AsyncResult<User, User>
  .merge();
// Output: { id: 'user_123', email: 'johndoe@example.com' }
```

#### contains

Returns a Promise that verifies if the `Result` contains a value that passes the test implemented by the provided function.

```typescript
import { AsyncResult } from 'funkcia';

//         ┌─── boolean
//         ▼
const isPositive = await AsyncResult.some(10).contains(num => num > 0);
// Output: true
```

#### toAsyncOption

Converts the `AsyncResult` to an `AsyncOption`. If the resolved `Result` is `Ok`, returns an `AsyncOption.Some`. If the resolved `Result` is `Error`, returns an `AsyncOption.None`.

```typescript
import { AsyncResult } from 'funkcia';

declare function readFile(path: string): AsyncResult<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): AsyncResult<FileContent, InvalidJsonError>;

//       ┌─── AsyncOption<FileContent>
//       ▼
const asyncFile = readFile('data.json')
  .andThen(parseJsonFile)
  .toAsyncOption();
// Output: Promise<Some(FileContent)>
```

#### toArray

Returns a Promise that converts the underlying `Result` to an array. If the resolved `Result` is `Ok`, returns an array with the value. If the resolved `Result` is `Error`, returns an empty array.

```typescript
import { AsyncResult } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await AsyncResult.some(10).toArray();
// Output: [10]
```

### Transformations

#### map

Applies a callback function to the value of the `AsyncResult` when it is `Ok`, returning a new `AsyncResult` containing the new value.

```typescript
import { AsyncResult } from 'funkcia';

//       ┌─── AsyncResult<number, never>
//       ▼
const result = AsyncResult.ok(10).map(number => number * 2);
// Output: Promise<Ok(20)>
```

#### mapError

Applies a callback function to the value of the `AsyncResult` when it is `Error`, returning a new `AsyncResult` containing the new error value.

```typescript
import { AsyncResult } from 'funkcia';

//       ┌─── AsyncResult<string, UserMissingInformationError>
//       ▼
const result = AsyncResult.fromNullable(user.lastName).mapError(
  (error) => new UserMissingInformationError()
//   ▲
//   └─── NoValueError
);
```

#### andThen

Applies a callback function to the value of the `AsyncResult` when it is `Ok`, and returns the new value. Supports both `Result` and `AsyncResult` returns.

```typescript
import { AsyncResult } from 'funkcia';

// With Result return
declare function readFile(path: string): AsyncResult<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;

//       ┌─── AsyncResult<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
//       ▼
const result = readFile('data.json')
  .andThen(parseJsonFile);

// With AsyncResult return
declare function parseJsonFileAsync(contents: string): AsyncResult<FileContent, InvalidJsonError>;

//       ┌─── AsyncResult<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
//       ▼
const result = readFile('data.json')
  .andThen(parseJsonFileAsync);
```

#### filter

Asserts that the `AsyncResult` value passes the test implemented by the provided function. Supports type guards and regular predicates with optional custom error handling.

```typescript
import { AsyncResult } from 'funkcia';

// With type guard
declare const input: Shape;

//       ┌─── AsyncResult<Circle, FailedPredicateError<Square>>
//       ▼
const result = AsyncResult.of(input).filter(
  (shape): shape is Circle => shape.kind === 'CIRCLE',
);

// With regular predicate
//       ┌─── AsyncResult<string, FailedPredicateError<string>>
//       ▼
const result = AsyncResult.of(user.lastName).filter(
  (value) => value.length > 0,
);

// With custom error handling
//       ┌─── AsyncResult<string, Error>
//       ▼
const result = AsyncResult.of(user.lastName).filter(
  (value) => value.length > 0,
  (value) => new Error(`Expected non-empty string, received ${value}`),
);
```

### Fallbacks

#### or

Replaces the current `AsyncResult` with the provided fallback `AsyncResult` when it is `Error`. If the resolved `Result` is `Ok`, it returns the current `AsyncResult`.

```typescript
import { AsyncResult } from 'funkcia';

//       ┌─── string
//       ▼
const result = await AsyncResult.ok('Smith')
  .or(() => AsyncResult.ok('John'))
  .unwrap();
// Output: 'Smith'

const greeting = await AsyncResult.error(new Error('Missing user'))
  .or(() => AsyncResult.ok('John'))
  .unwrap();
// Output: 'John'
```

#### swap

Swaps the `AsyncResult` value and error.

If the underlying `Result` is `Ok`, it returns a `AsyncResult` that resolves to a `Result.Error` with the value. If the underlying `Result` is `Error`, it returns a `AsyncResult` that resolves to a `Result.Ok` with the error.

```typescript
import { AsyncResult } from 'funkcia';

declare function getCachedUser(email: Email): AsyncResult<User, CacheMissError<Email>>;
declare function findOrCreateUserByEmail(email: Email): AsyncResult<User, never>;

//       ┌─── Result<User, User>
//       ▼
const result = getCachedUser('johndoe@example.com')
  .swap()
  .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input));
//             ▲
//             └─── CacheMissError<Email>
```

### Other Utilities

#### tap

Calls the function with `Result` value, then returns the `Result` itself. The return value of the provided function is ignored.

```typescript
import { AsyncResult } from 'funkcia';

declare function authenticateUser(credentials: AuthCredentials): AsyncResult<User, UserNotFound | InvalidCredentials>;
declare async function registerSuccessfulLoginAttempt(user: User): Promise<{ loginAttempts: number }>;

//       ┌─── AsyncResult<User, UserNotFound | InvalidCredentials>
//       ▼
const result = authenticateUser(req.body).tap(async (user) => {
  return await registerSuccessfulLoginAttempt(user);
});
// Output: Promise<Ok(User)>
```

#### tapError

Calls the function with the underlying `Result` error, then returns the `AsyncResult` itself. The return value of the provided function is ignored.

```typescript
import { AsyncResult } from 'funkcia';

declare function authenticateUser(credentials: AuthCredentials): AsyncResult<User, UserNotFound | InvalidCredentials>;
declare async function registerLoginAttempt(user: User): Promise<{ loginAttempts: number }>;

//       ┌─── AsyncResult<User, UserNotFound | InvalidCredentials>
//       ▼
const result = authenticateUser(req.body).tapError(async (error) => {
  if (InvalidCredentials.is(error)) {
    return await registerLoginAttempt(error.email);
  }
});
// Output: Promise<Error(InvalidCredentials)>
```
