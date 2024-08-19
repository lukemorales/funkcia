/* eslint-disable @typescript-eslint/no-namespace */
import {
  FailedPredicateError,
  MissingValueError,
  UnexpectedResultError,
  UnknownError,
  UnwrapError,
} from './exceptions';
import { identity } from './functions';
import { INSPECT_SYMBOL } from './internals/inspect';
import type { Falsy } from './internals/types';
import type { Option } from './option';
import type { Predicate, RefinedValue, Refinement } from './predicate';
import type { Nullable } from './types';

const $ok = Symbol('Result::Ok');
const $error = Symbol('Result::Error');

declare namespace Type {
  type Ok = typeof $ok;
  type Error = typeof $error;
}

interface PatternMatch<Value, Error, Output, ErrorOutput> {
  Ok: (value: Value) => Output;
  Error: (error: Error) => ErrorOutput;
}

type NoResultReturnInMapGuard<Value> =
  Value extends Result<infer _, infer _> ?
    'ERROR: Use `andThen` instead. Cause: the transformation is returning a Result, use `andThen` to flatten the Result.'
  : Value;

type InferResultValue<Output> =
  Output extends Result<infer Value, infer _> ?
    /* removes `never` from union */
    Value extends never ? never
    : /* removes `any` from union */
    unknown extends Value ? never
    : /* removes `undefined` from union */
    undefined extends Value ?
      void // eslint-disable-line @typescript-eslint/no-invalid-void-type
    : Value
  : never;

type InferResultError<Output> =
  Output extends Result<infer _, infer Error> ?
    /* removes `never` from union */
    Error extends never ? never
    : /* removes `any` from union */
    unknown extends Error ? never
    : Error
  : never;

/**
 * Error handling with `Result`.
 *
 * `Result` represents the result of an operation that can either be successful (`Ok`) or return an error (`Error`).
 *
 * `Result` is commonly used to represent the result of a function that can fail, such as a network request, a file read, or a database query.
 */
export class Result<Value, Error> {
  readonly #tag: Type.Ok | Type.Error;

  readonly #value: Value;

  readonly #error: Error;

  private constructor(kind: Type.Ok, value: Value);

  private constructor(kind: Type.Error, value: Error);

  private constructor(kind: Type.Ok | Type.Error, value?: any) {
    this.#tag = kind;
    this.#value = kind === $ok ? value : null;
    this.#error = kind === $error ? value : null;
  }

  // ------------------------
  // ---MARK: CONSTRUCTORS---
  // ------------------------

  /**
   * Constructs an `Ok` result with the provided value.
   *
   * Use it to explicit construct an `OK`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: Result<number, never>
   * const result = Result.ok(10);
   * ```
   */
  static ok<Value>(value: Value): Result<Value, never> {
    return new Result($ok, value);
  }

  /**
   * @alias
   * Alias of `Result.ok` - constructs an `Ok` result with the provided value.
   *
   * Useful to indicate the creation of an `Result` that is immediately going to be processed.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const denominator: number;
   *
   * // Output: Result<number, never>
   * const result = Result.of(denominator)
   *   .filter((number) => number > 0)
   *   .map((number) => 10 / number);
   * ```
   */
  static of = Result.ok; // eslint-disable-line @typescript-eslint/member-ordering

  /**
   * Constructs an `Error` result with the provided error.
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
    return new Result($error, error);
  }

  /**
   * Constructs a `Result` from a nullable value.
   *
   * If the value is `null` or `undefined`, returns an `Error` with a `MissingValueError` exception.
   * Otherwise, returns an `Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   *   age: number;
   * }
   *
   * // Output: Result<string, MissingValueError>
   * const result = Result.fromNullable(user.lastName);
   * ```
   */
  static fromNullable<Value>(
    value: Nullable<Value>,
  ): Result<NonNullable<Value>, MissingValueError>;

