/* eslint-disable @typescript-eslint/no-namespace */

import type { FunkciaMode } from './do-notation';
import { DoNotation, FUNKCIA_MODE } from './do-notation';
import {
  FailedPredicateError,
  MissingValueError,
  UnknownError,
  UnwrapError,
} from './exceptions';
import { constNull, constUndefined, identity } from './functions';
import { FunkciaStore } from './funkcia-store';
import type { Falsy } from './internals/types';
import { logiffy } from './internals/utils';
import type { Option } from './option';
import type { Predicate } from './predicate';
import type { Nullish } from './types';

const OK = Symbol('Result::Ok');
const ERROR = Symbol('Result::Error');

/**
 * Error handling with `Result`.
 *
 * `Result` represents the result of an operation that can either be successful (`Ok`) or return an error (`Error`).
 *
 * `Result` is commonly used to represent the result of a function that can fail, such as a network request, a file read, or a database query.
 */
export class Result<Value, Error> extends DoNotation<Value> {
  readonly #tag: Result.$ok | Result.$error;

  readonly #value: Value;

  readonly #error: Error;

  private constructor(
    kind: Result.$ok,
    value: Value,
    options?: FunkciaMode.Options,
  );

  private constructor(
    kind: Result.$error,
    value: Error,
    options?: FunkciaMode.Options,
  );

