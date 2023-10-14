/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { dual } from './_internals/dual';
import { isNone } from './_internals/option';
import { identity } from './functions';
import type { Option } from './option';
import {
  none as noneOption,
  fromNullable as optionFromNullable,
  fromPredicate as optionFromPredicate,
  some as someOption,
} from './option';
import { not } from './predicate';

// -------------------------------------
// constructors
// -------------------------------------

export function create(size: number): number[];
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

export function empty<A>(): A[] {
  return [];
}

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

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isEmpty<A>(self: readonly A[]): self is [] {
  return self.length === 0;
}

export type NonEmptyArray<A> = [A, ...A[]];

export function isNonEmpty<A>(self: readonly A[]): self is NonEmptyArray<A> {
  return self.length > 0;
}

// -------------------------------------
// getters
// -------------------------------------

interface Take {
  <A>(amount: number): (self: readonly A[]) => A[];
  <A>(self: readonly A[], amount: number): A[];
}

export const take: Take = dual(2, (self: readonly any[], amount: number) => {
  if (amount <= 0) {
    return [];
  }

  return self.slice(0, amount);
});

interface TakeWhile {
  <A>(predicate: (item: A) => boolean): (self: readonly A[]) => A[];
  <A>(self: readonly A[], predicate: (item: A) => boolean): A[];
}

export const takeWhile: TakeWhile = dual(
  2,
  (self: any[], predicate: (item: any) => boolean): any[] => {
    const indexOfFirstElementThatDoesNotSatisfiesPredicate = self.findIndex(
      not(predicate),
    );

    if (indexOfFirstElementThatDoesNotSatisfiesPredicate < 0) {
      return [];
    }

    return self.slice(0, indexOfFirstElementThatDoesNotSatisfiesPredicate);
  },
);

export function head<A>(self: readonly A[]): Option<A> {
  return isNonEmpty(self) ? someOption(self[0]) : noneOption();
}

export function last<A>(self: readonly A[]): Option<A> {
  return isNonEmpty(self) ? someOption(self[self.length - 1]!) : noneOption();
}

export function init<A>(self: readonly A[]): Option<NonEmptyArray<A>> {
  return isNonEmpty(self)
    ? someOption(self.slice(0, self.length - 1) as any)
    : noneOption();
}

export function tail<A>(self: readonly A[]): Option<NonEmptyArray<A>> {
  return isNonEmpty(self) ? someOption(self.slice(1) as any) : noneOption();
}

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

export function find<A, A2 extends A>(
  refinement: (item: A, index: number, array: readonly A[]) => item is A2,
): (self: readonly A[]) => Option<A2>;
export function find<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => Option<A>;
export function find(
  predicate: (item: any, index: number, array: readonly any[]) => boolean,
): (self: readonly any[]) => Option<any> {
  return (self) => optionFromNullable(self.find(predicate));
}

export function findIndex<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => Option<number> {
  return (self) =>
    optionFromPredicate(self.findIndex(predicate), (index) => index >= 0);
}

export function length<A>(self: readonly A[]): number {
  return self.length;
}

// -------------------------------------
// transforming
// -------------------------------------

export function map<A, B>(
  callback: (item: A, index: number, array: readonly A[]) => B,
): (self: readonly A[]) => B[] {
  return (self) => self.map(callback);
}

export function flatMap<A, B>(
  callback: (item: A, index: number, array: readonly A[]) => B | readonly B[],
): (self: readonly A[]) => B[] {
  return (self) => self.flatMap(callback);
}

interface Drop {
  <A>(howMany: number): (self: readonly A[]) => A[];
  <A>(self: readonly A[], howMany: number): A[];
}

export const drop: Drop = dual(2, (self: readonly any[], howMany: number) =>
  self.slice(howMany),
);

interface DropWhile {
  <A>(predicate: (item: A) => boolean): (self: readonly A[]) => A[];
  <A>(self: readonly A[], predicate: (item: A) => boolean): A[];
}

export const dropWhile: DropWhile = dual(
  2,
  (self: any[], predicate: (item: any) => boolean): any[] => {
    const copy = [...self];

    for (const item of self) {
      if (!predicate(item)) {
        break;
      }

      copy.shift();
    }

    return copy;
  },
);