  /**
   * Constructs a `Result` from a nullable value.
   *
   * If the value is `null | undefined`, returns an `Error` with return of the provided `onNullable` callback.
   * Otherwise, returns an `Ok` result.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   *   age: number;
   * }
   *
   * // Output: Result<string, Error>
   * const result = Result.fromNullable(
   *   user.lastName,
   *   () => new Error('User missing last name'),
   * );
   * ```
   */
  static fromNullable<Value, Error extends {}>(
    value: Nullable<Value>,
    onNullable: () => Error,
  ): Result<NonNullable<Value>, Error>;

  static fromNullable(value: any, onNullable?: () => any): Result<any, any> {
    return value == null ?
        Result.error(onNullable?.() ?? new MissingValueError())
      : Result.ok(value);
  }

  /**
   * Constructs a `Result` from a _falsy_ value.
   *
   * If the value is _falsy_, returns an `Error` result with a `MissingValueError` exception.
   * Otherwise, returns an `Ok` result.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   firstName: string;
   *   lastName?: string;
   *   age: number;
   * }
   *
   * // Output: Result<string, MissingValueError>
   * const result = Result.fromFalsy(user.lastName);
   * ```
   */
  static fromFalsy<Value>(
    value: Value | Falsy,
  ): Result<Exclude<NonNullable<Value>, Falsy>, MissingValueError>;

  /**
   * Constructs a `Result` from a _falsy_ value.
   *
   * If the value is _falsy_, returns an `Error` result with the return of the provided `onFalsy` callback.
   * Otherwise, returns an `Ok` result.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   firstName: string;
   *   lastName?: string;
   *   age: number;
   * }
   *
   * // Output: Result<string, Error>
   * const result = Result.fromFalsy(
   *   user.lastName,
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
    if (!value) {
      return Result.error(onFalsy?.(value) ?? new MissingValueError());
    }

    return Result.ok(value);
  }

  /**
   * Constructs a `Result` from a `Option`.
   *
   * If the `Option` is `Some`, returns an `Ok` with the value.
   * Otherwise, returns an `Error` with an `MissingValueError`.
   *
   * @example
   * ```ts
   * import { Option, Result } from 'funkcia';
   *
   * declare const option: Option<User>;
   *
   * // Output: Result<User, MissingValueError>
   * const result = Result.fromOption(option);
   * ```
   */
  static fromOption<Value extends {}>(
    option: Option<Value>,
  ): Result<Value, MissingValueError>;

  /**
   * Constructs a `Result` from a `Option`.
   *
   * If the `Option` is `Some`, returns an `Ok` with the value.
   * Otherwise, returns an `Error` with the return of the provided `onNone` callback.
   *
   * @example
   * ```ts
   * import { Option, Result } from 'funkcia';
   *
   * declare const option: Option<User>;
   *
   * // Output: Result<User, UserNotFound>
   * const result = Result.fromOption(option, () => new UserNotFound());
   * ```
   */
  static fromOption<Value extends {}, Error extends {}>(
    option: Option<Value>,
    onNone: () => Error,
  ): Result<Value, Error>;

  static fromOption(option: Option<any>, onNone?: () => any): Result<any, any> {
    return option.match({
      Some: (value) => Result.ok(value),
      None: () => Result.error(onNone?.() ?? new MissingValueError()),
    });
  }

  /**
   * Constructs a `Result` from a function that may throw.
   *
   * If the function does not throw, returns an `Ok` result.
   * Otherwise, returns an `Error` result with an `UnknownError` containing the exception thrown by the function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: Result<URL, UnknownError>
   * const url = Result.try(() => new URL('example.com'));
   * ```
   */
  static try<Value>(fn: () => Value): Result<Value, UnknownError>;

  /**
   * Constructs a `Result` from a function that may throw.
   *
   * If the function does not throw, returns an `Ok` result.
   * Otherwise, returns an `Error` result with the return of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: Result<URL, Error>
   * const url = Result.try(
   *   () => new URL('example.com'),
   *   (error) => new Error('Invalid URL'),
   * );
   * ```
   */
  static try<Value, Error extends {}>(
    fn: () => Value,
    onThrow: (error: unknown) => Error,
  ): Result<Value, Error>;

