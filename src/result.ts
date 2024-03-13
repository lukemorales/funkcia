/* eslint-disable prefer-destructuring */

import { dual } from './_internals/dual';
import { isSome, none, some } from './_internals/option';
import { type Pipeable } from './_internals/pipeable';
import * as _ from './_internals/result';
import { type Falsy, type Mutable, type Nullable } from './_internals/types';
import { identity, type Thunk } from './functions';
import type { Option } from './option';
import type { Predicate, Refinement } from './predicate';

// -------------------------------------
// constructors
// -------------------------------------

export type Result<E, O> = Err<E> | Ok<O>;

export type AsyncResult<E, O> = Promise<Result<E, O>>;

export interface Ok<out R> extends Pipeable {
  readonly _tag: 'Ok';
  readonly data: R;
}

export interface Err<out L> extends Pipeable {
  readonly _tag: 'Error';
  readonly error: L;
}

export const ok = _.ok;

export const error = _.error;

// -------------------------------------
// refinements
// -------------------------------------

export const isOk = _.isOk;

export const isError = _.isError;

export const isResult = _.isResult;

// -------------------------------------
// conversions
// -------------------------------------

interface FromNullable {
  <E>(
    onNullable: Thunk<E>,
  ): <O>(value: Nullable<O>) => Result<E, NonNullable<O>>;
  <E, O>(value: Nullable<O>, onNullable: Thunk<E>): Result<E, NonNullable<O>>;
}

export const fromNullable: FromNullable = dual(
  2,
  (value: any, onNullable: Thunk<any>) =>
    value == null ? _.error(onNullable()) : _.ok(value),
);

interface FromFalsy {
  <E>(
    onFalsy: Thunk<E>,
  ): <O>(value: O | Falsy) => Result<E, Exclude<NonNullable<O>, Falsy>>;
  <E, O>(
    value: O | Falsy,
    onFalsy: Thunk<E>,
  ): Result<E, Exclude<NonNullable<O>, Falsy>>;
}

export const fromFalsy: FromFalsy = dual(
  2,
  (value: any, onFalsy: Thunk<any>) =>
    value ? _.ok(value) : _.error(onFalsy()),
);

interface FromPredicate {
  <E, O, U extends O>(
    refinement: Refinement<O, U>,
    onDissatisfied: (failure: Exclude<O, U>) => E,
  ): (value: O) => Result<E, U>;
  <E, O>(
    predicate: Predicate<O>,
    onDissatisfied: (failure: O) => E,
  ): (value: O) => Result<E, O>;
  <E, O, U extends O>(
    value: O,
    refinement: Refinement<O, U>,
    onDissatisfied: (failure: Exclude<O, U>) => E,
  ): Result<E, U>;
  <E, O>(
    value: O,
    predicate: Predicate<O>,
    onDissatisfied: (failure: O) => E,
  ): Result<E, O>;
}

export const fromPredicate: FromPredicate = dual(
  3,
  (value: any, predicate: Predicate<any>, onErr: (failure: any) => any) =>
    predicate(value) ? _.ok(value) : _.error(onErr(value)),
);

export function fromThrowable<E, O>(
  cb: () => E,
  onException: (reason: unknown) => O,
): Result<O, E> {
  try {
    return _.ok(cb());
  } catch (e) {
    return _.error(onException(e));
  }
}

interface FromOption {
  <E>(onNone: Thunk<E>): <O>(option: Option<O>) => Result<E, O>;
  <E, O>(option: Option<O>, onNone: Thunk<E>): Result<E, O>;
}

export const fromOption: FromOption = dual(
  2,
  (option: any, onNone: Thunk<any>) =>
    isSome(option) ? _.ok(option.value) : _.error(onNone()),
);

export function toOption<E, O>(result: Result<E, O>): Option<O> {
  return _.isOk(result) ? some(result.data) : none();
}

// -------------------------------------
// lifting
// -------------------------------------

