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

# Option

`Option` represents an optional value: every `Option` is either `Some`, and contains a value, or `None`, and it's empty.

It is commonly used to represent the result of a function that may not return a value due to failure or missing data, such as a network request, a file read, or a database query.

### Defects vs Domain Errors

- Domain absence is expected and represented with `Option.none()`.
- Defects are unexpected exceptions thrown inside callbacks and are surfaced as `Panic`.
- Best practice: expected failures should be returned as `None`, not thrown.

| Scenario | Behavior |
| --- | --- |
| Missing/invalid value in normal control flow | Return `Option.none()` |
| Callback throws inside combinators (`map`, `andThen`, `filter`, `or`, `match`, `unwrapOr`, `contains`, `tap`, do-notation helpers) | Treated as a defect and throws `Panic` |
| `Option.try(() => ...)` callback throws or returns nullable | Returns `Option.None` |

### Constructor

#### some

Constructs a `Some` `Option`, representing an optional value that exists.

```ts
import { Option } from 'funkcia';

//       ┌─── Option<number>
//       ▼
const option = Option.some(10);
// Output: Some(10)
```

#### of

{% hint style="info" %}
Alias of `Option.some`
{% endhint %}

&#x20;Constructs a `Some` `Option`, representing an optional value that exists.

```ts
import { Option } from 'funkcia';

//       ┌─── Option<number>
//       ▼
const option = Option.of(10);
// Output: Some(10)
```

#### none

Constructs a `None` `Option`, representing an optional value that does not exist.

```ts
import { Option } from 'funkcia';

function divide(dividend: number, divisor: number): Option<number> {
  if (divisor === 0) {
    return Option.none();
  }

  return Option.some(dividend / divisor);
}
```

#### fromNullable

Constructs an `Option` from a nullable value.

If the value is `null` or `undefined`, it returns an `Option.None`. Otherwise, it returns an `Option.Some` containing the value.

```ts
import { Option } from 'funkcia';

declare const user: User | null

//       ┌─── Option<User>
//       ▼
const option = Option.fromNullable(user);
```

#### fromFalsy

Constructs an `Option` from a _falsy_ value.

If the value is _falsy_, it returns an `Option.None`. Otherwise, it returns an `Option.Some` with the value.

```ts
import { Option } from 'funkcia';

function getEnv(variable: string): string {
  return process.env[variable] ?? '';
}

//       ┌─── Option<string>
//       ▼
const option = Option.fromFalsy(getEnv('BASE_URL'));
```

#### fromResult

Converts an `Option` from a `Result`.

If `Result` is `Ok` and has a value, returns `Option.Some`. If `Result` is `Error` or has no value, returns `Option.None`.

```ts
import { Option } from 'funkcia';

declare function findUserById(id: string): Result<User, NoValueError>;

//          ┌─── Option<User>
//          ▼
const authorizedUser = Option.fromResult(findUserById('user_123'));
```

#### try

Constructs an `Option` from a function that may throw.

If the function throws or returns `null` or `undefined`, it returns an `Option.None`. Otherwise, it returns an `Option.Some` with the value.

```ts
import { Option } from 'funkcia';

//     ┌─── Option<URL>
//     ▼
const url = Option.try(() => new URL('https://api.example.com'));
// Output: Some(URL)
```

#### firstSomeOf

Returns the first `Option.Some` value in the iterable. If all values are `Option.None`, returns `Option.None`.

```ts
import { Option } from 'funkcia';

interface ContactInformation {
  primary: Option<string>;
  secondary: Option<string>;
  emergency: Option<string>;
}

declare const contact: ContactInformation;

//       ┌─── Option<string>
//       ▼
const option = Option.firstSomeOf([
  contact.primary,
  contact.secondary,
  contact.emergency,
]);
```

#### predicate

Returns a function that asserts that a value passes the test implemented by the provided function, creating an `Option.Some` narrowing down the value to the provided type predicate if the predicate is fulfilled. If the test fails, returns an `Option.None` instead.

```ts
import { Option } from 'funkcia';

//         ┌─── (shape: Shape) => Option<Circle>
//         ▼
const ensureCircle = Option.predicate(
  (shape: Shape): shape is Circle => shape.kind === 'circle',
);

declare const input: Shape;

//       ┌─── Option<Circle>
//       ▼
const option = ensureCircle(input);

//          ┌─── (value: number) => Option<number>
//          ▼
const ensurePositive = Option.predicate(
  (value: number) => value > 0,
);

//       ┌─── Option<number>
//       ▼
const option = ensurePositive(input);
```

#### fn

{% hint style="success" %}
This method offers improved type inference for the function's return value and guarantees that the function will always return an `Option`.
{% endhint %}

