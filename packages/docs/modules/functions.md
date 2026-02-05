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

# Functions

The Functions module provides a collection of utility functions for functional programming in TypeScript. It includes common functional programming primitives, function composition utilities, and helper functions for common operations.

### Function Evaluation

#### invoke

{% hint style="info" %}
This function is a syntax sugar for `IIFE`s.
{% endhint %}

Immediately invokes a function and returns its return value.

```typescript
import { invoke } from 'funkcia/functions';

declare const shape: Shape;

const humanReadableShape = invoke(() => {
  switch (shape.kind) {
    case 'CIRCLE':
      return 'Circle';
    case 'SQUARE':
      return 'Square';
    default:
      const invalidKind: never = shape.kind;
      throw new Error(`Invalid shape: ${invalidKind}`);
  }
});
```

#### lazyCompute

Lazily computes a value by invoking a function. The value is computed only once when first accessed.

```typescript
import { lazyCompute } from 'funkcia/functions';

declare function expensiveComputation(target: object[]): string;
declare const userLogs: object[];

const computation = lazyCompute(() => expensiveComputation(userLogs));

const output = computation.value; // computed only when accessed
const repeatedOutput = computation.value; // cached value returned
```

### Functional Primitives

#### identity

Returns the provided value unchanged.

```typescript
import { identity } from 'funkcia/functions';

const output = identity(10);
// Output: 10
```

#### noop

A function that does nothing and returns nothing.

```typescript
import { noop } from 'funkcia/functions';

noop(); // do nothing
```

### Constant Functions

#### always

Returns a function that will always return the provided value.

```typescript
import { always } from 'funkcia/functions';

const alwaysTen = always(10);

const result = alwaysTen();
// Output: 10
```

#### alwaysNull

Returns `null`.

```typescript
export const alwaysNull: () => null = always(null);
```

#### alwaysUndefined

Returns `undefined`.

```typescript
export const alwaysUndefined: () => undefined = always(undefined);
```

#### alwaysVoid

Returns `void`.

```typescript
export const alwaysVoid: () => void = alwaysUndefined;
```

#### ignore

Returns `never`.

```typescript
export const ignore: () => never = always(undefined as never);
```

#### alwaysTrue

Returns `true`.

```typescript
import { alwaysTrue, Option } from 'funkcia/functions';

declare function findUserById(id: string): Option<User>;

const isRegularUser = findUserById('user_123')
  .map(user => user.kind !== 'ADMIN')
  .unwrapOr(alwaysTrue);
```

#### alwaysFalse

Returns `false`.

```typescript
import { alwaysFalse, Option } from 'funkcia/functions';

declare function findUserById(id: string): Option<User>;

const isAdmin = findUserById('user_123')
  .map(user => user.kind === 'ADMIN')
  .unwrapOr(alwaysFalse);
```

### Type Utilities

#### coerce

{% hint style="warning" %}
This operation is unsafe and can be misleading if misused. Make sure you know what you're doing and use it wisely.

Ideally, you should only use this function when you have a better understanding of your code than TypeScript, which may be unable to narrow down the type of a value.
{% endhint %}

Returns the provided value coerced to the desired type.

```typescript
import { coerce, Result } from 'funkcia/functions';

//       ┌─── Result<any, SyntaxError>
//       ▼
const result = Result.try(
  () => JSON.parse('{ "name": John }'),
  error => coerce<SyntaxError>(error) // JSON.parse throws a `SyntaxError`
);
```

#### compose

Composes two or more functions into a single function, from left to right.

```typescript
import { compose } from 'funkcia/functions';

declare function increment(value: number): number;
declare function double(value: number): number;
declare function stringify(value: number): string;

const compute = compose(increment, double, stringify);

const output = compute(9);
// Output: "20"
```

#### pipe

Pipes a value through a series of functions, from left to right.

```typescript
import { pipe } from 'funkcia/functions';

declare function increment(value: number): number;
declare function double(value: number): number;
declare function stringify(value: number): string;

const output = pipe(9, increment, double, stringify);
// Output: "20"
```
