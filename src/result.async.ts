/* eslint-disable @typescript-eslint/method-signature-style, import/export */

import type { DoNotation } from './do-notation';
import type { FailedPredicateError, UnknownError } from './exceptions';
import { NoValueError } from './exceptions';
import { invoke } from './functions';
import { FunkciaStore } from './funkcia-store';
import type {
  AnyUnaryFn,
  BetterAsyncIterable,
  Falsy,
  Nullable,
  Task,
  Thunk,
  Tuple,
  UnaryFn,
} from './internals/types';
import { emptyObject } from './internals/utils';
import type { OptionAsync } from './option.async';
import type { Predicate } from './predicate';
import { Result } from './result';
import type { AnyResultAsync } from './result.async.proxy';
import { isResultAsync, ResultAsyncProxy } from './result.async.proxy';
import type { AnyResult } from './result.proxy';

/**
 * `AsyncResult` represents a `Promise` that **never** rejects of an operation that can either succeed (`Ok`) or return an error (`Error`).
 * Every `AsyncResult` resolves to a `Result.Ok` when successful or `Result.Error` when it fails.
 *
 * An `AsyncResult` allows you to chain the same methods as a `Result`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `AsyncResult`, the Promise inside will resolve to the underlying `Result`.
 */
export const ResultAsync: ResultAsyncTrait = invoke((): ResultAsyncTrait => {
  const ok: ResultAsyncTrait['ok'] = (value) =>
    ResultAsyncProxy(() => Promise.resolve(FunkciaStore.Ok(value)));

  const error: ResultAsyncTrait['error'] = (err) =>
    ResultAsyncProxy(() => Promise.resolve(FunkciaStore.Err(err))) as never;

  const tryCatch: ResultAsyncTrait['try'] = (
    promise: Task<any>,
    onThrow?: AnyUnaryFn,
  ) =>
    ResultAsyncProxy(async () => {
      try {
        return (await promise().then((value) =>
          Result.is(value) ? value : FunkciaStore.Ok(value),
        )) as never;
      } catch (e) {
        return FunkciaStore.Err(onThrow?.(e) ?? '');
      }
    }) as never;

  const use: ResultAsyncTrait['use'] = (generator) =>
    ResultAsyncProxy(async () => {
      const { done, value } = await generator().next();

      return (done ? value : FunkciaStore.Err(value)) as never;
    }) as never;

  return {
    ok,
    of: ok,
    error,
    fromNullable(value: any, onNullable?: Thunk<any>) {
      return (
        value != null ? ok(value) : error(onNullable?.() ?? new NoValueError())
      ) as never;
    },
    fromFalsy(value: any, onFalsy?: AnyUnaryFn) {
      return (
        value ? ok(value) : error(onFalsy?.(value) ?? new NoValueError())
      ) as never;
    },
    try: tryCatch,
    promise(promise: Task<AnyResult>) {
      return ResultAsyncProxy(promise as never) as never;
    },
    enhancePromise(promise: UnaryFn<any[], any>) {
      return (...args: [any]) =>
        tryCatch(() => promise(...args) as never) as never;
    },
    predicate(criteria: UnaryFn<any, boolean>) {
      return (input: any) => ok(input).filter(criteria) as never;
    },
    async values(asyncResults) {
      return Promise.all(asyncResults).then(Result.values) as never;
    },
    get Do() {
      return ResultAsyncProxy(() =>
        Promise.resolve(FunkciaStore.Ok(emptyObject)),
      ) as never;
    },
    is: isResultAsync,
    use,
    createUse(generator) {
      return (...args) => use(() => generator(...args));
    },
  };
});

/**
 * `AsyncResult` represents a `Promise` that **never** rejects of an operation that can either succeed (`Ok`) or return an error (`Error`).
 * Every `AsyncResult` resolves to a `Result.Ok` when successful or `Result.Error` when it fails.
 *
 * An `AsyncResult` allows you to chain the same methods as a `Result`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `AsyncResult`, the Promise inside will resolve to the underlying `Result`.
 */