Declare a function that always returns an `Option`.

```ts
import { Option } from 'funkcia';

// When defining a normal function allowing typescript to infer
// the return type, sometimes the return type will be
// a union of `Option<T>` and `Option<U>` or `Option<never>`

function hasAcceptedTermsOfService(user: User) {
  if (typeof user.termsOfService !== 'boolean')
    return Option.none();

  return user.termsOfService
    ? Option.some('ACCEPTED' as const)
    : Option.some('DECLINED' as const);
}

//       ┌─── Option<'ACCEPTED'> | Option<'DECLINED'> | Option<never>
//       ▼
const option = hasAcceptedTermsOfService(user);

// When using the `fn` method, the return type is always `Option<T | U>`

const improvedHasAcceptedTermsOfService = Option.fn(hasAcceptedTermsOfService);

//       ┌─── Option<'ACCEPTED' | 'DECLINED'>
//       ▼
const option = improvedHasAcceptedTermsOfService(user);
```

#### lift

Converts a function that may throw or return a _nullable_ value to an enhanced function that returns an `Option`.

```ts
import { Option } from 'funkcia';

//         ┌─── (text: string, reviver?: Function) => Option<any>
//         ▼
const safeJsonParse = Option.lift(JSON.parse);

//       ┌─── Option<any>
//       ▼
const profile = safeJsonParse('{ "name": "John Doe" }');
// Output: Some({ name: 'John Doe' })
```

#### values

Given an array of `Option`s, returns an array containing only the values inside `Some`.

```ts
import { Option } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = Option.values([
  Option.some(1),
  Option.none<number>(),
  Option.some(3),
]);
// Output: [1, 3]
```

#### is

Asserts that an _unknown_ value is an `Option`.

<pre class="language-typescript"><code class="lang-typescript">import { Option } from 'funkcia';

declare const maybeAnOptionWithUser: unknown;

if (Option.is(maybeAnOptionWithUser)) {
  const user = <a data-footnote-ref href="#user-content-fn-1">maybeAnOptionWithUser</a>.filter(isUser);
//        ▲
//        └─── Option<User>
}
</code></pre>

### Instance methods

#### map

Applies a callback function to the value of the `Option` when it is `Some`, returning a new `Option` containing the new value.

```ts
import { Option } from 'funkcia';

//       ┌─── Option<number>
//       ▼
const option = Option.of(10).map(number => number * 2);
// Output: Some(20)
```

#### andThen

Applies a callback function to the value of the `Option` when it is `Some`, and returns the new value. Similar to `chain` (also known as `flatMap`), with the difference that the callback must return an `Option`, not a raw value.

```ts
import { Option } from 'funkcia';

declare function readFile(path: string): Option<string>;
declare function parseJsonFile(contents: string): Option<FileContent>;

//       ┌─── Option<FileContent>
//       ▼
const option = readFile('data.json').andThen(parseJsonFile);
```

#### filter

Asserts that the `Option` value passes the test implemented by the provided function. If the test fails, the value is filtered out of the `Option`, returning a `None` instead.

```ts
import { Option } from 'funkcia';

declare const input: Shape;

//      ┌─── Option<Circle>
//      ▼
const circle = Option.of(input).filter(
  (shape): shape is Circle => shape.kind === 'circle',
);

//       ┌─── Option<User>
//       ▼
const option = Option.of(user).filter((user) => user.age >= 21);
```

#### or

Replaces the current `Option` with the provided fallback `Option` when it is `None`.

If the current `Option` is `Some`, it returns the current `Option`.

```ts
import { Option } from 'funkcia';

// Output: Some('Paul')
const option = Option.some('Paul')
  .or(() => Option.some('John'));


// Output: Some('John')
const greeting = Option.none<string>()
  .or(() => Option.some('John'));
```

#### zip

Combines two `Option`s into a single `Option` containing a tuple of their values, if both `Option`s are `Some` variants, otherwise, returns `None`.

```ts
import { Option } from 'funkcia';

const firstName = Option.some('Jane');
const lastName = Option.some('Doe');

//       ┌─── Option<[string, string]>
//       ▼
const strings = firstName.zip(lastName);
// Output: Some(['Jane', 'Doe'])
```

#### zipWith

Combines two `Option`s into a single `Option`. The new value is produced by applying the given function to both values, if both `Option`s are `Some` variants, otherwise, returns `None`.

```ts
import { Option } from 'funkcia';

const firstName = Option.some('Jane');
const lastName = Option.some('Doe');

//        ┌─── Option<string>
//        ▼
const fullName = firstName.zipWith(lastName, (a, b) => `${a} ${b}`);
// Output: Some('Jane Doe')
```

#### match

Compare the `Option` against the possible patterns and then execute code based on which pattern matches.

