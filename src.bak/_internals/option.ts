import type { None, Option, Some } from '../option.bak';
import { isFunkciaConstructor } from './core';
import { pipeable } from './pipeable';

const _none = Object.freeze<Option<never>>({
  _tag: 'None',
  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return pipeable(this, arguments);
  },
});

export function none(): Option<never> {
  return _none;
}

export function some<T>(value: T): Option<T> {
  return {
    _tag: 'Some',
    value,
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return pipeable({ ...this }, arguments);
    },
  };
}

export function isOption(value: unknown): value is Option<unknown> {
  return (
    isFunkciaConstructor(value) &&
    (value._tag === 'Some' || value._tag === 'None')
  );
}

export function isNone(value: Option<unknown>): value is None {
  return value._tag === 'None';
}

export function isSome<T>(value: Option<unknown>): value is Some<T> {
  return value._tag === 'Some';
}
