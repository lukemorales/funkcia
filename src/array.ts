/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { dual } from './_internals/dual';
import {
  isNone,
  none as noneOption,
  some as someOption,
} from './_internals/option';
import { identity } from './functions';
import type { Option } from './option';
import {
  fromNullable as optionFromNullable,
  fromPredicate as optionFromPredicate,
} from './option';
import { not } from './predicate';

// -------------------------------------
// constructors
// -------------------------------------

/**
 * Creates a new array with the provided size, filling each position with its index value
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const list = A.create(3); // [0, 1, 2]
 * ```
 */
export function create(size: number): number[];
/**
 * Creates a new array with the provided size, filling each position with the result of the callback to create each element
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const numbers = A.create(3, index => index + 1); // [1, 2, 3]
 * const names = A.create(2, generateRandomName); // ['John Doe', 'Fred Nerk']
 * ```
 */
export function create<A>(
  size: number,
  createElement: (index: number) => A,
): A[];
export function create(
  size: number,
  createElement: (index: number) => any = identity,
): any[] {
  return Array.from({ length: size }, (_, index) => createElement(index));
}

/**
 * Returns a new empty array of the provided type
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const list = A.empty<number>();
 *       //^?  number[]
 * ```
 */
export function empty<A>(): A[] {
  return [];
}

/**
 * Returns an array filled with values in the provided range
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const positives = A.range(1, 5); // [1, 2, 3, 4, 5]
 * ```
 */
export function range(start: number, finish: number): number[] {
  const offset = 1;

  if (finish < start) {
    return create(start - finish + offset, (index) => start - index);
  }

  return create(finish - start + offset, (index) => start + index);
}

// -------------------------------------
// refinements
// -------------------------------------

/**
 * Type guard that asserts a variable is an array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * declare const data: unknown;
 *
 * if (A.isArray(data)) {
 *   const result = data.map(transformValue);
 *                  //^?  unknown[]
 * }
 * ```
 */
export function isArray(arg: unknown): arg is unknown[] {
  return Array.isArray(arg);
}

/**
 * Type guard that asserts an array is an empty array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * declare const data: number[];
 *
 * if (A.isEmpty(data)) {
 *   return data;
 *          //^?  []
 * }
 * ```
 */
export function isEmpty<A>(self: readonly A[]): self is [] {
  return self.length === 0;
}

export type NonEmptyArray<A> = [A, ...A[]];

/**
 * Type guard that asserts an array is a non-empty array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const data: number[] = [1, 2, 3];
 *
 * if (A.isNonEmpty(data)) {
 *   const first = data[0];
 *                 //^?  [number, ...number[]]
 * }
 * ```
 */
export function isNonEmpty<A>(self: readonly A[]): self is NonEmptyArray<A> {
  return self.length > 0;
}

// -------------------------------------
// getters
// -------------------------------------

/**
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.head([1, 2, 3]);
 *         //^?  Some<1>
 * ```
 */
export function head<A>(self: readonly A[]): Option<A> {
  return isNonEmpty(self) ? someOption(self[0]) : noneOption();
}

/**
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.last([1, 2, 3]);
 *         //^?  Some<3>
 * ```
 */
export function last<A>(self: readonly A[]): Option<A> {
  return isNonEmpty(self) ? someOption(self[self.length - 1]!) : noneOption();
}

/**
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.init([1, 2, 3]);
 *         //^?  Some<[1, 2]>
 * ```
 */
export function init<A>(self: readonly A[]): Option<NonEmptyArray<A>> {
  const offset = 1;

  return isNonEmpty(self)
    ? someOption(self.slice(0, self.length - offset) as any)
    : noneOption();
}

/**
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.tail([1, 2, 3]);
 *         //^?  Some<[2, 3]>
 * ```
 */
export function tail<A>(self: readonly A[]): Option<NonEmptyArray<A>> {
  return isNonEmpty(self) ? someOption(self.slice(1) as any) : noneOption();
}

/**
 * Takes an integer value and returns an Option with the item at that index, allowing for positive and negative integers.
 * Negative integers count back from the last item in the array
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3], A.at(1));
 *         //^?  Some<2>
 * ```
 */
