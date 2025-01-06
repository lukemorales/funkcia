// eslint-disable-next-line import/no-cycle
import { type AsyncOption } from './async-option';
import { type FailedPredicateError } from './exceptions';
import { FunkciaStore } from './funkcia-store';
import type { Nullable, Task } from './internals/types';
import { type Option } from './option.bak';
import type { Predicate } from './predicate';
import { Result } from './result';

type AsyncResultPatternMatch<Value, Error, Output, ErrorOutput> = {
  Ok: (value: Value) => Output;
  Error: (error: Error) => ErrorOutput;
};

export class AsyncResult<Value, Error>
  implements PromiseLike<Result<Value, Error>>
{
  readonly #promise: Task<Result<Value, Error>>;

  private constructor(promise: Task<Result<Value, Error>>) {
    this.#promise = promise;
  }

  // ------------------------
  // ---MARK: CONSTRUCTORS---
  // ------------------------

  static of = AsyncResult.fromResult;

  static fromResult<Value, Error>(
    result: Result<Value, Error>,
  ): AsyncResult<Value, Error> {
    return new AsyncResult(() => Promise.resolve(result));
  }

  static fromOption<Value>(
    opts: Option<Value>,
  ): AsyncResult<Value, NullableValueError>;

  static fromOption<Value, Error>(
    option: Option<Value>,
    onNone: () => NonNullable<Error>,
  ): AsyncResult<Value, Error>;

  static fromOption(
    option: Option<any>,
    onNone?: () => any,
  ): AsyncResult<any, any> {
    return new AsyncResult(() =>
      Promise.resolve(Result.fromOption(option, onNone as never)),
    );
  }

  static fromAsyncOption<Value>(
    option: AsyncOption<Value>,
  ): AsyncResult<Value, UnexpectedAsyncOptionError> {
    return new AsyncResult(() =>
      option.then(($option) =>
        Result.fromOption($option, UnexpectedAsyncOptionError.raise),
      ),
    );
  }

  static fromNullable<Value>(
    value: Nullable<Value>,
  ): AsyncResult<Value, NullableValueError>;

  static fromNullable<Value, Error>(
    value: Nullable<Value>,
    onNone: () => NonNullable<Error>,
  ): AsyncResult<Value, Error>;

  static fromNullable(value: any, onNone?: () => any): AsyncResult<any, any> {
    return new AsyncResult(() =>
      Promise.resolve(Result.fromNullish(value, onNone as never)),
    );
  }

  static fromPromise<Value, Error>(
    promise: Task<Result<Value, Error>>,
  ): AsyncResult<Value, Error>;

  static fromPromise<Value, Error>(
    promise: Task<Value>,
    onrejected: (e: unknown) => NonNullable<Error>,
  ): AsyncResult<Value, Error>;

  static fromPromise(
    promise: Task<any>,
    onrejected?: (e: unknown) => any,
  ): AsyncResult<any, any> {
    return new AsyncResult(() =>
      promise().then(
        (val) => (val instanceof Result ? val : Result.ok(val)),
        (e) => Result.error(onrejected?.(e) ?? e),
      ),
    );
  }

  // -------------------
  // ---MARK: LIFTING---
  // -------------------

  static liftPromise<Args extends readonly unknown[], Value, Error = unknown>(
    promise: (...args: Args) => Promise<Result<Value, Error> | Value>,
  ): (...args: Args) => AsyncResult<Value, Error> {
    return (...args) =>
      new AsyncResult(() =>
        promise(...args).then(
          (val) => (val instanceof Result ? val : Result.ok(val)),
          (e) => Result.error(e),
        ),
      );
  }

  // -----------------------
  // ---MARK: CONVERSIONS---
  // -----------------------

  async match<Output, ErrorOutput>(
    cases: AsyncResultPatternMatch<Value, Error, Output, ErrorOutput>,
  ): Promise<ErrorOutput | Output> {
    return this.#promise().then((result) => result.match(cases));
  }

  async getOrElse<Output = Value>(
    onError: (error: Error) => readonly any[] extends Value ? Value : Output,
  ): Promise<readonly any[] extends Value ? Value : Value | Output> {
    return this.match({
      Ok: (value) => value,
      Error: (error) => onError(error),
    });
  }

  async unwrap(): Promise<Value> {
    return this.getOrElse((error) => {
      throw UnableToUnwrapAsyncResultError.raise(error);
    });
  }

  async unwrapError(): Promise<Error> {
    return this.match({
      Ok: (value) => {
        throw UnableToUnwrapAsyncResultErrorError.raise(value);
      },
      Error: (error) => error,
    });
  }

  async expect<Exception extends globalThis.Error | string>(
    onError: (error: Error) => Exception,
  ): Promise<Value> {
    return this.getOrElse((error) => {
      const message = onError(error);

      if (typeof message === 'string') {
        throw UnexpectedAsyncResultError.raise({ error, message });
      }

      throw message;
    });
  }

  async expectError<Exception extends globalThis.Error | string>(
    onOk: (value: Value) => Exception,
  ): Promise<Error> {
    return this.#promise().then((result) =>
      result.match({
        Ok: (value) => {
          const message = onOk(value);

          if (typeof message === 'string') {
            throw UnexpectedAsyncResultValueError.raise({ value, message });
          }

          throw message;
        },
        Error: (error) => error,
      }),
    );
  }

  async toUnion(): Promise<Value | Error> {
    return this.match({ Ok: (value) => value, Error: (error) => error });
  }

  async satisfies(predicate: Predicate<Value>): Promise<boolean> {
    return this.match({ Ok: (value) => predicate(value), Error: () => false });
  }

  then<Fulfilled = Value, Rejected = never>(
    onfulfilled?:
      | ((value: Result<Value, Error>) => Fulfilled | PromiseLike<Fulfilled>)
      | null,
    onrejected?: ((reason: Error) => Rejected | PromiseLike<Rejected>) | null,
  ): Promise<Fulfilled | Rejected> {
    return this.#promise().then(onfulfilled, onrejected);
  }

  // ---------------------------
  // ---MARK: TRANSFORMATIONS---
  // ---------------------------

  map<Output>(onOk: (value: Value) => Output): AsyncResult<Output, Error> {
    return AsyncResult.fromPromise(
      () => this.#promise().then((result) => result.map(onOk)) as never,
    );
  }

  flatMap<Output, NewError>(
    onOk: (value: Value) => AsyncResult<Output, NewError>,
  ): AsyncResult<Output, Error | NewError> {
    return AsyncResult.fromPromise(() =>
      this.#promise().then(
        (result) =>
          result
            .match({
              Ok: (value) => onOk(value),
              Error: (error) => AsyncResult.fromResult(Result.error(error)),
            })
            .#promise() as never,
      ),
    ) as never;
  }

  flatten(): Value extends AsyncResult<infer Output, infer NewError> ?
    AsyncResult<Output, Error | NewError>
  : never {
    return AsyncResult.fromPromise(() =>
      this.#promise().then((result) =>
        result
          .match({
            Ok: (value) =>
              value instanceof AsyncResult ? value : (
                AsyncResult.fromResult(Result.ok(value))
              ),
            Error: (error) => AsyncResult.fromResult(Result.error(error)),
          })
          .#promise(),
      ),
    ) as never;
  }

  filter<Output extends Value>(
    refinement: Refinement<Value, Output>,
  ): AsyncResult<
    Output,
    | Error
    | FailedPredicateError<
        Output extends object ? Exclude<Value, Output> : Value
      >
  >;

  filter(
    predicate: Predicate<Value>,
  ): AsyncResult<Value, Error | FailedPredicateError<Value>>;

  filter<Output extends Value, E2>(
    refinement: Refinement<Value, Output>,
    onUnfulfilled: (
      value: Output extends object ? Exclude<Value, Output> : Value,
    ) => NonNullable<E2>,
  ): AsyncResult<Output, Error | E2>;

  filter<NewError>(
    predicate: Predicate<Value>,
    onUnfulfilled: (value: Value) => NonNullable<NewError>,
  ): AsyncResult<Value, Error | NewError>;

  filter(
    predicate: Predicate<Value>,
    onUnfulfilled?: (value: Value) => any,
  ): AsyncResult<Value, any> {
    return AsyncResult.fromPromise(
      () =>
        this.#promise().then((result) =>
          result.filter(predicate, onUnfulfilled as never),
        ) as never,
    );
  }

  swap(): AsyncResult<Error, Value> {
    return AsyncResult.fromPromise(() =>
      this.#promise().then((result) => result.swap()),
    ) as never;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'AsyncResult(Promise)';
  }
}

FunkciaStore.register(AsyncResult);
