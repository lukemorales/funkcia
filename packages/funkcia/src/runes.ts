import { Option } from './option';

class RunicMap<K, V> extends Map<K, V> {
  // @ts-expect-error - overriding the get method to return an Option
  override get(key: K): Option<NonNullable<V>> {
    return Option.fromNullable(super.get(key));
  }
}

export function $map<K, V>(iterable?: Iterable<readonly [K, V]> | null) {
  return new RunicMap(iterable);
}

class RunicArray<T> extends Array<T> {
  static override from<T>(iterable: Iterable<T> | ArrayLike<T>): RunicArray<T>;
  static override from<T, U>(
    items: Iterable<T> | ArrayLike<T>,
    mapFn: (value: T, index: number) => U,
    thisArg?: any,
  ): RunicArray<U>;
  static override from(
    items: Iterable<any> | ArrayLike<any>,
    mapFn?: (value: any, index: number) => any,
    thisArg?: any,
  ): RunicArray<any>;

  static override from(
    items: Iterable<any> | ArrayLike<any>,
    mapFn?: (value: any, index: number) => any,
    thisArg?: any,
  ): RunicArray<any> {
    //@ts-expect-error - overriding the from method to return an RunicArray
    return new RunicArray(...Array.from(items, mapFn, thisArg));
  }

  /**
   * Returns `Some` with the item located at the specified index if it exists, otherwise `None`.
   * @param index The zero-based index of the desired code unit. A negative index will count back from the last item.
   */
  //@ts-expect-error - overriding the at method to return an Option
  override at(index: number): Option<NonNullable<T>> {
    if ('at' in Array.prototype) return Option.fromNullable(super.at(index));
    return Option.fromNullable(this[index]);
  }

  /**
   * Returns the value of the first element in the array where predicate is true, and undefined
   * otherwise.
   * @param predicate find calls predicate once for each element of the array, in ascending
   * order, until it finds one where predicate returns true. If such an element is found, find
   * immediately returns that element value. Otherwise, find returns undefined.
   * @param thisArg If provided, it will be used as the this value for each invocation of
   * predicate. If it is not provided, undefined is used instead.
   */
  //@ts-expect-error - overriding the find method to return an Option
  override find<S extends T>(
    predicate: (this: void, value: T, index: number, obj: T[]) => value is S,
    thisArg?: any,
  ): Option<NonNullable<S>>;
  //@ts-expect-error - overriding the find method to return an Option
  override find(
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: any,
  ): Option<NonNullable<T>>;
  //@ts-expect-error - overriding the find method to return an Option
  override find(
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: any,
  ): Option<NonNullable<T>> {
    return Option.fromNullable(super.find(predicate, thisArg));
  }

  /**
   * Returns `Some` with the index of the first element in the array where predicate is true, and `None` otherwise.
   * @param predicate find calls predicate once for each element of the array, in ascending
   * order, until it finds one where predicate returns true. If such an element is found,
   * findIndex immediately returns that element index. Otherwise, findIndex returns -1.
   * @param thisArg If provided, it will be used as the this value for each invocation of
   * predicate.
   */
  //@ts-expect-error - overriding the findIndex method to return an Option
  override findIndex(
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: any,
  ): Option<number> {
    return this.validateIndex(super.findIndex(predicate, thisArg));
  }

  /**
   * Returns `Some` with the index of the first occurrence of a value in an array, or `None` if it is not present.
   * @param searchElement The value to locate in the array.
   * @param fromIndex The array index at which to begin the search. If fromIndex is omitted, the search starts at index 0.
   */
  //@ts-expect-error - overriding the indexOf method to return an Option
  override indexOf(searchElement: T, fromIndex?: number): Option<number> {
    return this.validateIndex(super.indexOf(searchElement, fromIndex));
  }

  /**
   * Returns `Some` with the index of the last occurrence of a specified value in an array, or `None` if it is not present.
   * @param searchElement The value to locate in the array.
   * @param fromIndex The array index at which to begin searching backward. If fromIndex is omitted, the search starts at the last index in the array.
   */
  //@ts-expect-error - overriding the lastIndexOf method to return an Option
  override lastIndexOf(
    ...args: Parameters<typeof Array.prototype.lastIndexOf>
  ): Option<number> {
    return this.validateIndex(super.lastIndexOf(...args));
  }

  /**
   * Removes the last element from an array and returns `Some` with the item if it exists.
   * If the array is empty, `None` is returned and the array is not modified.
   */
  //@ts-expect-error - overriding the pop method to return an Option
  override pop(): Option<NonNullable<T>> {
    return Option.fromNullable(super.pop());
  }

  /**
   * Removes the first element from an array and returns `Some` with the item if it exists.
   * If the array is empty, `None` is returned and the array is not modified.
   */
  //@ts-expect-error - overriding the shift method to return an Option
  override shift(): Option<NonNullable<T>> {
    return Option.fromNullable(super.shift());
  }

  private validateIndex = Option.predicate((index: number) => index >= 0);
}

export type { RunicMap, RunicArray };

export function $array<T>(iterable: Iterable<T> | ArrayLike<T>): RunicArray<T>;
export function $array<T, U>(
  items: Iterable<T> | ArrayLike<T>,
  mapFn: (value: T, index: number) => U,
  thisArg?: any,
): RunicArray<U>;
export function $array(
  items: Iterable<any> | ArrayLike<any>,
  mapFn?: (value: any, index: number) => any,
  thisArg?: any,
): RunicArray<any> {
  return RunicArray.from(items, mapFn, thisArg);
}
