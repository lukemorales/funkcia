import type { DoNotation } from './do-notation';
import {
  FailedPredicateError,
  NoValueError,
  panic,
  UnhandledException,
} from './exceptions';
import { identity } from './functions';
import type {
  AnyUnaryFn,
  Falsy,
  FunkciaAsyncIterable,
  Nullable,
  Thunk,
  Tuple,
  UnaryFn,
} from './internals/types';
import { failOnDefect } from './internals/utils';
import { Option } from './option';
import type { OptionAsync } from './option-async';
import type { Predicate } from './predicate';
import { Result } from './result';

export type AnyResultAsync<Value = any> =
  | ResultAsync<Value, any>
  | ResultAsync<Value, never>
  | ResultAsync<never, any>;

class AsyncResult<Value, Error> {
  private readonly task: () => Promise<Result<Value, Error>>;

  constructor(task: () => Promise<Result<Value, Error>>) {
    this.task = task;
  }

  bindTo(key: string) {
    return new AsyncResult(() =>
      Promise.resolve(
        Result.ok(Object.create(null) as DoNotation).bind(
          key as never,
          () => this as never,
        ),
      ),
    ) as never;
  }

  bind(key: string, fn: (value: any) => ResultAsync<any, any>) {
    return this.andThen(
      (ctx) =>
        fn(ctx).map(
          (value) => Object.assign({ [key]: value }, ctx) as {},
        ) as never,
    ) as never;
  }

  let(key: string, cb: (value: any) => Promise<any>) {
    return (this as unknown as ResultAsync<DoNotation, never>).bind(
      key as never,
      (ctx) =>
        new AsyncResult(async () => {
          try {
            const value = await cb(ctx);

            return Result.ok(value);
          } catch (e) {
            failOnDefect(e);

            panic(
              'A defect occurred while binding a value to a ResultAsync in let',
              { cause: e },
            );
          }
        }) as never,
    ) as never;
  }

  map(onOk: UnaryFn<any, any>) {
    return new AsyncResult(() =>
      this.task().then((result) => result.map(onOk)),
    );
  }

  mapError(onError: UnaryFn<any, any>) {
    return new AsyncResult(() =>
      this.task().then((result) => result.mapError(onError)),
    );
  }

  mapBoth(cases: any) {
    return new AsyncResult(() =>
      this.task().then((result) => result.mapBoth(cases)),
    );
  }

  andThen(onOk: UnaryFn<any, ResultAsync<any, any> | Result<any, any>>) {
    return new AsyncResult(async () =>
      this.then(async (result) => {
        if (result.isError()) return result;

        const output = onOk(result.unwrap());

        if (Result.is(output)) return output;
        return await output;
      }),
    );
  }

  filter(onOk: UnaryFn<any, boolean>, onUnfulfilled?: UnaryFn<any, any>) {
    return new AsyncResult(() =>
      this.task().then((result) => result.filter(onOk, onUnfulfilled as never)),
    );
  }

  or(onError: (error: Error) => ResultAsync<any, any>) {
    return new AsyncResult(
      () =>
        this.then((result) =>
          result.match({ Ok: () => result, Error: onError }),
        ) as Promise<Result<Value, Error>>,
    );
  }

  swap() {
    return new AsyncResult(
      () =>
        this.then((result) => result.swap()) as Promise<Result<Error, Value>>,
    );
  }

  zip(that: ResultAsync<any, any>): AsyncResult<any, any> {
    return this.andThen((a) => that.map((b) => [a, b]));
  }

  zipWith(that: ResultAsync<any, any>, fn: (a: any, b: any) => any) {
    return this.zip(that).map((results: [any, any]) => fn(...results));
  }

