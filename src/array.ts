/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { none, some, type Option } from './option';

export function first<A>(array: readonly A[]): Option<A> {
  return array.length ? some(array[0]!) : none();
}

export function last<A>(array: readonly A[]): Option<A> {
  return array.length ? some(array[array.length - 1]!) : none();
}

export function head<A>(array: readonly A[]): Option<[A, ...A[]]> {
  return array.length ? some(array.slice(0, array.length - 1) as any) : none();
}

export function tail<A>(array: readonly A[]): Option<[...A[], A]> {
  return array.length ? some(array.slice(1) as any) : none();
}

export function map<A, B>(
  callback: (item: A) => B,
): (array: readonly A[]) => B[] {
  return (array) => array.map(callback);
}