export function at<A>(index: number): (self: readonly A[]) => Option<A> {
  return (self) => {
    const size = self.length;

    if (index < 0) {
      const accessedIndex = size + index;

      if (accessedIndex < 0) {
        return noneOption();
      }

      return someOption(self[accessedIndex]!);
    }

    const maxIndex = size - 1;

    if (index > maxIndex) {
      return noneOption();
    }

    return someOption(self[index]!);
  };
}

/**
 * Returns a Some with the value of the first element in the array where predicate is true, and None otherwise
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * type ValidNumber = number;
 *
 * const result = pipe([1, 2, 3], A.find((number): number is ValidNumber => number > 2));
 *         //^?  Some<ValidNumber>
 * ```
 */
export function find<A, A2 extends A>(
  refinement: (item: A, index: number, array: readonly A[]) => item is A2,
): (self: readonly A[]) => Option<A2>;
/**
 * Returns a Some with the value of the first element in the array where predicate is true, and None otherwise
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3], A.find(number => number > 2));
 *         //^?  Some<3>
 * ```
 */
export function find<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => Option<A>;
export function find(
  predicate: (item: any, index: number, array: readonly any[]) => boolean,
): (self: readonly any[]) => Option<any> {
  return (self) => optionFromNullable(self.find(predicate));
}

/**
 * Returns a Some with the index of the first element in the array where predicate is true, and None otherwise
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3], A.findIndex(number => number >= 3));
 *         //^?  Some<2>
 * ```
 */
export function findIndex<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => Option<number> {
  return (self) =>
    optionFromPredicate(self.findIndex(predicate), (index) => index >= 0);
}

/**
 * Gets the length of the array. This is a number one higher than the highest element defined in an array
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const size = pipe([1, 2, 3], A.length); // 3
 * ```
 */
export function length<A>(self: readonly A[]): number {
  return self.length;
}

// -------------------------------------
// transforming
// -------------------------------------

/**
 * Calls a defined callback function on each element of an array, and returns an array that contains the results
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([0, 1, 2], A.map(number => number + 1)); // [1, 2, 3]
 * ```
 */
export function map<A, B>(
  callback: (item: A, index: number, array: readonly A[]) => B,
): (self: readonly A[]) => B[] {
  return (self) => self.map(callback);
}

/**
 * Calls a defined callback function on each element of an array. Then, flattens the result into a new array.
 * This is identical to a map followed by flat with depth 1
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([0, 1, 2], A.flatMap(number => [number + 1])); // [1, 2, 3]
 * ```
 */
export function flatMap<A, B>(
  callback: (item: A, index: number, array: readonly A[]) => B | readonly B[],
): (self: readonly A[]) => B[] {
  return (self) => self.flatMap(callback);
}

interface Take {
  /**
   * Takes the specified number of items from the given array
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const result = pipe([1, 2, 3], A.take(2)); // [1, 2]
   * ```
   */
  <A>(amount: number): (self: readonly A[]) => A[];
  /**
   * Takes the specified number of items from the given array
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const result = A.take([1, 2, 3], 2); // [1, 2]
   * ```
   */
  <A>(self: readonly A[], amount: number): A[];
}

/**
 * Takes the specified number of items from the given array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.take([1, 2, 3], 2); // [1, 2]
 * ```
 */
export const take: Take = dual(2, (self: readonly any[], amount: number) => {
  if (amount <= 0) {
    return [];
  }

  return self.slice(0, amount);
});

interface TakeWhile {
  /**
   * Takes items from the given array while the predicate is satisfied
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const result = pipe([1, 2, 3], A.takeWhile(number => number < 3)); // [1, 2]
   * ```
   */
  <A>(predicate: (item: A) => boolean): (self: readonly A[]) => A[];
  /**
   * Takes items from the given array while the predicate is satisfied
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const result = A.takeWhile([1, 2, 3], number => number < 3); // [1, 2]
   * ```
   */
  <A>(self: readonly A[], predicate: (item: A) => boolean): A[];
}