  then<TResult1 = Result<Value, Error>, TResult2 = never>(
    onfulfilled?:
      | ((value: Result<Value, Error>) => TResult1 | PromiseLike<TResult1>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.task().then(onfulfilled) as Promise<TResult1 | TResult2>;
  }

  async match(cases: { Ok: (value: any) => any; Error: (error: any) => any }) {
    return this.then((result) => result.match(cases));
  }

  async unwrap() {
    return this.then((result) => result.unwrap());
  }

  async unwrapError() {
    return this.then((result) => result.unwrapError());
  }

  async unwrapOr(onError: (error: Error) => any) {
    return this.then((result) => result.unwrapOr(onError));
  }

  async unwrapOrNull() {
    return this.then((result) => result.unwrapOrNull());
  }

  async unwrapOrUndefined() {
    return this.then((result) => result.unwrapOrUndefined());
  }

  async expect(onError: (error: Error) => globalThis.Error) {
    return this.then((result) => result.expect(onError));
  }

  async merge() {
    return this.then((result) => result.merge());
  }

  async contains(predicate: UnaryFn<any, boolean>) {
    return this.then((result) => result.contains(predicate));
  }

  async toArray() {
    return this.then((result) => result.toArray());
  }

  tap(onOk: (value: any) => unknown) {
    return new AsyncResult(
      () =>
        this.then(async (result) => {
          try {
            const output = result.match({ Ok: onOk, Error: identity });
            if (output instanceof Promise) await output;
          } catch (e) {
            failOnDefect(e);

            panic('A defect occurred while tapping a ResultAsync value', {
              cause: e,
            });
          }

          return result;
        }) as Promise<Result<Value, Error>>,
    );
  }

  tapError(onError: (error: Error) => unknown) {
    return new AsyncResult(
      () =>
        this.then(async (result) => {
          try {
            const output = result.match({ Ok: identity, Error: onError });
            if (output instanceof Promise) await output;
          } catch (e) {
            failOnDefect(e);

            panic('A defect occurred while tapping a ResultAsync error', {
              cause: e,
            });
          }

          return result;
        }) as Promise<Result<Value, Error>>,
    );
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `ResultAsync(Promise<Result>)`;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<any> {
    return yield* await this;
  }
}

function resultAsync<Value, Error>(
  task: () => Promise<Result<Value, Error>>,
): ResultAsync<Value, Error> {
  return new AsyncResult(task) as never;
}

const ok: ResultAsyncTrait['ok'] = (value) =>
  resultAsync(() => Promise.resolve(Result.ok(value)));

const error: ResultAsyncTrait['error'] = (err) =>
  resultAsync(() => Promise.resolve(Result.error(err))) as never;

const tryCatch: ResultAsyncTrait['try'] = (
  promise: () => PromiseLike<any>,
  onThrow?: AnyUnaryFn,
) =>
  resultAsync(async () => {
    try {
      return (await promise().then(Result.ok)) as never;
    } catch (e) {
      return Result.error(
        onThrow?.(e) ?? new UnhandledException(String(e), { cause: e }),
      );
    }
  }) as never;

/**
 * `AsyncResult` represents a `Promise` that **never** rejects of an operation that can either succeed (`Ok`) or return an error (`Error`).
 * Every `AsyncResult` resolves to a `Result.Ok` when successful or `Result.Error` when it fails.
 *
 * An `AsyncResult` allows you to chain the same methods as a `Result`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `AsyncResult`, the Promise inside will resolve to the underlying `Result`.
 */
export const ResultAsync: ResultAsyncTrait = {
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
  fromResult(result) {
    return resultAsync(() => Promise.resolve(result));
  },
  fromOption(option: Option.Any, onNone?: Thunk<any>) {
    return resultAsync(() =>
      Promise.resolve(Result.fromOption(option, onNone as never)),
    ) as never;
  },
  fromOptionAsync(optionAsync: OptionAsync.Any, onNone?: Thunk<any>) {
    return resultAsync(async () => {
      return await optionAsync.match({
        Some: (value) => Result.ok(value),
        None: () => Result.error(onNone?.() ?? new NoValueError()),
      });
    }) as never;
  },
  get Do() {
    return ok(Object.create(null)) as never;
  },
  try: tryCatch,
  predicate(criteria: UnaryFn<any, boolean>) {
    return (input: any) => ok(input).filter(criteria) as never;
  },
  fn(promise: (...args: any[]) => Promise<any> | AsyncGenerator<any, any>) {
    return (...args: any[]) =>
      resultAsync(async () => {
        const output = promise(...args);

        if (output instanceof Promise) return output;

        const { done, value } = await output.next();

        return (done ? value : Result.error(value)) as never;
      }) as never;
  },
  use(generator) {
    return resultAsync(async () => {
      const { done, value } = await generator().next();

      return (done ? value : Result.error(value)) as never;
    }) as never;
  },
  async values(asyncResults) {
    return Promise.all(asyncResults).then(Result.values) as never;
  },
  resource(resource: any, onrejected?: AnyUnaryFn) {
    return {
      run(fn: (resource: any) => any) {
        return tryCatch(() => fn(resource), onrejected as never) as never;
      },
    };
  },
};

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
    FunkciaAsyncIterable<Error, DoNotation.Unbrand<Value>> {
  /**
   * Initiates a `Do-notation` with the current `ResultAsync`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function calculateUserScore(user: User): ResultAsync<UserScore, UserNotScored>;
   * declare function rankUserLevel(user: User, score: UserScore): ResultAsync<UserLevel, InvalidRanking>;
   * declare const user: ResultAsync<User, UserNotFound>;
   *
   * //        ┌─── ResultAsync<UserLevel, UserNotFound | UserNotScored | InvalidRanking>
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
  ) => ResultAsync<DoNotation<{ readonly [K in Key]: Value }>, Error>;

  /**
   * Binds a `ResultAsync` to the context object in a `Do-notation`.
   *
   * If the `ResultAsync` resolves to a `Result.Ok`, the value is assigned to the key in the context object.
   * If the `ResultAsync` resolves to a `Result.Error`, the parent `ResultAsync` running the `Do` simulation resolves to a `Result.Error`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function findUserById(id: string): ResultAsync<User, UserNotFound>;
   * declare function calculateUserScore(user: User): ResultAsync<UserScore, UserNotScored>;
   * declare function rankUserLevel(user: User, score: UserScore): ResultAsync<UserLevel, InvalidRanking>;
   *
   * //        ┌─── ResultAsync<UserLevel, UserNotFound | UserNotScored | InvalidRanking>
   * //        ▼
   * const userLevel = ResultAsync.Do
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
      : DoNotation.Forbidden<'ResultAsync', 'bind'>,
    key: Exclude<Key, keyof Value>,
    cb: (ctx: DoNotation.Unbrand<Value>) => ResultAsync<ValueToBind, NewError>,
  ) => ResultAsync<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
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
   * import { ResultAsync } from 'funkcia';
   *
   * //      ┌─── ResultAsync<number, never>
   * //      ▼
   * const result = ResultAsync.Do
   *   .let('subtotal', () => Promise.resolve(120))
   * //               ┌─── { subtotal: number }
   * //               ▼
   *   .let('tax', (ctx) => Promise.resolve(ctx.subtotal * 0.08))
   *   .map((ctx) => ctx.subtotal + ctx.tax);
   * //      ▲
   * //      └─── { subtotal: number; tax: number }
   * ```
   */
  let: <Key extends string, ValueToBind>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbidden<'ResultAsync', 'let'>,
    key: Exclude<Key, keyof Value>,
    cb: (scope: DoNotation.Unbrand<Value>) => Promise<ValueToBind>,
  ) => ResultAsync<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error
  >;

  /**
   * Applies a callback function to the value of the `ResultAsync` when it is `Ok`,
   * returning a new `ResultAsync` containing the new value.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //       ┌─── ResultAsync<number, never>
   * //       ▼
   * const result = ResultAsync.ok(10).map(number => number * 2);
   * // Output: ResultAsync<number, never>
   * ```
   */
  map<Output>(
    onOk: (value: DoNotation.Unbrand<Value>) => Output,
  ): ResultAsync<Output, Error>;

  /**
   * Applies a callback function to the error of the `ResultAsync` when it is `Error`,
   * returning a new `ResultAsync` containing the new error value.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //       ┌─── ResultAsync<string, UserMissingInformationError>
   * //       ▼
   * const result = ResultAsync.fromNullable(user.lastName).mapError(
   *   (error) => new UserMissingInformationError()
   * //   ▲
   * //   └─── NoValueError
   * );
   * ```
   */
  mapError: <NewError extends {}>(
    onError: (value: Error) => NewError,
  ) => ResultAsync<Value, NewError>;

  mapBoth: <Output, NewError extends {}>(
    cases: ResultAsync.Match<
      DoNotation.Unbrand<Value>,
      Error,
      Output,
      NewError
    >,
  ) => ResultAsync<Output, NewError>;

  /**
   * Applies a callback function to the value of the `ResultAsync` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return a `Result` or a `ResultAsync`, not a raw value.
   * This allows chaining multiple calls that return `ResultAsync`s together.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function readFile(path: string): ResultAsync<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   *
   * //       ┌─── ResultAsync<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
   * //       ▼
   * const result = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends Result.Any>(
    onOk: (value: DoNotation.Unbrand<Value>) => Output,
  ): ResultAsync<ResultAsync.Unwrap<Output>, Error | ResultAsync.Panic<Output>>;

  /**
   * Applies a callback function to the value of the `ResultAsync` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return a `ResultAsync`, not a raw value.
   * This allows chaining multiple calls that return `ResultAsync`s together.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function readFile(path: string): ResultAsync<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): ResultAsync<FileContent, InvalidJsonError>;
   *
   * //       ┌─── ResultAsync<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
   * //       ▼
   * const result = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends AnyResultAsync>(
    onOk: (value: DoNotation.Unbrand<Value>) => Output,
  ): ResultAsync<ResultAsync.Unwrap<Output>, Error | ResultAsync.Panic<Output>>;

  /**
   * Asserts that the `ResultAsync` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `ResultAsync`, resolving to a `Result.Error`
   * with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //       ┌─── ResultAsync<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = ResultAsync.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * );
   * ```
   */
  filter<Output extends DoNotation.Unbrand<Value>>(
    guard: Predicate.Guard<DoNotation.Unbrand<Value>, Output>,
  ): ResultAsync<
    Output,
    Error | FailedPredicateError<Exclude<DoNotation.Unbrand<Value>, Output>>
  >;

  /**
   * Asserts that the `ResultAsync` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `ResultAsync`,
   * resolving to a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //       ┌─── ResultAsync<string, FailedPredicateError<string>>
   * //       ▼
   * const result = ResultAsync.of(user.lastName).filter(
   *   (value) => value.length > 0,
   * );
   * ```
   */
  filter(
    predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>,
  ): ResultAsync<
    Value,
    Error | FailedPredicateError<DoNotation.Unbrand<Value>>
  >;

  /**
   * Asserts that the `ResultAsync` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `ResultAsync`, resolving to a `Result.Error`
   * with the provided value returned by the `onUnfulfilled` callback instead.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //       ┌─── ResultAsync<Circle, Error>
   * //       ▼
   * const result = ResultAsync.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * //   ┌─── Square
   * //   ▼
   *   (shape) => new Error(`Expected Circle, received ${shape.kind}`),
   * );
   * ```
   */
  filter<Output extends DoNotation.Unbrand<Value>, E2>(
    guard: Predicate.Guard<DoNotation.Unbrand<Value>, Output>,
    onUnfulfilled: (
      value: Predicate.Unguarded<DoNotation.Unbrand<Value>, Output>,
    ) => NonNullable<E2>,
  ): ResultAsync<Output, Error | E2>;

  /**
   * Asserts that the `ResultAsync` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `ResultAsync`,
   * resolving to a `Result.Error` with the value returned by the `onUnfulfilled` callback instead.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //       ┌─── ResultAsync<string, Error>
   * //       ▼
   * const result = ResultAsync.of(user.lastName).filter(
   *   (value) => value.length > 0,
   *   (value) => new Error(`Expected non-empty string, received ${value}`),
   * );
   * ```
   */
  filter<NewError>(
    predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>,
    onUnfulfilled: (value: DoNotation.Unbrand<Value>) => NonNullable<NewError>,
  ): ResultAsync<Value, Error | NewError>;

  /**
   * Replaces the current `ResultAsync` with the provided fallback `ResultAsync` when it is `Error`.
   *
   * If the resolved `Result` is `Ok`, it returns the current `ResultAsync`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   *  //       ┌─── string
   *  //       ▼
   * const result = await ResultAsync.ok('alex@gmail.com')
   *   .or(() => ResultAsync.ok('alex@acme.com'))
   *   .unwrap();
   * // Output: 'alex@gmail.com'
   *
   * const workEmail = await ResultAsync.error(new Error('Missing personal email'))
   *   .or(() => ResultAsync.ok('alex@acme.com'))
   *   .unwrap();
   * // Output: 'alex@acme.com'
   * ```
   */
  or: <$ResultAsync extends AnyResultAsync>(
    onError: (error: Error) => $ResultAsync,
  ) => ResultAsync<
    Value | ResultAsync.Unwrap<$ResultAsync>,
    Error | ResultAsync.Panic<$ResultAsync>
  >;

  /**
   * Swaps the `ResultAsync` value and error.
   *
   * If the underlying `Result` is `Ok`, it returns a `ResultAsync` that resolves to a `Result.Error` with the value.
   * If the underlying `Result` is `Error`, it returns a `ResultAsync` that resolves to a `Result.Ok` with the error.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): ResultAsync<User, CacheMissError<Email>>;
   *
   * declare function findOrCreateUserByEmail(email: Email): ResultAsync<User, never>;
   *
   * //       ┌─── ResultAsync<User, User>
   * //       ▼
   * const result = getCachedUser('customer@acme.com')
   *   .swap()
   *   .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input));
   * //             ▲
   * //             └─── CacheMissError<Email>
   * ```
   */
  swap: () => ResultAsync<Error, Value>;

  /**
   * Combines two `ResultAsync`s into a single `ResultAsync` containing a tuple of their values,
   * if both `ResultAsync`s resolve to `Result.Ok` variants, otherwise, resolves to `Result.Error`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * const firstName = ResultAsync.ok('Jane');
   * const lastName = ResultAsync.ok('Doe');
   *
   * //       ┌─── ResultAsync<[string, string], never>
   * //       ▼
   * const strings = firstName.zip(lastName);
   * // Output: ResultAsync<[string, string], never>
   * ```
   */
  zip: <Value2, Error2>(
    that: ResultAsync<Value2, Error2>,
  ) => ResultAsync<
    Tuple<DoNotation.Unbrand<Value>, DoNotation.Unbrand<Value2>>,
    Error | Error2
  >;

  /**
   * Combines two `ResultAsync`s into a single `ResultAsync`. The new value is produced
   * by applying the given function to both values, if both `ResultAsync`s resolve to `Result.Ok` variants,
   * otherwise, resolves to `Result.Error`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   *
   * const firstName = ResultAsync.ok('Jane');
   * const lastName = ResultAsync.ok('Doe');
   *
   * //        ┌─── ResultAsync<string, never>
   * //        ▼
   * const greeting = firstName.zipWith(lastName, (a, b) => `${a} ${b}`);
   * // Output: ResultAsync<string, never>
   * ```
   */
  zipWith: <Value2, Error2, Output>(
    that: ResultAsync<Value2, Error2>,
    fn: (
      arg0: DoNotation.Unbrand<Value>,
      arg1: DoNotation.Unbrand<Value2>,
    ) => Output,
  ) => ResultAsync<Output, Error | Error2>;

  /**
   * Returns a promise that compares the underlying `Result` against the possible patterns,
   * and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function readFile(path: string): ResultAsync<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): ResultAsync<FileContent, InvalidJsonError>;
   * declare function processFile(contents: FileContent): string;
   *
   * //     ┌─── string
   * //     ▼
   * const data = await readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .match({
   *     Ok(contents) {
   *       return processFile(contents);
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
      DoNotation.Unbrand<Value>,
      Error,
      Output,
      ErrorOutput
    >,
  ) => Promise<ErrorOutput | Output>;

  /**
   * Returns a promise that unwraps the underlying `ResultAsync` value.
   *
   * @throws `Panic` if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //     ┌─── User
   * //     ▼
   * const user = await ResultAsync.ok(databaseUser).unwrap();
   *
   * const team = await ResultAsync.error(new TeamNotFound()).unwrap();
   * // Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
   * ```
   */
  unwrap: () => Promise<DoNotation.Unbrand<Value>>;

  /**
   * Returns a promise that unwraps the underlying `Result` error.
   *
   * @throws `Panic` if the `Result` is `Ok`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //      ┌─── UserNotFound
   * //      ▼
   * const error = await ResultAsync.error(new UserNotFound()).unwrapError();
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
   * import { ResultAsync } from 'funkcia';
   *
   * //      ┌─── string
   * //      ▼
   * const baseUrl = await ResultAsync.ok('https://app.acme.com')
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://app.acme.com'
   *
   * const apiKey = await ResultAsync.error('Missing API key')
   *   .unwrapOr(() => 'api_test_acme_123');
   * // Output: 'api_test_acme_123'
   * ```
   */
  unwrapOr: <Output = DoNotation.Unbrand<Value>>(
    onError: (error: Error) => Output,
  ) => Promise<
    readonly any[] extends DoNotation.Unbrand<Value>
      ? DoNotation.Unbrand<Value>
      : DoNotation.Unbrand<Value> | Output
  >;

  /**
   * Returns a promise that unwraps the value of the underlying `Result`
   * if it is a `Result.Ok`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = await ResultAsync.ok(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull: () => Promise<DoNotation.Unbrand<Value> | null>;

  /**
   * Returns a promise that unwraps the value of the underlying `Result`
   * if it is a `Result.Ok`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //     ┌─── User | undefined
   * //     ▼
   * const user = await ResultAsync.ok(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined: () => Promise<DoNotation.Unbrand<Value> | undefined>;

  /**
   * Returns a promise that unwraps the underlying `Result` value.
   *
   * @throws the provided Error if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function findUserById(id: string): ResultAsync<User, DatabaseFailureError>;
   *
   * const userId = 'user_123';
   *
   * //     ┌─── User
   * //     ▼
   * const user = await findUserById(userId).expect(
   *   (error) => new UserNotFound(userId)
   * //   ▲
   * //   └─── DatabaseFailureError
   * );
   *
   * const invalidId = 'invalid_id';
   *
   * const anotherUser = await findUserById(invalidId).expect(
   *   (error) => new UserNotFound(invalidId)
   * //   ▲
   * //   └─── DatabaseFailureError
   * );
   * // Output: Uncaught exception: 'User not found: "invalid_id"'
   * ```
   */
  expect: <Exception extends globalThis.Error>(
    onError: (error: Error) => Exception,
  ) => Promise<DoNotation.Unbrand<Value>>;

  /**
   * Returns a promise that unwraps the underlying `Result`.
   *
   * If the `Result` is `Ok`, resolves to the value inside the `Ok` variant.
   * If the `Result` is `Error`, resolves to the value inside the `Error` variant.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): ResultAsync<User, CacheMissError<Email>>;
   *
   * declare function findOrCreateUserByEmail(email: Email): ResultAsync<User, never>;
   *
   * //       ┌─── User
   * //       ▼
   * const result = await getCachedUser('customer@acme.com')
   *   .swap() // ResultAsync<CacheMissError<Email>, User>
   *   .andThen((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input)) // ResultAsync<User, User>
   *   .merge();
   * // Output: { id: 'user_123', email: 'customer@acme.com' }
   * ```
   */
  merge: () => Promise<DoNotation.Unbrand<Value> | Error>;

  /**
   * Returns a Promise that verifies if the `Result` contains a value that passes the test implemented by the provided function.
   *
   * Resolves to `true` if the predicate is fulfilled by the wrapped value.
   * If the predicate is not fulfilled or if the resolved `Result` is `Error`, returns `false`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //         ┌─── boolean
   * //         ▼
   * const isPositive = await ResultAsync.ok(10).contains(num => num > 0);
   * // Output: true
   * ```
   */
  contains: (
    criteria: Predicate.Predicate<DoNotation.Unbrand<Value>>,
  ) => Promise<boolean>;

  /**
   * Returns a Promise that converts the underlying `Result` to an array.
   *
   * If the resolved `Result` is `Ok`, returns an array with the value.
   * If the resolved `Result` is `Error`, returns an empty array.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await ResultAsync.ok(10).toArray();
   * // Output: [10]
   * ```
   */
  toArray: () => Promise<Array<DoNotation.Unbrand<Value>>>;

  /**
   * Calls the function with the `Result` value, then returns the `ResultAsync` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function authenticateUser(credentials: AuthCredentials): ResultAsync<User, UserNotFound | InvalidCredentials>;
   *
   * declare async function registerSuccessfulLoginAttempt(user: User): Promise<{ loginAttempts: number }>;
   *
   * //       ┌─── ResultAsync<User, UserNotFound | InvalidCredentials>
   * //       ▼
   * const result = authenticateUser(req.body).tap(async (user) => {
   *   return await registerSuccessfulLoginAttempt(user);
   * });
   * // Output: ResultAsync<User, UserNotFound | InvalidCredentials>
   * ```
   */
  tap: (onOk: (value: DoNotation.Unbrand<Value>) => unknown) => this;

  /**
   * Calls the function with the underlying `Result` error, then returns the `ResultAsync` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function authenticateUser(credentials: AuthCredentials): ResultAsync<User, UserNotFound | InvalidCredentials>;
   *
   * declare async function registerLoginAttempt(user: User): Promise<{ loginAttempts: number }>;
   *
   * //       ┌─── ResultAsync<User, UserNotFound | InvalidCredentials>
   * //       ▼
   * const result = authenticateUser(req.body).tapError(async (error) => {
   *   if (InvalidCredentials.is(error)) {
   *     return await registerLoginAttempt(error.email);
   *   }
   * });
   * // Output: ResultAsync<User, UserNotFound | InvalidCredentials>
   * ```
   */
  tapError: (onError: (error: Error) => unknown) => this;
}

interface ResultAsyncTrait {
  /**
   * Constructs a `ResultAsync` that resolves to a `Result.Ok` with the provided value.
   *
   * Use it to explicitly construct an `Ok`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //      ┌─── ResultAsync<number, never>
   * //      ▼
   * const result = ResultAsync.ok(10);
   * // ResultAsync<number, never>
   * ```
   */
  ok: <Value>(value: Value) => ResultAsync<Value, never>;

