import { pipeable, type Pipeable } from './pipeable';
import { isPrimitive } from './primitives';

export type Option<A> = None | Some<A>;

export interface Some<A> extends Pipeable {
  readonly _tag: 'Some';
  readonly value: A;
}

export interface None extends Pipeable {
  readonly _tag: 'None';
}

const _none: Option<never> = {
  _tag: 'None',
  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return pipeable(this, arguments);
  },
};

export function none(): Option<never> {
  return _none;
}

export function some<T>(value: T): Option<T> {
  return {
    _tag: 'Some',
    value,
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return pipeable(this, arguments);
    },
  };
}

export function isOption(value: unknown): value is Option<unknown> {
  return isPrimitive(value) && (value._tag === 'Some' || value._tag === 'None');
}

export function isNone(value: Option<unknown>): value is None {
  return value._tag === 'None';
}

export function isSome<T>(value: Option<unknown>): value is Some<T> {
  return value._tag === 'Some';
}