/**
 * Takes items from the given array while the predicate is satisfied
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.takeWhile([1, 2, 3], number => number < 3); // [1, 2]
 * ```
 */
export const takeWhile: TakeWhile = dual(
  2,
  (self: any[], predicate: (item: any) => boolean): any[] => {
    const indexOfFirstElementThatDoesNotSatisfyPredicate = self.findIndex(
      not(predicate),
    );

    if (indexOfFirstElementThatDoesNotSatisfyPredicate < 0) {
      return [];
    }

    return self.slice(0, indexOfFirstElementThatDoesNotSatisfyPredicate);
  },
);

interface Drop {
  /**
   * Drops the specified number of items from the given array
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const result = pipe([1, 2, 3, 4, 5], A.drop(2)); // [3, 4, 5]
   * ```
   */
  <A>(howMany: number): (self: readonly A[]) => A[];
  /**
   * Drops the specified number of items from the given array
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const result = A.drop([1, 2, 3, 4, 5], 2); // [3, 4, 5]
   * ```
   */
  <A>(self: readonly A[], howMany: number): A[];
}

/**
 * Drops the specified number of items from the given array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.drop([1, 2, 3, 4, 5], 2); // [3, 4, 5]
 * ```
 */
export const drop: Drop = dual(2, (self: readonly any[], howMany: number) =>
  self.slice(howMany),
);

interface DropWhile {
  /**
   * Drops items from the given array while the predicate is satisfied
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const result = pipe([1, 2, 3, 4, 5], A.drop(number => number < 3)); // [3, 4, 5]
   * ```
   */
  <A>(predicate: (item: A) => boolean): (self: readonly A[]) => A[];
  /**
   * Drops items from the given array while the predicate is satisfied
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const result = A.drop([1, 2, 3, 4, 5], number => number < 3); // [3, 4, 5]
   * ```
   */
  <A>(self: readonly A[], predicate: (item: A) => boolean): A[];
}

/**
 * Drops items from the given array while the predicate is satisfied
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.drop([1, 2, 3, 4, 5], number => number < 3); // [3, 4, 5]
 * ```
 */
export const dropWhile: DropWhile = dual(
  2,
  (self: any[], predicate: (item: any) => boolean): any[] => {
    const indexOfFirstElementThatDoesNotSatisfyPredicate = self.findIndex(
      not(predicate),
    );

    if (indexOfFirstElementThatDoesNotSatisfyPredicate < 0) {
      return [...self];
    }

    return self.slice(indexOfFirstElementThatDoesNotSatisfyPredicate);
  },
);

interface Append {
  /**
   * Adds an item to the end of the given array
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const result = pipe([1, 2, 3, 4], A.append(5)); // [1, 2, 3, 4, 5]
   * ```
   */
  <A>(item: A): (self: readonly A[]) => A[];
  /**
   * Adds an item to the end of the given array
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const result = A.append([1, 2, 3, 4], 5); // [1, 2, 3, 4, 5]
   * ```
   */
  <A>(self: readonly A[], item: A): A[];
}

/**
 * Adds an item to the end of the given array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.append([1, 2, 3, 4], 5); // [1, 2, 3, 4, 5]
 * ```
 */
export const append: Append = dual(2, (self: readonly any[], item: any) => [
  ...self,
  item,
]);

interface Prepend {
  /**
   * Adds an item to the start of the given array
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const result = pipe([1, 2, 3, 4], A.prepend(0)); // [0, 1, 2, 3, 4]
   * ```
   */
  <A>(item: A): (self: readonly A[]) => A[];
  /**
   * Adds an item to the start of the given array
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const result = A.prepend([1, 2, 3, 4], 0); // [0, 1, 2, 3, 4]
   * ```
   */
  <A>(self: readonly A[], item: A): A[];
}

/**
 * Adds an item to the start of the given array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.prepend([1, 2, 3, 4], 0); // [0, 1, 2, 3, 4]
 * ```
 */
export const prepend: Prepend = dual(2, (self: readonly any[], item: any) => [
  item,
  ...self,
]);

