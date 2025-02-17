import * as A from './array';
import * as N from './number';
import * as O from './option.bak';
import * as P from './predicate';
import * as R from './result.bak';
import * as S from './string';

export * from './functions';
export {
  A,
  N,
  O,
  P,
  R,
  S,
  A as array,
  N as number,
  O as option,
  P as predicate,
  R as result,
  S as string,
};

export type { AsyncOption, None, Option, Some } from './option.bak';
export type { AsyncResult, Err, Ok, Result } from './result.bak';
