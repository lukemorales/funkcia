/* eslint-disable no-param-reassign,, prefer-destructuring */
import { dual } from './_internals/dual';
import { isRight, type Either } from './_internals/either';
import * as _ from './_internals/option';
import type { Predicate, TypePredicate } from './_internals/predicate';
import { type Falsy, type Mutable, type Nullable } from './_internals/types';
import {
  constNull,
  constUndefined,
  identity,
  type LazyValue,
} from './functions';

export type { None, Option, Some } from './_internals/option';

// -------------------------------------
// constructors
// -------------------------------------

export const some = _.some;

export const none = _.none;

// -------------------------------------
// refinements
// -------------------------------------

export const isSome = _.isSome;

export const isNone = _.isNone;

export const isOption = _.isOption;

// -------------------------------------
// conversions
// -------------------------------------

/**
 * If value is `null` or `undefined`, returns `None`.
 *
 * Otherwise, returns the value wrapped in a `Some`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const stringOption = O.fromNullable('hello world');
 *               //^?  Some<string>
 * const emptyOption = O.fromNullable(null);
 *              //^?  None
 * ```
 */
export function fromNullable<T>(value: Nullable<T>): _.Option<NonNullable<T>> {
  return value == null ? _.none() : _.some(value);
}

/**
 * If value is a falsy value (`undefined | null | NaN | 0 | 0n | "" (empty string) | false`), returns `None`.
 *
 * Otherwise, returns the value wrapped in a `Some`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const stringOption = O.fromFalsy('hello world');
 *               //^?  Some<string>
 * const emptyOption = O.fromFalsy('');
 *              //^?  None
 * ```
 */
export function fromFalsy<T>(
  value: T | Falsy,
): _.Option<Exclude<NonNullable<T>, Falsy>> {
  return value ? _.some(value as any) : _.none();
}

/**
 * Wraps a function that might throw an exception. If the function throws, returns a `None`.
 *
 * Otherwise, returns the result of the function wrapped in a `Some`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const someOption = O.fromThrowable(() => JSON.parse('{ "enabled": true }'));
 *             //^?  Some<{ enabled: true }>
 *
 * const emptyOption = O.fromThrowable(() => JSON.parse('{{ }}'));
 *              //^?  None
 * ```
 */
export function fromThrowable<A>(f: () => A): _.Option<A> {
  try {
    return _.some(f());
  } catch {
    return _.none();
  }
}

interface FromPredicate {
  <A, B extends A>(
    typePredicate: TypePredicate<A, B>,
  ): (value: A) => _.Option<B>;
  <A>(predicate: Predicate<A>): (value: A) => _.Option<A>;
  <A, B extends A>(value: A, typePredicate: TypePredicate<A, B>): _.Option<B>;
  <A>(value: A, predicate: Predicate<A>): _.Option<A>;
}

/**
 * Constructs an `Option` based on a type predicate. If the predicate evaluates to `false`, returns `None`.
 *
 * Otherwise, returns the value wrapped in a `Some` narrowed to the specific type.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * interface Square {
 *   kind: 'square';
 *   size: number;
 * }
 *
 * interface Circle {
 *   kind: 'circle';
 *   radius: number;
 * }
 *
 * type Shape = Square | Circle;
 *
 * const shape: Shape = { kind: 'square', size: 2 };
 *
 * const someOption = O.fromPredicate(
 *   shape,
 *   (figure): figure is Square => figure.kind === 'square',
 * ); // Some<Square>
 *
 * const emptyOption = O.fromPredicate<Shape>(
 *   shape,
 *   (figure) => figure.kind === 'circle',
 * ); // None
 * ```
 *
 *
 * @example
 * ```ts
 * import { O, pipe } from 'funkcia';
 *
 * interface Square {
 *   kind: 'square';
 *   size: number;
 * }
 *
 * interface Circle {
 *   kind: 'circle';
 *   radius: number;
 * }
 *
 * type Shape = Square | Circle;
 *
 * const shape: Shape = { kind: 'square', size: 2 };
 *
 * const someOption = pipe(
 *   shape,
 *   O.fromPredicate((figure): figure is Square => figure.kind === 'square'),
 * ); // Some<Square>
 *
 * const emptyOption = pipe(
 *   shape,
 *   O.fromPredicate((figure) => figure.kind === 'circle'),
 * ); // None
 * ```
 */
