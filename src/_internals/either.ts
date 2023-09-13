import type { Either, Left, Right } from '../either';
import { isFunkciaConstructor } from './core';
import { pipeable } from './pipeable';

export function left<L>(failure: L): Either<L, never> {
  return {
    _tag: 'Left',
    left: failure,
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return pipeable({ ...this }, arguments);
    },
  };
}

export function right<R>(success: R): Either<never, R> {
  return {
    _tag: 'Right',
    right: success,
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return pipeable({ ...this }, arguments);
    },
  };
}

export function isEither(value: unknown): value is Either<unknown, unknown> {
  return (
    isFunkciaConstructor(value) &&
    (value._tag === 'Left' || value._tag === 'Right')
  );
}

export function isLeft<L>(value: Either<L, unknown>): value is Left<L> {
  return value._tag === 'Left';
}

export function isRight<R>(value: Either<unknown, R>): value is Right<R> {
  return value._tag === 'Right';
}