export interface ResultAsync<Value, Error>
  extends PromiseLike<Result<Value, Error>>,
    BetterAsyncIterable<Error, DoNotation.Unsign<Value>> {
  /**
   * Initiates a `Do-notation` with the current `AsyncResult`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function calculateUserScore(user: User): AsyncResult<UserScore, UserNotScored>;
   * declare function rankUserLevel(user: User, score: UserScore): AsyncResult<UserLevel, InvalidRanking>;
   * declare const user: AsyncResult<User, UserNotFound>;
   *
   * //        ┌─── AsyncResult<UserLevel, UserNotFound | UserNotScored | InvalidRanking>
   * //        ▼
   * const userLevel = user
   *   .bindTo('user')
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => calculateUserScore(ctx.user))
   *   .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
   * //           ▲
   * //           └─── { user: User; score: UserScore }
   * ```
   */
  bindTo: <Key extends string>(
    key: Key,
  ) => ResultAsync<DoNotation.Sign<{ readonly [K in Key]: Value }>, Error>;

  /**
   * Binds a `AsyncResult` to the context object in a `Do-notation`.
   *
   * If the `AsyncResult` resolves to a `Result.Ok`, the value is assigned to the key in the context object.
   * If the `AsyncResult` resolve to a `Result.Error`, the parent `AsyncResult` running the `Do` simulation resolves to a `Result.Error`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function findUserById(id: string): AsyncResult<User, UserNotFound>;
   * declare function calculateUserScore(user: User): AsyncResult<UserScore, UserNotScored>;
   * declare function rankUserLevel(user: User, score: UserScore): AsyncResult<UserLevel, InvalidRanking>;
   *
   * //        ┌─── AsyncResult<UserLevel, UserNotFound | UserNotScored | InvalidRanking>
   * //        ▼
   * const userLevel = AsyncResult.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => calculateUserScore(ctx.user))
   *   .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
   * //           ▲
   * //           └─── { user: User; score: UserScore }
   * ```
   */
  bind: <Key extends string, ValueToBind, NewError>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'ResultAsync', 'bind'>,
    key: Exclude<Key, keyof Value>,
    cb: (ctx: DoNotation.Unsign<Value>) => ResultAsync<ValueToBind, NewError>,
  ) => ResultAsync<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error | NewError
  >;

  /**
   * Binds non-rejecting promise to the context object in a `Do-notation`.
   *
   * The value is assigned to the key in the context object.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── AsyncResult<number, never>
   * //       ▼
   * const result = AsyncResult.Do
   *   .let('a', () => Promise.resolve(10))
   * //            ┌─── { a: number }
   * //            ▼
   *   .let('b', (ctx) => Promise.resolve(ctx.a * 2))
   *   .map((ctx) => a + b);
   * //       ▲
   * //       └─── { a: number; b: number }
   * ```
   */
  let: <Key extends string, ValueToBind>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'ResultAsync', 'let'>,
    key: Exclude<Key, keyof Value>,
    cb: (scope: DoNotation.Unsign<Value>) => Promise<ValueToBind>,
  ) => ResultAsync<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error
  >;

  /**
   * Applies a callback function to the value of the `AsyncResult` when it is `Ok`,
   * returning a new `AsyncResult` containing the new value.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── AsyncResult<number, never>
   * //       ▼
   * const result = ok(10).map(number => number * 2);
   * // Output: Promise<Ok(20)>
   * ```
   */
  map<Output>(
    onOk: (value: DoNotation.Unsign<Value>) => Output,
  ): ResultAsync<Output, Error>;

  /**
   * Applies a callback function to the value of the `AsyncResult` when it is `Ok`,
   * returning a new `AsyncResult` containing the new error value.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── AsyncResult<string, UserMissingInformationError>
   * //       ▼
   * const result = fromNullable(user.lastName).mapError(
   *   (error) => new UserMissingInformationError()
   * //   ▲
   * //   └─── NoValueError
   * );
   * ```
   */
  mapError: <NewError extends {}>(
    onError: (value: Error) => NewError,
  ) => ResultAsync<Value, NewError>;

  mapBoth: <NewValue, NewError extends {}>(
    cases: ResultAsync.Match<
      DoNotation.Unsign<Value>,
      Error,
      NewValue,
      NewError
    >,
  ) => ResultAsync<Value, NewError>;

  /**
   * Applies a callback function to the value of the `AsyncResult` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return a `Result` or an `AsyncResult`, not a raw value.
   * This allows chaining multiple calls that return `AsyncResult`s together.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncResult<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   *
   * //       ┌─── AsyncResult<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
   * //       ▼
   * const result = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends AnyResult>(
    onOk: (value: DoNotation.Unsign<Value>) => Output,
  ): ResultAsync<
    ResultAsync.Unwrap<Output>,
    Error | ResultAsync.UnwrapError<Output>
  >;

  /**
   * Applies a callback function to the value of the `AsyncResult` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `AsyncResult`, not a raw value.
   * This allows chaining multiple calls that return `AsyncResult`s together.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncResult<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   *
   * //       ┌─── AsyncResult<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
   * //       ▼
   * const result = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends AnyResultAsync>(
    onOk: (value: DoNotation.Unsign<Value>) => Output,
  ): ResultAsync<
    ResultAsync.Unwrap<Output>,
    Error | ResultAsync.UnwrapError<Output>
  >;

  /**
   * Asserts that the `AsyncResult` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `AsyncResult`, resolving to a `Result.Error`
   * with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //       ┌─── AsyncResult<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * );
   * ```
   */
  filter<Output extends DoNotation.Unsign<Value>>(
    guard: Predicate.Guard<DoNotation.Unsign<Value>, Output>,
  ): ResultAsync<
    Output,
    Error | FailedPredicateError<Exclude<DoNotation.Unsign<Value>, Output>>
  >;

  /**
   * Asserts that the `AsyncResult` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `AsyncResult`,
   * resolving to a `Result.Error` with a `FailedPredicateError` instead.
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
  ): ResultAsync<Value, Error | FailedPredicateError<DoNotation.Unsign<Value>>>;

  /**
   * Asserts that the `AsyncResult` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `AsyncResult`, resolving to a `Result.Error`
   * with the provided value returned by the `onUnfulfilled` callback instead.
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
  filter<Output extends DoNotation.Unsign<Value>, E2>(
    guard: Predicate.Guard<DoNotation.Unsign<Value>, Output>,
    onUnfulfilled: (
      value: Predicate.Unguarded<DoNotation.Unsign<Value>, Output>,
    ) => NonNullable<E2>,
  ): ResultAsync<Output, Error | E2>;

  /**
   * Asserts that the `AsyncResult` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `AsyncResult`,
   * resolving to a `Result.Error` with the value returned by the `onUnfulfilled` callback instead.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── AsyncResult<string, Error>
   * //       ▼
   * const result = of(user.lastName).filter(
   *   (value) => value.length > 0,
   *   (value) => new Error(`Expected non-empty string, received ${value}`),
   * );
   * ```
   */
  filter<NewError>(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
    onUnfulfilled: (value: DoNotation.Unsign<Value>) => NonNullable<NewError>,
  ): ResultAsync<Value, Error | NewError>;

  /**
   * Replaces the current `AsyncResult` with the provided fallback `AsyncResult` when it is `Error`.
   *
   * If the resolved `Result` is `Ok`, it returns the current `AsyncResult`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   *  //       ┌─── string
   *  //       ▼
   * const result = await ok('Smith')
   *   .or(() => ok('John'))
   *   .unwrap();
   * // Output: 'Smith'
   *
   * const greeting = await error(new Error('Missing user'))
   *   .or(() => ok('John'))
   *   .unwrap();
   * // Output: 'John'
   * ```
   */
  or: <NewValue, NewError>(
    onError: (error: Error) => ResultAsync<NewValue, NewError>,
  ) => ResultAsync<Value | NewValue, Error | NewError>;

  /**
   * Swaps the `AsyncResult` value and error.
   *
   * If the underlying `Result` is `Ok`, it returns a `AsyncResult` that resolves to a `Result.Error` with the value.
   * If the underlying `Result` is `Error`, it returns a `AsyncResult` that resolves to a `Result.Ok` with the error.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): AsyncResult<User, CacheMissError<Email>>;
   *
   * declare function findOrCreateUserByEmail(email: Email): AsyncResult<User, never>;
   *
   * //       ┌─── Result<User, User>
   * //       ▼
   * const result = getCachedUser('johndoe@example.com')
   *   .swap()
   *   .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input));
   * //             ▲
   * //             └─── CacheMissError<Email>
   * ```
   */
  swap: () => ResultAsync<Error, Value>;

  /**
   * Combines two `AsyncResult`s into a single `AsyncResult` containing a tuple of their values,
   * if both `AsyncResult`s resolve to `Result.Ok` variants, otherwise, resolves to `Result.Error`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * const first = some('hello');
   * const second = some('world');
   *
   * //       ┌─── AsyncResult<[string, string], never>
   * //       ▼
   * const strings = first.zip(second);
   * // Output: Promise<Ok(['hello', 'world'])>
   * ```
   */
  zip: <Value2, Error2>(
    that: ResultAsync<Value2, Error2>,
  ) => ResultAsync<
    Tuple<DoNotation.Unsign<Value>, DoNotation.Unsign<Value2>>,
    Error | Error2
  >;

  /**
   * Combines two `AsyncResult`s into a single `AsyncResult`. The new value is produced
   * by applying the given function to both values, if both `AsyncResult`s resolve to `Result.Ok` variants,
   * otherwise, resolves to `Result.Error`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   *
   * const first = some('hello');
   * const second = some('world');
   *
   * //        ┌─── AsyncResult<string, never>
   * //        ▼
   * const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
   * // Output: Promise<Ok('hello world')>
   * ```
   */
  zipWith: <Value2, Error2, Output>(
    that: ResultAsync<Value2, Error2>,
    fn: (
      arg0: DoNotation.Unsign<Value>,
      arg1: DoNotation.Unsign<Value2>,
    ) => Output,
  ) => ResultAsync<Output, Error | Error2>;

  /**
   * Returns a promise that compares the underlying `Result` against the possible patterns,
   * and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   * import { readFileSync } from 'node:fs';
   *
   * declare function readFile(path: string): AsyncResult<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): AsyncResult<FileContent, InvalidJsonError>;
   *
   * //     ┌─── string
   * //     ▼
   * const data = await readFile('data.json')
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
  match: <Output, ErrorOutput>(
    cases: ResultAsync.Match<
      DoNotation.Unsign<Value>,
      Error,
      Output,
      ErrorOutput
    >,
  ) => Promise<ErrorOutput | Output>;

  /**
   * Returns a promise that unwraps the underlying `AsyncResult` value.
   *
   * @throws `UnwrapError` if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //     ┌─── User
   * //     ▼
   * const user = await ok(databaseUser).unwrap();
   *
   * const team = await error(new TeamNotFound()).unwrap();
   * // Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
   * ```
   */
  unwrap: () => Promise<DoNotation.Unsign<Value>>;

  /**
   * Returns a promise that unwraps the underlying `Result` error.
   *
   * @throws `UnwrapError` if the `Result` is `Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //      ┌─── UserNotFound
   * //      ▼
   * const error = await error(new UserNotFound()).unwrapError();
   * ```
   */
  unwrapError: () => Promise<Error>;

  /**
   * Returns a promise that unwraps the underlying `Result`.
   *
   * If the promise resolves to a `Result.Error`, returns the result of the provided callback.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── string
   * //       ▼
   * const baseUrl = await ok(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://funkcia.lukemorales.io'
   *
   * const apiKey = await error('Missing API key')
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * // Output: 'sk_test_9FK7CiUnKaU'
   * ```
   */
  unwrapOr: <Output = DoNotation.Unsign<Value>>(
    onError: (error: Error) => Output,
  ) => Promise<
    readonly any[] extends DoNotation.Unsign<Value>
      ? DoNotation.Unsign<Value>
      : DoNotation.Unsign<Value> | Output
  >;

  /**
   * Returns a promise that unwraps the value of the underlying `Result`
   * if it is a `Result.Ok`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = await AsyncResult.ok(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull: () => Promise<DoNotation.Unsign<Value> | null>;

  /**
   * Returns a promise that unwraps the value of the underlying `Result`
   * if it is a `Result.Ok`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //     ┌─── User | undefined
   * //     ▼
   * const user = await AsyncResult.ok(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined: () => Promise<DoNotation.Unsign<Value> | undefined>;

  /**
   * Returns a promise that unwraps the underlying `Result` value.
   *
   * @throws the provided Error if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function findUserById(id: string): AsyncResult<User, DatabaseFailureError>;
   *
   * //     ┌─── User
   * //     ▼
   * const user = await findUserById('user_123').expect(
   *   (error) => new UserNotFound(userId),
   * //   ▲
   * //   └─── DatabaseFailureError
   * );
   *
   * const anotherUser = await findUserById('invalid_id').expect(
   *   (error) => new UserNotFound('team_123'),
   * //   ▲
   * //   └─── DatabaseFailureError
   * );
   * // Output: Uncaught exception: 'User not found: "user_123"'
   * ```
   */
  expect: <Exception extends globalThis.Error>(
    onError: (error: Error) => Exception,
  ) => Promise<DoNotation.Unsign<Value>>;

  /**
   * Returns a promise that unwraps the underlying `Result`.
   *
   * If the `Result` is `Ok`, resolves to the value inside the `Ok` variant.
   * If the `Result` is `Error`, resolves to the value inside the `Error` variant.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): AsyncResult<User, CacheMissError<Email>>;
   *
   * declare function findOrCreateUserByEmail(email: Email): AsyncResult<User, never>;
   *
   * //       ┌─── User
   * //       ▼
   * const result = await getCachedUser('johndoe@example.com')
   *   .swap() // AsyncResult<CacheMissError<Email>, User>
   *   .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input)) // AsyncResult<User, User>
   *   .merge();
   * // Output: { id: 'user_123', email: 'johndoe@example.com' }
   * ```
   */
  merge: () => Promise<DoNotation.Unsign<Value> | Error>;

  /**
   * Returns a Promise that verifies if the `Result` contains a value that passes the test implemented by the provided function.
   *
   * Resolves to `true` if the predicate is fullfiled by the wrapped value.
   * If the predicate is not fullfiled or if the resolved `Result` is `Error`, returns `false`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //         ┌─── boolean
   * //         ▼
   * const isPositive = await AsyncResult.some(10).contains(num => num > 0);
   * // Output: true
   * ```
   */
  contains: (
    criteria: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ) => Promise<boolean>;

  /**
   * Converts the `AsyncResult` to an `AsyncOption`.
   *
   * If the resolved `Result` is `Ok`, returns an `AsyncOption.Some`.
   * If the resolved `Result` is `Error`, returns an `AsyncOption.None`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncResult<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): AsyncResult<FileContent, InvalidJsonError>;
   *
   * //       ┌─── AsyncOption<FileContent>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncOption();
   * // Output: Promise<Some(FileContent)>
   * ```
   */
  toAsyncOption: () => OptionAsync<NonNullable<DoNotation.Unsign<Value>>>;

  /**
   * Returns a Promise that converts the underlying `Result` to an array.
   *
   * If the resolved `Result` is `Ok`, returns an array with the value.
   * If the resolved `Result` is `Error`, returns an empty array.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await AsyncResult.some(10).toArray();
   * // Output: [10]
   * ```
   */
  toArray: () => Promise<Array<DoNotation.Unsign<Value>>>;

  /**
   * Calls the function with  `Result` value, then returns the `Result` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function authenticateUser(credentials: AuthCredentials): AsyncResult<User, UserNotFound | InvalidCredentials>;
   *
   * declare async function registerSuccessfulLoginAttempt(user: User): Promise<{ loginAttempts: number }>;
   *
   * //       ┌─── AsyncResult<User, UserNotFound | InvalidCredentials>
   * //       ▼
   * const result = authenticateUser(req.body).tap(async (user) => {
   *   return await registerSuccessfulLoginAttempt(user);
   * });
   * // Output: Promise<Ok(User)>
   * ```
   */
  tap: (onOk: (value: DoNotation.Unsign<Value>) => unknown) => this;

  /**
   * Calls the function with the underlying `Result` error, then returns the `AsyncResult` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function authenticateUser(credentials: AuthCredentials): AsyncResult<User, UserNotFound | InvalidCredentials>;
   *
   * declare async function registerLoginAttempt(user: User): Promise<{ loginAttempts: number }>;
   *
   * //       ┌─── AsyncResult<User, UserNotFound | InvalidCredentials>
   * //       ▼
   * const result = authenticateUser(req.body).tapError(async (error) => {
   *   if (InvalidCredentials.is(error)) {
   *     return await registerLoginAttempt(error.email);
   *   }
   * });
   * // Output: Promise<Error(InvalidCredentials)>
   * ```
   */
  tapError: (onError: (error: Error) => unknown) => this;
}