  /**
   * @alias
   * Alias of `ResultAsync.ok` - constructs a `ResultAsync` that resolves to a `Result.Ok` with the provided value.
   *
   * Useful to indicate the creation of a `ResultAsync` that is immediately going to be processed.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //      ┌─── ResultAsync<number, never>
   * //      ▼
   * const result = ResultAsync.of(10);
   * // ResultAsync<number, never>
   * ```
   */
  of: <Value>(value: Value) => ResultAsync<Value, never>;

  /**
   * Constructs a `ResultAsync` that resolves to a `Result.Error` with the provided value.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * async function rateLimit(clientId: ClientId, ip: IpAddress): ResultAsync<ClientId, RateLimitError> {
   *   const attempts = await cache.get(`ratelimit:${clientId}:${ip}`)
   *
   *   if (attempts.total > 10) {
   *     return ResultAsync.error(new RateLimitError({ clientId, ip }));
   *   }
   *
   *   return ResultAsync.ok(clientId);
   * }
   * ```
   */
  error: <Error>(error: NonNullable<Error>) => ResultAsync<never, Error>;

  /**
   * Constructs a `ResultAsync` from a nullable value.
   *
   * If the value is `null` or `undefined`, it resolves to a `Result.Error` with a `NoValueError`.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //      ┌─── ResultAsync<string, NoValueError>
   * //      ▼
   * const result = ResultAsync.fromNullable(localStorage.getItem('@app/theme'));
   * ```
   */
  fromNullable<Value>(value: Nullable<Value>): ResultAsync<Value, NoValueError>;