/**
 * Calls the specified callback function for all the elements in an array.
 * The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3, 4, 5], A.reduce(0, (prev, current) => prev + current)); // 15
 * ```
 */
export function reduce<A, B>(
  initialValue: B,
  reducer: (acc: B, current: A, index: number, array: readonly A[]) => B,
): (self: readonly A[]) => B {
  return (self) => self.reduce(reducer, initialValue);
}

/**
 * Returns a new array with the elements of the original array sorted using the native sort algorithm
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const sortedNumbers = pipe([3, 5, 1, 2, 4], A.sort()); // [1, 2, 3, 4, 5]
 *
 * const sortedUsersByAge = pipe(
 *   [{ name: 'John', age: 29 }, { name: 'Fred', age: 20 }],
 *   A.sort((userA, userB) => userA.age - userB.age),
 * ); // [{ name: 'Fred', age: 20 }, { name: 'John', age: 29 }]
 * ```
 */
export function sort<A>(
  compare?: (a: A, b: A) => number,
): (self: readonly A[]) => A[] {
  return (self) => [...self].sort(compare);
}

interface QuickSort {
  /**
   * Returns a new array with the elements of the original array sorted using the quickSort algorithm
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const sortedNumbers = pipe([3, 5, 1, 2, 4], A.quickSort()); // [1, 2, 3, 4, 5]
   *
   * const sortedUsersByAge = pipe(
   *   [{ name: 'John', age: 29 }, { name: 'Fred', age: 20 }],
   *   A.quickSort(user => user.age),
   * ); // [{ name: 'Fred', age: 20 }, { name: 'John', age: 29 }]
   * ```
   */
  <A, B>(getValue?: (item: A) => B): (self: readonly A[]) => A[];
  /**
   * Returns a new array with the elements of the original array sorted using the quickSort algorithm
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const sortedNumbers = A.quickSort([3, 5, 1, 2, 4]); // [1, 2, 3, 4, 5]
   *
   * const sortedUsersByAge = A.quickSort([
   *   { name: 'John', age: 29 },
   *   { name: 'Fred', age: 20 },
   * ], user => user.age); // [{ name: 'Fred', age: 20 }, { name: 'John', age: 29 }]
   * ```
   */
  <A, B>(self: readonly A[], getValue?: (item: A) => B): A[];
}

/**
 * Returns a new array with the elements of the original array sorted using the quickSort algorithm
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const sortedNumbers = A.quickSort([3, 5, 1, 2, 4]); // [1, 2, 3, 4, 5]
 *
 * const sortedUsersByAge = A.quickSort([
 *   { name: 'John', age: 29 },
 *   { name: 'Fred', age: 20 },
 * ], user => user.age); // [{ name: 'Fred', age: 20 }, { name: 'John', age: 29 }]
 * ```
 */
export const quickSort: QuickSort = (...args: any[]) => {
  const _quickSort = dual(
    2,
    (self: readonly any[], getValue: (item: any) => any): any[] => {
      function _quickSortBy(array: any[]): any[] {
        if (array.length <= 1) {
          return array;
        }

        const pivotIndex = Math.floor(array.length / 2);

        const pivot = array[pivotIndex]!;
        const pivotToCompare = getValue(pivot);

        const lesser: any[] = [];
        const greater: any[] = [];

        for (let index = 0; index < array.length; index++) {
          if (index === pivotIndex) {
            // eslint-disable-next-line no-continue
            continue;
          }

          const element = array[index]!;
          const elementToCompare = getValue(element);

          const target = elementToCompare < pivotToCompare ? lesser : greater;
          target.push(element);
        }

        return [..._quickSortBy(lesser), pivot, ..._quickSortBy(greater)];
      }

      return _quickSortBy([...self]);
    },
  );

  if (!args.length) {
    return _quickSort(identity);
  }

  if (args.length === 1 && Array.isArray(args[0])) {
    return _quickSort(...args, identity);
  }

  return _quickSort(...args);
};

/**
 * Returns a new array shuffling the elements of the original array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.shuffle([1, 2, 3, 4, 5]); // [2, 5, 1, 3, 4]
 * ```
 */
