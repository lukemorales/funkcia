# ResultAsync

`ResultAsync` represents a `Promise` that **never** rejects of an operation that can either succeed (`Ok`) or return an error (`Error`). Every `ResultAsync` resolves to a `Result.Ok` when successful or `Result.Error` when it fails.

An `ResultAsync` allows you to chain the same methods as a `Result`, but in an asynchronous context. This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.

By awaiting the `ResultAsync`, the Promise inside will resolve to the underlying `Result`.

### Defects vs Domain Errors

- Domain errors are expected failures represented with `Result.Error`.
- Defects are unexpected throw/reject behavior in callback code and are surfaced as `Panic`.
- Best practice: expected failures should be returned as `Error`, not thrown.

| Scenario                                                                     | Behavior                                                                   |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Domain validation or business failure                                        | Resolve to `Result.Error(...)`                                             |
| `ResultAsync.try(() => promise)` promise rejects                             | Resolves to `Result.Error(UnhandledException)` or your mapped custom error |
| `ResultAsync.let(...)` callback throws/rejects                               | Treated as a defect and throws `Panic`                                     |
| `ResultAsync.tap(...)` / `ResultAsync.tapError(...)` callback throws/rejects | Treated as a defect and throws `Panic`                                     |

### Static Methods

#### ok

Constructs an `ResultAsync` that resolves to a `Result.Ok` with the provided value.

```ts
import { ResultAsync } from 'funkcia';

//      ┌─── ResultAsync<number, never>
//      ▼
const result = ResultAsync.ok(10);
// ResultAsync<number, never>
```

#### of

{% hint style="info" %}
Alias of `ResultAsync.ok`
{% endhint %}

Constructs an `ResultAsync` that resolves to a `Result.Ok` with the provided value.

```ts
import { ResultAsync } from 'funkcia';

//      ┌─── ResultAsync<number, never>
//      ▼
const result = ResultAsync.of(10);
// ResultAsync<number, never>
```

#### error

Constructs an `ResultAsync` that resolves to a `Result.Error` with the provided value.

```ts
import { ResultAsync } from 'funkcia';

async function rateLimit(clientId: ClientId, ip: IpAddress): ResultAsync<ClientId, RateLimitError> {
  const attempts = await cache.get(`ratelimit:${clientId}:${ip}`)

  if (attempts.total > 10) {
    return ResultAsync.error(new RateLimitError({ clientId, ip }));
  }

  return ResultAsync.ok(clientId);
}
```

#### fromNullable

Constructs an `ResultAsync` from a nullable value.

If the value is `null` or `undefined`, it resolves to a `Result.Error` with a `NoValueError` exception or a custom error. Otherwise, it resolves to a `Result.Ok`.

```ts
import { ResultAsync } from 'funkcia';

// With default error handling
//      ┌─── ResultAsync<string, NoValueError>
//      ▼
const result = ResultAsync.fromNullable(localStorage.getItem('@app/theme'));

// With custom error handling
//      ┌─── ResultAsync<string, Error>
//      ▼
const result = ResultAsync.fromNullable(
  localStorage.getItem('@app/theme'),
  () => new Error('Theme not set'),
);
```

#### fromFalsy

Constructs an `ResultAsync` from a falsy value.

If the value is falsy, it resolves to a `Result.Error` with a `NoValueError` exception or a custom error. Otherwise, it resolves to a `Result.Ok`.

```ts
import { ResultAsync } from 'funkcia';

interface User {
  id: string;
  firstName: string;
  lastName: string | null;
}

// With default error handling
//      ┌─── ResultAsync<string, NoValueError>
//      ▼
const result = ResultAsync.fromFalsy(user.lastName?.trim());

// With custom error handling
//      ┌─── ResultAsync<string, Error>
//      ▼
const result = ResultAsync.fromFalsy(
  user.lastName?.trim(),
  () => new Error('User missing last name'),
);
```

#### fromResult

Converts a synchronous `Result` into a `ResultAsync`.

```ts
import { Result, ResultAsync } from 'funkcia';

//       ┌─── ResultAsync<number, never>
//       ▼
const result = ResultAsync.fromResult(Result.ok(1));
```

#### fromOption

