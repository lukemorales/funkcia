/* eslint-disable no-param-reassign, prefer-destructuring */
import { dual } from './_internals/dual';
import * as _ from './_internals/either';
import { isSome } from './_internals/option';
import { type Pipeable } from './_internals/pipeable';
import { type Falsy, type Mutable, type Nullable } from './_internals/types';
import { identity, type LazyValue } from './functions';
import type { Option } from './option';
import type { Predicate, Refinement } from './predicate';

// -------------------------------------
// constructors
// -------------------------------------

export type Either<L, R> = Left<L> | Right<R>;

export interface Right<R> extends Pipeable {
  readonly _tag: 'Right';
  readonly right: R;
}

export interface Left<L> extends Pipeable {
  readonly _tag: 'Left';
  readonly left: L;
}

export const right = _.right;

export const left = _.left;

// -------------------------------------
// refinements
// -------------------------------------

export const isRight = _.isRight;

export const isLeft = _.isLeft;

export const isEither = _.isEither;

// -------------------------------------
// conversions
// -------------------------------------

interface FromNullable {
  <L>(
    onNullable: LazyValue<L>,
  ): <R>(value: Nullable<R>) => Either<L, NonNullable<R>>;
  <L, R>(
    value: Nullable<R>,
    onNullable: LazyValue<L>,
  ): Either<L, NonNullable<R>>;
}

export const fromNullable: FromNullable = dual(
  2,
  (value: any, onNullable: LazyValue<any>) =>
    value == null ? _.left(onNullable()) : _.right(value),
);

interface FromFalsy {
  <L>(
    onFalsy: LazyValue<L>,
  ): <R>(value: R | Falsy) => Either<L, Exclude<NonNullable<R>, Falsy>>;
  <L, R>(
    value: R | Falsy,
    onFalsy: LazyValue<L>,
  ): Either<L, Exclude<NonNullable<R>, Falsy>>;
}

export const fromFalsy: FromFalsy = dual(
  2,
  (value: any, onFalsy: LazyValue<any>) =>
    value ? _.right(value as any) : _.left(onFalsy()),
);

interface FromPredicate {
  <L, A, R extends A>(
    typePredicate: Refinement<A, R>,
    onDissatisfied: (failure: A) => L,
  ): (value: A) => Either<L, R>;
  <L, R>(
    predicate: Predicate<R>,
    onDissatisfied: (failure: R) => L,
  ): (value: R) => Either<L, R>;
  <L, A, R extends A>(
    value: A,
    typePredicate: Refinement<A, R>,
    onDissatisfied: (failure: A) => L,
  ): Either<L, R>;
  <L, R>(
    value: R,
    predicate: Predicate<R>,
    onDissatisfied: (failure: R) => L,
  ): Either<L, R>;
}

export const fromPredicate: FromPredicate = dual(
  3,
  (value: any, predicate: Predicate<any>, onLeft: (failure: any) => any) =>
    predicate(value) ? _.right(value) : _.left(onLeft(value)),
);

export function fromThrowable<R, L>(
  cb: () => R,
  onException: (reason: unknown) => L,
): Either<L, R> {
  try {
    return _.right(cb());
  } catch (error) {
    return _.left(onException(error));
  }
}

interface FromOption {
  <L>(onNone: LazyValue<L>): <R>(option: Option<R>) => Either<L, R>;
  <L, R>(option: Option<R>, onNone: LazyValue<L>): Either<L, R>;
}

export const fromOption: FromOption = dual(
  2,
  (option: any, onLeft: LazyValue<any>) =>
    isSome(option) ? _.right(option.value) : _.left(onLeft()),
);

// -------------------------------------
// lifting
// -------------------------------------

export function liftNullable<A extends readonly unknown[], R, L>(
  callback: (...args: A) => Nullable<R>,
  onNull: () => L,
): (...args: A) => Either<L, NonNullable<R>> {
  return (...args: A) => fromNullable(callback(...args), onNull);
}

