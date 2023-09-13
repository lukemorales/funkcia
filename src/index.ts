import * as A from './array';
import * as E from './either';
import * as N from './number';
import * as O from './option';
import * as P from './predicate';
import * as S from './string';

export * from './functions';
export {
  A,
  E,
  N,
  O,
  P,
  S,
  A as array,
  E as either,
  N as number,
  O as option,
  P as predicate,
  S as string,
};

export type { Either, Left, Right } from './either';
export type { None, Option, Some } from './option';