export function shuffle<A>(self: readonly A[]): A[] {
  function _shuffle(array: A[], left: number): A[] {
    const right = Math.floor(Math.random() * (left + 1));
    // eslint-disable-next-line no-param-reassign
    [array[left], array[right]] = [array[right]!, array[left]!];

    return left > 0 ? _shuffle(array, left - 1) : array;
  }

  return _shuffle([...self], self.length - 1);
}

/**
 * Returns a new array reversing the elements of the original array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const result = A.reverse([1, 2, 3]); // [3, 2, 1]
 * ```
 */
export function reverse<A>(self: readonly A[]): A[] {
  const reversed = [...self];

  const maxIndex = self.length - 1;
  const middleIndex = Math.floor(self.length / 2);

  for (let left = 0; left <= middleIndex; left++) {
    const right = maxIndex - left;
    [reversed[right], reversed[left]] = [reversed[left]!, reversed[right]!];
  }

  return reversed;
}

/**
 * Adds all the elements of an array separated by the specified separator string
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3], A.join(' | ')); // '1 | 2 | 3'
 * ```
 */
export function join(separator?: string): <A>(self: readonly A[]) => string {
  return (self) => self.join(separator);
}

// -------------------------------------
// filtering
// -------------------------------------

/**
 * Returns the elements of an array that meet the condition specified in a callback function
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * type Positive = number;
 *
 * const result = pipe(
 *   [-2, -1, 0, 1, 2, 3],
 *   A.filter((number): number is Positive => number > 0),
 * ); // [1, 2, 3]
 * ```
 */
export function filter<A, A2 extends A>(
  refinement: (item: A, index: number, array: readonly A[]) => item is A2,
): (self: readonly A[]) => A2[];
/**
 * Returns the elements of an array that meet the condition specified in a callback function
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe(
 *   [-2, -1, 0, 1, 2, 3],
 *   A.filter(number => number > 0),
 * ); // [1, 2, 3]
 * ```
 */
export function filter<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => A[];
export function filter(
  predicate: (item: any, index: number, array: readonly any[]) => boolean,
): (self: readonly any[]) => any[] {
  return (self) => self.filter(predicate);
}

/**
 * Returns the mapped elements of an array, filtering out the None values
 *
 * @example
 * ```ts
 * import { A, O, N, pipe, flow } from 'funkcia';
 *
 * const result = pipe(
 *   [-2, -1, 0, 1, 2, 3],
 *   A.filterMap(flow(
 *     O.fromPredicate(value => value > 0),
 *     O.map(N.multiply(5)),
 *   )),
 * ); // [5, 10, 15]
 * ```
 */
export function filterMap<A, B>(
  callback: (item: A, index: number, array: readonly A[]) => Option<B>,
): (self: readonly A[]) => B[] {
  return (self) => {
    const filtered: B[] = [];

    for (let index = 0; index < self.length; index++) {
      const item = self[index];

      if (!item) {
        continue; // eslint-disable-line no-continue
      }

      const maybeMapped = callback(item, index, self);

      if (isNone(maybeMapped)) {
        continue; // eslint-disable-line no-continue
      }

      filtered.push(maybeMapped.value);
    }

    return filtered;
  };
}

// -------------------------------------
// asserting
// -------------------------------------

/**
 * Determines whether all the members of an array satisfy the specified test
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * type Positive = number;
 *
 * const result = pipe([1, 2, 3], A.every((number): number is Positive => number > 0)); // true
 * ```
 */
export function every<A, A2 extends A>(
  refinement: (item: A, index: number, array: readonly A[]) => item is A2,
): (self: readonly A[]) => self is A2[];
/**
 * Determines whether all the members of an array satisfy the specified test
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3], A.every(number => number > 0)); // true
 * ```
 */
export function every<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => boolean;
export function every(
  predicate: (item: any, index: number, array: readonly any[]) => boolean,
): (self: readonly any[]) => boolean {
  return (self) => self.every(predicate);
}

/**
 * Determines whether the specified callback function returns true for any element of an array
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3], A.some(number => number > 0)); // true
 * ```
 */
export function some<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => boolean {
  return (self) => self.some(predicate);
}