export const fromPredicate: FromPredicate = dual(
  2,
  (value: any, predicate: Predicate<any>) =>
    predicate(value) ? _.some(value) : _.none(),
);

/**
 * Transforms an `Either` into an `Option` discarding the error.
 *
 * @example
 * ```ts
 * import { O, E } from 'funkcia';
 *
 * const someOption = O.fromEither(E.right(10));
 *             //^?  Some<number>
 *
 * const emptyOption = O.fromEither(E.left('Computation failure'));
 *              //^?  None
 * ```
 */
export function fromEither<A>(either: Either<unknown, A>): _.Option<A> {
  return isRight(either) ? _.some(either.right) : _.none();
}

// -------------------------------------
// lifting
// -------------------------------------

/**
 * Lifts a function that returns a nullable value into a function that returns an `Option`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * function divide(dividend: number, divisor: number): number | null {
 *   return divisor === 0 ? null : dividend / divisor;
 * }
 *
 * const safeDivide = O.liftNullable(divide);
 *
 * const someOption = safeDivide(10, 2);
 *             //^?  Some<number>
 *
 * const emptyOption = safeDivide(2, 0);
 *              //^?  None
 * ```
 */
export function liftNullable<A extends readonly unknown[], B>(
  callback: (...args: A) => Nullable<B>,
): (...args: A) => _.Option<NonNullable<B>> {
  return (...args: A) => fromNullable(callback(...args));
}

/**
 * Lifts a function that might throw exceptions into a function that returns an `Option`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const safeJsonParse = O.liftThrowable(JSON.parse);
 *
 * const someOption = safeJsonParse('{ "enabled": true }');
 *             //^?  Some<{ enabled: true }>
 *
 * const emptyOption = safeJsonParse('{{ }}');
 *              //^?  None
 * ```
 */
export function liftThrowable<A extends readonly unknown[], B>(
  callback: (...args: A) => B,
): (...args: A) => _.Option<B> {
  return (...args) => fromThrowable(() => callback(...args));
}

// -------------------------------------
// replacements
// -------------------------------------

export function fallback<B>(
  spare: LazyValue<_.Option<B>>,
): <A>(self: _.Option<A>) => _.Option<A | B> {
  return (self) => (_.isNone(self) ? spare() : self);
}

// -------------------------------------
// transforming
// -------------------------------------

/**
 * Maps the `Some` side of an `Option` value to a new `Option` value.
 *
 * Otherwise, the operation is a noop.
 *
 * @example
 * import { O } from 'funkcia';
 *
 * const someOption = O.some('John').pipe(O.map(name => `Hello, ${name}`));
 *             //^?  Some<'Hello, John'>
 *
 * const emptyOption = O.none().pipe(O.map(name => `Hello, ${name}`));
 *              //^?  None
 */
export function map<A, B>(
  onSome: (value: A) => B,
): (self: _.Option<A>) => _.Option<B> {
  return (self) => {
    if (_.isSome(self)) {
      (self as unknown as Mutable<_.Some<B>>).value = onSome(self.value);
    }

    return self as _.Option<B>;
  };
}

