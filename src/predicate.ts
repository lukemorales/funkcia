export declare namespace Predicate {
  export type Predicate<A> = (a: A) => boolean;

  export type Guard<A, B extends A> = (a: A) => a is B;

  export type $inferRefinedValue<$Guard extends Guard<any, any>> =
    $Guard extends (arg: any) => arg is infer R ? R : never;

  export type Refine<A, B extends A> =
    Exclude<A, B> extends never ? A : Exclude<A, B>;
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
