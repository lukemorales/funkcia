// eslint-disable-next-line import/no-cycle
import type { DoNotation } from './do-notation';
import {
  NoValueError,
  UnknownError,
  UnwrapError,
  type FailedPredicateError,
} from './exceptions';
import {
  alwaysFalse,
  alwaysNull,
  alwaysUndefined,
  identity,
  lazyCompute,
} from './functions';
import { FunkciaStore } from './funkcia-store';
import { Queue } from './internals/queue';
import type { Falsy, Nullable, Task, Thunk, Tuple } from './internals/types';
import type { Predicate } from './predicate';
import type { Result } from './result';

const ResultRef = lazyCompute(() => FunkciaStore.Result);

type AnyResult = Result<any, any>;

declare namespace AsyncResult {
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

  type inferError<Error> = [Error] extends [any] ? Error : never;

  interface Match<Value, Error, Output, ErrorOutput> {
    Ok: (value: Value) => Output;
    Error: (error: Error) => ErrorOutput;
  }
}

/**
 * `AsyncResult` represents a `Promise` that **never** rejects of an operation that can either succeed (`Ok`) or return an error (`Error`).
 * Every `AsyncResult` resolves to a `Result.Ok` when successful or `Result.Error` when it fails.
 *
 * An `AsyncResult` allows you to chain the same methods as a `Result`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `AsyncResult`, the Promise inside will resolve to the underlying `Result`.
 */