  static try(
    fn: () => any,
    onThrow?: (error: unknown) => any,
  ): Result<any, any> {
    try {
      return Result.ok(fn());
    } catch (e) {
      return Result.error(onThrow?.(e) ?? new UnknownError(e));
    }
  }

  /**
   * Utility wrapper to ensure a function always returns a `Result`.
   *
   * This method provides a better inference over the return of the function,
   * and guarantees that the function will always return a `Result`.
   * Extremally useful when your function returns multiple errors.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // When defining a normal function allowing typescript to infer the return type,
   * //the return type is always a union of `Result<T, never>` and `Result<never, E>`
   * function parseAndValidate(value: unknown) {
   *   try {
   *     const data = JSON.parse(value);
   *
   *     const payload = schema.safeParse(data);
   *
   *     return payload.success ?
   *       Result.ok(payload.data)
   *     : Result.error(new InvalidPayload(payload.error));
   *   } catch {
   *     return Result.error(new InvalidJson());
   *   }
   * }
   *
   *
   * // Output: Result<Schema, never> | Result<never, InvalidJson> | Result<never, InvalidPayload>
   * const result = parseAndValidate(req.body);
   *
   * // When using the `wrap` method, the return type is always `Result<T, E>`
   * const parseAndValidate = Result.wrap((value: unknown) => {
   *   try {
   *     const data = JSON.parse(value);
   *
   *     const payload = schema.safeParse(data);
   *
   *     return payload.success ?
   *       Result.ok(payload.data)
   *     : Result.error(new InvalidPayload(payload.error));
   *   } catch {
   *     return Result.error(new InvalidJson());
   *   }
   * });
   *
   * // Output: Result<Schema, InvalidJson | InvalidPayload>
   * const result = parseAndValidate(req.body);
   * ```
   */
  static wrap<Callback extends (...args: any[]) => Result<any, any>>(
    fn: Callback,
  ): (
    ...args: Parameters<Callback>
  ) => Result<
    InferResultValue<ReturnType<Callback>>,
    InferResultError<ReturnType<Callback>>
  > {
    return (...args) => fn(...args);
  }

  /**
   * Produces a function that returns a `Result` from a function that may throw.
   *
   * If the function does not throw, returns an `Ok`.
   * Otherwise, returns an `Error` with an `UnknownError` containing the exception thrown by the function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: (text: string, reviver?: Function) => Result<any, UnknownError>
   * const safeJsonParse = Result.produce(JSON.parse);
   *
   * // Output: Result<any, UnknownError>
   * const result = safeJsonParse('{ "name": "John Doe" }');
   * ```
   */
  static produce<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Result<Value, UnknownError>;

  /**
   * Produces a function that returns a `Result` from a function that may throw.
   *
   * If the function does not throw, returns an `Ok`.
   * Otherwise, returns an `Error` with the return of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: (text: string, reviver?: Function) => Result<any, TypeError>
   * const safeJsonParse = Result.produce(
   *   JSON.parse,
   *   (error) => new TypeError('Invalid JSON'),
   * );
   *
   * // Output: Result<any, TypeError>
   * const result = safeJsonParse('{ "name": "John Doe" }');
   * ```
   */
  static produce<Args extends readonly unknown[], Value, Error extends {}>(
    callback: (...args: Args) => Value,
    onThrow: (error: unknown) => Error,
  ): (...args: Args) => Result<Value, Error>;

  static produce(
    callback: (...args: any[]) => any,
    onThrow?: (error: unknown) => any,
  ): (...args: any[]) => Result<any, any> {
    return (...args) => Result.try(() => callback(...args), onThrow as never);
  }

  /**
   * Creates a function that can be used to refine the type of a value.
   *
   * The predicate function takes a value and returns a `Result` with either
   * the narrowed value or a `FailedPredicateError` containing the failed value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const isCircle = Result.definePredicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * // Output: Result<Circle, FailedPredicateError<Square>>
   * const result = isCircle(input);
   * ```
   */
  static definePredicate<Value, Output extends Value>(
    refinement: Refinement<Value, Output>,
  ): (
    input: Value,
  ) => Result<Output, FailedPredicateError<RefinedValue<Value, Output>>>;