Converts an `Option` into a `ResultAsync`.

If the `Option` is `Some`, it resolves to `Result.Ok`.
If it is `None`, it resolves to `Result.Error(NoValueError)` or your custom error.

```ts
import { Option, ResultAsync } from 'funkcia';

//       ┌─── ResultAsync<number, NoValueError>
//       ▼
const result = ResultAsync.fromOption(Option.some(1));

//       ┌─── ResultAsync<number, Error>
//       ▼
const withCustomError = ResultAsync.fromOption(
  Option.none<number>(),
  () => new Error('Missing value'),
);
```

#### fromOptionAsync

Converts an `OptionAsync` into a `ResultAsync`.

If the `OptionAsync` resolves to `Some`, it resolves to `Result.Ok`.
If it resolves to `None`, it resolves to `Result.Error(NoValueError)` or your custom error.

```ts
import { OptionAsync, ResultAsync } from 'funkcia';

declare function readFile(path: string): OptionAsync<string>;

//       ┌─── ResultAsync<string, NoValueError>
//       ▼
const result = ResultAsync.fromOptionAsync(readFile('data.json'));

//       ┌─── ResultAsync<string, Error>
//       ▼
const withCustomError = ResultAsync.fromOptionAsync(
  readFile('data.json'),
  () => new Error('File not found'),
);
```

#### try

Constructs a `ResultAsync` from a promise that may reject.

If the promise resolves, the value is wrapped in `Result.Ok`. If it rejects, the error is wrapped in `Result.Error` using `UnhandledException` or your custom mapper.

```ts
import { ResultAsync } from 'funkcia';

// With value-returning promise
declare async function findUserByIdOrThrow(id: string): Promise<User>;

//     ┌─── ResultAsync<User, UnhandledException>
//     ▼
const result = ResultAsync.try(() => findUserByIdOrThrow('user_123'));
// Output: ResultAsync<User, UnhandledException>

// With custom error handling
//     ┌─── ResultAsync<User, UserNotFound | DatabaseFailureError>
//     ▼
const withCustomError = ResultAsync.try(
  () => findUserByIdOrThrow('user_123'),
  (error) => UserNotFound.is(error) ? error : new DatabaseFailureError(error),
);
// Output: ResultAsync<User, UserNotFound | DatabaseFailureError>
```

#### fn

Declares a function that returns either:

- a `Promise<Result<...>>`, or
- an async generator for propagation flows.

It returns a new function that produces `ResultAsync`.

```ts
import { ResultAsync } from 'funkcia';

declare async function findUserById(id: string): Promise<Result<User, UserNotFound>>;

//      ┌─── (id: string) => ResultAsync<User, UserNotFound>
//      ▼
const safeFindUserById = ResultAsync.fn((id: string) => findUserById(id));

//     ┌─── ResultAsync<User, UserNotFound>
//     ▼
const user = safeFindUserById('user_123');
// Output: ResultAsync<User, UserNotFound>
```

#### resource

Wraps a resource and provides a safe way to execute operations with error handling.

```ts
import { ResultAsync } from 'funkcia';
import { drizzle } from 'drizzle-orm/node-postgres';

const database = drizzle(process.env.DATABASE_URL!);

const db = ResultAsync.resource(database);

//       ┌─── ResultAsync<{ id: string }[], UnhandledException>
//       ▼
const result = db.run((client) => client.query.users.findMany({
  columns: { id: true },
}));
```

With custom error mapping:

```ts
import { ResultAsync } from 'funkcia';
import { TaggedError } from 'funkcia/exceptions';
import { drizzle } from 'drizzle-orm/node-postgres';

const database = drizzle(process.env.DATABASE_URL!);

class DatabaseError extends TaggedError('DatabaseError') {}

const database = drizzle(process.env.DATABASE_URL!);

const db = ResultAsync.resource(database, () => new DatabaseError('Query failed'));
```

#### predicate

Returns a function that asserts that a value passes the test implemented by the provided function. Provides multiple overloads for type guards and regular predicates, with optional custom error handling.