export interface ResultAsyncTrait {
  is(value: unknown): value is ResultAsync<unknown, unknown>;

  /**
   * Constructs an `AsyncResult` that resolves to a `Result.Ok` with the provided value.
   *
   * Use it to explicitly construct an `OK`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //      ┌─── AsyncResult<number, never>
   * //      ▼
   * const result = AsyncResult.ok(10);
   * // Promise<Ok(10)>
   * ```
   */
  ok: <Value>(value: Value) => ResultAsync<Value, never>;

  /**
   * @alias
   * Alias of `AsyncResult.ok` - constructs an `AsyncResult` that resolves to a `Result.Ok` with the provided value.
   *
   * Useful to indicate the creation of an `AsyncResult` that is immediately going to be processed.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //      ┌─── AsyncResult<number, UnfulfilledPredicateError<number>>
   * //      ▼
   * const result = AsyncResult.of(10);
   * // Promise<Ok(10)>
   * ```
   */
  of: <Value>(value: Value) => ResultAsync<Value, never>;

  /**
   * Constructs an `AsyncResult` that resolves to a `Result.Error` with the provided value.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * async function rateLimit(clientId: ClientId, ip: IpAddress): AsyncResult<ClientId, RateLimitError> {
   *   const attempts = await cache.get(`ratelimit:${clientId}:${ip}`)
   *
   *   if (attempts.total > 10) {
   *     return AsyncFunkciaStore.Err(new RateLimitError({ clientId, ip }));
   *   }
   *
   *   return AsyncOption.ok(clientId);
   * }
   * ```
   */
  error: <Error>(error: NonNullable<Error>) => ResultAsync<never, Error>;

