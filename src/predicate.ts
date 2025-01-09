export declare namespace Predicate {
  type Predicate<A> = (a: A) => boolean;

  type Guard<A, B extends A> = (a: A) => a is B;

  type $inferRefinedValue<$Guard extends Guard<any, any>> =
    $Guard extends Guard<infer _, infer R> ? R : never;

  type Refine<A, B extends A> = Exclude<A, B> extends never ? A : Exclude<A, B>;
}

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
export function not<A>(
  predicate: Predicate.Predicate<A>,
): Predicate.Predicate<A> {
  return (a) => !predicate(a);
}
