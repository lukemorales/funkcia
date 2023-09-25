import type { Err, Ok, Result } from '../result';
import { isFunkciaConstructor } from './core';
import { pipeable } from './pipeable';

export function error<L>(failure: L): Result<L, never> {
  return {
    _tag: 'Error',
    error: failure,
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return pipeable({ ...this }, arguments);
    },
  };
}

export function ok<R>(data: R): Result<never, R> {
  return {
    _tag: 'Ok',
    data,
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return pipeable({ ...this }, arguments);
    },
  };
}

export function isResult(value: unknown): value is Result<unknown, unknown> {
  return (
    isFunkciaConstructor(value) &&
    (value._tag === 'Error' || value._tag === 'Ok')
  );
}

export function isError<L>(value: Result<L, unknown>): value is Err<L> {
  return value._tag === 'Error';
}

export function isOk<R>(value: Result<unknown, R>): value is Ok<R> {
  return value._tag === 'Ok';
}