/**
 * Determines whether an array includes a certain element, returning true or false as appropriate
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const result = pipe([1, 2, 3], A.includes(1)); // true
 * ```
 */
export function includes<A, B extends A>(
  searchElement: B extends string ? B | Omit<string, B> : B,
  fromIndex?: number,
): (self: readonly A[]) => boolean {
  return (self) => self.includes(searchElement as any, fromIndex);
}

// -------------------------------------
// composing
// -------------------------------------

/**
 * Combines two or more arrays. This method returns a new array without modifying any existing arrays
 *
 * @example
 * ```ts
 * import { A, pipe } from 'funkcia';
 *
 * const numbers = pipe([1, 2, 3], A.concat([4, 5], [6, 7, 8])); // [1, 2, 3, 4, 5, 6, 7, 8]
 * ```
 */
export function concat<A>(...args: A[][]): (self: A[]) => A[] {
  return (self) => self.concat(...args);
}

interface Difference {
  /**
   * Creates a new array with only the values not included in the second array
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const existingMembers = [1, 2, 3, 4, 5];
   * const mostUpToDateMembers = [4, 5, 6, 7, 8];
   *
   * const membersToRemove = pipe(existingMembers, A.difference(mostUpToDateMembers)); // [1, 2, 3]
   * ```
   */
  <A>(second: A[]): (first: A[]) => A[];
  /**
   * Creates a new array with only the values not included in the second array
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const existingMembers = [1, 2, 3, 4, 5];
   * const mostUpToDateMembers = [4, 5, 6, 7, 8];
   *
   * const membersToRemove = A.difference(existingMembers, mostUpToDateMembers); // [1, 2, 3]
   * ```
   */
  <A>(first: A[], second: A[]): A[];
}

/**
 * Creates a new array with only the values not included in the second array
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const existingMembers = [1, 2, 3, 4, 5];
 * const mostUpToDateMembers = [4, 5, 6, 7, 8];
 *
 * const membersToRemove = A.difference(existingMembers, mostUpToDateMembers); // [1, 2, 3]
 * ```
 */
export const difference: Difference = dual(2, (first: any[], second: any[]) => {
  if (!first.length) {
    return [];
  }

  if (!second.length) {
    return [...first];
  }

  const secondSet = new Set(second);
  return first.filter((value) => !secondSet.has(value));
});

interface Intersection {
  /**
   * Returns a new array with only the common values in both arrays
   *
   * @example
   * ```ts
   * import { A, pipe } from 'funkcia';
   *
   * const onlineUsers = [1, 2, 3, 4, 5];
   * const roomMembers = [2, 5, 7, 8, 9];
   *
   * const onlineRoomMembers = pipe(onlineUsers, A.intersect(roomMembers)); // [2, 5]
   * ```
   */
  <A>(second: A[]): (first: A[]) => A[];
  /**
   * Returns a new array with only the common values in both arrays
   *
   * @example
   * ```ts
   * import { A } from 'funkcia';
   *
   * const onlineUsers = [1, 2, 3, 4, 5];
   * const roomMembers = [2, 5, 7, 8, 9];
   *
   * const onlineRoomMembers = A.intersect(onlineUsers, roomMembers); // [2, 5]
   * ```
   */
  <A>(first: A[], second: A[]): A[];
}

/**
 * Returns a new array with only the common values in both arrays
 *
 * @example
 * ```ts
 * import { A } from 'funkcia';
 *
 * const onlineUsers = [1, 2, 3, 4, 5];
 * const roomMembers = [2, 5, 7, 8, 9];
 *
 * const onlineRoomMembers = A.intersect(onlineUsers, roomMembers); // [2, 5]
 * ```
 */
export const intersection: Intersection = dual(
  2,
  (first: any[], second: any[]) => {
    const firstSize = first.length;
    const secondSize = second.length;

    if (!firstSize || !secondSize) {
      return [];
    }

    const [shorter, larger] =
      firstSize < secondSize ? [first, second] : [second, first];

    const largerSet = new Set(larger);
    return shorter.filter((value) => largerSet.has(value));
  },
);