```ts
import { ResultAsync } from 'funkcia';

// With type guard
declare const input: Shape;

//         ┌─── (shape: Shape) => ResultAsync<Circle, FailedPredicateError<Square>>
//         ▼
const ensureCircle = ResultAsync.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
);

//       ┌─── ResultAsync<Circle, FailedPredicateError<Square>>
//       ▼
const result = ensureCircle(input);

// With regular predicate
//          ┌─── (value: number) => ResultAsync<number, FailedPredicateError<number>>
//          ▼
const ensurePositive = ResultAsync.predicate(
  (value: number) => value > 0,
);

//       ┌─── ResultAsync<number, FailedPredicateError<number>>
//       ▼
const result = ensurePositive(10);
// Output: Ok(10)

// With custom error handling
//          ┌─── (shape: Shape) => ResultAsync<Circle, InvalidShapeError>
//          ▼
const ensureCircle = ResultAsync.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
//   ┌─── Square
//   ▼
  (shape) => new InvalidShapeError(shape.kind),
);
```

### Combinators

#### values

Given an array of `ResultAsync`s, returns an array containing only the values inside `Result.Ok`.

```ts
import { ResultAsync } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await ResultAsync.values([
  ResultAsync.ok(1),
  ResultAsync.error<number>('Failed computation'),
  ResultAsync.ok(3),
]);
// Output: [1, 3]
```

#### zip

Combines two `ResultAsync`s into a single `ResultAsync` containing a tuple of their values, if both `ResultAsync`s resolve to `Result.Ok` variants, otherwise, resolves to `Result.Error`.

```ts
import { ResultAsync } from 'funkcia';

const firstName = ResultAsync.ok('Jane');
const lastName = ResultAsync.ok('Doe');

//       ┌─── ResultAsync<[string, string], never>
//       ▼
const strings = firstName.zip(lastName);
// Output: ResultAsync<[string, string], never>
```

#### zipWith

Combines two `ResultAsync`s into a single `ResultAsync`. The new value is produced by applying the given function to both values, if both `ResultAsync`s resolve to `Result.Ok` variants, otherwise, resolves to `Result.Error`.

```ts
import { ResultAsync } from 'funkcia';

const firstName = ResultAsync.ok('Jane');
const lastName = ResultAsync.ok('Doe');

//        ┌─── ResultAsync<string, never>
//        ▼
const greeting = firstName.zipWith(lastName, (a, b) => `${a} ${b}`);
// Output: ResultAsync<string, never>
```

### Conversions

#### then

Attaches a callback for the resolution of the Promise inside the `ResultAsync`.

#### match

Returns a promise that compares the underlying `Result` against the possible patterns, and then execute code based on which pattern matches.

```ts
import { ResultAsync } from 'funkcia';

declare function readFile(path: string): ResultAsync<string, FileNotFoundError | FileReadError>;

declare function parseJsonFile(contents: string): ResultAsync<FileContent, InvalidJsonError>;
declare function processFile(contents: FileContent): string;

//     ┌─── string
//     ▼
const data = await readFile('data.json')
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

Returns a promise that unwraps the underlying `ResultAsync` value. Throws `Panic` if the `Result` is `Error`.

```ts
import { ResultAsync } from 'funkcia';

//     ┌─── User
//     ▼
const user = await ResultAsync.ok(databaseUser).unwrap();

const team = await ResultAsync.error(new TeamNotFound()).unwrap();
// Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
```

#### unwrapError

Returns a promise that unwraps the underlying `Result` error. Throws `Panic` if the `Result` is `Ok`.

```ts
import { ResultAsync } from 'funkcia';

//      ┌─── UserNotFound
//      ▼
const error = await ResultAsync.error(new UserNotFound()).unwrapError();
```

#### unwrapOr

Returns a promise that unwraps the underlying `Result`. If the promise resolves to a `Result.Error`, returns the result of the provided callback.

```ts
import { ResultAsync } from 'funkcia';

//       ┌─── string
//       ▼
const baseUrl = await ResultAsync.ok('https://app.acme.com')
  .unwrapOr(() => 'http://localhost:3000');
// Output: 'https://app.acme.com'

const apiKey = await ResultAsync.error('Missing API key')
  .unwrapOr(() => 'api_test_acme_123');
