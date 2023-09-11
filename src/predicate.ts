export type Predicate<A> = (a: A) => boolean;

export type Refinement<A, B extends A> = (a: A) => a is B;

export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a);
}
