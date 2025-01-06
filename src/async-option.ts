// eslint-disable-next-line import/no-cycle

import { type AsyncResult } from './async-result';
import { UnexpectedOptionException, UnwrapError } from './exceptions';
import { FunkciaStore } from './funkcia-store';
import { Option } from './option';
import type { Predicate, Refinement } from './predicate';
import type { Result } from './result';
import type { Lazy, Nullish, Task } from './types';

type CallbackQueue<Value> = Array<
  [method: keyof Option<Value>, (...args: any[]) => any]
>;

type AsyncOptionPatternMatch<Value, Output, NoneOutput> = {
  Some: (value: Value) => Output;
  None: () => NoneOutput;
};

export class AsyncOption<Value> implements PromiseLike<Option<Value>> {
  readonly #promise: Task<Option<Value>>;

  readonly #callbackQueue: CallbackQueue<Value>;

  private constructor(
    promise: Task<Option<Value>>,
    callbackQueue: CallbackQueue<Value> = [],
  ) {
    this.#promise = promise;
    this.#callbackQueue = callbackQueue;
  }

  // ------------------------
  // ---MARK: CONSTRUCTORS---
  // ------------------------

  // eslint-disable-next-line @typescript-eslint/no-shadow
  static of: <Value>(
    value: NonNullable<Value>,
  ) => AsyncOption<NonNullable<Value>> = AsyncOption.some;

  static some<Value>(
    value: NonNullable<Value>,
  ): AsyncOption<NonNullable<Value>> {
    return new AsyncOption(() => Promise.resolve(Option.of(value)));
  }

  static none<Value = never>(): AsyncOption<Value> {
    return new AsyncOption(() => Promise.resolve(Option.none<Value>()));
  }

  static fromOption<Value>(option: Option<Value>): AsyncOption<Value> {
    return new AsyncOption(() => Promise.resolve(option));
  }

  static fromResult<Value, _>(
    result: Result<Value, _>,
  ): AsyncOption<NonNullable<Value>> {
    return new AsyncOption(() => Promise.resolve(result.toOption()));
  }

  static fromAsyncResult<Value, Error>(
    result: AsyncResult<Value, Error>,
  ): AsyncOption<NonNullable<Value>> {
    return new AsyncOption(() => result.then((res) => res.toOption()));
  }

  static fromNullable<Value>(
    value: Nullish<Value>,
  ): AsyncOption<NonNullable<Value>> {
    return new AsyncOption(() => Promise.resolve(Option.fromNullish(value)));
  }

  static fromPromise<Value>(
    promise: Task<Option<Value>> | Task<Nullish<Value>>,
  ): Value extends Option<infer Output> ? AsyncOption<NonNullable<Output>>
  : AsyncOption<NonNullable<Value>> {
    return new AsyncOption(
      () =>
        promise().then(
          (val) => (val instanceof Option ? val : Option.fromNullish(val)),
          () => Option.none(),
        ) as never,
    ) as never;
  }

  static async try<Value extends {}>(
    generator: () => AsyncGenerator<never, AsyncOption<Value>>,
  ): Promise<AsyncOption<Value>> {
    const iteration = await generator().next();

    if (!iteration.done) {
      return AsyncOption.none();
    }

    return iteration.value;
  }

  // -------------------
  // ---MARK: LIFTING---
  // -------------------

  static liftPromise<Args extends readonly unknown[], Value>(
    promise: (
      ...args: Args
    ) => Promise<Option<NonNullable<Value>> | Nullish<Value>>,
  ): (...args: Args) => AsyncOption<NonNullable<Value>> {
    return (...args) =>
      new AsyncOption(() =>
        promise(...args).then(
          (val) => (val instanceof Option ? val : Option.fromNullish(val)),
          () => Option.none<NonNullable<Value>>(),
        ),
      );
  }

  // -----------------------
  // ---MARK: CONVERSIONS---
  // -----------------------

  async match<Output, NoneOutput>(
    cases: AsyncOptionPatternMatch<Value, NoneOutput, Output>,
  ): Promise<NoneOutput | Output> {
    return this.#promise().then((option) =>
      this.#executeQueue(option).match(cases),
    );
  }

  async getOrElse<Output = Value>(
    onNone: Lazy<readonly any[] extends Value ? Value : Output>,
  ): Promise<readonly any[] extends Value ? Value : Value | Output> {
    return this.match({ Some: (value) => value, None: onNone });
  }

  async unwrap(): Promise<Value> {
    return this.getOrElse(() => {
      throw new UnwrapError('Option');
    });
  }

  async expect<Exception extends globalThis.Error | string>(
    onNone: Lazy<Exception>,
  ): Promise<Value> {
    return this.getOrElse(() => {
      const message = onNone();

      if (typeof message === 'string') {
        throw new UnexpectedOptionException(message);
      }

      throw message;
    });
  }

  async contains(predicate: Predicate<Value>): Promise<boolean> {
    return this.match({ Some: (value) => predicate(value), None: () => false });
  }

  then<Fulfilled = Value, Rejected = never>(
    onfulfilled?:
      | ((value: Option<Value>) => Fulfilled | PromiseLike<Fulfilled>)
      | null,
    onrejected?: ((reason: unknown) => Rejected | PromiseLike<Rejected>) | null,
  ): Promise<Fulfilled | Rejected> {
    return this.#promise().then(
      (option) => onfulfilled?.(this.#executeQueue(option)) as never,
      onrejected,
    );
  }

  // ---------------------------
  // ---MARK: TRANSFORMATIONS---
  // ---------------------------

  map<Output>(
    onSome: (value: Value) => NonNullable<Output>,
  ): AsyncOption<NonNullable<Output>> {
    return new AsyncOption(
      this.#promise,
      this.#callbackQueue.concat([['map', onSome]]),
    ) as never;
  }

  andThen<Output>(
    onSome: (value: Value) => AsyncOption<NonNullable<Output>>,
  ): AsyncOption<NonNullable<Output>> {
    const flattenedPromise = () =>
      this.#promise().then((option) =>
        this.#executeQueue(option)
          .match({
            Some: onSome,
            None: () => AsyncOption.none<NonNullable<Output>>(),
          })
          .#promise(),
      );

    return AsyncOption.fromPromise(flattenedPromise) as never;
  }

  filter<Output extends Value>(
    refinement: Refinement.Refinement<Value, Output>,
  ): AsyncOption<Output>;

  filter(predicate: Predicate<Value>): AsyncOption<Value>;

  filter(predicate: Predicate<Value>): AsyncOption<Value> {
    return new AsyncOption(
      this.#promise,
      this.#callbackQueue.concat([['filter', predicate]]),
    );
  }

  // ---------------------
  // ---MARK: FALLBACKS---
  // ---------------------

  or(onNone: Lazy<AsyncOption<Value>>): AsyncOption<Value> {
    // @ts-expect-error this is fine
    return AsyncOption.fromPromise(() =>
      this.#promise().then(this.#executeQueue, onNone),
    );
  }

  #executeQueue = (option: Option<Value>): Option<any> =>
    this.#callbackQueue.reduce(
      ($option, [method, fn]) => ($option[method] as any)(fn),
      option,
    );

  async *[Symbol.asyncIterator](): AsyncIterator<never, Value> {
    const option = await this.#promise().then(
      this.#executeQueue,
      Option.none<any>,
    );

    if (option.isNone()) {
      yield undefined as never;
    }

    return option.unwrap();
  }

  protected [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'AsyncOption(Promise)';
  }
}

FunkciaStore.register(AsyncOption);
