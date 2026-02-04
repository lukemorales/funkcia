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

# Runes

The Runes module provides enhanced `Map` and `Array` implementations that return `Option` types instead of `undefined` or `-1` for operations that might not find a value.

## $map

Creates a `RunicMap` instance with Option-returning methods.

```typescript
import { $map } from 'funkcia/runes';

const map = $map([
  ['key1', 'value1'],
  ['key2', 'value2'],
]);

// Returns Option<string> instead of string | undefined
const value = map.get('key1');
// Some('value1')

const missing = map.get('key3');
// None
```

## $array

Creates a `RunicArray` instance with Option-returning methods.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array([1, 2, 3]);

// Returns Option<number> instead of number | undefined
const item = arr.at(0);
// Some(1)

const missing = arr.at(10);
// None
```

### RunicArray

An `Array` subclass with Option-returning methods for safer array operations.

#### at

Returns `Some` with the item at the specified index if it exists, otherwise `None`.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array([1, 2, 3]);

const first = arr.at(0);
// Some(1)

const last = arr.at(-1);
// Some(3)

const missing = arr.at(10);
// None
```

#### find

Returns `Some` with the first element matching the predicate, otherwise `None`.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array([1, 2, 3, 4, 5]);

const even = arr.find((n) => n % 2 === 0);
// Some(2)

const large = arr.find((n) => n > 10);
// None
```

#### findIndex

Returns `Some` with the index of the first element matching the predicate, otherwise `None`.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array(['a', 'b', 'c']);

const index = arr.findIndex((item) => item === 'b');
// Some(1)

const missing = arr.findIndex((item) => item === 'z');
// None
```

#### indexOf

Returns `Some` with the index of the first occurrence of a value, otherwise `None`.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array(['a', 'b', 'c', 'b']);

const index = arr.indexOf('b');
// Some(1)

const missing = arr.indexOf('z');
// None
```

#### lastIndexOf

Returns `Some` with the index of the last occurrence of a value, otherwise `None`.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array(['a', 'b', 'c', 'b']);

const index = arr.lastIndexOf('b');
// Some(3)
```

#### pop

Removes and returns `Some` with the last element if it exists, otherwise `None`.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array([1, 2, 3]);

const last = arr.pop();
// Some(3)
// arr is now [1, 2]

const empty = $array<number>([]);
const nothing = empty.pop();
// None
```

#### shift

Removes and returns `Some` with the first element if it exists, otherwise `None`.

```typescript
import { $array } from 'funkcia/runes';

const arr = $array([1, 2, 3]);

const first = arr.shift();
// Some(1)
// arr is now [2, 3]
```