  /**
   * Constructs an `AsyncResult` from a nullable value.
   *
   * If the value is `null` or `undefined`, it resolves to a `Result.Error` with a `NoValueError` exception.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //      ┌─── AsyncResult<string, NoValueError>
   * //      ▼
   * const result = AsyncResult.fromNullable(localStorage.getItem('@app/theme'));
   * ```
   */
  fromNullable<Value>(value: Nullable<Value>): ResultAsync<Value, NoValueError>;

  /**
   * Constructs an `AsyncResult` from a nullable value.
   *
   * If the value is `null` or `undefined`, it resolves to a `Result.Error` using the provided `onNullable` callback.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //      ┌─── AsyncResult<string, Error>
   * //      ▼
   * const result = AsyncResult.fromNullable(
   *   localStorage.getItem('@app/theme'),
   *   () => new Error('Theme not set'),
   * );
   * ```
   */
  fromNullable<Value, Error>(
    value: Nullable<Value>,
    onNullable: Thunk<NonNullable<Error>>,
  ): ResultAsync<Value, Error>;

  /**
   * Constructs an `AsyncResult` from a _falsy_ value.
   *
   * If the value is _falsy_, it resolves to a `Result.Error` result with a `NoValueError` exception.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── AsyncResult<string, NoValueError>
   * //      ▼
   * const result = AsyncResult.fromFalsy(user.lastName?.trim());
   * ```
   */
  fromFalsy<Value>(
    value: Value | Falsy,
  ): ResultAsync<Exclude<NonNullable<Value>, Falsy>, NoValueError>;