  /**
   * Constructs a `ResultAsync` from a nullable value.
   *
   * If the value is `null` or `undefined`, it resolves to a `Result.Error` using the provided `onNullable` callback.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //      ┌─── ResultAsync<string, Error>
   * //      ▼
   * const result = ResultAsync.fromNullable(
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
   * Constructs a `ResultAsync` from a _falsy_ value.
   *
   * If the value is _falsy_, it resolves to a `Result.Error` with a `NoValueError`.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── ResultAsync<string, NoValueError>
   * //      ▼
   * const result = ResultAsync.fromFalsy(user.lastName?.trim());
   * ```
   */
  fromFalsy<Value>(
    value: Value | Falsy,
  ): ResultAsync<Exclude<NonNullable<Value>, Falsy>, NoValueError>;

  /**
   * Constructs a `ResultAsync` from a _falsy_ value.
   *
   * If the value is _falsy_, it resolves to a `Result.Error` using the provided `onFalsy` callback.
   * Otherwise, it resolves to a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── ResultAsync<string, Error>
   * //      ▼
   * const result = ResultAsync.fromFalsy(
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
   * Converts a `Result` to a `ResultAsync`.
   *
   * Wraps the synchronous `Result` in a `ResultAsync` that immediately resolves to the provided `Result`.
   *
   * @example
   * ```ts
   * import { Result, ResultAsync } from 'funkcia';
   *
   * //       ┌─── ResultAsync<number, never>
   * //       ▼
   * const result = ResultAsync.fromResult(Result.ok(1));
   * // Output: ResultAsync<number, never>
   * ```
   */
  fromResult: <Value, Error>(
    result: Result<Value, Error>,
  ) => ResultAsync<Value, Error>;