/**
 * Takes a callback and injects the `Option` value as the argument, if it is a `Some`, allowing to **map** the value to some other value.
 *
 * Otherwise, the operation is a noop.
 *
 * @example
 * import { O } from 'funkcia';
 *
 * interface Address {
 *   home?: { street: string | null };
 * };
 *
 * const address: Address = { home: { street: '5th Avenue' } };
 *
 * const someOption = O.fromNullable(address.home).pipe(O.flatMap(home => O.fromNullable(home.street)));
 *             //^?  Option<string>
 *
 * const emptyOption = O.fromNullable(address.home).pipe(O.map(home => O.fromNullable(home.street)));
 *              //^?  Option<Option<string>>
 */
export function flatMap<A, B>(
  onSome: (value: A) => _.Option<B>,
): (self: _.Option<A>) => _.Option<B> {
  return (self) => (_.isSome(self) ? onSome(self.value) : self);
}

/**
 * Takes a callback and injects the `Option` value as the argument, if it is a `Some`, allowing to **map** the value to some other value.
 *
 * Otherwise, the operation is a noop.
 *
 * @example
 * import { O } from 'funkcia';
 *
 * interface Address {
 *   home?: { street: string | null };
 * };
 *
 * const address: Address = { home: { street: '5th Avenue' } };
 *
 * const someOption = O.fromNullable(address.home).pipe(O.flatMapNullable(home => home.street));
 *             //^?  Option<string>
 */
export function flatMapNullable<A, B>(
  onSome: (a: A) => Nullable<B>,
): (self: _.Option<A>) => _.Option<NonNullable<B>> {
  return (self) => (_.isSome(self) ? fromNullable(onSome(self.value)) : self);
}

export const flatten: <A>(self: _.Option<_.Option<A>>) => _.Option<A> =
  flatMap(identity);

// -------------------------------------
// filtering
// -------------------------------------

/**
 * Filters an `Option` using a predicate.
 *
 * If the predicate is satisfied, the original `Option` is left untouched. If the predicate is not satisfied or the `Option` is `None`, it returns `None`.
 *
 * @example
 * import { O } from 'funkcia';
 *
 * interface Square {
 *   kind: 'square';
 *   size: number;
 * }
 *
 * interface Circle {
 *   kind: 'circle';
 *   radius: number;
 * }
 *
 * type Shape = Square | Circle;
 *
 * const shape: Shape = { kind: 'square', size: 2 };
 *
 * const someOption = O.some(shape).pipe(
 *   O.filter((figure): figure is Square => figure.kind === 'square'),
 * ); // Some<Square>
 *
 * const emptyOption = O.some(shape).pipe(
 *   O.filter((figure): figure is Circle => figure.kind === 'circle'),
 * ); // None
 */
export function filter<A, B extends A>(
  typePredicate: TypePredicate<A, B>,
): (self: _.Option<A>) => _.Option<B>;
/**
 * Filters an `Option` using a predicate.
 *
 * If the predicate is satisfied, the original `Option` is left untouched. If the predicate is not satisfied or the `Option` is `None`, it returns `None`.
 *
 * @example
 * import { O } from 'funkcia';
 *
 * interface Square {
 *   kind: 'square';
 *   size: number;
 * }
 *
 * interface Circle {
 *   kind: 'circle';
 *   radius: number;
 * }
 *
 * type Shape = Square | Circle;
 *
 * const someOption = O.some<Shape>({ kind: 'square', size: 2 }).pipe(
 *   O.filter((figure) => figure.kind === 'square'),
 * ); // Some<Shape>
 *
 * const emptyOption = O.some<Shape>({ kind: 'square', size: 2 }).pipe(
 *   O.filter((figure) => figure.kind === 'circle'),
 * ); // None
 */
export function filter<A>(
  predicate: Predicate<A>,
): (self: _.Option<A>) => _.Option<A>;
export function filter(
  predicate: Predicate<unknown>,
): (self: _.Option<unknown>) => _.Option<unknown> {
  return (self) => {
    if (_.isNone(self)) {
      return self;
    }

    return predicate(self.value) ? self : _.none();
  };
}

// -------------------------------------
// getters
// -------------------------------------