  private constructor(
    kind: Result.$ok | Result.$error,
    value?: any,
    options?: FunkciaMode.Options,
  ) {
    super(options?.mode);

    this.#tag = kind;
    this.#value = kind === OK ? value : undefined;
    this.#error = kind === ERROR ? value : undefined;
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
   * //      ┌─── Result<number, never>
   * //      ▼
   * const result = Result.ok(10);
   * ```
   */
  static ok<Value>(value: Value): Result<Value, never> {
    return new Result(OK, value);
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
   * //      ┌─── Result<number, UnfulfilledPredicateError<number>>
   * //      ▼
   * const result = Result.of(divisor)
   *   .filter((number) => number > 0)
   *   .map((number) => dividend / number);
   * ```
   */
  static of: <Value>(value: Value) => Result<Value, never> = Result.ok; // eslint-disable-line @typescript-eslint/member-ordering, @typescript-eslint/no-shadow

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
    return new Result(ERROR, error);
  }

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
   * declare function getUserScore(user: User): Result<UserScore, UserHasNotScored>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserHasNotScored>
   * //        ▼
   * const userLevel = Result.Do
   *   .bind('user', () => getUser('user_01'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  static get Do(): Result<Readonly<{}>, never> {
    return new Result(OK, Object.create(null), {
      mode: FUNKCIA_MODE.DO_NOTATION,
    });
  }

  /**
   * Constructs a `Result` from a nullish value.
   *
   * If the value is `null` or `undefined`, returns an `Error` with a `MissingValueError` exception.
   * Otherwise, returns an `Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<string, MissingValueError>
   * //      ▼
   * const result = Result.fromNullish(localStorage.getItem('@app/theme'));
   * ```
   */
  static fromNullish<Value>(
    value: Nullish<Value>,
  ): Result<NonNullable<Value>, MissingValueError>;

  /**
   * Constructs a `Result` from a nullish value.
   *
   * If the value is `null | undefined`, returns an `Error` with return of the provided `onNullish` callback.
   * Otherwise, returns an `Ok` result.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<string, Error>
   * //      ▼
   * const result = Result.fromNullish(
   *   localStorage.getItem('@app/theme'),
   *   () => new Error('Theme not set'),
   * );
   * ```
   */
  static fromNullish<Value, Error extends {}>(
    value: Nullish<Value>,
    onNullish: () => Error,
  ): Result<NonNullable<Value>, Error>;

  static fromNullish(value: any, onNullish?: () => any): Result<any, any> {
    return value != null ?
        (Result.ok(value) as any)
      : Result.error(onNullish?.() ?? new MissingValueError());
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
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── Result<string, MissingValueError>
   * //      ▼
   * const result = Result.fromFalsy(user.lastName?.trim());
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
      return Result.error(onFalsy?.(value) ?? new MissingValueError()) as never;

    return Result.ok(value);
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
   * //     ┌─── Result<URL, UnknownError>
   * //     ▼
   * const url = Result.fromThrowable(() => new URL('example.com'));
   * // Output: Error(UnknownError)
   * ```
   */
  static fromThrowable<Value>(fn: () => Value): Result<Value, UnknownError>;

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
   * //     ┌─── Result<URL, Error>
   * //     ▼
   * const url = Result.fromThrowable(
   *   () => new URL('example.com'),
   *   (error) => new Error('Invalid URL'),
   * );
   * // Output: Error('Invalid URL')
   * ```
   */
  static fromThrowable<Value, Error extends {}>(
    fn: () => Value,
    onThrow: (error: unknown) => Error,
  ): Result<Value, Error>;

  static fromThrowable(
    fn: () => any,
    onThrow?: (error: unknown) => any,
  ): Result<any, any> {
    try {
      return Result.ok(fn());
    } catch (e) {
      return Result.error(onThrow?.(e) ?? new UnknownError(String(e))) as never;
    }
  }

  /**
   * Utility to ensure a function always returns a `Result`.
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
   * function hasAcceptedTermsOfService(user: User) {
   *   if (typeof user.termsOfService !== 'boolean') {
   *     return Result.error(new TermsOfServiceNotAcceptedError(user.id));
   *   }
   *
   *   return user.termsOfService ?
   *       Result.ok('YES' as const)
   *     : Result.ok('NO' as const);
   * }
   *
   * //       ┌─── Result<'YES', never> | Result<'NO', never> | Result<never, TermsOfServiceNotAcceptedError>
   * //       ▼
   * const result = hasAcceptedTermsOfService(user);
   *
   * // When using the `wrap` method, the return type is always `Result<T, E>`
   * const hasAcceptedTermsOfService = Result.fun((user: User) => {
   *   if (typeof user.termsOfService !== 'boolean') {
   *     return Result.error(new TermsOfServiceNotAcceptedError(user.id));
   *   }
   *
   *   return user.termsOfService ?
   *       Result.ok('YES' as const)
   *     : Result.ok('NO' as const);
   * });
   *
   * //       ┌─── Result<'YES' | 'NO', TermsOfServiceNotAcceptedError>
   * //       ▼
   * const result = hasAcceptedTermsOfService(user);
   * ```
   */
  static fun<
    Callback extends (...args: any[]) => Result<any, any> | Result<never, any>,
  >(
    fn: Callback,
  ): (
    ...args: Parameters<Callback>
  ) => Result<
    Result.UnwrapValue<ReturnType<Callback>>,
    Result.UnwrapError<ReturnType<Callback>>
  > {
    return fn;
  }

  /**
   * Wraps a function that may throw an exception
   * returning an enhanced function that returns a `Result`.
   *
   * If the function does not throw, returns an `Ok` with the returned value.
   * Otherwise, returns an `Error` with an `UnknownError` containing the exception thrown by the function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── (text: string, reviver?: Function) => Result<any, UnknownError>
   * //         ▼
   * const safeJsonParse = Result.wrap(JSON.parse);
   *
   * //       ┌─── Result<any, UnknownError>
   * //       ▼
   * const result = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Ok({ name: 'John Doe' })
   * ```
   */
  static wrap<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Result<Value, UnknownError>;

  /**
   * Decorates a function that may throw
   * returning a modified function that returns a `Result`.
   *
   * If the function does not throw, returns an `Ok` with the returned value.
   * Otherwise, returns an `Error` with the return of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── (text: string, reviver?: Function) => Result<any, TypeError>
   * //         ▼
   * const safeJsonParse = Result.wrap(
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
  static wrap<Args extends readonly unknown[], Value, Error extends {}>(
    callback: (...args: Args) => Value,
    onThrow: (error: unknown) => Error,
  ): (...args: Args) => Result<Value, Error>;

  static wrap(
    callback: (...args: any[]) => any,
    onThrow?: (error: unknown) => any,
  ): (...args: any[]) => Result<any, any> {
    return (...args) =>
      Result.fromThrowable(() => callback(...args), onThrow as never);
  }

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `Ok` narrowing down the value to the provided type predicate if the predicate is fulfilled.
   *
   * If the test fails, returns an `Error` with `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //         ┌─── (shape: Shape) => Result<Circle, FailedPredicateError<Square>>
   * //         ▼
   * const ensureCircle = Result.guard(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── Result<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = ensureCircle(input);
   * ```
   */
  static guard<Guard extends Predicate.Guard<any, any>>(
    guard: Guard,
  ): (
    ...args: Parameters<Guard>
  ) => Guard extends Predicate.Guard<infer Input, infer Output> ?
    Result<Output, FailedPredicateError<Predicate.Refine<Input, Output>>>
  : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `Ok` with the value tested if the predicate is fulfilled.
   *
   * If the test fails, returns an `Error` with `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //          ┌─── (value: number) => Result<number, FailedPredicateError<number>>
   * //          ▼
   * const ensurePositive = Result.guard(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── Result<number, FailedPredicateError<number>>
   * //       ▼
   * const result = ensurePositive(10);
   * // Output: Ok(10)
   * ```
   */
  static guard<Guard extends Predicate.Predicate<any>>(
    predicate: Guard,
  ): (
    ...args: Parameters<Guard>
  ) => Guard extends Predicate.Predicate<infer Input> ?
    Result<Input, FailedPredicateError<Input>>
  : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `Ok` narrowing down the value to the provided type predicate if the predicate is fulfilled.
   *
   * If the test fails, returns an `Error` with the error returned by the provided function instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //          ┌─── (shape: Shape) => Result<Circle, InvalidShapeError>
   * //          ▼
   * const ensureCircle = Result.guard(
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
  static guard<Guard extends Predicate.Guard<any, any>, Error extends {}>(
    guard: Guard,
    onUnfulfilled: (
      input: Guard extends Predicate.Guard<infer Input, infer Output> ?
        Predicate.Refine<Input, Output>
      : never,
    ) => Error,
  ): (
    ...args: Parameters<Guard>
  ) => Guard extends Predicate.Guard<infer _, infer Output> ?
    Result<Output, Error>
  : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `Ok` with the value tested if the predicate is fulfilled.
   *
   * If the test fails, returns an `Error` with the error returned by the provided function instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //          ┌─── (value: number) => Result<number, InvalidNumberError>
   * //          ▼
   * const ensurePositive = Result.guard(
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
  static guard<Guard extends Predicate.Predicate<any>, Error extends {}>(
    predicate: Guard,
    onUnfulfilled: (
      input: Guard extends Predicate.Predicate<infer Input> ? Input : never,
    ) => Error,
  ): (
    ...args: Parameters<Guard>
  ) => Guard extends Predicate.Predicate<infer Input> ? Result<Input, Error>
  : never;

  static guard(
    predicate: Predicate.Predicate<any>,
    onUnfulfilled?: (input: any) => any,
  ): (value: any) => Result<any, any> {
    return (value) =>
      Result.of(value).filter(predicate, onUnfulfilled as never);
  }

  /**
   * Evaluates a generator early returning when an error is propagated
   * or returning the `Result` returned by the generator.
   *
   * `yield*` a `Result<Value, Error>` unwraps values and propagates errors.
   *
   * If the value is `Result.error<e>`,
   * then it will return `Result.Error<typeof e>` from the enclosing function.
   *
   * If applied to `Result.ok<x>`, then it will unwrap the value to evaluate `x`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function safeParseInt(value: string): Result<number, ParseIntError>;
   *
   * //       ┌─── Result<number, ParseIntError>
   * //       ▼
   * const result = Result.try(function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns Result.Error<ParseIntError> immediately
   *
   *   return Result.ok(x + y); // doesn't run
   * });
   * // Output: Error(ParseIntError)
   * ```
   */
  static try<Value, Error extends {}>(
    generator: () => Generator<
      Error,
      Result<Value, never> | Result<Value, any>
    >,
  ): Result<Value, Error> {
    const iteration = generator().next();

    if (!iteration.done) {
      return Result.error(iteration.value) as never;
    }

    return iteration.value;
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
    cases: Result.Match<Value, Error, Output, ErrorOutput>,
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
   * //     ┌─── User
   * //     ▼
   * const user = Result.ok(databaseUser).unwrap();
   *
   * const team = Result.error(new TeamNotFound()).unwrap();
   * // Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
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
   * //       ┌─── string
   * //       ▼
   * const baseUrl = Result.ok(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://docs.funkcia.io'
   *
   * const apiKey = Result.error('Missing API key')
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * // Output: 'sk_test_9FK7CiUnKaU'
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
   * //     ┌─── User
   * //     ▼
   * const user = findUserById(userId).expect(
   *   () => new UserNotFoundError(userId)
   * );
   * ```
   */
  expect<Exception extends globalThis.Error>(
    onError: (error: Error) => Exception,
  ): Value {
    return this.unwrapOr((error) => {
      throw onError(error);
    });
  }

  /**
   * Converts a `Result` to an `Option`.
   *
   * If `Result` is `Ok`, returns a `Option.some`.
   * If `Result` is `Error`, returns a `Option.none`.
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
    return FunkciaStore.Option.fromNullish(this.unwrapOrNull());
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
   * //     ┌─── User | null
   * //     ▼
   * const user = Result.ok(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull(): Value | null {
    return this.unwrapOr(constNull as never);
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
   * const user = Result.ok(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined(): Value | undefined {
    return this.unwrapOr(constUndefined as never);
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
  contains(predicate: Predicate.Predicate<Value>): boolean {
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
   * //       ┌─── Result<number, never>
   * //       ▼
   * const result = Result.ok(10).map(number => number * 2);
   * // Output: Ok(20)
   * ```
   */
  map<Output>(
    onOk: (value: Value) => Result.NoResultReturnGuard<Output, 'andThen'>,
  ): Result<Output, Error> {
    if (this.isError()) return this as never;

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
   * //       ┌─── Result<string, UserMissingInformationError>
   * //       ▼
   * const result = Result.fromNullish(user.lastName).mapError(
   *   (error) => new UserMissingInformationError()
   * //   ▲
   * //   └─── MissingValueError
   * );
   * ```
   */
  mapError<NewError extends {}>(
    onError: (value: Error) => Result.NoResultReturnGuard<NewError, 'andThen'>,
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
   * const result = Result.fromNullish(user.lastName).mapBoth({
   *   Ok: (lastName) => `Hello, Mr. ${lastName}`,
   *   Error: (error) => new UserMissingInformationError(),
   * //          ▲
   * //          └─── MissingValueError
   * });
   * ```
   */
  mapBoth<Output, NewError extends {}>(
    cases: Result.Match<
      Value,
      Error,
      Result.NoResultReturnGuard<Output, 'andThen'>,
      Result.NoResultReturnGuard<NewError, 'andThen'>
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
   * declare const input: Shape;
   *
   * //       ┌─── Result<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = Result.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * );
   * ```
   */
  filter<Output extends Value>(
    refinement: Predicate.Guard<Value, Output>,
  ): Result<
    Output,
    Error | FailedPredicateError<Predicate.Refine<Value, Output>>
  >;

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
   * //       ┌─── Result<string, FailedPredicateError<string>>
   * //       ▼
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   * );
   * ```
   */
  filter(
    predicate: Predicate.Predicate<Value>,
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
  filter<Output extends Value, NewError extends {}>(
    refinement: Predicate.Guard<Value, Output>,
    onUnfulfilled: (value: Predicate.Refine<Value, Output>) => NewError,
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
   * //       ┌─── Result<string, Error>
   * //       ▼
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   *   (value) => new Error(`Expected non-empty string, received ${value}`),
   * );
   * ```
   */
  filter<NewError extends {}>(
    predicate: Predicate.Predicate<Value>,
    onUnfulfilled: (value: Value) => NewError,
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

  // -----------------------
  // ---MARK: DO-NOTATION---
  // -----------------------

  /**
   * Initiates a `Do-notation` with the current `Result`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUserScore(user: User): Result<UserScore, UserHasNotScored>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * declare const user: Result<User, UserNotFound>;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserHasNotScored>
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
  ): Result<Readonly<{ [K in Key]: Value }>, Error> {
    return Result.Do.bind(key, () => this as never) as never;
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
   * declare function getUserScore(user: User): Result<UserScore, UserHasNotScored>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserHasNotScored>
   * //        ▼
   * const userLevel = Result.Do
   *   .bind('user', () => getUser('user_01'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   * ```
   */
  bind<Key extends string, ValueToBind, NewError>(
    key: Exclude<Key, keyof Value>,
    cb: (ctx: Value) => Result<ValueToBind, NewError>,
  ): Result<
    Readonly<{
      [K in Key | keyof Value]: K extends keyof Value ? Value[K] : ValueToBind;
    }>,
    Error | NewError
  > {
    return this.andThen((ctx) =>
      cb(ctx).map(
        (value) =>
          // eslint-disable-next-line prefer-object-spread
          Object.assign({ [key]: value }, ctx) as {},
      ),
    ).match({
      Ok: (value) => new Result(OK, value, { mode: this.mode }) as never,
      Error: (error) =>
        this.isError() ?
          (this as never)
        : (new Result(ERROR, error, {
            mode: FUNKCIA_MODE.DO_NOTATION,
          }) as never),
    });
  }

  /**
   * Binds a raw value to the context object in a `Do-notation`.
   *
   * If the value is generated without throwing an exception, the value is assigned to the key in the context object.
   * If an error is thrown when generating the value, the parent `Result` running the `Do` simulation becomes an `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<number, UnknownError>
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
    key: Exclude<Key, keyof Value>,
    cb: (scope: Value) => ValueToBind,
  ): Result<
    Readonly<{
      [K in Key | keyof Value]: K extends keyof Value ? Value[K] : ValueToBind;
    }>,
    Error | UnknownError
  > {
    return this.bind(key, (ctx) => Result.fromThrowable(() => cb(ctx)));
  }

  // -----------------------
  // ----MARK: FALLBACKS----
  // -----------------------

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
   * const greeting = Result.error()
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
    return this.#tag === OK;
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
    return this.#tag === ERROR;
  }

  // -----------------
  // ---MARK: OTHER---
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
   * const option = Result.some(10).tap((value) => console.log(value)); // LOG: 10
   * ```
   */
  tap(onOk: (value: Value) => unknown): this {
    if (this.isOk()) onOk(this.#value);

    return this;
  }

  *[Symbol.iterator](): Iterator<Error, Value> {
    if (this.isError()) {
      yield this.#error;
    }

    return this.#value;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.match({
      Ok: (value) => `Ok(${logiffy(value)})`,
      Error: (error) => `Error(${logiffy(error)})`,
    });
  }
}

FunkciaStore.register(Result);

declare namespace Result {
  type $ok = typeof OK;
  type $error = typeof ERROR;

  interface Match<Value, Error, Output, ErrorOutput> {
    Ok: (value: Value) => Output;
    Error: (error: Error) => ErrorOutput;
  }

  type NoResultReturnGuard<Value, AnotherMethod extends string> =
    Value extends Result<infer _, infer _> ?
      `ERROR: Use ${AnotherMethod} instead. Cause: the transformation is returning a Result, use ${AnotherMethod} to flatten the Result.`
    : Value;

  type UnwrapValue<Output> =
    Output extends Result<infer Value, infer _> ?
      /* removes `never` from union */
      Value extends never ? never
      : /* removes `any` from union */
      unknown extends Value ? never
      : Value
    : never;

  type UnwrapError<Output> =
    Output extends Result<infer _, infer Error> ?
      /* removes `never` from union */
      Error extends never ? never
      : /* removes `any` from union */
      unknown extends Error ? never
      : Error
    : never;

  interface Ok<Value> {
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    mapError: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    mapBoth: never;
    /** @override `unwrap` will not throw in this context. Result value is guaranteed to exist. */
    unwrap: () => Value;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapOr: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapError: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    match: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    expect: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapOrNull: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    unwrapOrUndefined: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    or: never;
    /** @override this method has no effect in this context. Result value is guaranteed to exist. */
    isError: never;
  }

  interface Error<Err> extends Partial<Result<any, Err>> {
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    bindTo: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    bind: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    let: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    map: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    mapBoth: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    andThen: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    filter: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    contains: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    match: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    unwrap: never;
    /** @override `unwrapError` will not throw in this context. Result is guaranteed to be Error. */
    unwrapError: () => Err;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    expect: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    isOk: never;
    /** @override this method has no effect in this context. Result is guaranteed to be Error. */
    tap: never;
  }
}