  /**
   * Creates a function that can be used to assert the type of a value.
   *
   * The predicate function takes a value and returns a `Result` with either
   * the value or a `FailedPredicateError` containing the failed value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const isPositive = Result.definePredicate(
   *   (value: number) => value > 0,
   * );
   *
   * // Output: Result<number, FailedPredicateError<number>>
   * const result = isPositive(10);
   * ```
   */
  static definePredicate<Value>(
    predicate: Predicate<Value>,
  ): (input: Value) => Result<Value, FailedPredicateError<Value>>;

  /**
   * Creates a function that can be used to refine the type of a value.
   *
   * The predicate function takes a value and returns a `Result` with either
   * the narrowed value or the error returned by the provided function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const isPositive = Result.definePredicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   *   (shape) => new InvalidShapeError(shape.kind),
   *   // ^? Square
   * );
   *
   * // Output: Result<Circle, InvalidShapeError>
   * const result = isPositive(input);
   * ```
   */
  static definePredicate<Value, Output extends Value, Error extends {}>(
    refinement: Refinement<Value, Output>,
    onUnfulfilled: (input: RefinedValue<Value, Output>) => Error,
  ): (input: Value) => Result<Output, Error>;

  /**
   * Creates a function that can be used to assert the type of a value.
   *
   * The predicate function takes a value and returns a `Result` with either
   * the value or the error returned by the provided function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const isPositive = Result.definePredicate(
   *   (value: number) => value > 0,
   *   (value) => new InvalidNumberError(value),
   * );
   *
   * // Output: Result<number, InvalidNumberError>
   * const result = isPositive(10);
   * ```
   */
  static definePredicate<Value, Error extends {}>(
    predicate: Predicate<Value>,
    onUnfulfilled: (input: Value) => Error,
  ): (input: Value) => Result<Value, Error>;

  static definePredicate(
    predicate: Predicate<any>,
    onUnfulfilled?: (input: any) => any,
  ): (value: any) => Result<any, any> {
    return (value) =>
      Result.of(value).filter(predicate, onUnfulfilled as never);
  }

  // -----------------------
  // ---MARK: CONVERSIONS---
  // -----------------------

