import { type Predicate } from './_internals/predicate';

export function not<A>(predicate: Predicate<A>): Predicate<A> {
  return (a) => !predicate(a);
}