  /**
   * Converts an `Option` to a `ResultAsync`.
   *
   * If the `Option` is `Some`, returns a `ResultAsync` that resolves to `Result.Ok`.
   * If the `Option` is `None`, returns a `ResultAsync` that resolves to `Result.Error` with a `NoValueError` or the provided error.
   *
   * @example
   * ```ts
   * import { Option, ResultAsync } from 'funkcia';
   *
   * //       ┌─── ResultAsync<number, NoValueError>
   * //       ▼
   * const result = ResultAsync.fromOption(Option.some(1));
   * // Output: ResultAsync<number, NoValueError>
   * ```
   */
  fromOption<Value>(option: Option<Value>): ResultAsync<Value, NoValueError>;
  /**
   * Converts an `Option` to a `ResultAsync`.
   *
   * If the `Option` is `Some`, returns a `ResultAsync` that resolves to `Result.Ok`.
   * If the `Option` is `None`, returns a `ResultAsync` that resolves to `Result.Error` with the provided error.
   *
   * @example
   * ```ts
   * import { Option, ResultAsync } from 'funkcia';
   *
   * //       ┌─── ResultAsync<number, CustomError>
   * //       ▼
   * const result = ResultAsync.fromOption(
   *   Option.none(),
   *   () => new CustomError('Missing value'),
   * );
   * // Output: ResultAsync<number, CustomError>
   * ```
   */
  fromOption<Value, Error>(
    option: Option<Value>,
    onNone: Thunk<Error>,
  ): ResultAsync<Value, Error>;