  /**
   * Constructs an `AsyncResult` from a _falsy_ value.
   *
   * If the value is _falsy_, it resolves to a `Result.Error` using the provided `onFalsy` callback.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── AsyncResult<string, Error>
   * //      ▼
   * const result = AsyncResult.fromFalsy(
   *   user.lastName?.trim(),
   *   () => new Error('User missing last name'),
   * );
   * ```
   */
  fromFalsy<Value, Error extends {}>(
    value: Value | Falsy,
    onFalsy: (value: Falsy) => Error,
  ): ResultAsync<Exclude<NonNullable<Value>, Falsy>, Error>;

  /**
   * Initiates a `Do-notation` for the `AsyncResult` type, allowing to write code
   * in a more declarative style, similar to the “do notation” in other programming languages.
   * It provides a way to define variables and perform operations on them
   * using functions like `bind` and `let`, piping the returned values into a context object.
   *
   * Within the `Do` scope, you can use the `bind` function to bind a value to a variable.
   * The `bind` function takes two arguments: the name of the variable and a function that returns a `AsyncResult` to be bound.
   * If the returned `AsyncResult` resolves to a `Result.Ok`, the value is assigned to the variable in the context object.
   * If the returned `AsyncResult` resolves to a `Result.Error`, the parent `AsyncResult` running the `Do` simulation resolves to a `Result.Error`.
   *
   * You can also use the `let` function to bind a simple value to a variable.
   * The `let` function takes two arguments: the name of the variable and a function that returns a value to be bound.
   * You can return any value from the function, like a `string`, `number`, `boolean` etc,
   * and it will be assigned to the variable in the context object.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function findUserById(id: string): AsyncResult<User, UserNotFound>;
   *
   * declare function calculateUserScore(user: User): AsyncResult<UserScore, UserNotScored>;
   *
   * declare function rankUserLevel(user: User, score: UserScore): AsyncResult<UserLevel, InvalidRanking>;
   *
   * //        ┌─── AsyncResult<UserLevel, UserNotFound | UserNotScored | InvalidRanking>
   * //        ▼
   * const userLevel = AsyncResult.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => calculateUserScore(ctx.user))
   *   .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
   * //           ▲
   * //           └─── { user: User; score: UserScore }
   */
  get Do(): ResultAsync<DoNotation.Sign, never>;