```ts
import { Option } from 'funkcia';

declare function readFile(path: string): Option<string>;
declare function parseJsonFile(contents: string): Option<FileContent>;
declare function processFile(contents: FileContent): string;

//         ┌─── string
//         ▼
const userGreeting = readFile('data.json')
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
Throws `Panic` if the `Option` is `None`.
{% endhint %}

Unwraps the `Option` value.

```ts
import { Option } from 'funkcia';

declare const findUserById: (id: string) => User | null;

//     ┌─── User
//     ▼
const user = Option.fromNullable(findUserById('user_123')).unwrap();

const team = Option.none<Team>().unwrap();
// Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
```

#### unwrapOr

Unwraps the `Option` value.

If the Option is `None`, returns the result of the provided callback.

```ts
import { Option } from 'funkcia';

//       ┌─── string
//       ▼
const baseUrl = Option.fromNullable(process.env.BASE_URL)
  .unwrapOr(() => 'http://localhost:3000');
// Output: 'https://app.acme.com'

const apiKey = Option.none<string>()
  .unwrapOr(() => 'api_test_acme_123');
// Output: 'api_test_acme_123'
```

#### unwrapOrNull

{% hint style="info" %}
Use this method at the edges of the system, when storing values in a database or serializing to JSON.
{% endhint %}

Unwraps the value of the `Option` if it is a `Some`, otherwise returns `null`.

```ts
import { Option } from 'funkcia';

declare const findUserById: (id: string) => Option<User>;

//     ┌─── User | null
//     ▼
const user = findUserById('user_123').unwrapOrNull();
```

#### unwrapOrUndefined

{% hint style="info" %}
Use this method at the edges of the system, when storing values in a database or serializing to JSON.
{% endhint %}

Unwraps the value of the `Option` if it is a `Some`, otherwise returns `undefined`.

```ts
import { Option } from 'funkcia';

declare const findUserById: (id: string) => Option<User>;

//     ┌─── User | undefined
//     ▼
const user = findUserById('user_123').unwrapOrUndefined();
```

#### expect

{% hint style="danger" %}
Throws the provided Error if the `Option` is `None`.
{% endhint %}

Unwraps the `Option` value.

```ts
import { Option } from 'funkcia';

declare function findUserById(id: string): Option<User>;

const userId = 'user_123';

//     ┌─── User
//     ▼
const user = findUserById(userId).expect(
  () => new UserNotFound(userId),
);

const invalidId = 'invalid_id';

const anotherUser = findUserById(invalidId).expect(
  () => new UserNotFound(invalidId),
);
// Output: Uncaught exception: 'User not found: "invalid_id"'
```

#### contains

Verifies if the `Option` contains a value that passes the test implemented by the provided function.

* Returns `true` if the predicate is fullfiled by the wrapped value.
* If the predicate is not fullfiled or if the `Option` is `None`, returns `false`.

```ts
import { Option } from 'funkcia';

//         ┌─── boolean
//         ▼
const isPositive = Option.some(10).contains(num => num > 0);
// Output: true
```

#### toArray

Converts an `Option` to an array.

If `Option` is `Some`, returns an array with the value. If `Option` is `None`, returns an empty array.

```ts
import { Option } from 'funkcia';

//       ┌─── number[]
//       ▼
const output = Option.some(10).toArray();
// Output: [10]
```

#### tap

Calls the function with the `Option` value, then returns the `Option` itself.

The return value of the provided function is ignored. This allows "tapping into" a function sequence in a pipe, to perform side effects on intermediate results

```ts
import { Option } from 'funkcia';

//       ┌─── Option<number>
//       ▼
const option = Option.some(10)
  .tap((value) => console.log(value)); // Console output: 10
```

#### isSome

Returns `true` if the `Option` contains a value.

```ts
import { Option } from 'funkcia';

declare function findUserById(id: string): Option<User>;

const user = findUserById('user_123');

if (user.isSome()) {
  return user.unwrap(); // `unwrap` will not throw
}
```

#### isNone

Returns `true` if the `Option` is empty.

```ts
import { Option } from 'funkcia';

declare function findUserByEmail(email: string): Option<User>;

const user = findUserByEmail(data.email);

if (user.isNone()) {
  return await createUser(data);
}

return user.unwrap();
```

#### equals

{% hint style="info" %}
By default, it uses referential equality to compare the values, but you can provide a custom equality function for more complex cases.
{% endhint %}

Compares the `Option` with another `Option` and returns `true` if they are equal.

```ts
import { Option } from 'funkcia';

const option = Option.of(10).equals(Option.some(10));
// Output: true
```

[^1]: const maybeAnOptionWithUser: Option\<unknown>