  /**
   * Converts an `OptionAsync` to a `ResultAsync`.
   *
   * If the `OptionAsync` resolves to `Option.Some`, returns a `ResultAsync.Ok`.
   * If the `OptionAsync` resolves to `Option.None`, returns a `ResultAsync.Error` with a `NoValueError` or the provided error.
   *
   * @example
   * ```ts
   * import { OptionAsync, ResultAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   *
   * //       ┌─── ResultAsync<string, NoValueError>
   * //       ▼
   * const result = ResultAsync.fromOptionAsync(readFile('data.json'));
   * // Output: ResultAsync<string, NoValueError>
   * ```
   */
  fromOptionAsync<Value>(
    optionAsync: OptionAsync<Value>,
  ): ResultAsync<Value, NoValueError>;

  /**
   * Converts an `OptionAsync` to a `ResultAsync`.
   *
   * If the `OptionAsync` resolves to `Option.Some`, returns a `ResultAsync.Ok`.
   * If the `OptionAsync` resolves to `Option.None`, returns a `ResultAsync.Error` with the provided error.
   *
   * @example
   * ```ts
   * import { OptionAsync, ResultAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   *
   * //       ┌─── ResultAsync<string, FileNotFoundError>
   * //       ▼
   * const result = ResultAsync.fromOptionAsync(
   *   readFile('data.json'),
   *   () => new FileNotFoundError('data.json'),
   * );
   * // Output: ResultAsync<string, FileNotFoundError>
   * ```
   */
  fromOptionAsync<Value, Error extends {}>(
    optionAsync: OptionAsync<Value>,
    onNone: Thunk<Error>,
  ): ResultAsync<Value, Error>;