/**
 * Matches the given `Option` and returns either the provided `onNone` value or the result of the provided `onSome`
 * function when passed the `Option`'s value.
 *
 * @example
 * import { O } from 'funkcia';
 *
 * const greeting = O.some('John').pipe(O.match(() => 'Greeting!', name => `Hello, ${name}`));
 *           //^?  'Hello, John'
 *
 * const salutation = O.none().pipe(O.match(() => 'Greeting!', name => `Hello, ${name}`));
 *             //^?  'Greeting!'
 */
export function match<A, B, C>(
  onNone: LazyValue<C>,
  onSome: (value: A) => B,
): (self: _.Option<A>) => B | C {
  return (option) => (_.isSome(option) ? onSome(option.value) : onNone());
}

/**
 * Unwraps the `Option` value. If `Option` is a `None`, returns the provided fallback instead.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const greeting = O.some('Hello world').pipe(O.getOrElse(() => 'Greeting!'));
 *           //^?  'Hello world'
 *
 * const salutation = O.none().pipe(O.getOrElse(() => 'Greeting!'));
 *             //^?  'John Doe'
 * ```
 */
export function getOrElse<B>(
  onNone: LazyValue<B>,
): <A>(self: _.Option<A>) => A | B {
  return match(onNone, identity);
}

/**
 * Unwraps the `Option` value. If `Option` is a `None`, throws an Error.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const greeting = O.some('Hello world').pipe(O.unwrap);
 *           //^?  'Hellow world'
 *
 * const salutation = O.none().pipe(O.unwrap);
 *             //^?  Uncaught exception: 'Failed to unwrap Option value'
 * ```
 */
export const unwrap = getOrElse(() => {
  throw new Error('Failed to unwrap Option value');
});

/**
 * Unwraps the `Option` value. If `Option` is a `None`, throws the provided Error.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const user = O.some<User>({ id: 'user_01' }).pipe(O.expect(() => UserNotFound('user_01')));
 *       //^?  User
 *
 * const team = O.none().pipe(O.expect(() => TeamNotFound('team_01')));
 *       //^?  Uncaught exception: 'Team not found: "team_01"'
 * ```
 */
export function expect<B extends Error>(onNone: LazyValue<B>) {
  return getOrElse(() => {
    throw onNone();
  });
}

/**
 * Unwraps the `Option` value. If `Option` is a `None`, returns `null`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const user = O.some<User>({ id: 'user_01' }).pipe(O.toNull);
 *       //^?  User | null
 * ```
 */
export const toNull = getOrElse(constNull);

/**
 * Unwraps the `Option` value. If `Option` is a `None`, returns `undefined`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const user = O.some<User>({ id: 'user_01' }).pipe(O.toUndefined);
 *       //^?  User | undefined
 * ```
 */
export const toUndefined = getOrElse(constUndefined);

/**
 * Transforms an `Option` into an `Array`.
 *
 * If the input is `Some`, the value is wrapped in an array.
 * If the input is `None`, an empty array is returned.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const collection = O.some('john doe').pipe(O.toArray);
 *             //^?  ['john doe']
 *
 * const emptyCollection = O.none().pipe(O.toArray);
 *                  //^?  []
 * ```
 */
export function toArray<A>(self: _.Option<A>): A[] {
  return _.isSome(self) ? [self.value] : [];
}

/**
 * Returns `true` if the predicate is satisfied by the wrapped value.
 *
 * If the predicate is not satisfied or the `Option` is `None`, it returns `false`.
 *
 * @example
 * ```ts
 * import { O } from 'funkcia';
 *
 * const isPositive = O.some(18).pipe(O.satisfies(value => value > 0));
 *             //^?  true
 * ```
 */
export function satisfies<A>(
  predicate: Predicate<A>,
): (self: _.Option<A>) => boolean {
  return (self) => _.isSome(self) && predicate(self.value);
}