  /**
   * Constructs an `AsyncResult` from a promise that resolves to a `Result`, but may reject.
   *
   * If the promise executes successfully, it resolves to the returned `Result`.
   * Otherwise, it resolves to a `Result.Error` containing an `UnknownError` with the thrown exception.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFound>>;
   *
   * //     ┌─── AsyncResult<User, UserNotFound | UnknownError>
   * //     ▼
   * const url = AsyncResult.try(() => findUserById('user_123'));
   * // Output: Error(UnknownError)
   * ```
   */
  try<$Result extends AnyResult>(
    promise: Task<$Result>,
  ): ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.UnwrapError<$Result> | UnknownError
  >;

  /**
   * Constructs an `AsyncResult` from a promise that may reject.
   *
   * If the promise executes successfully, it resolves to a `Result.Ok`.
   * Otherwise, it resolves to a `Result.Error` containing an `UnknownError` with the thrown exception.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserByIdOrThrow(id: string): Promise<User>;
   *
   * //     ┌─── AsyncResult<User, UnknownError>
   * //     ▼
   * const url = try(() => findUserByIdOrThrow('user_123'));
   * // Output: Error(UnknownError)
   * ```
   */
  try<Value>(promise: Task<Value>): ResultAsync<Value, UnknownError>;

  /**
   * Constructs an `AsyncResult` from a promise that resolves to a `Result`, but may reject.
   *
   * If the promise executes successfully, it resolves to the returned `Result`.
   * Otherwise, it resolves to a `Result.Error` containing the output of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFound>>;
   *
   * //     ┌─── AsyncResult<User, UserNotFound | UnknownError>
   * //     ▼
   * const url = try(
   *   () => findUserById('user_123'),
   *   (error) => new DatabaseFailureError(error),
   * );
   * // Output: Error(DatabaseFailureError)
   * ```
   */
  try<$Result extends AnyResult, Error extends {}>(
    promise: Task<$Result>,
    onThrow: (error: unknown) => Error,
  ): ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.UnwrapError<$Result> | Error
  >;

  /**
   * Constructs an `AsyncResult` from a promise that may reject.
   *
   * If the promise executes successfully, it resolves to a `Result.Ok`.
   * Otherwise, it resolves to a `Result.Error` containing the output of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserByIdOrThrow(id: string): Promise<User>;
   *
   * //     ┌─── AsyncResult<User, UserNotFound | DatabaseFailureError>
   * //     ▼
   * const url = try(
   *   () => findUserByIdOrThrow('user_123'),
   *   (error) => UserNotFound.is(error) ? error : new DatabaseFailureError(error),
   * );
   * // Output: DatabaseFailureError('Error: Failed to connect to the database')
   * ```
   */
  try<Value, Error extends {}>(
    promise: Task<Value>,
    onThrow: (error: unknown) => Error,
  ): ResultAsync<Value, Error>;