interface Append {
  <A>(item: A): (self: readonly A[]) => A[];
  <A>(self: readonly A[], item: A): A[];
}

export const append: Append = dual(2, (self: readonly any[], item: any) => [
  ...self,
  item,
]);

interface Prepend {
  <A>(item: A): (self: readonly A[]) => A[];
  <A>(self: readonly A[], item: A): A[];
}

export const prepend: Prepend = dual(2, (self: readonly any[], item: any) => [
  item,
  ...self,
]);

export function reduce<A, B>(
  initialValue: B,
  reducer: (acc: B, current: A, index: number, array: readonly A[]) => B,
): (self: readonly A[]) => B {
  return (self) => self.reduce(reducer, initialValue);
}

export function sort<A>(
  compare?: (a: A, b: A) => number,
): (self: readonly A[]) => A[] {
  return (self) => [...self].sort(compare);
}

interface QuickSort {
  <A, B>(getValue?: (item: A) => B): (self: readonly A[]) => A[];
  <A, B>(self: readonly A[], getValue?: (item: A) => B): A[];
}

export const quickSort: QuickSort = (...args: any[]) => {
  const implementation = dual(
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
    return implementation(identity);
  }

  if (args.length === 1 && Array.isArray(args[0])) {
    return implementation(...args, identity);
  }

  return implementation(...args);
};

export function shuffle<A>(self: readonly A[]): A[] {
  function _shuffle(array: A[], left: number): A[] {
    const right = Math.floor(Math.random() * (left + 1));
    // eslint-disable-next-line no-param-reassign
    [array[left], array[right]] = [array[right]!, array[left]!];

    return left > 0 ? _shuffle(array, left - 1) : array;
  }

  return _shuffle([...self], self.length - 1);
}

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

export function join(separator?: string): <A>(self: readonly A[]) => string {
  return (self) => self.join(separator);
}

// -------------------------------------
// filtering
// -------------------------------------

export function filter<A, A2 extends A>(
  refinement: (item: A, index: number, array: readonly A[]) => item is A2,
): (self: readonly A[]) => A2[];
export function filter<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => A[];
export function filter(
  predicate: (item: any, index: number, array: readonly any[]) => boolean,
): (self: readonly any[]) => any[] {
  return (self) => self.filter(predicate);
}

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

export function every<A, A2 extends A>(
  refinement: (item: A, index: number, array: readonly A[]) => item is A2,
): (self: readonly A[]) => self is A2[];
export function every<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => boolean;
export function every(
  predicate: (item: any, index: number, array: readonly any[]) => boolean,
): (self: readonly any[]) => boolean {
  return (self) => self.every(predicate);
}

export function some<A>(
  predicate: (item: A, index: number, array: readonly A[]) => boolean,
): (self: readonly A[]) => boolean {
  return (self) => self.some(predicate);
}

export function includes<A, B extends A>(
  searchElement: B extends string ? B | Omit<string, B> : B,
  fromIndex?: number,
): (self: readonly A[]) => boolean {
  return (self) => self.includes(searchElement as any, fromIndex);
}

// -------------------------------------
// composing
// -------------------------------------

export function concat<A>(...args: A[][]): (self: A[]) => A[] {
  return (self) => self.concat(...args);
}

interface Difference {
  <A>(second: A[]): (first: A[]) => A[];
  <A>(first: A[], second: A[]): A[];
}

export const difference: Difference = dual(2, (first: any[], second: any[]) => {
  const firstSize = first.length;
  const secondSize = second.length;

  if (!firstSize && !secondSize) {
    return [];
  }

  if (firstSize && !secondSize) {
    return [...first];
  }

  if (!firstSize && secondSize) {
    return [...second];
  }

  const firstSet = new Set(first);
  const secondSet = new Set(second);

  return first
    .concat(second)
    .filter((value) => !firstSet.has(value) || !secondSet.has(value));
});

interface Intersection {
  <A>(second: A[]): (first: A[]) => A[];
  <A>(first: A[], second: A[]): A[];
}

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