  /**
   * Compare the `Result` against the possible patterns and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   firstName: string;
   *   lastName?: string;
   *   age: number;
   * }
   *
   *
   * declare function findUserById(id: string): Result<User, UserNotFound>;
   *
   * declare function getUserLastName(user: User): Result<string, MissingValueError>;
   *
   * // Output: string
   * const userGreeting = findUserById('user_01')
   *   .andThen(getUserLastName)
   *   .match({
   *     Ok(lastName) {
   *       return `Hello, Mr. ${lastName}`;
   *     },
   *     Error(error) {
   *       return 'Hello, stranger';
   *     },
   *   });
   * ```
   */
  match<Output, ErrorOutput>(
    cases: PatternMatch<Value, Error, Output, ErrorOutput>,
  ): Output | ErrorOutput {
    return this.isOk() ? cases.Ok(this.#value) : cases.Error(this.#error);
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
   * // Output: User
   * const user = Result.ok(databaseUser).unwrap();
   *
   * // Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
   * const team = Result.error(new TeamNotFound()).unwrap();
   * ```
   */
  unwrap(): Value {
    return this.unwrapOr(() => {
      throw new UnwrapError('Result');
    });
  }

  /**
   * Returns the value of the `Result`.
   * If the Result is `Error`, returns the fallback value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: 'https://docs.funkcia.io'
   * const baseUrl = Result.ok(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   *
   * // Output: 'sk_test_9FK7CiUnKaU'
   * const apiKey = Result.error('Missing API key')
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * ```
   */
  unwrapOr(onError: (error: Error) => Value): Value {
    return this.match({ Ok: identity, Error: onError });
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
   *   // Output: UserNotFound
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
   * Unwraps the `Result` value.
   *
   * Receives an `onError` callback that returns a message to throw
   * if the `Result` is `Error` with the `UnexpectedResultError` exception.
   *
   * @throws the provided exception if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, MissingValueError>;
   *
   * // Output: User
   * const user = findUserById(userId).expect(
   *   'User not found with id: ${userId}'
   * );
   * ```
   */
  expect(onError: string): Value;

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
   * declare function findUserById(id: string): Result<User, MissingValueError>;
   *
   * // Output: User
   * const user = findUserById(userId).expect(
   *   () => new UserNotFoundError(userId)
   * );
   * ```
   */
  expect<Exception extends globalThis.Error>(
    onError: (error: Error) => Exception,
  ): Value;

  expect(onError: string | ((error: Error) => globalThis.Error)): Value {
    return this.unwrapOr((error) => {
      if (typeof onError === 'string') {
        throw new UnexpectedResultError(onError, error);
      }

      throw onError(error);
    });
  }

  /**
   * Unwraps the value of the `Result` if it is a `Ok`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: User | null
   * const user = Result.ok(databaseUser).toNullable();
   * ```
   */
  toNullable(): Value | null {
    return this.match({ Ok: identity, Error: () => null });
  }

  /**
   * Unwraps the value of the `Result` if it is a `Ok`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: User | undefined
   * const user = Result.ok(databaseUser).toUndefined();
   * ```
   */
  toUndefined(): Value | undefined {
    return this.match({ Ok: identity, Error: () => undefined });
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
   * // Output: true
   * const isPositive = Result.ok(10).contains(num => num > 0);
   *
   * // Output: false
   * const isNegative = Result.error(10).contains(num => num > 0);
   * ```
   */
  contains(predicate: Predicate<Value>): boolean {
    return this.isOk() && predicate(this.#value);
  }

  // ---------------------------
  // ---MARK: TRANSFORMATIONS---
  // ---------------------------

  /**
   * Applies a callback function to the value of the `Result` when it is `Ok`,
   * returning a new `Result` containing the new value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Result<number, never>
   * const result = Result.ok(10).map(number => number * 2);
   * ```
   */
  map<Output>(
    onOk: (value: Value) => NoResultReturnInMapGuard<Output>,
  ): Result<Output, Error> {
    if (this.isError()) {
      return this as never;
    }

    // @ts-expect-error the compiler is complaining because of the NoResultReturnInMapGuard guard
    return Result.ok(onOk(this.#value));
  }

  /**
   * Applies a callback function to the value of the `Result` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to map (also known as `flatMap`), with the difference
   * that the callback must return an `Result`, not a raw value.
   * This allows chaining multiple calls that return `Result`s together.
   *
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Result<string, UserMissingInformationError>
   * const result = Result.fromNullable(user.lastName).mapError(
   *   (error) => new UserMissingInformationError()
   * //   ^?  MissingValueError
   * );
   * ```
   */
  mapError<NewError extends {}>(
    onError: (value: Error) => NoResultReturnInMapGuard<NewError>,
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
   * // Result<string, UserMissingInformationError>
   * const result = Result.fromNullable(user.lastName).mapBoth({
   *   Ok: (lastName) => `Hello, Mr. ${lastName}`,
   *   Error: (error) => new UserMissingInformationError(),
   * //          ^?  MissingValueError
   * });
   * ```
   */
  mapBoth<Output, NewError extends {}>(
    cases: PatternMatch<
      Value,
      Error,
      NoResultReturnInMapGuard<Output>,
      NoResultReturnInMapGuard<NewError>
    >,
  ): Result<Output, NewError> {
    // @ts-expect-error the compiler is complaining because of the NoResultReturnInMapGuard guard
    return this.isOk() ?
        Result.ok(cases.Ok(this.#value))
      : Result.error(cases.Error(this.#error));
  }

  /**
   * Applies a callback function to the value of the `Result` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to map (also known as `flatMap`), with the difference
   * that the callback must return an `Result`, not a raw value.
   * This allows chaining multiple calls that return `Result`s together.
   *
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   *   age: number;
   * }
   *
   * declare function findUserById(id: string): Result<User, UserNotFound>;
   *
   * declare function getUserLastName(user: User): Result<string, MissingValueError>;
   *
   *  // Output: Result<string, UserNotFound | MissingValueError>
   * const result = findUserById('user_01').andThen(getUserLastName)
   * ```
   */
  andThen<Output, NewError>(
    onOk: (value: Value) => Result<Output, NewError>,
  ): Result<Output, Error | NewError> {
    return this.isOk() ? (onOk(this.#value) as never) : (this as never);
  }

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `Result`, returning a `Error` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: Result<Circle, FailedPredicateError<Square>>
   * const result = Result.of<Square | Circle>(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * );
   * ```
   */
  filter<Output extends Value>(
    refinement: Refinement<Value, Output>,
  ): Result<Output, Error | FailedPredicateError<RefinedValue<Value, Output>>>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning an `Error` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Result<string, FailedPredicateError<string>>
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   * );
   * ```
   */
  filter(
    predicate: Predicate<Value>,
  ): Result<Value, Error | FailedPredicateError<Value>>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning an `Error` Result with the provided value instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Output: Result<Circle, Error>
   * const result = Result.of<Square | Circle>(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   *   (shape) => new Error(`Expected Circle, received ${shape.kind}`),
   * //   ^? Square
   * );
   * ```
   */
  filter<Output extends Value, NewError extends {}>(
    refinement: Refinement<Value, Output>,
    onUnfulfilled: (value: RefinedValue<Value, Output>) => NewError,
  ): Result<Output, Error | NewError>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning an `Error` Result with the provided value instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // Result<string, Error>
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   *   (value) => new Error(`Expected non-empty string, received ${value}`),
   * );
   * ```
   */
  filter<NewError extends {}>(
    predicate: Predicate<Value>,
    onUnfulfilled: (value: Value) => NewError,
  ): Result<Value, Error | NewError>;

  filter(
    predicate: Predicate<any>,
    onUnfulfilled?: (value: any) => any,
  ): Result<any, any> {
    if (this.isOk() && !predicate(this.#value)) {
      return Result.error(
        onUnfulfilled?.(this.#value) ?? new FailedPredicateError(this.#value),
      );
    }

    return this as never;
  }

  // -----------------------
  // ---MARK: COMPARISONS---
  // -----------------------

  /**
   * Returns `true` if the Result is `Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, UserNotFound>;
   *
   * const maybeUser = findUserById('user_01');
   *
   * if (maybeUser.isSome()) {
   *   // Output: User
   *   const user = maybeUser.unwrap(); // `unwrap` will not throw
   * }
   * ```
   */
  isOk(): this is Result.Ok<Value> {
    return this.#tag === $ok;
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
    return this.#tag === $error;
  }

  protected [INSPECT_SYMBOL] = (): string =>
    this.match({
      Ok: (value) => `Ok(${JSON.stringify(value)})`,
      Error: (e) => `Error(${JSON.stringify(e)})`,
    });
}

declare namespace Result {
  interface Ok<Value> {
    /**
     * @override `unwrap` will not throw in this context. Result value is guaranteed to exist.
     */
    unwrap: () => Value;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    unwrapOr: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    unwrapError: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    match: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    mapError: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    mapBoth: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    expect: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    toNullable: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    toUndefined: never;
    /**
     * @override this method has no effect in this context. Result value is guaranteed to exist.
     */
    isError: never;
  }

  interface Error<Err> extends Partial<Result<any, Err>> {
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    unwrap: never;
    /**
     * @override `unwrapError` will not throw in this context. Result guaranteed to be Error.
     */
    unwrapError: () => Err;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    expect: never;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    map: never;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    mapBoth: never;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    andThen: never;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    match: never;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    isOk: never;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    filter: never;
    /**
     * @override this method has no effect in this context. Result guaranteed to be Error.
     */
    contains: never;
  }
}