  /**
   * Constructs an `AsyncResult` from a `Promise` that returns a `Result`, and never rejects.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFound | DatabaseFailureError>>;
   *
   * //      ┌─── AsyncResult<User, UserNotFound | DatabaseFailureError>
   * //      ▼
   * const result = promise(() => findUserById('user_123'));
   * // Output: Promise<Ok(User)>
   * ```
   */
  promise: <$Result extends AnyResult>(
    promise: Task<$Result>,
  ) => ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.UnwrapError<$Result>
  >;

  /**
   * Lifts a `Promise` that may fail to a function that returns an `AsyncResult`.
   *
   * If the promise executes successfully, it resolves to a `Result.Ok`.
   * Otherwise, it resolves to a `Result.Error` with an `UnknownError` that contains the thrown exception.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserByIdOrThrow(id: string): Promise<User>;
   *
   * //           ┌─── (id: string) => AsyncResult<User, UnknownError>
   * //           ▼
   * const safeFindUserById = liftPromise(findUserByIdOrThrow);
   *
   * //      ┌─── AsyncResult<User, UnknownError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   */
  enhancePromise<Args extends readonly unknown[], $Result extends AnyResult>(
    promise: (...args: Args) => Promise<$Result>,
  ): (
    ...args: Args
  ) => ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.UnwrapError<$Result> | UnknownError
  >;

  /**
   * Lifts a `Promise` that may fail to a function that returns an `AsyncResult`.
   *
   * If the promise executes successfully, it resolves to a `Result.Ok`.
   * Otherwise, it resolves to a `Result.Error` with an `UnknownError` that contains the thrown exception.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserByIdOrThrow(id: string): Promise<User>;
   *
   * //           ┌─── (id: string) => AsyncResult<User, UnknownError>
   * //           ▼
   * const safeFindUserById = liftPromise(findUserByIdOrThrow);
   *
   * //      ┌─── AsyncResult<User, UnknownError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   */
  enhancePromise<Args extends readonly unknown[], Value>(
    promise: (...args: Args) => Promise<Value>,
  ): (...args: Args) => ResultAsync<Value, UnknownError>;

  /**
   * Lifts a `Promise` that may fail or resolve to a `Result`
   * to a function that returns an `AsyncResult`.
   *
   * If the promise executes successfully, it resolves to the returned `Result`.
   * Otherwise, it resolves to a `Result.Error` with the return of the provided `onrejected` callback.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFound>>;
   *
   * //           ┌─── (id: string) => AsyncResult<User, UserNotFound | DatabaseFailureError>
   * //           ▼
   * const safeFindUserById = liftPromise(
   *   findUserById,
   *   (error) => new DatabaseFailureError(error),
   * );
   *
   * //      ┌─── AsyncResult<User, UserNotFound | DatabaseFailureError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   * ```
   */
  enhancePromise<
    Args extends readonly unknown[],
    $Result extends AnyResult,
    RejectionError extends {},
  >(
    promise: (...args: Args) => Promise<$Result>,
    onrejected: (e: unknown) => RejectionError,
  ): (
    ...args: Args
  ) => ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.UnwrapError<$Result> | RejectionError
  >;