export class ResultAsync<Value, Error>
  implements
    DoNotation.Signed<'AsyncResult', Value>,
    PromiseLike<Result<Value, Error>>
{
  readonly #promise: Task<Result<Value, Error>>;

  readonly #q: Queue<Result<Value, Error>> | undefined;

  private constructor(
    promise: Task<Result<Value, Error>>,
    queue?: Queue<Result<Value, Error>>,
  ) {
    this.#promise = promise;
    this.#q = queue;
  }

  // ------------------------
  // #region: CONSTRUCTORS---
  // ------------------------

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
  static ok<Value>(value: Value): ResultAsync<Value, never> {
    return new ResultAsync(() => Promise.resolve(ResultRef.value.ok(value)));
  }

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
  static of: <Value>(value: Value) => ResultAsync<Value, never> = // eslint-disable-line @typescript-eslint/no-shadow
    ResultAsync.ok;

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
   *     return AsyncResult.error(new RateLimitError({ clientId, ip }));
   *   }
   *
   *   return AsyncOption.ok(clientId);
   * }
   * ```
   */
  static error<Error>(error: NonNullable<Error>): ResultAsync<never, Error> {
    return new ResultAsync(() => Promise.resolve(ResultRef.value.error(error)));
  }

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
  static fromNullable<Value>(
    value: Nullable<Value>,
  ): ResultAsync<Value, NoValueError>;

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
  static fromNullable<Value, Error>(
    value: Nullable<Value>,
    onNullable: Thunk<NonNullable<Error>>,
  ): ResultAsync<Value, Error>;

  static fromNullable(
    value: any,
    onNullable?: Thunk<any>,
  ): ResultAsync<any, any> {
    return new ResultAsync(() =>
      Promise.resolve(ResultRef.value.fromNullable(value, onNullable as never)),
    );
  }

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
  static fromFalsy<Value>(
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
  static fromFalsy<Value, Error extends {}>(
    value: Value | Falsy,
    onFalsy: (value: Falsy) => Error,
  ): ResultAsync<Exclude<NonNullable<Value>, Falsy>, Error>;

  static fromFalsy(
    value: any,
    onFalsy?: (value: any) => any,
  ): ResultAsync<any, any> {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!value)
      return ResultAsync.error(onFalsy?.(value) ?? new NoValueError()) as never;

    return ResultAsync.ok(value) as never;
  }

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
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFoundError>>;
   *
   * //     ┌─── AsyncResult<User, UserNotFoundError | UnknownError>
   * //     ▼
   * const url = AsyncResult.try(() => findUserById('user_123'));
   * // Output: Error(UnknownError)
   * ```
   */
  static try<$Result extends AnyResult>(
    promise: Task<$Result>,
  ): ResultAsync<
    AsyncResult.Unwrap<$Result>,
    AsyncResult.UnwrapError<$Result> | UnknownError
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
   * const url = AsyncResult.try(() => findUserByIdOrThrow('user_123'));
   * // Output: Error(UnknownError)
   * ```
   */
  static try<Value>(promise: Task<Value>): ResultAsync<Value, UnknownError>;

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
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFoundError>>;
   *
   * //     ┌─── AsyncResult<User, UserNotFoundError | UnknownError>
   * //     ▼
   * const url = AsyncResult.try(
   *   () => findUserById('user_123'),
   *   (error) => new DatabaseFailureError(error),
   * );
   * // Output: Error(DatabaseFailureError)
   * ```
   */
  static try<$Result extends AnyResult, Error extends {}>(
    promise: Task<$Result>,
    onThrow: (error: unknown) => Error,
  ): ResultAsync<
    AsyncResult.Unwrap<$Result>,
    AsyncResult.UnwrapError<$Result> | Error
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
   * //     ┌─── AsyncResult<User, UserNotFoundError | DatabaseFailureError>
   * //     ▼
   * const url = AsyncResult.try(
   *   () => findUserByIdOrThrow('user_123'),
   *   (error) => UserNotFoundError.is(error) ? error : new DatabaseFailureError(error),
   * );
   * // Output: DatabaseFailureError('Error: Failed to connect to the database')
   * ```
   */
  static try<Value, Error extends {}>(
    promise: Task<Value>,
    onThrow: (error: unknown) => Error,
  ): ResultAsync<Value, Error>;

  static try(
    promise: Task<any>,
    onThrow?: (error: unknown) => any,
  ): ResultAsync<any, any> {
    return new ResultAsync(
      () =>
        promise().then(
          (value) =>
            ResultRef.value.is(value) ? value : ResultRef.value.ok(value),
          (e) =>
            ResultRef.value.error(onThrow?.(e) ?? new UnknownError(String(e))),
        ) as never,
    );
  }

  /**
   * Constructs an `AsyncResult` from a `Promise` that returns a `Result`, and never rejects.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFoundError | DatabaseFailureError>>;
   *
   * //      ┌─── AsyncResult<User, UserNotFoundError | DatabaseFailureError>
   * //      ▼
   * const result = AsyncResult.promise(() => findUserById('user_123'));
   * // Output: Promise<Ok(User)>
   * ```
   */
  static promise<$Result extends AnyResult>(
    promise: Task<$Result>,
  ): ResultAsync<
    AsyncResult.Unwrap<$Result>,
    AsyncResult.UnwrapError<$Result>
  > {
    return new ResultAsync(promise) as never;
  }

  /**
   * Lifts a `Promise` that may fail or resolve to a `Result`
   * to a function that returns an `AsyncResult`.
   *
   * If the promise executes successfully, it resolves to the returned `Result`.
   * Otherwise, it resolves to a `Result.Error` with an `UnknownError` that contains the thrown exception.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFoundError>>;
   *
   * //           ┌─── (id: string) => AsyncResult<User, UserNotFoundError | UnknownError>
   * //           ▼
   * const safeFindUserById = AsyncResult.liftPromise(findUserById);
   *
   * //      ┌─── AsyncResult<User, UserNotFoundError | UnknownError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   * ```
   */
  static enhancePromise<
    Args extends readonly unknown[],
    $Result extends AnyResult,
  >(
    promise: (...args: Args) => Promise<$Result>,
  ): (
    ...args: Args
  ) => ResultAsync<
    AsyncResult.Unwrap<$Result>,
    AsyncResult.UnwrapError<$Result> | UnknownError
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
   * const safeFindUserById = AsyncResult.liftPromise(findUserByIdOrThrow);
   *
   * //      ┌─── AsyncResult<User, UnknownError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   */
  static enhancePromise<Args extends readonly unknown[], Value>(
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
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFoundError>>;
   *
   * //           ┌─── (id: string) => AsyncResult<User, UserNotFoundError | DatabaseFailureError>
   * //           ▼
   * const safeFindUserById = AsyncResult.liftPromise(
   *   findUserById,
   *   (error) => new DatabaseFailureError(error),
   * );
   *
   * //      ┌─── AsyncResult<User, UserNotFoundError | DatabaseFailureError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   * ```
   */
  static enhancePromise<
    Args extends readonly unknown[],
    $Result extends AnyResult,
    RejectionError extends {},
  >(
    promise: (...args: Args) => Promise<$Result>,
    onrejected: (e: unknown) => RejectionError,
  ): (
    ...args: Args
  ) => ResultAsync<
    AsyncResult.Unwrap<$Result>,
    AsyncResult.UnwrapError<$Result> | RejectionError
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
   * //           ┌─── (id: string) => AsyncResult<User, UserNotFoundError | DatabaseFailureError>
   * //           ▼
   * const safeFindUserById = AsyncResult.liftPromise(
   *   findUserByIdOrThrow,
   *   (error) => UserNotFoundError.is(error) ? error : new DatabaseFailureError(error),
   * );
   *
   * //      ┌─── AsyncResult<User, UserNotFoundError | DatabaseFailureError>
   * //      ▼
   * const user = safeFindUserById('user_123')
   * // Output: Promise<Ok(User)>
   * ```
   */
  static enhancePromise<
    Args extends readonly unknown[],
    Value,
    RejectionError extends {},
  >(
    promise: (...args: Args) => Promise<Value>,
    onrejected: (e: unknown) => RejectionError,
  ): (...args: Args) => ResultAsync<Value, RejectionError>;

  static enhancePromise(
    promise: (...args: any[]) => Promise<any>,
    onrejected?: (e: unknown) => any,
  ): (...args: any[]) => ResultAsync<any, any> {
    return (...args) =>
      new ResultAsync(
        () =>
          promise(...args).then(
            (value) =>
              ResultRef.value.is(value) ? value : ResultRef.value.ok(value),
            (e) =>
              ResultRef.value.error(
                onrejected?.(e) ?? new UnknownError(String(e)),
              ),
          ) as never,
      );
  }

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
   * const ensureCircle = AsyncResult.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── AsyncResult<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = ensureCircle(input);
   * ```
   */
  static predicate<Criteria extends Predicate.Guard<any, any>>(
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
   * const ensurePositive = AsyncResult.predicate(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── AsyncResult<number, FailedPredicateError<number>>
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
  static predicate<Criteria extends Predicate.Predicate<any>, Error extends {}>(
    criteria: Criteria,
    onUnfulfilled: (
      input: Criteria extends Predicate.Predicate<infer Input> ? Input : never,
    ) => Error,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Predicate<infer Input>
    ? ResultAsync<Input, Error>
    : never;

  static predicate(
    criteria: Predicate.Predicate<any>,
    onUnfulfilled?: (input: any) => any,
  ): (value: any) => ResultAsync<any, any> {
    return (value) =>
      ResultAsync.of(value).filter(criteria, onUnfulfilled as never);
  }

  /**
   * Evaluates a generator early returning when a `Result.Error` is propagated
   * or returning the `AsyncResult` returned by the generator.
   *
   * `yield*` an `AsyncResult<Value, Error>` unwraps values and propagates `Result.Error`s.
   *
   * If the value is `Result.error<E>`, then it will return an `AsyncResult` that resolves to `Result.Error<E>`
   * from the enclosing function.
   *
   * If applied to an `AsyncResult` that resolves to `Result.Ok<U>`, then it will unwrap the value to evaluate `U`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function rateLimit(clientId: ClientId, ip: IpAddress): AsyncResult<ClientId, RateLimitError>;
   *
   * declare function findUserByEmail(email: Email): AsyncResult<User, UserNotFoundError>;
   *
   * //       ┌─── AsyncResult<UserPreferences, RateLimitError | UserNotFoundError>
   * //       ▼
   * const result = AsyncResult.propagate(async function* () {
   *   yield* rateLimit(req.headers['x-client-id'], req.ip); // returns AsyncResult.Error<RateLimitError> immediately
   *
   *   const user: User = yield* findUserByEmail('johndoe@example.com'); // doesn't run
   *
   *   return AsyncResult.ok(user.preferences);
   * });
   * // Output: Promise<Error(RateLimitError)>
   * ```
   */
  static propagate<$Result extends AnyResult, Error extends {}>(
    generator: () => AsyncGenerator<Error, $Result>,
  ): ResultAsync<
    AsyncResult.Unwrap<$Result>,
    AsyncResult.UnwrapError<$Result> | AsyncResult.inferError<Error>
  > {
    return new ResultAsync(async () => {
      const { done, value } = await generator().next();

      return done ? value : (ResultRef.value.error(value) as never);
    });
  }

  static createPropagator<
    Args extends readonly any[],
    $Result extends AnyResult,
    Error extends {},
  >(
    generator: (...args: Args) => AsyncGenerator<Error, $Result>,
  ): (...args: Args) => ResultAsync<AsyncResult.Unwrap<$Result>, Error> {
    return (...args: Args) => ResultAsync.propagate(() => generator(...args));
  }

  // -----------------------
  // #endregion ------------

  // ------------------------
  // #region: COMBINATORS---
  // ------------------------

  /**
   * Given an array of `AsyncResult`s, returns an array containing only the values inside `Result.Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await AsyncResult.values([
   *   AsyncResult.ok(1),
   *   AsyncResult.error<number>('Failed computation'),
   *   AsyncResult.ok(3),
   * ]);
   * // Output: [1, 3]
   * ```
   */
  static async values<Value>(
    results: Array<
      | ResultAsync<Value, any>
      | ResultAsync<never, any>
      | ResultAsync<Value, never>
    >,
  ): Promise<Array<DoNotation.Unsign<Value>>> {
    return Promise.all(results).then(ResultRef.value.values);
  }

  /**
   * Combines two `AsyncResult`s into a single `AsyncResult` containing a tuple of their values,
   * if both `AsyncResult`s resolve to `Result.Ok` variants, otherwise, resolves to `Result.Error`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * const first = AsyncResult.some('hello');
   * const second = AsyncResult.some('world');
   *
   * //       ┌─── AsyncResult<[string, string], never>
   * //       ▼
   * const strings = first.zip(second);
   * // Output: Promise<Ok(['hello', 'world'])>
   * ```
   */
  zip<Value2, Error2>(
    that: ResultAsync<Value2, Error2>,
  ): ResultAsync<
    Tuple<DoNotation.Unsign<Value>, DoNotation.Unsign<Value2>>,
    Error | Error2
  > {
    return this.andThen((a) => that.map((b) => [a, b]) as never) as never;
  }

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
   * const first = AsyncResult.some('hello');
   * const second = AsyncResult.some('world');
   *
   * //        ┌─── AsyncResult<string, never>
   * //        ▼
   * const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
   * // Output: Promise<Ok('hello world')>
   * ```
   */
  zipWith<Value2, Error2, Output>(
    that: ResultAsync<Value2, Error2>,
    fn: (
      arg0: DoNotation.Unsign<Value>,
      arg1: DoNotation.Unsign<Value2>,
    ) => Output,
  ): ResultAsync<Output, Error | Error2> {
    return this.zip(that).map((results) => fn(...results) as any);
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: DO-NOTATION---
  // -----------------------

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
   * declare function findUserById(id: string): AsyncResult<User, UserNotFoundError>;
   *
   * declare function computeUserScore(user: User): AsyncResult<UserScore, UserNotScoredError>;
   *
   * declare function rankUserLevel(user: User, score: UserScore): AsyncResult<UserLevel, InvalidRankingError>;
   *
   * //        ┌─── AsyncResult<UserLevel, UserNotFoundError | UserNotScoredError | InvalidRankingError>
   * //        ▼
   * const userLevel = AsyncResult.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => computeUserScore(ctx.user))
   *   .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
   * //           ▲
   * //           └─── { user: User; score: UserScore }
   */
  static get Do(): ResultAsync<DoNotation.Sign, never> {
    return new ResultAsync(() => Promise.resolve(ResultRef.value.Do));
  }

  /**
   * Initiates a `Do-notation` with the current `AsyncResult`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * declare function computeUserScore(user: User): AsyncResult<UserScore, UserNotScoredError>;
   *
   * declare function rankUserLevel(user: User, score: UserScore): AsyncResult<UserLevel, InvalidRankingError>;
   *
   * declare const user: AsyncResult<User, UserNotFoundError>;
   *
   * //        ┌─── AsyncResult<UserLevel, UserNotFoundError | UserNotScoredError | InvalidRankingError>
   * //        ▼
   * const userLevel = user
   *   .bindTo('user')
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => computeUserScore(ctx.user))
   *   .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
   * //           ▲
   * //           └─── { user: User; score: UserScore }
   * ```
   */
  bindTo<Key extends string>(
    key: Key,
  ): ResultAsync<DoNotation.Sign<{ readonly [K in Key]: Value }>, Error> {
    return ResultAsync.Do.bind(key as never, () => this as never) as never;
  }

  /**
   * Binds a `AsyncResult` to the context object in a `Do-notation`.
   *
   * If the `AsyncResult` resolves to a `Result.Ok`, the value is assigned to the key in the context object.
   * If the `AsyncResult` resolve to a `Result.Error`, the parent `AsyncResult` running the `Do` simulation resolves to a `Result.Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): AsyncResult<User, UserNotFoundError>;
   *
   * declare function computeUserScore(user: User): AsyncResult<UserScore, UserNotScoredError>;
   *
   * declare function rankUserLevel(user: User, score: UserScore): AsyncResult<UserLevel, InvalidRankingError>;
   *
   * //        ┌─── Result<UserLevel, UserNotFoundError | UserNotScoredError | InvalidRankingError>
   * //        ▼
   * const userLevel = Result.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => computeUserScore(ctx.user))
   *   .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
   * //           ▲
   * //           └─── { user: User; score: UserScore }
   * ```
   */
  bind<Key extends string, ValueToBind, NewError>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'AsyncResult', 'bind'>,
    key: Exclude<Key, keyof Value>,
    cb: (ctx: DoNotation.Unsign<Value>) => ResultAsync<ValueToBind, NewError>,
  ): ResultAsync<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error | NewError
  > {
    return (this as ResultAsync<Value, Error>).andThen((ctx) =>
      cb(ctx).map(
        (value) =>
          // eslint-disable-next-line prefer-object-spread
          Object.assign({ [key]: value }, ctx) as {},
      ),
    ) as never;
  }

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
  let<Key extends string, ValueToBind>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'AsyncResult', 'let'>,
    key: Exclude<Key, keyof Value>,
    cb: (scope: DoNotation.Unsign<Value>) => Promise<ValueToBind>,
  ): ResultAsync<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error
  > {
    // @ts-expect-error the compiler is complaining because of DoNotation check in argument `this`
    return (this as ResultAsync<Value, Error>).bind(key, (ctx) =>
      ResultAsync.promise(() => cb(ctx).then(ResultRef.value.ok)),
    );
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: CONVERSIONS---
  // -----------------------

  /**
   * Attaches a callback for the resolution of the Promise inside the `AsyncResult`.
   */
  then<Fulfilled = Value>(
    onfulfilled?:
      | ((value: Result<Value, Error>) => Fulfilled | PromiseLike<Fulfilled>)
      | null,
  ): Promise<Fulfilled> {
    return this.#promise().then(
      (result) => onfulfilled?.(this.#q?.execute(result) ?? result) as never,
      // (e) =>
      //   onfulfilled?.(
      //     ResultRef.value.error(new UnknownError(String(e))) as never,
      //   ) as never,
    );
  }

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
  async match<Output, ErrorOutput>(
    cases: AsyncResult.Match<
      DoNotation.Unsign<Value>,
      Error,
      Output,
      ErrorOutput
    >,
  ): Promise<ErrorOutput | Output> {
    return this.then((result) => result.match(cases));
  }

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
   * const user = await AsyncResult.ok(databaseUser).unwrap();
   *
   * const team = await AsyncResult.error(new TeamNotFound()).unwrap();
   * // Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
   * ```
   */
  async unwrap(): Promise<DoNotation.Unsign<Value>> {
    return this.unwrapOr((error) => {
      const exception = new UnwrapError('Result');
      exception.cause = error;

      throw exception;
    });
  }

  /**
   * Returns a promise that unwraps the underlying `Result` error.
   *
   * @throws `UnwrapError` if the `Result` is `Ok`.
   *
   * @example
   * ```ts
   * import { AsyncResult } from 'funkcia';
   *
   * //      ┌─── UserNotFoundError
   * //      ▼
   * const error = await AsyncResult.error(new UserNotFoundError()).unwrapError();
   * ```
   */
  async unwrapError(): Promise<Error> {
    return this.match({
      Ok: (value) => {
        const exception = new UnwrapError('ResultError');
        exception.cause = value;

        throw exception;
      },
      Error: identity,
    });
  }

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
   * const baseUrl = await AsyncResult.ok(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://funkcia.lukemorales.io'
   *
   * const apiKey = await AsyncResult.error('Missing API key')
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * // Output: 'sk_test_9FK7CiUnKaU'
   * ```
   */
  async unwrapOr<Output = DoNotation.Unsign<Value>>(
    onError: (error: Error) => Output,
  ): Promise<
    readonly any[] extends DoNotation.Unsign<Value>
      ? DoNotation.Unsign<Value>
      : DoNotation.Unsign<Value> | Output
  > {
    return this.match({
      Ok: identity,
      Error: onError,
    }) as never;
  }

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
  async unwrapOrNull(): Promise<DoNotation.Unsign<Value> | null> {
    return this.unwrapOr(alwaysNull);
  }

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
  async unwrapOrUndefined(): Promise<DoNotation.Unsign<Value> | undefined> {
    return this.unwrapOr(alwaysUndefined as never) as never;
  }

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
   *   (error) => new UserNotFoundError(userId),
   * //   ▲
   * //   └─── DatabaseFailureError
   * );
   *
   * const anotherUser = await findUserById('invalid_id').expect(
   *   (error) => new UserNotFoundError('team_01'),
   * //   ▲
   * //   └─── DatabaseFailureError
   * );
   * // Output: Uncaught exception: 'User not found: "user_123"'
   * ```
   */
  async expect<Exception extends globalThis.Error>(
    onError: (error: Error) => Exception,
  ): Promise<DoNotation.Unsign<Value>> {
    return this.unwrapOr((error) => {
      throw onError(error);
    });
  }

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
  async merge(): Promise<DoNotation.Unsign<Value> | Error> {
    return this.match({ Ok: identity, Error: identity });
  }

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
  async contains(
    criteria: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ): Promise<boolean> {
    return this.match({ Ok: criteria, Error: alwaysFalse });
  }

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
  toAsyncOption(): AsyncOption<NonNullable<DoNotation.Unsign<Value>>> {
    return FunkciaStore.AsyncOption.promise(() =>
      this.then((result) => result.toOption()),
    ) as never;
  }

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
  async toArray(): Promise<Array<DoNotation.Unsign<Value>>> {
    return this.then((result) => result.toArray());
  }

  // ---------------------------
  // #endregion ----------------

  // ---------------------------
  // #region: TRANSFORMATIONS---
  // ---------------------------

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
   * const result = AsyncResult.ok(10).map(number => number * 2);
   * // Output: Promise<Ok(20)>
   * ```
   */
  map<Output>(
    onOk: (value: DoNotation.Unsign<Value>) => Output,
  ): ResultAsync<Output, Error> {
    return new ResultAsync(
      this.#promise,
      Queue.of(this.#q).enqueue('map', onOk),
    ) as never;
  }

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
   * const result = AsyncResult.fromNullable(user.lastName).mapError(
   *   (error) => new UserMissingInformationError()
   * //   ▲
   * //   └─── NoValueError
   * );
   * ```
   */
  mapError<NewError extends {}>(
    onError: (value: Error) => NewError,
  ): ResultAsync<Value, NewError> {
    return new ResultAsync(
      this.#promise,
      Queue.of(this.#q).enqueue('mapError', onError),
    ) as never;
  }

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
    AsyncResult.Unwrap<Output>,
    Error | AsyncResult.UnwrapError<Output>
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
  andThen<Output extends ResultAsync<any, any>>(
    onOk: (value: DoNotation.Unsign<Value>) => Output,
  ): ResultAsync<
    AsyncResult.Unwrap<Output>,
    Error | AsyncResult.UnwrapError<Output>
  >;

  andThen<Output, NewError>(
    onOk: (
      value: DoNotation.Unsign<Value>,
    ) => Result<Output, NewError> | ResultAsync<Output, NewError>,
  ): any {
    const flattenedPromise = async () => {
      try {
        let output = onOk(await this.expect(identity as never));
        if (output instanceof ResultRef.value) output = output.toAsyncResult();

        return await output;
      } catch (e) {
        return ResultAsync.error(e as never) as never;
      }
    };

    return new ResultAsync(flattenedPromise) as never;
  }

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
   * const result = AsyncResult.of(input).filter(
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
   * const result = AsyncResult.of(user.lastName).filter(
   *   (value) => value.length > 0,
   *   (value) => new Error(`Expected non-empty string, received ${value}`),
   * );
   * ```
   */
  filter<NewError>(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
    onUnfulfilled: (value: DoNotation.Unsign<Value>) => NonNullable<NewError>,
  ): ResultAsync<Value, Error | NewError>;

  filter(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
    onUnfulfilled?: (value: DoNotation.Unsign<Value>) => any,
  ): ResultAsync<Value, any> {
    return new ResultAsync(
      this.#promise,
      Queue.of(this.#q).enqueue('filter', predicate, [onUnfulfilled]),
    );
  }

  // ---------------------
  // #endregion ----------

  // ---------------------
  // #region: FALLBACKS---
  // ---------------------

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
   * const result = await AsyncResult.ok('Smith')
   *   .or(() => AsyncResult.ok('John'))
   *   .unwrap();
   * // Output: 'Smith'
   *
   * const greeting = await AsyncResult.error(new Error('Missing user'))
   *   .or(() => AsyncResult.ok('John'))
   *   .unwrap();
   * // Output: 'John'
   * ```
   */
  or<NewValue, NewError>(
    onError: (error: Error) => ResultAsync<NewValue, NewError>,
  ): ResultAsync<Value | NewValue, Error | NewError> {
    return new ResultAsync(
      () =>
        this.then(async (result) =>
          result.isOk() ? result : onError(result.unwrapError()),
        ) as never,
    ) as never;
  }

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
  swap(): ResultAsync<Error, Value> {
    return new ResultAsync(
      this.#promise,
      Queue.of(this.#q).enqueue('swap', () => null),
    ) as never;
  }

  // -----------------
  // #endregion ------

  // -----------------
  // #region: OTHER---
  // -----------------

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
   * declare function authenticateUser(credentials: AuthCredentials): AsyncResult<User, UserNotFoundError | InvalidCredentialsError>;
   *
   * declare async function registerSuccessfulLoginAttempt(user: User): Promise<{ loginAttempts: number }>;
   *
   * //       ┌─── AsyncResult<User, UserNotFoundError | InvalidCredentialsError>
   * //       ▼
   * const result = authenticateUser(req.body).tap(async (user) => {
   *   return await registerSuccessfulLoginAttempt(user);
   * });
   * // Output: Promise<Ok(User)>
   * ```
   */
  tap(onOk: (value: DoNotation.Unsign<Value>) => unknown): this {
    return new ResultAsync(() =>
      this.then(async (_result) => {
        const result = this.#q?.execute(_result) ?? _result;

        if (result.isOk()) {
          const effect = await onOk(result.unwrap());

          if (effect instanceof Promise) await effect;
        }

        return result;
      }),
    ) as never;
  }

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
   * declare function authenticateUser(credentials: AuthCredentials): AsyncResult<User, UserNotFoundError | InvalidCredentialsError>;
   *
   * declare async function registerLoginAttempt(user: User): Promise<{ loginAttempts: number }>;
   *
   * //       ┌─── AsyncResult<User, UserNotFoundError | InvalidCredentialsError>
   * //       ▼
   * const result = authenticateUser(req.body).tapError(async (error) => {
   *   if (InvalidCredentialsError.is(error)) {
   *     return await registerLoginAttempt(error.email);
   *   }
   * });
   * // Output: Promise<Error(InvalidCredentialsError)>
   * ```
   */
  tapError(onError: (error: Error) => unknown): this {
    return new ResultAsync(() =>
      this.then(async (_result) => {
        const result = this.#q?.execute(_result) ?? _result;

        if (result.isError()) await onError(result.unwrapError());

        return result;
      }),
    ) as never;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<
    Error,
    DoNotation.Unsign<Value>
  > {
    return yield* await this;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'AsyncResult(Promise)';
  }
}

FunkciaStore.register(ResultAsync);
