export type Predicate<A> = (a: A) => boolean;

export type Refinement<A, B extends A> = (a: A) => a is B;

export type EqualityFn<A> = (a: A, b: A) => boolean;

export type RefinedValue<A, B extends A> =
  Exclude<A, B> extends never ? A : Exclude<A, B>;

/**
 * Returns a new function that will return the opposite boolean value of the original predicate.
 *
 * @example
 * ```ts
 * import { not } from 'funkcia';
 *
 * const isGreaterThanZero = (value: number): boolean => value > 0;
 * const isLessOrEqualToZero = not(isGreaterThanZero);
 *
 * const result = isLessOrEqualToZero(-1);
 *         //^?  true
 * ```
 */
export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a);
}
