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

# Predicate

The Predicate module provides utilities for type-safe predicate functions in TypeScript.

#### not

Returns a new function that will return the opposite boolean value of the original predicate.

```typescript
import { not } from 'funkcia';

const isGreaterThanZero = (value: number): boolean => value > 0;
const isLessOrEqualToZero = not(isGreaterThanZero);

const result = isLessOrEqualToZero(-1);
        //^?  true
```

#### Predicate\<A>

Represents a function that tests a value and returns a boolean.

```typescript
import { Predicate } from 'funkcia/predicate';

const isPositive: Predicate.Predicate<number> = (n) => n > 0;
```

#### Guard\<A, B extends A>

Represents a type guard function that refines a type `A` to a more specific type `B`.

```typescript
import { Predicate } from 'funkcia/predicate';

const isString: Predicate.Guard<unknown, string> = (value) =>
  typeof value === 'string';
```

#### Guarded\<Guard>

Utility type that extracts the refined type `B` from a `Guard<A, B>`.

```typescript
import { Predicate } from 'funkcia/predicate';

type StringGuard = Predicate.Guard<unknown, string>;
type Refined = Predicate.Guarded<StringGuard>;
//      ^? string
```

#### Unguarded\<A, B extends A>

Utility type that computes the type that was excluded by the type guard refinement.

```typescript
import { Predicate } from 'funkcia/predicate';

type Shape = Circle | Square | Triangle;
type UnguardedShape = Predicate.Unguarded<Shape, Circle>;
//        ^? Square | Triangle
```