// Output: 'api_test_acme_123'
```

#### unwrapOrNull

Returns a promise that unwraps the value of the underlying `Result` if it is a `Result.Ok`, otherwise returns `null`.

```ts
import { ResultAsync } from 'funkcia';

//     ┌─── User | null
//     ▼
const user = await ResultAsync.ok(databaseUser).unwrapOrNull();
```

#### unwrapOrUndefined

Returns a promise that unwraps the value of the underlying `Result` if it is a `Result.Ok`, otherwise returns `undefined`.

```ts
import { ResultAsync } from 'funkcia';

//     ┌─── User | undefined
//     ▼
const user = await ResultAsync.ok(databaseUser).unwrapOrUndefined();
```

#### expect

Returns a promise that unwraps the underlying `Result` value. Throws the provided Error if the `Result` is `Error`.

```ts
import { ResultAsync } from 'funkcia';

declare function findUserById(id: string): ResultAsync<User, DatabaseFailureError>;

const userId = 'user_123';

//     ┌─── User
//     ▼
const user = await findUserById(userId).expect(
  (error) => new UserNotFound(userId),
//   ▲
//   └─── DatabaseFailureError
);

const invalidId = 'invalid_id';

const anotherUser = await findUserById(invalidId).expect(
  (error) => new UserNotFound(invalidId),
//   ▲
//   └─── DatabaseFailureError
);
// Output: Uncaught exception: 'User not found: "invalid_id"'
```

#### merge

Returns a promise that unwraps the underlying `Result`. If the `Result` is `Ok`, resolves to the value inside the `Ok` variant. If the `Result` is `Error`, resolves to the value inside the `Error` variant.

```ts
import { ResultAsync } from 'funkcia';

declare function getCachedUser(email: Email): ResultAsync<User, CacheMissError<Email>>;
declare function findOrCreateUserByEmail(email: Email): ResultAsync<User, never>;

//       ┌─── User
//       ▼
const result = await getCachedUser('customer@acme.com')
  .swap() // ResultAsync<CacheMissError<Email>, User>
  .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input)) // ResultAsync<User, User>
  .merge();
// Output: { id: 'user_123', email: 'customer@acme.com' }
```

#### contains

Returns a Promise that verifies if the `Result` contains a value that passes the test implemented by the provided function.

```ts
import { ResultAsync } from 'funkcia';

//         ┌─── boolean
//         ▼
const isPositive = await ResultAsync.ok(10).contains(num => num > 0);
// Output: true
```

#### toArray

Returns a Promise that converts the underlying `Result` to an array. If the resolved `Result` is `Ok`, returns an array with the value. If the resolved `Result` is `Error`, returns an empty array.

```ts
import { ResultAsync } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = await ResultAsync.ok(10).toArray();
// Output: [10]
```

### Transformations

#### map

Applies a callback function to the value of the `ResultAsync` when it is `Ok`, returning a new `ResultAsync` containing the new value.

```ts
import { ResultAsync } from 'funkcia';

//       ┌─── ResultAsync<number, never>
//       ▼
const result = ResultAsync.ok(10).map(number => number * 2);
```

#### mapError

Applies a callback function to the value of the `ResultAsync` when it is `Error`, returning a new `ResultAsync` containing the new error value.

```ts
import { ResultAsync } from 'funkcia';

//       ┌─── ResultAsync<string, UserMissingInformationError>
//       ▼
const result = ResultAsync.fromNullable(user.lastName).mapError(
  (error) => new UserMissingInformationError()
//   ▲
//   └─── NoValueError
);
```

#### mapBoth

Transforms both variants of the `ResultAsync` in one call:

- `Ok` values are mapped by `cases.Ok`
- `Error` values are mapped by `cases.Error`

```ts
import { ResultAsync } from 'funkcia';

const result = ResultAsync.fromNullable(user.lastName).mapBoth({
  Ok: (value) => value.toUpperCase(),
  Error: () => new Error('Missing last name'),
});
// ResultAsync<string, Error>
```

#### andThen

Applies a callback function to the value of the `ResultAsync` when it is `Ok`, and returns the new value. Supports both `Result` and `ResultAsync` returns.

```ts
import { ResultAsync } from 'funkcia';

// With Result return
declare function readFile(path: string): ResultAsync<string, FileNotFoundError | FileReadError>;
declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;