export function liftThrowable<A extends readonly unknown[], R, L>(
  callback: (...args: A) => R,
  onException: (reason: unknown) => L,
): (...args: A) => Either<L, R> {
  return (...args) => fromThrowable(() => callback(...args), onException);
}

// -------------------------------------
// replacements
// -------------------------------------

export function fallback<L2, R2>(
  spare: LazyValue<Either<L2, R2>>,
): <L, R>(self: Either<L, R>) => Either<L2, R | R2> {
  return (self) => (_.isRight(self) ? self : spare());
}

// -------------------------------------
// mappers
// -------------------------------------

export function map<R, R2>(
  onRight: (success: R) => R2,
): <L>(self: Either<L, R>) => Either<L, R2> {
  return (self) => {
    if (_.isRight(self)) {
      (self as unknown as Mutable<Right<R2>>).right = onRight(self.right);
    }

    return self as any;
  };
}

export function mapLeft<L, L2>(
  onLeft: (failure: L) => L2,
): <R>(self: Either<L, R>) => Either<L2, R> {
  return (self) => {
    if (_.isLeft(self)) {
      (self as unknown as Mutable<Left<L2>>).left = onLeft(self.left);
    }

    return self as any;
  };
}

export function mapBoth<L, L2, R, R2>(
  onLeft: (failure: L) => L2,
  onRight: (success: R) => R2,
): (self: Either<L, R>) => Either<L2, R2> {
  return (self) => {
    if (_.isLeft(self)) {
      (self as unknown as Mutable<Left<L2>>).left = onLeft(self.left);
    } else {
      (self as unknown as Mutable<Right<R2>>).right = onRight(self.right);
    }

    return self as any;
  };
}

export function flatMap<L, L2, R, R2>(
  onRight: (success: R) => Either<L2, R2>,
): (self: Either<L, R>) => Either<L | L2, R2> {
  return (self) => (_.isRight(self) ? onRight(self.right) : self);
}

export function flatMapNullable<L, L2, R, R2>(
  onRight: (success: R) => Nullable<R2>,
  onNullable: () => L2,
): (self: Either<L, R>) => Either<L | L2, NonNullable<R2>> {
  return (self) =>
    _.isRight(self) ? fromNullable(onRight(self.right), onNullable) : self;
}

export const flatten: <L, L2, R>(
  self: Either<L, Either<L2, R>>,
) => Either<L | L2, R> = flatMap(identity);

// -------------------------------------
// filtering
// -------------------------------------

export function filter<R, R2 extends R, L2>(
  typePredicate: Refinement<R, R2>,
  onDissatisfied: (value: R) => L2,
): <L>(self: Either<L, R>) => Either<L | L2, R2>;
export function filter<R, L2>(
  predicate: Predicate<R>,
  onDissatisfied: (value: R) => L2,
): <L>(self: Either<L, R>) => Either<L | L2, R>;
export function filter(
  predicate: Predicate<unknown>,
  onDissatisfied: (value: unknown) => unknown,
): (self: Either<unknown, unknown>) => Either<unknown, unknown> {
  return (self) => {
    if (_.isLeft(self)) {
      return self;
    }

    return predicate(self.right) ? self : _.left(onDissatisfied(self.right));
  };
}

// -------------------------------------
// getters
// -------------------------------------

export function match<L, R, L2, R2>(
  onLeft: (failure: L) => L2,
  onRight: (success: R) => R2,
): (self: Either<L, R>) => L2 | R2 {
  return (self) => (_.isRight(self) ? onRight(self.right) : onLeft(self.left));
}

export const merge: <L, R>(self: Either<L, R>) => L | R = match(
  identity,
  identity,
);

export function getOrElse<L, L2>(
  onLeft: (failure: L) => L2,
): <R>(self: Either<L, R>) => L2 | R {
  return match(onLeft, identity);
}

export const unwrap = getOrElse(() => {
  throw new Error('Failed to unwrap Either value');
});

export function expect<B extends Error>(onLeft: LazyValue<B>) {
  return getOrElse(() => {
    throw onLeft();
  });
}
