/* eslint-disable no-param-reassign, prefer-destructuring */
import { dual } from './_internals/dual';
import * as _ from './_internals/either';
import { isSome, type Option } from './_internals/option';
import { type Predicate, type TypePredicate } from './_internals/predicate';
import { type Falsy, type Mutable, type Nullable } from './_internals/types';
import { identity, type LazyValue } from './functions';

export type { Either, Left, Right } from './_internals/either';

// -------------------------------------
// constructors
// -------------------------------------

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
  ): <R>(value: Nullable<R>) => _.Either<L, NonNullable<R>>;
  <L, R>(
    value: Nullable<R>,
    onNullable: LazyValue<L>,
  ): _.Either<L, NonNullable<R>>;
}

export const fromNullable: FromNullable = dual(
  2,
  (value: any, onNullable: LazyValue<any>) =>
    value == null ? _.left(onNullable()) : _.right(value),
);

interface FromFalsy {
  <L>(
    onFalsy: LazyValue<L>,
  ): <R>(value: R | Falsy) => _.Either<L, Exclude<NonNullable<R>, Falsy>>;
  <L, R>(
    value: R | Falsy,
    onFalsy: LazyValue<L>,
  ): _.Either<L, Exclude<NonNullable<R>, Falsy>>;
}

export const fromFalsy: FromFalsy = dual(
  2,
  (value: any, onFalsy: LazyValue<any>) =>
    value ? _.right(value as any) : _.left(onFalsy()),
);

interface FromPredicate {
  <L, A, R extends A>(
    typePredicate: TypePredicate<A, R>,
    onDissatisfied: (failure: A) => L,
  ): (value: A) => _.Either<L, R>;
  <L, R>(
    predicate: Predicate<R>,
    onDissatisfied: (failure: R) => L,
  ): (value: R) => _.Either<L, R>;
  <L, A, R extends A>(
    value: A,
    typePredicate: TypePredicate<A, R>,
    onDissatisfied: (failure: A) => L,
  ): _.Either<L, R>;
  <L, R>(
    value: R,
    predicate: Predicate<R>,
    onDissatisfied: (failure: R) => L,
  ): _.Either<L, R>;
}

export const fromPredicate: FromPredicate = dual(
  3,
  (value: any, predicate: Predicate<any>, onLeft: (failure: any) => any) =>
    predicate(value) ? _.right(value) : _.left(onLeft(value)),
);

export function fromThrowable<R, L>(
  cb: () => R,
  onException: (reason: unknown) => L,
): _.Either<L, R> {
  try {
    return _.right(cb());
  } catch (error) {
    return _.left(onException(error));
  }
}

interface FromOption {
  <L>(onNone: LazyValue<L>): <R>(option: Option<R>) => _.Either<L, R>;
  <L, R>(option: Option<R>, onNone: LazyValue<L>): _.Either<L, R>;
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
): (...args: A) => _.Either<L, NonNullable<R>> {
  return (...args: A) => fromNullable(callback(...args), onNull);
}

export function liftThrowable<A extends readonly unknown[], R, L>(
  callback: (...args: A) => R,
  onException: (reason: unknown) => L,
): (...args: A) => _.Either<L, R> {
  return (...args) => fromThrowable(() => callback(...args), onException);
}

// -------------------------------------
// replacements
// -------------------------------------

export function fallback<L2, R2>(
  spare: LazyValue<_.Either<L2, R2>>,
): <L, R>(self: _.Either<L, R>) => _.Either<L2, R | R2> {
  return (self) => (_.isRight(self) ? self : spare());
}

// -------------------------------------
// mappers
// -------------------------------------

export function map<R, R2>(
  onRight: (success: R) => R2,
): <L>(self: _.Either<L, R>) => _.Either<L, R2> {
  return (self) => {
    if (_.isRight(self)) {
      (self as unknown as Mutable<_.Right<R2>>).right = onRight(self.right);
    }

    return self as any;
  };
}

export function mapLeft<L, L2>(
  onLeft: (failure: L) => L2,
): <R>(self: _.Either<L, R>) => _.Either<L2, R> {
  return (self) => {
    if (_.isLeft(self)) {
      (self as unknown as Mutable<_.Left<L2>>).left = onLeft(self.left);
    }

    return self as any;
  };
}

export function mapBoth<L, L2, R, R2>(
  onLeft: (failure: L) => L2,
  onRight: (success: R) => R2,
): (self: _.Either<L, R>) => _.Either<L2, R2> {
  return (self) => {
    if (_.isLeft(self)) {
      (self as unknown as Mutable<_.Left<L2>>).left = onLeft(self.left);
    } else {
      (self as unknown as Mutable<_.Right<R2>>).right = onRight(self.right);
    }

    return self as any;
  };
}

export function flatMap<L, L2, R, R2>(
  onRight: (success: R) => _.Either<L2, R2>,
): (self: _.Either<L, R>) => _.Either<L | L2, R2> {
  return (self) => (_.isRight(self) ? onRight(self.right) : self);
}

export function flatMapNullable<L, L2, R, R2>(
  onRight: (success: R) => Nullable<R2>,
  onNullable: () => L2,
): (self: _.Either<L, R>) => _.Either<L | L2, NonNullable<R2>> {
  return (self) =>
    _.isRight(self) ? fromNullable(onRight(self.right), onNullable) : self;
}

export const flatten: <L, L2, R>(
  self: _.Either<L, _.Either<L2, R>>,
) => _.Either<L | L2, R> = flatMap(identity);

// -------------------------------------
// filtering
// -------------------------------------

export function filter<R, R2 extends R, L2>(
  typePredicate: TypePredicate<R, R2>,
  onDissatisfied: (value: R) => L2,
): <L>(self: _.Either<L, R>) => _.Either<L | L2, R2>;
export function filter<R, L2>(
  predicate: Predicate<R>,
  onDissatisfied: (value: R) => L2,
): <L>(self: _.Either<L, R>) => _.Either<L | L2, R>;
export function filter(
  predicate: Predicate<unknown>,
  onDissatisfied: (value: unknown) => unknown,
): (self: _.Either<unknown, unknown>) => _.Either<unknown, unknown> {
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
): (self: _.Either<L, R>) => L2 | R2 {
  return (self) => (_.isRight(self) ? onRight(self.right) : onLeft(self.left));
}

export const merge: <L, R>(self: _.Either<L, R>) => L | R = match(
  identity,
  identity,
);

export function getOrElse<L, L2>(
  onLeft: (failure: L) => L2,
): <R>(self: _.Either<L, R>) => L2 | R {
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
