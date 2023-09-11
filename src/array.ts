/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as O from './option';

export function first<A>(array: readonly A[]): O.Option<A> {
  return array.length ? O.some(array[0]!) : O.none();
}

export function last<A>(array: readonly A[]): O.Option<A> {
  return array.length ? O.some(array[array.length - 1]!) : O.none();
}

export function head<A>(array: readonly A[]): O.Option<[A, ...A[]]> {
  return array.length
    ? O.some(array.slice(0, array.length - 1) as any)
    : O.none();
}

export function tail<A>(array: readonly A[]): O.Option<[...A[], A]> {
  return array.length ? O.some(array.slice(1) as any) : O.none();
}

export function map<A, B>(
  callback: (item: A) => B,
): (array: readonly A[]) => B[] {
  return (array) => array.map(callback);
}