//       ┌─── ResultAsync<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
//       ▼
const result = readFile('data.json')
  .andThen(parseJsonFile);

// With ResultAsync return
declare function parseJsonFileAsync(contents: string): ResultAsync<FileContent, InvalidJsonError>;

//       ┌─── ResultAsync<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
//       ▼
const result = readFile('data.json')
  .andThen(parseJsonFileAsync);
```

#### filter

Asserts that the `ResultAsync` value passes the test implemented by the provided function. Supports type guards and regular predicates with optional custom error handling.

```ts
import { ResultAsync } from 'funkcia';

// With type guard
declare const input: Shape;

//       ┌─── ResultAsync<Circle, FailedPredicateError<Square>>
//       ▼
const result = ResultAsync.of(input).filter(
  (shape): shape is Circle => shape.kind === 'CIRCLE',
);

// With regular predicate
//       ┌─── ResultAsync<string, FailedPredicateError<string>>
//       ▼
const result = ResultAsync.of(user.lastName).filter(
  (value) => value.length > 0,
);

// With custom error handling
//       ┌─── ResultAsync<string, Error>
//       ▼
const result = ResultAsync.of(user.lastName).filter(
  (value) => value.length > 0,
  (value) => new Error(`Expected non-empty string, received ${value}`),
);
```

### Fallbacks

#### or

Replaces the current `ResultAsync` with the provided fallback `ResultAsync` when it is `Error`. If the resolved `Result` is `Ok`, it returns the current `ResultAsync`.

```ts
import { ResultAsync } from 'funkcia';

//       ┌─── string
//       ▼
const result = await ResultAsync.ok('alex@gmail.com')
  .or(() => ResultAsync.ok('alex@acme.com'))
  .unwrap();
// Output: 'alex@gmail.com'

const workEmail = await ResultAsync.error(new Error('Missing personal email'))
  .or(() => ResultAsync.ok('alex@acme.com'))
  .unwrap();
// Output: 'alex@acme.com'
```

#### swap

Swaps the `ResultAsync` value and error.

If the underlying `Result` is `Ok`, it returns a `ResultAsync` that resolves to a `Result.Error` with the value. If the underlying `Result` is `Error`, it returns a `ResultAsync` that resolves to a `Result.Ok` with the error.

```ts
import { ResultAsync } from 'funkcia';

declare function getCachedUser(email: Email): ResultAsync<User, CacheMissError<Email>>;
declare function findOrCreateUserByEmail(email: Email): ResultAsync<User, never>;

//       ┌─── ResultAsync<User, User>
//       ▼
const result = getCachedUser('customer@acme.com')
  .swap()
  .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input));
//             ▲
//             └─── CacheMissError<Email>
```

### Other Utilities

#### tap

Calls the function with `Result` value, then returns the `Result` itself. The return value of the provided function is ignored.

```ts
import { ResultAsync } from 'funkcia';

declare function authenticateUser(credentials: AuthCredentials): ResultAsync<User, UserNotFound | InvalidCredentials>;
declare async function registerSuccessfulLoginAttempt(user: User): Promise<{ loginAttempts: number }>;

//       ┌─── ResultAsync<User, UserNotFound | InvalidCredentials>
//       ▼
const result = authenticateUser(req.body).tap(async (user) => {
  return await registerSuccessfulLoginAttempt(user);
});
// Output: ResultAsync<User, UserNotFound | InvalidCredentials>
```

#### tapError

Calls the function with the underlying `Result` error, then returns the `ResultAsync` itself. The return value of the provided function is ignored.

```ts
import { ResultAsync } from 'funkcia';

declare function authenticateUser(credentials: AuthCredentials): ResultAsync<User, UserNotFound | InvalidCredentials>;
declare async function registerLoginAttempt(user: User): Promise<{ loginAttempts: number }>;

//       ┌─── ResultAsync<User, UserNotFound | InvalidCredentials>
//       ▼
const result = authenticateUser(req.body).tapError(async (error) => {
  if (InvalidCredentials.is(error)) {
    return await registerLoginAttempt(error.email);
  }
});
// Output: ResultAsync<User, UserNotFound | InvalidCredentials>
```
