/* eslint-disable @typescript-eslint/no-namespace */

import type { DoNotation } from './do-notation';
import {
  FailedPredicateError,
  NoValueError,
  UnknownError,
  UnwrapError,
} from './exceptions';
import { alwaysNull, alwaysUndefined, identity } from './functions';
import { FunkciaStore } from './funkcia-store';
import type { EqualityFn } from './internals/equality';
import { isEqual } from './internals/equality';
import type { Falsy, Nullable, Thunk, Tuple } from './internals/types';
import { beautify, emptyObject } from './internals/utils';
import type { Option } from './option';
import type { AsyncOption } from './option.async';
import type { Predicate } from './predicate';
import type { AsyncResult } from './result.async';

const okSymbol = Symbol('Result::Ok');
const errorSymbol = Symbol('Result::Error');

/**
 * Error handling with `Result`.
 *
 * `Result` represents the result of an operation that can either be successful (`Ok`) or return an error (`Error`).
 *
 * `Result` is commonly used to represent the result of a function that can fail, such as a network request, a file read, or a database query.
 */
export class Result<Value, Error>
  implements DoNotation.Signed<'Result', Value>
{
  readonly #tag: Result.$ok | Result.$error;

  readonly #value: Value;

  readonly #error: Error;

  private constructor(kind: Result.$ok, value: Value);

  private constructor(kind: Result.$error, value: Error);

  private constructor(kind: Result.$ok | Result.$error, value?: any) {
    this.#tag = kind;
    this.#value = kind === okSymbol ? value : undefined;
    this.#error = kind === errorSymbol ? value : undefined;
  }

  // ------------------------
  // #region: CONSTRUCTORS---
  // ------------------------

  /**
   * Constructs an `Ok` `Result` with the provided value.
   *
   * Use it to explicitly construct an `OK`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<number, never>
   * //      ▼
   * const result = Result.ok(10);
   * ```
   */
  static ok<Value>(value: Value): Result<Value, never> {
    return new Result(okSymbol, value);
  }

  /**
   * @alias
   * Alias of `Result.ok` - constructs an `Ok` `Result` with the provided value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<number, never>
   * //      ▼
   * const result = Result.of(10);
   * ```
   */
  static of: <Value>(value: Value) => Result<Value, never> = Result.ok; // eslint-disable-line @typescript-eslint/member-ordering, @typescript-eslint/no-shadow

  /**
   * Constructs an `Error` result with the provided value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * function divide(numerator: number, denominator: number): Result<number, InvalidDenominator> {
   *   if (denominator === 0) {
   *     return Result.error(new InvalidDenominator('Division by zero'));
   *   }
   *
   *   return Result.ok(numerator / denominator);
   * }
   * ```
   */
  static error<Error>(error: NonNullable<Error>): Result<never, Error> {
    return new Result(errorSymbol, error);
  }

  /**
   * Constructs a `Result` from a nullable value.
   *
   * If the value is `null` or `undefined`, it returns a `Result.Error` with a `NoValueError` exception.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<string, NoValueError>
   * //      ▼
   * const result = Result.fromNullable(localStorage.getItem('@app/theme'));
   * ```
   */
  static fromNullable<Value>(
    value: Nullable<Value>,
  ): Result<NonNullable<Value>, NoValueError>;

  /**
   * Constructs a `Result` from a nullable value.
   *
   * If the value is `null` or `undefined`, it returns a `Result.Error` using the provided `onNullable` callback.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<string, Error>
   * //      ▼
   * const result = Result.fromNullable(
   *   localStorage.getItem('@app/theme'),
   *   () => new Error('Theme not set'),
   * );
   * ```
   */
  static fromNullable<Value, Error extends {}>(
    value: Nullable<Value>,
    onNullable: Thunk<Error>,
  ): Result<NonNullable<Value>, Error>;

  static fromNullable(value: any, onNullable?: Thunk<any>): Result<any, any> {
    return value != null
      ? (Result.ok(value) as any)
      : Result.error(onNullable?.() ?? new NoValueError());
  }

  /**
   * Constructs a `Result` from a _falsy_ value.
   *
   * If the value is _falsy_, it returns a `Result.Error` result with a `NoValueError` exception.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── Result<string, NoValueError>
   * //      ▼
   * const result = Result.fromFalsy(user.lastName?.trim());
   * ```
   */
  static fromFalsy<Value>(
    value: Value | Falsy,
  ): Result<Exclude<NonNullable<Value>, Falsy>, NoValueError>;

  /**
   * Constructs a `Result` from a _falsy_ value.
   *
   * If the value is _falsy_, it returns a `Result.Error` using the provided `onFalsy` callback.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── Result<string, Error>
   * //      ▼
   * const result = Result.fromFalsy(
   *   user.lastName?.trim(),
   *   () => new Error('User missing last name'),
   * );
   * ```
   */
  static fromFalsy<Value, Error extends {}>(
    value: Value | Falsy,
    onFalsy: (value: Falsy) => Error,
  ): Result<Exclude<NonNullable<Value>, Falsy>, Error>;

  static fromFalsy(
    value: any,
    onFalsy?: (value: any) => any,
  ): Result<any, any> {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!value)
      return Result.error(onFalsy?.(value) ?? new NoValueError()) as never;

    return Result.ok(value);
  }

  /**
   * Constructs a `Result` from a function that may throw.
   *
   * If the function executes successfully, it returns a `Result.Ok`.
   * Otherwise, it returns a `Result.Error` containing an `UnknownError` with the thrown exception.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── Result<URL, UnknownError>
   * //     ▼
   * const url = Result.try(() => new URL('example.com'));
   * // Output: Error(UnknownError)
   * ```
   */
  static try<Value>(fn: () => Value): Result<Value, UnknownError>;

  /**
   * Constructs a `Result` from a function that may throw.
   *
   * If the function does not throw, it returns a `Result.Ok`.
   * Otherwise, it returns a `Result.Error` containing the output of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── Result<URL, Error>
   * //     ▼
   * const url = Result.try(
   *   () => new URL('example.com'),
   *   (error) => new Error('Invalid URL'),
   * );
   * // Output: Error('Invalid URL')
   * ```
   */
  static try<Value, Error extends {}>(
    fn: () => Value,
    onThrow: (error: unknown) => Error,
  ): Result<Value, Error>;

  static try(
    fn: Thunk<any>,
    onThrow?: (error: unknown) => any,
  ): Result<any, any> {
    try {
      return Result.ok(fn());
    } catch (e) {
      return Result.error(onThrow?.(e) ?? new UnknownError(String(e))) as never;
    }
  }

  /**
   * Converts a function that may throw an exception to an enhanced function that returns a `Result`.
   *
   * If the function executes successfully, it returns a `Result.Ok` with the value obtained.
   * If an exception occurs, it returns a `Result.Error` with an `UnknownError` that contains the thrown exception.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── (text: string, reviver?: Function) => Result<any, UnknownError>
   * //         ▼
   * const safeJsonParse = Result.liftFn(JSON.parse);
   *
   * //       ┌─── Result<any, UnknownError>
   * //       ▼
   * const result = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Ok({ name: 'John Doe' })
   * ```
   */
  static liftFun<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Result<Value, UnknownError>;

  /**
   * Converts a function that may throw an exception to an enhanced function that returns a `Result`.
   *
   * If the function executes successfully, it returns a `Result.Ok` with the obtained value.
   * If an exception occurs, it returns a `Result.Error` from the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── (text: string, reviver?: Function) => Result<any, TypeError>
   * //         ▼
   * const safeJsonParse = Result.liftFn(
   *   JSON.parse,
   *   (error) => new TypeError('Invalid JSON'),
   * );
   *
   * //       ┌─── Result<any, TypeError>
   * //       ▼
   * const result = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Ok({ name: 'John Doe' })
   * ```
   */
  static liftFun<Args extends readonly unknown[], Value, Error extends {}>(
    callback: (...args: Args) => Value,
    onThrow: (error: unknown) => Error,
  ): (...args: Args) => Result<Value, Error>;

  static liftFun(
    callback: (...args: any[]) => any,
    onThrow?: (error: unknown) => any,
  ): (...args: any[]) => Result<any, any> {
    return (...args) => Result.try(() => callback(...args), onThrow as never);
  }

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `Result.Ok`, narrowing the value to the specified type predicate, if the predicate is fulfilled.
   *
   * If the test fails, returns a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //         ┌─── (shape: Shape) => Result<Circle, FailedPredicateError<Square>>
   * //         ▼
   * const ensureCircle = Result.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── Result<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = ensureCircle(input);
   * ```
   */
  static predicate<Criteria extends Predicate.Guard<any, any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Guard<infer Input, infer Output>
    ? Result<Output, FailedPredicateError<Predicate.Unguarded<Input, Output>>>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, returns a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //          ┌─── (value: number) => Result<number, FailedPredicateError<number>>
   * //          ▼
   * const ensurePositive = Result.predicate(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── Result<number, FailedPredicateError<number>>
   * //       ▼
   * const result = ensurePositive(10);
   * // Output: Ok(10)
   * ```
   */
  static predicate<Criteria extends Predicate.Predicate<any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Predicate<infer Input>
    ? Result<Input, FailedPredicateError<Input>>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `Result.Ok`, narrowing the value to the specified type predicate, if the predicate is fulfilled.
   *
   * If the test fails, it returns a `Result.Error` with the value provided by the `onUnfulfilled` function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //          ┌─── (shape: Shape) => Result<Circle, InvalidShapeError>
   * //          ▼
   * const ensureCircle = Result.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * //   ┌─── Square
   * //   ▼
   *   (shape) => new InvalidShapeError(shape.kind),
   * );
   *
   * //       ┌─── Result<Circle, InvalidShapeError>
   * //       ▼
   * const result = ensureCircle(input);
   * ```
   */
  static predicate<
    Criteria extends Predicate.Guard<any, any>,
    Error extends {},
  >(
    criteria: Criteria,
    onUnfulfilled: (
      input: Criteria extends Predicate.Guard<infer Input, infer Output>
        ? Predicate.Unguarded<Input, Output>
        : never,
    ) => Error,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Guard<infer _, infer Output>
    ? Result<Output, Error>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, it returns a `Result.Error` with the value provided by the `onUnfulfilled` function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //          ┌─── (value: number) => Result<number, InvalidNumberError>
   * //          ▼
   * const ensurePositive = Result.predicate(
   *   (value: number) => value > 0,
   *   (value) => new InvalidNumberError(value),
   * );
   *
   * //       ┌─── Result<number, InvalidNumberError>
   * //       ▼
   * const result = ensurePositive(10);
   * // Output: Ok(10)
   * ```
   */
  static predicate<Criteria extends Predicate.Predicate<any>, Error extends {}>(
    criteria: Criteria,
    onUnfulfilled: (
      input: Criteria extends Predicate.Predicate<infer Input> ? Input : never,
    ) => Error,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Predicate<infer Input>
    ? Result<Input, Error>
    : never;

  static predicate(
    criteria: Predicate.Predicate<any>,
    onUnfulfilled?: (input: any) => any,
  ): (value: any) => Result<any, any> {
    return (value) => Result.of(value).filter(criteria, onUnfulfilled as never);
  }

  /**
   * Evaluates a generator early returning when a `Result.Error` is propagated
   * or returning the `Result` returned by the generator.
   *
   * `yield*` a `Result<Value, Error>` unwraps values and propagates `Error`s.
   *
   * If the value is `Result.error<E>`, then it will return `Result.Error<E>`
   * from the enclosing function.
   *
   * If applied to `Result.Ok<U>`, then it will unwrap the value to evaluate `U`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function safeParseInt(value: string): Result<number, ParseIntError>;
   *
   * //       ┌─── Result<number, ParseIntError>
   * //       ▼
   * const result = Result.relay(function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns Result.Error<ParseIntError> immediately
   *
   *   return Result.ok(x + y); // doesn't run
   * });
   * // Output: Error(ParseIntError)
   * ```
   */
  static relay<Value, Error extends {}>(
    generator: () => Generator<
      Error,
      Result<Value, never> | Result<Value, any>
    >,
  ): Result<Value, Error> {
    const { done, value } = generator().next();

    return done ? value : (Result.error(value) as never);
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: COMBINATORS---
  // -----------------------

  /**
   * Given an array of `Result`s, returns an array containing only the values inside `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = Result.values([
   *   Result.ok(1),
   *   Result.error<number>('Failed computation'),
   *   Result.ok(3),
   * ]);
   * // Output: [1, 3]
   * ```
   */
  static values<Value>(
    results: Array<Result<Value, any> | Result<never, any>>,
  ): Array<DoNotation.Unsign<Value>> {
    return results.reduce<Array<DoNotation.Unsign<Value>>>((acc, result) => {
      if (result.isOk()) acc.push(result.unwrap());

      return acc;
    }, []);
  }

  /**
   * Combines two `Result`s into a single `Result` containing a tuple of their values,
   * if both `Result`s are `Ok` variants, otherwise, returns `Result.Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const first = Result.some('hello');
   * const second = Result.some('world');
   *
   * //       ┌─── Result<[string, string], never>
   * //       ▼
   * const strings = first.zip(second);
   * // Output: Ok(['hello', 'world'])
   * ```
   */
  zip<Value2, Error2>(
    that: Result<Value2, Error2>,
  ): Result<
    Tuple<DoNotation.Unsign<Value>, DoNotation.Unsign<Value2>>,
    Error | Error2
  > {
    return this.andThen((a) => that.map((b) => [a, b])) as never;
  }

  /**
   * Combines two `Result`s into a single `Result`. The new value is produced
   * by applying the given function to both values, if both `Result`s are `Ok` variants,
   * otherwise, returns `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   *
   * const first = Result.some('hello');
   * const second = Result.some('world');
   *
   * //        ┌─── Result<string, never>
   * //        ▼
   * const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
   * // Output: Ok('hello world')
   * ```
   */
  zipWith<Value2, Error2, Output>(
    that: Result<Value2, Error2>,
    fn: (
      arg0: DoNotation.Unsign<Value>,
      arg1: DoNotation.Unsign<Value2>,
    ) => Output,
  ): Result<Output, Error | Error2> {
    return this.zip(that).map((results) => fn(...results) as any);
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: DO-NOTATION---
  // -----------------------

  /**
   * Initiates a `Do-notation` for the `Result` type, allowing to write code
   * in a more declarative style, similar to the “do notation” in other programming languages.
   * It provides a way to define variables and perform operations on them
   * using functions like `bind` and `let`, piping the returned values into a context object.
   *
   * Within the `Do` scope, you can use the `bind` function to bind a value to a variable.
   * The `bind` function takes two arguments: the name of the variable and a function that returns a `Result` to be bound.
   * If the returned `Result` is `Ok`, the value is assigned to the variable in the context object.
   * If the returned `Result` is `Error`, the parent `Result` running the `Do` simulation becomes an `Error`.
   *
   * You can also use the `let` function to bind a simple value to a variable.
   * The `let` function takes two arguments: the name of the variable and a function that returns a value to be bound.
   * You can return any value from the function, like a `string`, `number`, `boolean` etc,
   * and it will be assigned to the variable in the context object.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUser(id: string): Result<User, UserNotFound>;
   *
   * declare function getUserScore(user: User): Result<UserScore, UserNotScoredError>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserNotScoredError>
   * //        ▼
   * const userLevel = Result.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  static get Do(): Result<DoNotation.Sign, never> {
    return new Result(okSymbol, emptyObject) as never;
  }

  /**
   * Initiates a `Do-notation` with the current `Result`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUserScore(user: User): Result<UserScore, UserNotScoredError>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * declare const user: Result<User, UserNotFound>;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserNotScoredError>
   * //        ▼
   * const userLevel = user
   *   .bindTo('user')
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   * ```
   */
  bindTo<Key extends string>(
    key: Key,
  ): Result<DoNotation.Sign<{ [K in Key]: Value }>, Error> {
    return Result.Do.bind(key as never, () => this as never) as never;
  }

  /**
   * Binds a `Result` to the context object in a `Do-notation`.
   *
   * If the `Result` is `Ok`, the value is assigned to the key in the context object.
   * If the `Result` is `Error`, the parent `Result` running the `Do` simulation becomes an `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUser(id: string): Result<User, UserNotFound>;
   *
   * declare function getUserScore(user: User): Result<UserScore, UserNotScoredError>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserNotScoredError>
   * //        ▼
   * const userLevel = Result.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   * ```
   */
  bind<Key extends string, ValueToBind, NewError>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'Result', 'bind'>,
    key: Exclude<Key, keyof Value>,
    cb: (ctx: DoNotation.Unsign<Value>) => Result<ValueToBind, NewError>,
  ): Result<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error | NewError
  > {
    return (this as Result<Value, Error>).andThen((ctx) =>
      cb(ctx).map(
        (value) =>
          // eslint-disable-next-line prefer-object-spread
          Object.assign({ [key]: value }, ctx) as {},
      ),
    ) as never;
  }

  /**
   * Binds a raw value to the context object in a `Do-notation`.
   *
   * The value is assigned to the key in the context object.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<number, never>
   * //       ▼
   * const result = Result.Do
   *   .let('a', () => 10)
   * //            ┌─── { a: number }
   * //            ▼
   *   .let('b', (ctx) => ctx.a * 2)
   *   .map((ctx) => a + b);
   * //       ▲
   * //       └─── { a: number; b: number }
   * ```
   */
  let<Key extends string, ValueToBind>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'Result', 'let'>,
    key: Exclude<Key, keyof Value>,
    cb: (scope: DoNotation.Unsign<Value>) => ValueToBind,
  ): Result<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error
  > {
    // @ts-expect-error the compiler is complaining because of DoNotation check in argument `this`
    return (this as Result<Value, Error>).bind(key, (ctx) =>
      Result.ok(cb(ctx)),
    );
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: CONVERSIONS---
  // -----------------------

  /**
   * Compare the `Result` against the possible patterns and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   * import { readFileSync } from 'node:fs';
   *
   * declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   *
   * //     ┌─── string
   * //     ▼
   * const data = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .match({
   *     Ok(contents) {
   *       return 'File is valid JSON';
   *     },
   * //          ┌─── FileNotFoundError | FileReadError | InvalidJsonError
   * //          ▼
   *     Error(error) {
   *       return 'File is invalid JSON';
   *     },
   *   });
   * ```
   */
  match<Output, ErrorOutput>(
    cases: Result.Match<DoNotation.Unsign<Value>, Error, Output, ErrorOutput>,
  ): Output | ErrorOutput {
    return this.isOk()
      ? cases.Ok(this.#value as never)
      : cases.Error(this.#error);
  }

  /**
   * Unwraps the `Result` value.
   *
   * @throws `UnwrapError` if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── User
   * //     ▼
   * const user = Result.ok(databaseUser).unwrap();
   *
   * const team = Result.error(new TeamNotFound()).unwrap();
   * // Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
   * ```
   */
  unwrap(): DoNotation.Unsign<Value> {
    return this.unwrapOr(() => {
      throw new UnwrapError('Result');
    });
  }

  /**
   * Unwraps the `Result` error.
   *
   * @throws `UnwrapError` if the `Result` is `Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const result = Result.error(new UserNotFound());
   *
   * if (result.isError()) {
   * //        ┌─── UserNotFound
   * //        ▼
   *   const error = result.unwrapError();
   * }
   * ```
   */
  unwrapError(): Error {
    return this.match({
      Ok: () => {
        throw new UnwrapError('ResultError');
      },
      Error: identity,
    });
  }

  /**
   * Returns the value of the `Result`.
   * If the `Result` is `Error`, returns the fallback value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── string
   * //       ▼
   * const baseUrl = Result.ok(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://funkcia.lukemorales.io'
   *
   * const apiKey = Result.error('Missing API key')
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * // Output: 'sk_test_9FK7CiUnKaU'
   * ```
   */
  unwrapOr(
    onError: (error: Error) => DoNotation.Unsign<Value>,
  ): DoNotation.Unsign<Value> {
    return this.match({ Ok: identity, Error: onError });
  }

  /**
   * Unwraps the value of the `Result` if it is an `Ok`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = Result.ok(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull(): DoNotation.Unsign<Value> | null {
    return this.unwrapOr(alwaysNull as never);
  }

  /**
   * Unwraps the value of the `Result` if it is an `Ok`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: User | undefined
   * const user = Result.ok(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined(): DoNotation.Unsign<Value> | undefined {
    return this.unwrapOr(alwaysUndefined as never);
  }

  /**
   * Unwraps the `Result` value.
   *
   * Receives an `onError` callback that returns an Error to be thrown
   * if the `Result` is `Error`.
   *
   * @throws the provided Error if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, NoValueError>;
   *
   * //     ┌─── User
   * //     ▼
   * const user = findUserById(userId).expect(
   *   (error) => new UserNotFoundError(userId)
   * //   ▲
   * //   └─── NoValueError
   * );
   * ```
   */
  expect<Exception extends globalThis.Error>(
    onError: (error: Error) => Exception,
  ): DoNotation.Unsign<Value> {
    return this.unwrapOr((error) => {
      throw onError(error);
    });
  }

  /**
   * Returns the value inside the `Result`.
   *
   * If the `Result` is `Ok`, returns the value inside the `Ok` variant.
   * If the `Result` is `Error`, returns the value inside the `Error` variant.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): Result<User, CacheMissError<Email>>;
   *
   * declare function getOrCreateUserByEmail(email: Email): User;
   *
   * //       ┌─── User
   * //       ▼
   * const result = getCachedUser('johndoe@example.com')
   *   .swap() // Result<CacheMissError<Email>, User>
   *   .map((cacheMiss) => getOrCreateUserByEmail(cacheMiss.input)) // Result<User, User>
   *   .merge();
   * // Output: { id: 'user_123', email: 'johndoe@example.com' }
   * ```
   */
  merge(): DoNotation.Unsign<Value> | Error {
    return this.match({
      Ok: identity,
      Error: identity,
    });
  }

  /**
   * Returns `true` if the predicate is fullfiled by the wrapped value.
   *
   * If the predicate is not fullfiled or the `Result` is `Error`, it returns `false`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── boolean
   * //         ▼
   * const isPositive = Result.ok(10).contains(num => num > 0);
   * // Output: true
   *
   * const isNegative = Result.error(10).contains(num => num > 0);
   * // Output: false
   * ```
   */
  contains(predicate: Predicate.Predicate<DoNotation.Unsign<Value>>): boolean {
    return this.isOk() && predicate(this.#value as never);
  }

  /**
   * Converts a `Result` to an `Option`.
   *
   * If `Result` is `Ok`, returns a `Some`.
   * If `Result` is `Error`, returns a `None`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   *
   * //          ┌─── Option<FileContent>
   * //          ▼
   * const fileContents = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toOption();
   */
  toOption(): Option<NonNullable<Value>> {
    return FunkciaStore.Option.fromNullable(this.unwrapOrNull() as never);
  }

  /**
   * Converts the `Result` to a `AsyncResult`.
   *
   * @example
   * import { Result } from 'funkcia';
   *
   * declare function readFile(path: string): Result<string, FileNotFound>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, ParseError>;
   *
   * //       ┌─── AsyncOption<FileContent>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncOption();
   * // Output: Promise<Some(FileContent)>
   */
  toAsyncOption(): AsyncOption<NonNullable<Value>> {
    return FunkciaStore.AsyncOption.promise(() =>
      Promise.resolve(this.toOption()),
    ) as never;
  }

  /**
   * Converts the `Result` to a `AsyncResult`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function readFile(path: string): Result<string, FileNotFound>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, ParseError>;
   *
   * //       ┌─── AsyncResult<FileContent, FileNotFound | ParseError>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncResult();
   * // Output: Promise<Ok(FileContent)>
   * ```
   */
  toAsyncResult(): AsyncResult<Value, Error> {
    return FunkciaStore.AsyncResult.promise(() =>
      Promise.resolve(this),
    ) as never;
  }

  /**
   * Converts an `Result` to an array.
   *
   * If `Result` is `Ok`, returns an array with the value.
   * If `Result` is `Error`, returns an empty array.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = Result.ok(10).toArray();
   * // Output: [10]
   * ```
   */
  toArray(): Array<DoNotation.Unsign<Value>> {
    return this.match({ Ok: (value) => [value], Error: () => [] });
  }

  // ---------------------------
  // #endregion ----------------

  // ---------------------------
  // #region: TRANSFORMATIONS---
  // ---------------------------

  /**
   * Applies a callback function to the value of the `Result` when it is `Ok`,
   * returning a new `Result` containing the new value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<number, never>
   * //       ▼
   * const result = Result.ok(10).map(number => number * 2);
   * // Output: Ok(20)
   * ```
   */
  map<Output>(
    onOk: (
      value: DoNotation.Unsign<Value>,
    ) => Result.NoResultGuard<Output, 'andThen'>,
  ): Result<Output, Error> {
    if (this.isError()) return this as never;

    // @ts-expect-error the compiler is complaining because of the NoResultReturnInMapGuard guard
    return Result.ok(onOk(this.#value));
  }

  /**
   * Applies a callback function to the value of the `Result` when it is `Error`,
   * returning a new `Result` containing the new error value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<string, UserMissingInformationError>
   * //       ▼
   * const result = Result.fromNullable(user.lastName).mapError(
   *   (error) => new UserMissingInformationError()
   * //   ▲
   * //   └─── NoValueError
   * );
   * ```
   */
  mapError<NewError extends {}>(
    onError: (value: Error) => Result.NoResultGuard<NewError, 'andThen'>,
  ): Result<Value, NewError> {
    if (this.isOk()) {
      return this as never;
    }

    return Result.error(onError(this.#error)) as never;
  }

  /**
   * Maps both the `Result` value and the `Result` error to new values.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<string, UserMissingInformationError>
   * //       ▼
   * const result = Result.fromNullable(user.lastName).mapBoth({
   *   Ok: (lastName) => `Hello, Mr. ${lastName}`,
   *   Error: (error) => new UserMissingInformationError(),
   * //          ▲
   * //          └─── NoValueError
   * });
   * ```
   */
  mapBoth<Output, NewError extends {}>(
    cases: Result.Match<
      DoNotation.Unsign<Value>,
      Error,
      Result.NoResultGuard<Output, 'andThen'>,
      Result.NoResultGuard<NewError, 'andThen'>
    >,
  ): Result<Output, NewError> {
    // @ts-expect-error the compiler is complaining because of the NoResultReturnInMapGuard guard
    return this.isOk()
      ? Result.ok(cases.Ok(this.#value as never))
      : Result.error(cases.Error(this.#error));
  }

  /**
   * Applies a callback function to the value of the `Result` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to map (also known as `flatMap`), with the difference
   * that the callback must return an `Result` or an `AsyncResult`, not a raw value.
   * This allows chaining multiple calls that return `Result`s together.
   *
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   *
   * //       ┌─── Result<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
   * //       ▼
   * const result = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<Output, NewError>(
    onOk: (value: DoNotation.Unsign<Value>) => Result<Output, NewError>,
  ): Result<Output, Error | NewError> {
    return this.isOk() ? onOk(this.#value as never) : (this as never);
  }

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `Result`, returning a `Error`
   * with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //       ┌─── Result<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = Result.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * );
   * ```
   */
  filter<Output extends DoNotation.Unsign<Value>>(
    refinement: Predicate.Guard<DoNotation.Unsign<Value>, Output>,
  ): Result<
    Output,
    | Error
    | FailedPredicateError<
        Predicate.Unguarded<DoNotation.Unsign<Value>, Output>
      >
  >;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning an `Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<string, FailedPredicateError<string>>
   * //       ▼
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   * );
   * ```
   */
  filter(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ): Result<Value, Error | FailedPredicateError<Value>>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning a `Result.Error` with the value returned by the `onUnfulfilled` callback instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //       ┌─── Result<Circle, Error>
   * //       ▼
   * const result = Result.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * //   ┌─── Square
   * //   ▼
   *   (shape) => new Error(`Expected Circle, received ${shape.kind}`),
   * );
   * ```
   */
  filter<Output extends DoNotation.Unsign<Value>, NewError extends {}>(
    refinement: Predicate.Guard<DoNotation.Unsign<Value>, Output>,
    onUnfulfilled: (
      value: Predicate.Unguarded<DoNotation.Unsign<Value>, Output>,
    ) => NewError,
  ): Result<Output, Error | NewError>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning an `Result.Error` with the value returned by the `onUnfulfilled` callback instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<string, Error>
   * //       ▼
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   *   (value) => new Error(`Expected non-empty string, received ${value}`),
   * );
   * ```
   */
  filter<NewError extends {}>(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
    onUnfulfilled: (value: DoNotation.Unsign<Value>) => NewError,
  ): Result<Value, Error | NewError>;

  filter(
    predicate: Predicate.Predicate<any>,
    onUnfulfilled?: (value: any) => any,
  ): Result<any, any> {
    if (this.isOk() && !predicate(this.#value)) {
      return Result.error(
        onUnfulfilled?.(this.#value) ?? new FailedPredicateError(this.#value),
      ) as never;
    }

    return this as never;
  }

  // ----------------------
  // #endregion -----------

  // ----------------------
  // #region: FALLBACKS----
  // ----------------------

  /**
   * Replaces the current `Result` with the provided fallback `Result` when it is `Error`.
   *
   * If the current `Result` is `Ok`, it returns the current `Result`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   *  //       ┌─── string
   *  //       ▼
   * const option = Result.ok('Smith')
   *   .or(() => Result.ok('John'))
   *   .unwrap();
   * // Output: 'Smith'
   *
   * const greeting = Result.error(new Error('Missing user'))
   *   .or(() => Result.ok('John'))
   *   .unwrap();
   * // Output: 'John'
   * ```
   */
  or<NewValue, NewError>(
    onError: (error: Error) => Result<NewValue, NewError>,
  ): Result<Value | NewValue, Error | NewError> {
    return this.isError() ? (onError(this.#error) as never) : (this as never);
  }

  /**
   * Swaps the `Result` value and error.
   *
   * If the `Result` is `Ok`, it returns a `Result.Error` with the value.
   * If the `Result` is `Error`, it returns a `Result.Ok` with the error.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): Result<User, CacheMissError<Email>>;
   *
   * declare function getOrCreateUserByEmail(email: Email): User;
   *
   * //       ┌─── Result<User, User>
   * //       ▼
   * const result = getCachedUser('johndoe@example.com')
   *   .swap() // Result<CacheMissError<Email>, User>
   *   .map((cacheMiss) => getOrCreateUserByEmail(cacheMiss.input));
   * //         ▲
   * //         └─── CacheMissError<Email>
   * ```
   */
  swap(): Result<Error, DoNotation.Unsign<Value>> {
    return this.match({
      Ok: (value) => Result.error(value as never),
      Error: (error) => Result.ok(error),
    }) as never;
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: COMPARISONS---
  // -----------------------

  /**
   * Asserts that an *unknown* value is an `Option`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const maybeAResultWithUser: unknown;
   *
   * if (Result.is(maybeAResultWithUser)) {
   * //                     ┌─── Result<unknown, unknown>
   * //                     ▼
   *   const user = maybeAResultWithUser.filter(isUser);
   * //        ▲
   * //        └─── Result<User, unknown>
   * }
   */
  static is(value: unknown): value is Result<unknown, unknown> {
    return value instanceof Result;
  }

  /**
   * Returns `true` if the Result is `Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, UserNotFound>;
   *
   * const maybeUser = findUserById('user_123');
   *
   * if (maybeUser.isSome()) {
   *   // Output: User
   *   const user = maybeUser.unwrap(); // `unwrap` will not throw
   * }
   * ```
   */
  isOk(): this is Result.Ok<Value> {
    return this.#tag === okSymbol;
  }

  /**
   * Returns `true` if the Result is `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserByEmail(email: string): Result<User, UserNotFound>;
   *
   * const maybeUser = findUserByEmail(data.email);
   *
   * if (result.isError()) {
   *   return await createUser(data)
   * }
   * ```
   */
  isError(): this is Result.Error<Error> {
    return this.#tag === errorSymbol;
  }

  /**
   * Compares the `Result` with another `Result` and returns `true` if they are equal.
   *
   * By default, it uses referential equality to compare the values,
   * but you can provide a custom equality function for more complex cases.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const result = Result.of(10).equals(Result.ok(10));
   * // Output: true
   * ```
   */
  equals(
    that: Result<Value, Error>,
    equalityFn: EqualityFn<DoNotation.Unsign<Value>> = isEqual,
    errorEqualityFn: EqualityFn<Error> = isEqual,
  ): boolean {
    try {
      return equalityFn(this.unwrap(), that.unwrap());
    } catch {
      try {
        return errorEqualityFn(this.unwrapError(), that.unwrapError());
      } catch {
        return false;
      }
    }
  }

  // -----------------
  // #endregion ------

  // -----------------
  // #region: OTHER---
  // -----------------

  /**
   * Calls the function with the `Result` value, then returns the `Result` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<number, never>
   * //       ▼
   * const result = Result.some(10).tap((value) => console.log(value)); // LOG: 10
   * ```
   */
  tap(onOk: (value: Value) => unknown): this {
    if (this.isOk()) onOk(this.#value);

    return this;
  }

  /**
   * Calls the function with the `Result` error, then returns the `Result` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUser(id: string): Result<User, NoValueError>;
   *
   * //       ┌─── Result<never, NoValueError>
   * //       ▼
   * const result = getUser('invalid_id')
   *   .tapError((error) => console.log(error)); // LOG: NoValueError
   * ```
   */
  tapError(onError: (error: Error) => unknown): this {
    if (this.isError()) onError(this.#error);

    return this;
  }

  *[Symbol.iterator](): Iterator<Error, DoNotation.Unsign<Value>> {
    if (this.isError()) {
      yield this.#error;
    }

    return this.#value as never;
  }

  /**
   * Utility to ensure a function always returns a `Result`.
   *
   * This method improves the inference of the function's
   * return value and guarantees that it will always return a `Result`.
   * It is extremely useful when your function can return multiple errors.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // When defining a normal function allowing typescript to infer the return type,
   * // the return type is always a union of `Result<T, never>` and `Result<never, E>`
   * function hasAcceptedTermsOfService(user: User) {
   *   if (typeof user.termsOfService !== 'boolean') {
   *     return Result.error(new TermsOfServiceNotAcceptedError(user.id));
   *   }
   *
   *   return user.termsOfService ?
   *       Result.ok('ACCEPTED' as const)
   *     : Result.error(new RejectedTermsOfServiceError(user.id));
   * }
   *
   * //       ┌─── Result<'ACCEPTED', never> | Result<never, TermsOfServiceNotAcceptedError> | Result<never, RejectedTermsOfServiceError>
   * //       ▼
   * const result = hasAcceptedTermsOfService(user);
   *
   * // When using the `fun` method, the return type is always `Result<T, E>`
   * const hasAcceptedTermsOfService = Result.fun((user: User) => {
   *   if (typeof user.termsOfService !== 'boolean') {
   *     return Result.error(new TermsOfServiceNotAcceptedError(user.id));
   *   }
   *
   *   return user.termsOfService ?
   *       Result.ok('ACCEPTED' as const)
   *     : Result.ok(new RejectedTermsOfServiceError(user.id));
   * });
   *
   * //       ┌─── Result<'ACCEPTED', TermsOfServiceNotAcceptedError | RejectedTermsOfServiceError>
   * //       ▼
   * const result = hasAcceptedTermsOfService(user);
   * ```
   */
  static fun<
    Callback extends
      | ((...args: any[]) => Result<any, any> | Result<never, any>)
      | ((...args: any[]) => Promise<Result<any, any> | Result<never, any>>),
  >(
    fn: Callback,
  ): (
    ...args: Parameters<Callback>
  ) => ReturnType<Callback> extends Promise<any>
    ? Promise<
        Result<
          Result.Unwrap<Awaited<ReturnType<Callback>>>,
          Result.UnwrapError<Awaited<ReturnType<Callback>>>
        >
      >
    : Result<
        Result.Unwrap<ReturnType<Callback>>,
        Result.UnwrapError<ReturnType<Callback>>
      > {
    return fn as never;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.match({
      Ok: (value) => `Ok(${beautify(value)})`,
      Error: (error) => `Error(${beautify(error)})`,
    });
  }

  // ----------------
  // #endregion -----
}

FunkciaStore.register(Result);

declare namespace Result {
  type $ok = typeof okSymbol;
  type $error = typeof errorSymbol;

  interface Match<Value, Error, Output, ErrorOutput> {
    Ok: (value: Value) => Output;
    Error: (error: Error) => ErrorOutput;
  }

  type NoResultInReturn<CorrectMethod extends string> =
    `ERROR: Use ${CorrectMethod} instead. Cause: the transformation is returning a Result, use ${CorrectMethod} to flatten the Result.`;

  type NoResultGuard<
    Output,
    CorrectMethod extends string,
  > = Output extends Result<infer _, infer _>
    ? NoResultInReturn<CorrectMethod>
    : Output;

  type Unwrap<Output> = Output extends Result<infer Value, infer _>
    ? Value
    : never;

  type UnwrapError<Output> = Output extends Result<infer _, infer Error>
    ? Error
    : never;

  interface Ok<Value> {
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    match: never;
    /** @override `unwrap` will not throw in this context. Result value is guaranteed to exist. */
    unwrap: () => Value;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapError: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapOr: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapOrNull: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapOrUndefined: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    expect: never;
    /** @override `merge` will not return an `Error` in this context. Result value is guaranteed to exist. */
    merge: () => Value;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    mapError: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    mapBoth: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    or: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    isError: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    tapError: never;
  }

  interface Error<Err> extends Partial<Result<any, Err>> {
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    zip: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    zipWith: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    bindTo: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    bind: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    let: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    match: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    unwrap: never;
    /** @override `unwrapError` will not throw in this context. Result is guaranteed to be Error. */
    unwrapError: () => Err;
    /** @override `unwrapOrNull` will not return a `Value` in this context. Result is guaranteed to be Error. */
    unwrapOrNull: () => null;
    /** @override `unwrapOrUndefined` will not return a `Value` in this context. Result is guaranteed to be Error. */
    unwrapOrUndefined: () => undefined;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    expect: never;
    /** @override `merge` will not return a `Value` in this context. Result is guaranteed to be Error. */
    merge: () => Err;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    contains: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    toOption: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    toAsyncOption: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    toAsyncResult: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    map: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    mapBoth: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    andThen: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    filter: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    isOk: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    tap: never;
  }
}