export function liftNullable<A extends readonly unknown[], E, O>(
  callback: (...args: A) => Nullable<O>,
  onNull: () => E,
): (...args: A) => Result<E, NonNullable<O>> {
  return (...args: A) => fromNullable(callback(...args), onNull);
}

export function liftThrowable<A extends readonly unknown[], E, O>(
  callback: (...args: A) => O,
  onException: (reason: unknown) => E,
): (...args: A) => Result<E, O> {
  return (...args) => fromThrowable(() => callback(...args), onException);
}

// -------------------------------------
// replacements
// -------------------------------------

export function fallback<E2, O2>(
  spare: Thunk<Result<E2, O2>>,
): <E, O>(self: Result<E, O>) => Result<E2, O | O2> {
  return (self) => (_.isOk(self) ? self : spare());
}

// -------------------------------------
// mappers
// -------------------------------------

export function map<O, O2>(
  onOk: (success: O) => O2,
): <E>(self: Result<E, O>) => Result<E, O2> {
  return (self) => {
    if (_.isOk(self)) {
      (self as unknown as Mutable<Ok<O2>>).data = onOk(self.data);
    }

    return self as any;
  };
}

export function mapError<E, E2>(
  onError: (failure: E) => E2,
): <O>(self: Result<E, O>) => Result<E2, O> {
  return (self) => {
    if (_.isError(self)) {
      (self as unknown as Mutable<Err<E2>>).error = onError(self.error);
    }

    return self as any;
  };
}

export function flatMap<E, E2, O, O2>(
  onOk: (success: O) => Result<E2, O2>,
): (self: Result<E, O>) => Result<E | E2, O2> {
  return (self) => (_.isOk(self) ? onOk(self.data) : self);
}

export function flatMapNullable<E, E2, O, O2>(
  onOk: (success: O) => Nullable<O2>,
  onNullable: () => E2,
): (self: Result<E, O>) => Result<E | E2, NonNullable<O2>> {
  return (self) =>
    _.isOk(self) ? fromNullable(onOk(self.data), onNullable) : self;
}

export const flatten: <E, E2, O>(
  self: Result<E, Result<E2, O>>,
) => Result<E | E2, O> = flatMap(identity);

// -------------------------------------
// filtering
// -------------------------------------

// @ts-expect-error the compiler complains about the implementation, but the overloading works fine
export function filter<O, O2 extends O, E2>(
  refinement: Refinement<O, O2>,
  onDissatisfied: (value: Exclude<O, O2>) => E2,
): <E>(self: Result<E, O>) => Result<E | E2, O2>;
export function filter<O, E2>(
  predicate: Predicate<O>,
  onDissatisfied: (value: O) => E2,
): <E>(self: Result<E, O>) => Result<E | E2, O>;
export function filter(
  predicate: (value: any) => boolean,
  onDissatisfied: (value: any) => void,
) {
  return (self: Result<any, any>) => {
    if (_.isError(self)) {
      return self;
    }

    return predicate(self.data) ? self : _.error(onDissatisfied(self.data));
  };
}

// -------------------------------------
// getters
// -------------------------------------

export function match<E, E2, O, O2>(
  onErr: (error: E) => E2,
  onOk: (data: O) => O2,
): (self: Result<E, O>) => E2 | O2 {
  return (self) => (_.isOk(self) ? onOk(self.data) : onErr(self.error));
}

export const merge: <E, O>(self: Result<E, O>) => E | O = match(
  identity,
  identity,
);

export function getOrElse<E, E2>(
  onError: (error: E) => E2,
): <O>(self: Result<E, O>) => E2 | O {
  return match(onError, identity);
}

export const unwrap: <E, O>(self: Result<E, O>) => O = getOrElse(() => {
  throw new Error('Failed to unwrap Result value');
});

export function expect<B extends globalThis.Error>(
  onError: LazyValue<B>,
): <E, O>(self: Result<E, O>) => O {
  return getOrElse(() => {
    throw onError();
  });
}
