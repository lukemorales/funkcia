export declare namespace Predicate {
  /**
   * Represents a function that tests a value and returns a boolean.
   */
  type Predicate<A> = (a: A) => boolean;

  /**
   * Represents a type guard function that refines a type `A` to a more specific type `B`.
   */
  type Guard<A, B extends A> = (a: A) => a is B;

  /**
   * Utility type that extracts the refined type `B` from a `Guard<A, B>`.
   */
  type Guarded<$Guard extends Guard<any, any>> = $Guard extends Guard<
    infer _,
    infer R
  >
    ? R
    : never;

  /**
   * Utility type that computes the type that was excluded by the type guard refinement.
   */
  type Unguarded<A, B extends A> = Exclude<A, B> extends never
    ? A
    : Exclude<A, B>;
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
