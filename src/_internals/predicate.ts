export type Predicate<A> = (a: A) => boolean;

export type TypePredicate<A, B extends A> = (a: A) => a is B;