  /**
   * Initiates a `Do-notation` for the `ResultAsync` type, allowing to write code
   * in a more declarative style, similar to the "do notation" in other programming languages.
   * It provides a way to define variables and perform operations on them
   * using functions like `bind` and `let`, piping the returned values into a context object.
   *
   * Within the `Do` scope, you can use the `bind` function to bind a value to a variable.
   * The `bind` function takes two arguments: the name of the variable and a function that returns a `ResultAsync` to be bound.
   * If the returned `ResultAsync` resolves to a `Result.Ok`, the value is assigned to the variable in the context object.
   * If the returned `ResultAsync` resolves to a `Result.Error`, the parent `ResultAsync` running the `Do` simulation resolves to a `Result.Error`.
   *
   * You can also use the `let` function to bind a simple value to a variable.
   * The `let` function takes two arguments: the name of the variable and a function that returns a value to be bound.
   * You can return any value from the function, like a `string`, `number`, `boolean` etc,
   * and it will be assigned to the variable in the context object.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare function findUserById(id: string): ResultAsync<User, UserNotFound>;
   *
   * declare function calculateUserScore(user: User): ResultAsync<UserScore, UserNotScored>;
   *
   * declare function rankUserLevel(user: User, score: UserScore): ResultAsync<UserLevel, InvalidRanking>;
   *
   * //        ┌─── ResultAsync<UserLevel, UserNotFound | UserNotScored | InvalidRanking>
   * //        ▼
   * const userLevel = ResultAsync.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => calculateUserScore(ctx.user))
   *   .andThen((ctx) => rankUserLevel(ctx.user, ctx.score));
   * //           ▲
   * //           └─── { user: User; score: UserScore }
   */
  get Do(): ResultAsync<DoNotation, never>;

  /**
   * Constructs a `ResultAsync` from a promise that may reject.
   *
   * If the promise executes successfully, it resolves to a `Result.Ok`.
   * Otherwise, it resolves to a `Result.Error` containing an `UnhandledException` with the thrown exception.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare async function findUserByIdOrThrow(id: string): Promise<User>;
   *
   * //     ┌─── ResultAsync<User, UnhandledException>
   * //     ▼
   * const result = ResultAsync.try(() => findUserByIdOrThrow('user_123'));
   * // Output: Error(UnhandledException)
   * ```
   */
  try<Value>(
    promise: () => PromiseLike<Value>,
  ): ResultAsync<Value, UnhandledException>;

  /**
   * Constructs a `ResultAsync` from a promise that may reject.
   *
   * If the promise executes successfully, it resolves to a `Result.Ok`.
   * Otherwise, it resolves to a `Result.Error` containing the output of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare async function findUserByIdOrThrow(id: string): Promise<User>;
   *
   * //     ┌─── ResultAsync<User, UserNotFound | DatabaseFailureError>
   * //     ▼
   * const result = ResultAsync.try(
   *   () => findUserByIdOrThrow('user_123'),
   *   (error) => UserNotFound.is(error) ? error : new DatabaseFailureError(error),
   * );
   * // Output: DatabaseFailureError('Error: Failed to connect to the database')
   * ```
   */
  try<Value, Error extends {}>(
    promise: () => PromiseLike<Value>,
    onThrow: (error: unknown) => Error,
  ): ResultAsync<Value, Error>;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `ResultAsync` that resolves to a `Result.Ok`, narrowing the value to the specified type predicate,
   * if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //         ┌─── (shape: Shape) => ResultAsync<Circle, FailedPredicateError<Square>>
   * //         ▼
   * const ensureCircle = ResultAsync.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── ResultAsync<Circle, FailedPredicateError<Square>>
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
   * creating a `ResultAsync` that resolves to a `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //          ┌─── (value: number) => ResultAsync<number, FailedPredicateError<number>>
   * //          ▼
   * const ensurePositive = ResultAsync.predicate(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── ResultAsync<number, FailedPredicateError<number>>
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
   * creating a `ResultAsync` that resolves to a `Result.Ok`, narrowing the value to the specified type predicate,
   * if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with the value provided by the `onUnfulfilled` function.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //          ┌─── (shape: Shape) => ResultAsync<Circle, InvalidShapeError>
   * //          ▼
   * const ensureCircle = ResultAsync.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * //   ┌─── Square
   * //   ▼
   *   (shape) => new InvalidShapeError(shape.kind),
   * );
   *
   * //       ┌─── ResultAsync<Circle, InvalidShapeError>
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
   * creating a `ResultAsync` that resolves to a `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, resolves to a `Result.Error` with the value provided by the `onUnfulfilled` function.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //          ┌─── (value: number) => ResultAsync<number, InvalidNumberError>
   * //          ▼
   * const ensurePositive = ResultAsync.predicate(
   *   (value: number) => value > 0,
   *   (value) => new InvalidNumberError(value),
   * );
   *
   * //       ┌─── ResultAsync<number, InvalidNumberError>
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
   * Declares a promise that must return a `Result`, returning a new function that returns a `ResultAsync` and never rejects.
   *
   * @example
   * ```ts
   * import { Result, ResultAsync } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Result<User, UserNotFound>>;
   *
   * //      ┌─── (id: string) => ResultAsync<User, UserNotFound>
   * //      ▼
   * const findUser = ResultAsync.fn((id: string) => findUserById(id));
   *
   * const result = await findUser('user_123');
   * // Output: ResultAsync<User, UserNotFound>
   * ```
   */
  fn<Args extends readonly unknown[], $Result extends Result.Any>(
    promise: (...args: Args) => Promise<$Result>,
  ): (
    ...args: Args
  ) => ResultAsync<ResultAsync.Unwrap<$Result>, ResultAsync.Panic<$Result>>;