  /**
   * Lifts a `Promise` that may fail to a function that returns an `AsyncResult`.
   *
   * If the promise executes successfully, it resolves to a `Result.Ok`.
   * Otherwise, it resolves to a `Result.Error` with the return of the provided `onrejected` callback.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserByIdOrThrow(id: string): Promise<User>;
   *
   * //           ┌─── (id: string) => AsyncResult<User, UserNotFound | DatabaseFailureError>
   * //           ▼
   * const safeFindUserById = liftPromise(
   *   findUserByIdOrThrow,
   *   (error) => UserNotFound.is(error) ? error : new DatabaseFailureError(error),
   * );
   *
   * //      ┌─── AsyncResult<User, UserNotFound | DatabaseFailureError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   * ```
   */
  enhancePromise<
    Args extends readonly unknown[],
    Value,
    RejectionError extends {},
  >(
    promise: (...args: Args) => Promise<Value>,
    onrejected: (e: unknown) => RejectionError,
  ): (...args: Args) => ResultAsync<Value, RejectionError>;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `AsyncResult` that resolves to a `Result.Ok`, narrowing the value to the specified type predicate,
   * if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //         ┌─── (shape: Shape) => AsyncResult<Circle, FailedPredicateError<Square>>
   * //         ▼
   * const ensureCircle = predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── AsyncResult<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = ensureCircle(input);
   * ```
   */
  predicate<Criteria extends Predicate.Guard<any, any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Guard<infer Input, infer Output>
    ? ResultAsync<
        Output,
        FailedPredicateError<Predicate.Unguarded<Input, Output>>
      >
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `AsyncResult` that resolves to a `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //          ┌─── (value: number) => AsyncResult<number, FailedPredicateError<number>>
   * //          ▼
   * const ensurePositive = predicate(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── AsyncResult<number, FailedPredicateError<number>>
   * //       ▼
   * const result = ensurePositive(10);
   * // Output: Ok(10)
   * ```
   */
  predicate<Criteria extends Predicate.Predicate<any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Predicate<infer Input>
    ? ResultAsync<Input, FailedPredicateError<Input>>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `AsyncResult` that resolves to a `Result.Ok`, narrowing the value to the specified type predicate,
   * if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with the value provided by the `onUnfulfilled` function.
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
  predicate<Criteria extends Predicate.Guard<any, any>, Error extends {}>(
    criteria: Criteria,
    onUnfulfilled: (
      input: Criteria extends Predicate.Guard<infer Input, infer Output>
        ? Predicate.Unguarded<Input, Output>
        : never,
    ) => Error,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Guard<infer _, infer Output>
    ? ResultAsync<Output, Error>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `AsyncResult` that resolves to a `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with the value provided by the `onUnfulfilled` function.
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
  predicate<Criteria extends Predicate.Predicate<any>, Error extends {}>(
    criteria: Criteria,
    onUnfulfilled: (
      input: Criteria extends Predicate.Predicate<infer Input> ? Input : never,
    ) => Error,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Predicate<infer Input>
    ? ResultAsync<Input, Error>
    : never;

  /**
   * Evaluates an *async* generator early returning when a `Result.Error` is propagated
   * or returning the `AsyncResult` returned by the generator.
   *
   * - Each `yield*` automatically awaits and unwraps the `ResultAsync` value or propagates `Error`.
   * - If any operation resolves to `Result.Error`, the entire generator exits early.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare const safeReadFile: (path: string) => ResultAsync<string, FileNotFoundError>;
   * declare const safeWriteFile: (path: string, content: string) => ResultAsync<string, FailedToWriteFileError>;
   *
   * //          ┌─── ResultAsync<string, FileNotFoundError | FailedToWriteFileError>
   * //          ▼
   * const mergedContent = ResultAsync.use(async function* () {
   *   const fileA: string = yield* safeReadFile('data.txt');
   *   const fileB: string = yield* safeReadFile('non-existent-file.txt'); // returns ResultAsync.Error immediately
   *
   *   return safeWriteFile('output.txt', `${fileA}\n${fileB}`); // doesn't run
   * });
   * // Output: Promise<Error(FileNotFoundError)>
   * ```
   */
  use<$Result extends AnyResult, Error extends {}>(
    generator: () => AsyncGenerator<Error, $Result>,
  ): ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.UnwrapError<$Result> | inferError<Error>
  >;

  /**
   * Returns a function that evaluates an *async* generator when called with the defined arguments,
   * early returning when a `Result.Error` is propagated or returning the `AsyncResult` returned by the generator.
   *
   * - Each `yield*` automatically awaits and unwraps the `ResultAsync` value or propagates `Error`.
   * - If any operation resolves to `Result.Error`, the entire generator exits early.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare const safeReadFile: (path: string) => ResultAsync<string, NodeFSError>;
   * declare const safeWriteFile: (path: string, content: string) => ResultAsync<string, NodeFSError>;
   *
   * //          ┌─── (output: string, pathA: string, pathB: string) => ResultAsync<string, NodeFSError>
   * //          ▼
   * const safeMergeFiles = ResultAsync.createUse(async function* (output: string, pathA: string, pathB: string) {
   *   const fileA: string = yield* safeReadFile(pathA);
   *   const fileB: string = yield* safeReadFile(pathB);
   *
   *   return safeWriteFile(output, `${fileA}\n${fileB}`);
   * });
   *
   * const mergedContent = safeMergeFiles('output.txt', 'data.txt', 'updated-data.txt');
   * // Output: Promise<Ok('[ERROR] Failed to connect\n[INFO] Connection restored')>
   * ```
   */
  createUse<
    Args extends readonly any[],
    $Result extends AnyResult,
    Error extends {},
  >(
    generator: (...args: Args) => AsyncGenerator<Error, $Result>,
  ): (...args: Args) => ResultAsync<ResultAsync.Unwrap<$Result>, Error>;

  /**
   * Given an array of `AsyncResult`s, returns an array containing only the values inside `Result.Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await values([
   *   ok(1),
   *   error<number>('Failed computation'),
   *   ok(3),
   * ]);
   * // Output: [1, 3]
   * ```
   */
  values: <Value>(
    results: Array<
      | ResultAsync<Value, any>
      | ResultAsync<never, any>
      | ResultAsync<Value, never>
    >,
  ) => Promise<Array<DoNotation.Unsign<Value>>>;
}

export declare namespace ResultAsync {
  interface Match<Value, Error, Output, ErrorOutput> {
    Ok: (value: Value) => Output;
    Error: (error: Error) => ErrorOutput;
  }

  type Unwrap<Output> = Output extends
    | Result<infer Value, infer _>
    | ResultAsync<infer Value, infer _>
    ? Value
    : never;

  type UnwrapError<Output> = Output extends
    | Result<infer _, infer Error>
    | ResultAsync<infer _, infer Error>
    ? Error
    : never;
}

type inferError<Error> = [Error] extends [any] ? Error : never;