  /**
   * Returns a function that evaluates an *async* generator when called with the defined arguments,
   * early returning when a `Result.Error` is propagated or returning the `ResultAsync` returned by the generator.
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
   * const safeMergeFiles = ResultAsync.fn(async function* (output: string, pathA: string, pathB: string) {
   *   const fileA: string = yield* safeReadFile(pathA);
   *   const fileB: string = yield* safeReadFile(pathB);
   *
   *   return safeWriteFile(output, `${fileA}\n${fileB}`);
   * });
   *
   * const mergedContent = safeMergeFiles('report.txt', 'q1.txt', 'q2.txt');
   * // Output: ResultAsync<string, NodeFSError>
   * ```
   */
  fn<
    Args extends readonly unknown[],
    $Result extends Result.Any,
    Error extends {},
  >(
    generator: (...args: Args) => AsyncGenerator<Error, $Result>,
  ): (
    ...args: Args
  ) => ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.Panic<$Result> | inferError<Error>
  >;

  /**
   * Evaluates an *async* generator early returning when a `Result.Error` is propagated
   * or returning the `ResultAsync` returned by the generator.
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
   * // Output: ResultAsync<string, FileNotFoundError | FailedToWriteFileError>
   * ```
   */
  use<$Result extends Result.Any, Error extends {}>(
    generator: () => AsyncGenerator<Error, $Result>,
  ): ResultAsync<
    ResultAsync.Unwrap<$Result>,
    ResultAsync.Panic<$Result> | inferError<Error>
  >;

  /**
   * Given an array of `ResultAsync`s, returns an array containing only the values inside `Result.Ok`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await ResultAsync.values([
   *   ResultAsync.ok(1),
   *   ResultAsync.error('Failed computation'),
   *   ResultAsync.ok(3),
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
  ) => Promise<Array<DoNotation.Unbrand<Value>>>;

  /**
   * Wraps a resource and provides a safe way to use it with error handling.
   *
   * Returns an object with a `run` method that executes a function with the resource,
   * automatically catching any errors and converting them to a `ResultAsync`.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * const database = {
   *   query: {
   *     users: {
   *       findMany: async () => [{ id: '1' }, { id: '2' }],
   *     },
   *   },
   * };
   *
   * const db = ResultAsync.resource(database);
   *
   * //       ┌─── ResultAsync<{ id: string }[], UnhandledException>
   * //       ▼
   * const result = await db.run((client) => client.query.users.findMany());
   * // Output: ResultAsync<{ id: string }[], UnhandledException>
   * ```
   */
  resource<$Resource>(resource: $Resource): ResultAsync.Resource<$Resource>;
  /**
   * Wraps a resource and provides a safe way to use it with error handling.
   *
   * Returns an object with a `run` method that executes a function with the resource,
   * automatically catching any errors and converting them to a `ResultAsync` with the provided error handler.
   *
   * @example
   * ```ts
   * import { ResultAsync } from 'funkcia';
   *
   * class DatabaseError extends Error {}
   *
   * const database = {
   *   query: {
   *     users: {
   *       findOne: async () => {
   *         throw new Error('Invalid database credentials');
   *       },
   *     },
   *   },
   * };
   *
   * const db = ResultAsync.resource(
   *   database,
   *   (error) => new DatabaseError('Failed to connect to the database', { cause: error }),
   * );
   *
   * //       ┌─── ResultAsync<{ id: string }, DatabaseError>
   * //       ▼
   * const result = await db.run((client) => client.query.users.findOne());
   * // Output: ResultAsync<{ id: string }, DatabaseError>
   * ```
   */
  resource<$Resource, Error extends {}>(
    resource: $Resource,
    onrejected: (error: unknown) => Error,
  ): ResultAsync.Resource<$Resource, Error>;
}

export declare namespace ResultAsync {
  type Any<Value = any> =
    | ResultAsync<Value, any>
    | ResultAsync<Value, never>
    | ResultAsync<never, any>;

  interface Match<Value, Error, Output, ErrorOutput> {
    Ok: (value: Value) => Output;
    Error: (error: Error) => ErrorOutput;
  }

  interface Resource<Resource, Error = UnhandledException> {
    run<Output>(
      fn: (resource: Resource) => PromiseLike<Output>,
    ): ResultAsync<Output, Error>;
  }

  type Unwrap<Output> = Output extends
    | Result<infer Value, infer _>
    | ResultAsync<infer Value, infer _>
    ? Value
    : never;

  type Panic<Output> = Output extends
    | Result<infer _, infer Error>
    | ResultAsync<infer _, infer Error>
    ? Error
    : never;
}

type inferError<Error> = [Error] extends [any] ? Error : never;
