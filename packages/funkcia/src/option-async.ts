import type { DoNotation } from './do-notation';
import { panic } from './exceptions';
import { alwaysNull } from './functions';
import type {
  Falsy,
  FunkciaAsyncIterable,
  Nullable,
  Thunk,
  Tuple,
  UnaryFn,
} from './internals/types';
import { failOnDefect } from './internals/utils';
import { Option } from './option';
import type { Predicate } from './predicate';
import { Result } from './result';
import type { ResultAsync } from './result-async';

class AsyncOption<Value> implements PromiseLike<Option<Value>> {
  private readonly task: () => Promise<Option<Value>>;

  constructor(task: () => Promise<Option<Value>>) {
    this.task = task;
  }

  bindTo(key: string) {
    return new AsyncOption(() =>
      Promise.resolve(
        Option.some(Object.create(null) as DoNotation).bind(
          key,
          () => this as never,
        ),
      ),
    );
  }

  bind(key: string, fn: (value: any) => OptionAsync<any>) {
    return this.andThen(
      (ctx) =>
        fn(ctx).map(
          (value) => Object.assign({ [key]: value }, ctx) as {},
        ) as never,
    ) as never;
  }

  let(key: string, cb: (value: any) => Promise<any>) {
    return (this as unknown as OptionAsync<DoNotation>).bind(
      key as never,
      (ctx) =>
        new AsyncOption(async () => {
          try {
            const value = await cb(ctx);

            return value == null ? Option.none() : Option.some(value);
          } catch {
            return Option.none() as never;
          }
        }) as never,
    ) as never;
  }

  map(onSome: UnaryFn<any, any>) {
    return new AsyncOption(() =>
      this.task().then((option) => option.map(onSome)),
    );
  }

  andThen(onSome: UnaryFn<any, OptionAsync<any> | Option.Any>) {
    return new AsyncOption(() =>
      this.then(async (option) => {
        if (option.isNone()) return option;

        const output = onSome(option.unwrap());

        if (Option.is(output)) return output;
        return await output;
      }),
    );
  }

  filter(predicate: UnaryFn<any, boolean>) {
    return new AsyncOption(() =>
      this.task().then((option) => option.filter(predicate)),
    );
  }

  or(onNone: Thunk<OptionAsync<Value>>) {
    return new AsyncOption(() =>
      this.then((option) => (option.isSome() ? option : onNone())),
    );
  }

  zip(that: OptionAsync<any>): AsyncOption<any> {
    return this.andThen((a) => that.map((b) => [a, b]));
  }

  zipWith(that: OptionAsync<any>, fn: (a: any, b: any) => any) {
    return this.zip(that).map((options: [any, any]) => fn(...options));
  }

  async then<TResult1 = Option<Value>, TResult2 = never>(
    onfulfilled?:
      | ((value: Option<Value>) => TResult1 | PromiseLike<TResult1>)
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.task().then(onfulfilled) as Promise<TResult1 | TResult2>;
  }

  async match(cases: { Some: (value: any) => any; None: () => any }) {
    return this.then((option) => option.match(cases));
  }

  async unwrap() {
    return this.then((option) => option.unwrap());
  }

  async unwrapOr(onNone: Thunk<any>) {
    return this.then((option) => option.unwrapOr(onNone));
  }

  async unwrapOrNull() {
    return this.then((option) => option.unwrapOrNull());
  }

  async unwrapOrUndefined() {
    return this.then((option) => option.unwrapOrUndefined());
  }

  async expect(onNone: Thunk<globalThis.Error>) {
    return this.then((option) => option.expect(onNone));
  }

  async contains(predicate: UnaryFn<any, boolean>) {
    return this.then((option) => option.contains(predicate));
  }

  async toArray() {
    return this.then((option) => option.toArray());
  }

  tap(onSome: (value: any) => unknown) {
    return new AsyncOption(
      () =>
        this.then(async (option) => {
          try {
            const output = option.match({ Some: onSome, None: alwaysNull });
            if (output instanceof Promise) await output;
          } catch (e) {
            failOnDefect(e);

            panic('A defect occurred while tapping an OptionAsync', {
              cause: e,
            });
          }

          return option;
        }) as Promise<Option<Value>>,
    );
  }

  async *[Symbol.asyncIterator](): AsyncIterator<never> {
    return yield* await this;
  }
}

export function isOptionAsync(option: unknown): option is OptionAsync<unknown> {
  return option instanceof AsyncOption;
}

function optionAsync<Value>(
  task: () => Promise<Option<Value>>,
): OptionAsync<Value> {
  return new AsyncOption(task) as unknown as OptionAsync<Value>;
}

const some: OptionAsyncTrait['some'] = (value) =>
  optionAsync(() => Promise.resolve(Option.some(value)));

const none: OptionAsyncTrait['none'] = () =>
  optionAsync(() => Promise.resolve(Option.none() as never));

const tryCatch: OptionAsyncTrait['try'] = (promise: () => PromiseLike<any>) =>
  optionAsync(async () => {
    try {
      return await promise().then((value) => {
        if (Option.is(value)) return value as never;

        return (value != null ? Option.some(value) : Option.none()) as never;
      });
    } catch {
      return Option.none() as never;
    }
  });

/**
 * `OptionAsync` represents a `Promise` that **never** rejects of an asynchronous optional value .
 * Every `OptionAsync` resolves to either `Option.Some`, containing a value, or `Option.None`, which is empty.
 *
 * An `OptionAsync` allows you to chain the same methods as an `Option`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `OptionAsync`, the Promise inside will resolve to the underlying `Option`.
 */
export const OptionAsync: OptionAsyncTrait = {
  some,
  of: some,
  none,
  fromNullable(value) {
    return (value != null ? some(value) : none()) as never;
  },
  fromFalsy(value) {
    return (value ? some(value) : none()) as never;
  },
  fromOption(option: Option.Any) {
    return optionAsync(() => Promise.resolve(option)) as never;
  },
  fromResult(result: Result.Any) {
    return optionAsync(() =>
      Promise.resolve(Option.fromResult(result)),
    ) as never;
  },
  fromResultAsync<Value, Error>(resultAsync: ResultAsync<Value, Error>) {
    return optionAsync(async () => {
      const result = await resultAsync;
      return result.match({
        Ok: (value) => Option.some(value as never),
        Error: () => Option.none(),
      });
    }) as never;
  },
  get Do() {
    return some(Object.create(null)) as never;
  },
  try: tryCatch,
  firstSomeOf(asyncOptions) {
    return optionAsync(() =>
      Promise.allSettled(asyncOptions).then((options) => {
        for (const option of options) {
          if (option.status === 'fulfilled' && option.value.isSome()) {
            return option.value as never;
          }
        }

        return Option.none() as never;
      }),
    );
  },
  predicate(criteria: UnaryFn<any, boolean>) {
    return (input: any) => some(input).filter(criteria);
  },
  fn(promise) {
    return (...args) =>
      optionAsync(async () => {
        const output = promise(...args);

        if (output instanceof Promise) return output;

        const { done, value } = await output.next();

        return (done ? value : Option.none()) as Option.Any;
      }) as never;
  },
  use(generator) {
    return optionAsync(async () => {
      const { done, value } = await generator().next();

      return (done ? value : Option.none()) as Option.Any;
    }) as never;
  },
  async values(asyncOptions) {
    return Promise.allSettled(asyncOptions).then((options) =>
      options.reduce<any[]>((acc, option) => {
        if (option.status === 'fulfilled' && option.value.isSome()) {
          acc.push(option.value.unwrap());
        }

        return acc;
      }, []),
    ) as never;
  },
  resource(resource: any) {
    return {
      run(fn: (resource: any) => any) {
        return tryCatch(() => fn(resource)) as never;
      },
    };
  },
};

/**
 * `OptionAsync` represents a `Promise` that **never** rejects of an asynchronous optional value .
 * Every `OptionAsync` resolves to either `Option.Some`, containing a value, or `Option.None`, which is empty.
 *
 * An `OptionAsync` allows you to chain the same methods as an `Option`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `OptionAsync`, the Promise inside will resolve to the underlying `Option`.
 */
export interface OptionAsync<Value>
  extends PromiseLike<Option<Value>>,
    FunkciaAsyncIterable<never, DoNotation.Unbrand<Value>> {
  /**
   * Initiates a `Do-notation` with the current `OptionAsync`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function getUserScore(user: User): OptionAsync<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * declare const user: OptionAsync<User>;
   *
   * //        ┌─── OptionAsync<UserLevel>
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
  bindTo: <Key extends string>(
    key: Key,
  ) => OptionAsync<DoNotation<{ [K in Key]: Value }>>;

  /**
   * Binds an `OptionAsync` to the context object in a `Do-notation`.
   *
   * If the `OptionAsync` resolves to `Some`, the value is assigned to the key in the context object.
   * If the `OptionAsync` resolves to `None`, the parent `OptionAsync` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function findUserById(id: string): OptionAsync<User>;
   *
   * declare function getUserScore(user: User): OptionAsync<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── OptionAsync<UserLevel>
   * //        ▼
   * const userLevel = OptionAsync.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   * ```
   */
  bind: <Key extends string, U extends {}>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbidden<'OptionAsync', 'bind'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unbrand<Value>) => OptionAsync<U>,
  ) => OptionAsync<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
        ? Value[K]
        : U;
    }>
  >;

  /**
   * Binds a non-rejecting promise to the context object in a `Do-notation`.
   *
   * If the promise resolves to a non-nullable value, the value is assigned to the key in the context object.
   * If the promise resolves to `null` or `undefined`, the parent `OptionAsync` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //      ┌─── OptionAsync<number>
   * //      ▼
   * const orderTotal = OptionAsync.Do
   *   .let('subtotal', () => Promise.resolve(120))
   * //               ┌─── { subtotal: number }
   * //               ▼
   *   .let('tax', (ctx) => Promise.resolve(ctx.subtotal * 0.08))
   *   .map((ctx) => ctx.subtotal + ctx.tax);
   * //      ▲
   * //      └─── { subtotal: number; tax: number }
   * ```
   */
  let: <Key extends string, U extends {}>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbidden<'OptionAsync', 'let'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unbrand<Value>) => Promise<U>,
  ) => OptionAsync<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
        ? Value[K]
        : U;
    }>
  >;

  /**
   * Applies a callback function to the value of the `OptionAsync` when it is `Some`,
   * returning a new `OptionAsync` containing the new value.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //       ┌─── OptionAsync<number>
   * //       ▼
   * const option = OptionAsync.some(10).map(number => number * 2);
   * // Output: OptionAsync<number>
   * ```
   */
  map<Output>(
    onSome: (value: DoNotation.Unbrand<Value>) => NonNullable<Output>,
  ): OptionAsync<NonNullable<Output>>;

  /**
   * Applies a callback function to the value of the `OptionAsync` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `Option` or an `OptionAsync`, not a raw value.
   * This allows chaining multiple calls that return `OptionAsync`s together.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   *
   * declare function parseJsonFile(contents: string): Option<FileContent>;
   *
   * //       ┌─── OptionAsync<FileContent>
   * //       ▼
   * const option = readFile('data.json').andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends Option.Any>(
    onSome: (value: DoNotation.Unbrand<Value>) => Output,
  ): OptionAsync<OptionAsync.Unwrap<Output>>;

  /**
   * Applies a callback function to the value of the `OptionAsync` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `Option` or an `OptionAsync`, not a raw value.
   * This allows chaining multiple calls that return `OptionAsync`s together.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   *
   * declare function parseJsonFile(contents: string): OptionAsync<FileContent>;
   *
   * //       ┌─── OptionAsync<FileContent>
   * //       ▼
   * const option = readFile('data.json').andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends OptionAsync<any>>(
    onSome: (value: DoNotation.Unbrand<Value>) => Output,
  ): OptionAsync<NonNullable<OptionAsync.Unwrap<Output>>>;

  /**
   * Applies a callback function to the value of the `OptionAsync` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `OptionAsync`, not a raw value.
   * This allows chaining multiple calls that return `OptionAsync`s together.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   *
   * declare function parseJsonFile(contents: string): OptionAsync<FileContent>;
   *
   * //       ┌─── OptionAsync<FileContent>
   * //       ▼
   * const option = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<Output>(
    onSome: (
      value: DoNotation.Unbrand<Value>,
    ) => Option<NonNullable<Output>> | OptionAsync<NonNullable<Output>>,
  ): OptionAsync<NonNullable<OptionAsync.Unwrap<Output>>>;

  /**
   * Asserts that the `OptionAsync` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `OptionAsync`, resolving to an `Option.None` instead.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //      ┌─── OptionAsync<Circle>
   * //      ▼
   * const circle = OptionAsync.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'circle',
   * );
   * ```
   */
  filter<Output extends DoNotation.Unbrand<Value>>(
    guard: Predicate.Guard<DoNotation.Unbrand<Value>, Output>,
  ): OptionAsync<Output>;

  /**
   * Asserts that the `OptionAsync` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `OptionAsync`, resolving to an `Option.None` instead.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //       ┌─── OptionAsync<User>
   * //       ▼
   * const option = OptionAsync.of(user).filter((user) => user.age >= 21);
   * ```
   */
  filter(
    predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>,
  ): OptionAsync<Value>;

  /**
   * Replaces the current `OptionAsync` with the provided fallback `OptionAsync` when it is `None`.
   *
   * If the current `OptionAsync` is `Some`, it returns the current `OptionAsync`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * // Output: OptionAsync<string>
   * const preferredName = OptionAsync.some('Ava')
   *   .or(() => OptionAsync.some('Guest'));
   *
   * // Output: OptionAsync<string>
   * const displayName = OptionAsync.none<string>()
   *   .or(() => OptionAsync.some('Guest'));
   * ```
   */
  or: (onNone: Thunk<OptionAsync<Value>>) => OptionAsync<Value>;

  /**
   * Combines two `OptionAsync`s into a single `OptionAsync` containing a tuple of their values,
   * if both `OptionAsync`s are `Some` variants, otherwise, returns `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * const firstName = OptionAsync.some('Jane');
   * const lastName = OptionAsync.some('Doe');
   *
   * //       ┌─── OptionAsync<[string, string]>
   * //       ▼
   * const strings = firstName.zip(lastName);
   * // Output: OptionAsync<[string, string]>
   * ```
   */
  zip: <Value2 extends {}>(
    that: OptionAsync<Value2>,
  ) => OptionAsync<
    Tuple<DoNotation.Unbrand<Value>, DoNotation.Unbrand<Value2>>
  >;

  /**
   * Combines two `OptionAsync`s into a single `OptionAsync`. The new value is produced
   * by applying the given function to both values, if both `OptionAsync`s are `Some` variants,
   * otherwise, returns `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   *
   * const firstName = OptionAsync.some('Jane');
   * const lastName = OptionAsync.some('Doe');
   *
   * //        ┌─── OptionAsync<string>
   * //        ▼
   * const greeting = firstName.zipWith(lastName, (a, b) => `${a} ${b}`);
   * // Output: OptionAsync<string>
   * ```
   */
  zipWith: <Value2 extends {}, Output extends {}>(
    that: OptionAsync<Value2>,
    fn: (
      arg0: DoNotation.Unbrand<Value>,
      arg1: DoNotation.Unbrand<Value2>,
    ) => Output,
  ) => OptionAsync<Output>;

  /**
   * Returns a promise that compares the underlying `Option` against the possible patterns,
   * and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   * declare function parseJsonFile(contents: string): OptionAsync<FileContent>;
   * declare function processFile(contents: FileContent): string;
   *
   * //         ┌─── string
   * //         ▼
   * const userGreeting = await readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .match({
   *     Some(contents) {
   *       return processFile(contents);
   *     },
   *     None() {
   *       return 'File is invalid JSON';
   *     },
   *   });
   * ```
   */
  match: <Output, NoneOutput>(
    cases: OptionAsync.Match<DoNotation.Unbrand<Value>, NoneOutput, Output>,
  ) => Promise<NoneOutput | Output>;

  /**
   * Returns a promise that unwraps the underlying `Option` value.
   *
   * @throws `Panic` if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //     ┌─── User
   * //     ▼
   * const user = await OptionAsync.some(databaseUser).unwrap();
   *
   * const team = await OptionAsync.none().unwrap();
   * // Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
   * ```
   */
  unwrap: () => Promise<DoNotation.Unbrand<Value>>;

  /**
   * Returns a promise that unwraps the underlying `Option` value.
   *
   * If the promise resolves to an `Option.None`, returns the result of the provided callback.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //       ┌─── string
   * //       ▼
   * const baseUrl = await OptionAsync.fromNullable(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://app.acme.com'
   *
   * const apiKey = await OptionAsync.none<string>()
   *   .unwrapOr(() => 'api_test_acme_123');
   * // Output: 'api_test_acme_123'
   * ```
   */
  unwrapOr: (
    onNone: Thunk<DoNotation.Unbrand<Value>>,
  ) => Promise<DoNotation.Unbrand<Value>>;

  /**
   * Returns a promise that unwraps the value of the underlying `Option`
   * if it is an `Option.Some`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = await OptionAsync.some(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull: () => Promise<DoNotation.Unbrand<Value> | null>;

  /**
   * Returns a promise that unwraps the value of the underlying `Option`
   * if it is an `Option.Some`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //     ┌─── User | undefined
   * //     ▼
   * const user = await OptionAsync.some(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined: () => Promise<DoNotation.Unbrand<Value> | undefined>;

  /**
   * Returns a promise that unwraps the underlying `Option` value.
   *
   * @throws the provided Error if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function findUserById(id: string): OptionAsync<User>;
   *
   * const userId = 'user_123';
   *
   * //     ┌─── User
   * //     ▼
   * const user = await findUserById(userId).expect(
   *   () => new UserNotFound(userId),
   * );
   *
   * const invalidId = 'invalid_id';
   *
   * const anotherUser = await findUserById(invalidId).expect(
   *   () => new UserNotFound(invalidId),
   * );
   * // Output: Uncaught exception: 'User not found: "invalid_id"'
   * ```
   */
  expect: <Exception extends globalThis.Error>(
    onNone: Thunk<Exception>,
  ) => Promise<DoNotation.Unbrand<Value>>;

  /**
   * Returns a Promise that verifies if the `Option` contains a value that passes the test implemented by the provided function.
   *
   * Resolves to `true` if the predicate is fullfiled by the wrapped value.
   * If the predicate is not fullfiled or if the resolved `Option` is `None`, returns `false`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //         ┌─── boolean
   * //         ▼
   * const isPositive = await OptionAsync.some(10).contains(num => num > 0);
   * // Output: true
   * ```
   */
  contains: (
    criteria: Predicate.Predicate<DoNotation.Unbrand<Value>>,
  ) => Promise<boolean>;

  /**
   * Returns a Promise that converts the underlying `Option` to an array.
   *
   * If the resolved `Option` is `Some`, returns an array with the value.
   * If the resolved `Option` is `None`, returns an empty array.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await OptionAsync.some(10).toArray();
   * // Output: [10]
   * ```
   */
  toArray(): Promise<Array<DoNotation.Unbrand<Value>>>;

  /**
   * Calls the function with the `OptionAsync` value, then returns the `OptionAsync` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //       ┌─── OptionAsync<number>
   * //       ▼
   * const option = OptionAsync.some(10).tap((value) => console.log(value)); // LOG: 10
   * ```
   */
  tap: (onSome: (value: DoNotation.Unbrand<Value>) => unknown) => this;
}

/**
 * `OptionAsync` represents a `Promise` that **never** rejects of an asynchronous optional value .
 * Every `OptionAsync` resolves to either `Option.Some`, containing a value, or `Option.None`, which is empty.
 *
 * An `OptionAsync` allows you to chain the same methods as an `Option`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `OptionAsync`, the Promise inside will resolve to the underlying `Option`.
 */
interface OptionAsyncTrait {
  resource<$Resource>(resource: $Resource): OptionAsync.Resource<$Resource>;

  /**
   * Constructs an `OptionAsync` that resolves to an `Option.Some` containing a value.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //       ┌─── OptionAsync<number>
   * //       ▼
   * const option = OptionAsync.some(10);
   * // Output: Some(10)
   * ```
   */
  some: <Value extends {}>(value: Value) => OptionAsync<Value>;

  /**
   * @alias
   * Alias of `OptionAsync.some` - constructs an `OptionAsync` that resolves to a `Some` `Option` containing a value.
   *
   * Useful to indicate the creation of an `OptionAsync` that is immediately going to be processed.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare const divisor: number;
   *
   * //       ┌─── OptionAsync<number>
   * //       ▼
   * const option = OptionAsync.of(divisor)
   *   .filter((number) => number > 0)
   *   .map((number) => 10 / number);
   * ```
   */
  of: <Value extends {}>(value: Value) => OptionAsync<Value>;

  /**
   * Constructs an `OptionAsync` that resolves to a `None` `Option`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * function rateLimit(clientId: ClientId, ip: IpAddress): OptionAsync<ClientId> {
   *   const attempts = cache.get(`ratelimit:${clientId}:${ip}`)
   *
   *   if (attempts.total > 10) {
   *     return OptionAsync.none();
   *   }
   *
   *   return OptionAsync.some(clientId);
   * }
   * ```
   */
  none: <Value = never>() => OptionAsync<NonNullable<Value>>;

  /**
   * Constructs an `OptionAsync` from a nullable value.
   *
   * If the value is `null` or `undefined`, resolves to an `Option.None`.
   * Otherwise, resolves to an `Option.Some` with the value.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare const user: User | null
   *
   * //       ┌─── OptionAsync<User>
   * //       ▼
   * const option = OptionAsync.fromNullable(user);
   * ```
   */
  fromNullable: <Value>(
    value: Nullable<Value>,
  ) => OptionAsync<NonNullable<Value>>;

  /**
   * Constructs an `OptionAsync` from a _falsy_ value.
   *
   * If the value is _falsy_, resolves to a `None`.
   * Otherwise, resolves to a `Some` with the value.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * function getEnv(variable: string): string {
   *   return process.env[variable] ?? '';
   * }
   *
   * //       ┌─── OptionAsync<string>
   * //       ▼
   * const option = OptionAsync.fromFalsy(getEnv('BASE_URL'));
   * ```
   */
  fromFalsy: <Value>(
    value: Value | Falsy,
  ) => OptionAsync<Exclude<NonNullable<Value>, Falsy>>;

  /**
   * Converts an `Option` to an `OptionAsync`.
   *
   * Wraps the synchronous `Option` in an `OptionAsync` that immediately resolves to the provided `Option`.
   *
   * @example
   * ```ts
   * import { Option, OptionAsync } from 'funkcia';
   *
   * //       ┌─── OptionAsync<number>
   * //       ▼
   * const option = OptionAsync.fromOption(Option.some(1));
   * // Output: OptionAsync<number>
   * ```
   */
  fromOption: <Value>(option: Option<Value>) => OptionAsync<Value>;

  /**
   * Converts a `Result` to an `OptionAsync`.
   *
   * If the `Result` is `Ok` and has a value, returns an `OptionAsync` that resolves to `Option.Some`.
   * If the `Result` is `Error` or has no value, returns an `OptionAsync` that resolves to `Option.None`.
   *
   * @example
   * ```ts
   * import { OptionAsync, Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, NoValueError>;
   *
   * //       ┌─── OptionAsync<User>
   * //       ▼
   * const option = OptionAsync.fromResult(findUserById('user_123'));
   * // Output: OptionAsync<User>
   * ```
   */
  fromResult: <Value, Error>(
    result: Result<Value, Error>,
  ) => OptionAsync<Value>;

  /**
   * Converts a `ResultAsync` to an `OptionAsync`.
   *
   * If the `ResultAsync` resolves to `Result.Ok`, returns an `OptionAsync.Some`.
   * If the `ResultAsync` resolves to `Result.Error`, returns an `OptionAsync.None`.
   *
   * @example
   * ```ts
   * import { OptionAsync, ResultAsync } from 'funkcia';
   *
   * declare function readFile(path: string): ResultAsync<string, FileNotFoundError>;
   *
   * //       ┌─── OptionAsync<string>
   * //       ▼
   * const option = OptionAsync.fromResultAsync(readFile('data.json'));
   * // Output: OptionAsync<string>
   * ```
   */
  fromResultAsync: <Value, Error>(
    resultAsync: ResultAsync<Value, Error>,
  ) => OptionAsync<Value>;

  /**
   * Initiates a `Do-notation` for the `OptionAsync` type, allowing to write code
   * in a more declarative style, similar to the "do notation" in other programming languages.
   * It provides a way to define variables and perform operations on them
   * using functions like `bind` and `let`, piping the returned values into a context object.
   *
   * Within the `Do` scope, you can use the `bind` function to bind a value to a variable.
   * The `bind` function takes two arguments: the name of the variable and a function that returns an `OptionAsync` to be bound.
   * If the returned `OptionAsync` resolves to `Option.Some`, the value is assigned to the variable in the context object.
   * If the returned `OptionAsync` resolves to `Option.None`, the parent `OptionAsync` running the `Do` simulation resolves to an `Option.None`.
   *
   * You can also use the `let` function to bind a simple value to a variable.
   * The `let` function takes two arguments: the name of the variable and a function that returns a value to be bound.
   * You can return any value from the function, like a `string`, `number`, `boolean` etc,
   * and it will be assigned to the variable in the context object.
   * If the resolves value is `null` or `undefined`, the parent `OptionAsync` running the `Do` simulation resolves to an `Option.None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function findUserById(id: string): OptionAsync<User>;
   *
   * declare function getUserScore(user: User): OptionAsync<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── OptionAsync<UserLevel>
   * //        ▼
   * const userLevel = OptionAsync.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user)) // getUserScore is dependent on findUserById result
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  get Do(): OptionAsync<DoNotation>;

  /**
   * Constructs an `OptionAsync` from a `Promise` that may reject.
   *
   * If the promise rejects, or resolves to `null` or `undefined`, resolves to an `Option.None`.
   * Otherwise, resolves to an `Option.Some` with the value.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<User | null>
   *
   * //      ┌─── OptionAsync<User>
   * //      ▼
   * const option = OptionAsync.try(() => findUserById('user_123'));
   * // Output: OptionAsync<User>
   * ```
   */
  try<Value>(
    promise: () => PromiseLike<Value>,
  ): OptionAsync<NonNullable<Value>>;

  /**
   * Resolves to the first `OptionAsync.Some` value in the iterable. If all values are `OptionAsync.None`, resolves to `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * interface Contacts {
   *   primary: OptionAsync<string>;
   *   secondary: OptionAsync<string>;
   *   emergency: OptionAsync<string>;
   * }
   *
   * declare const contacts: Contacts;
   *
   * //       ┌─── OptionAsync<string>
   * //       ▼
   * const option = OptionAsync.firstSomeOf([
   *   contacts.primary,
   *   contacts.secondary,
   *   contacts.emergency,
   * ]);
   * ```
   */
  firstSomeOf: <Value>(
    asyncOptions: Iterable<OptionAsync<Value>>,
  ) => OptionAsync<Value>;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `OptionAsync` that resolves to a `Some` narrowing down the value to the provided type predicate if the predicate is fulfilled.
   *
   * If the test fails, the `OptionAsync` resolves to a `None` instead.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //         ┌─── (shape: Shape) => OptionAsync<Circle>
   * //         ▼
   * const ensureCircle = OptionAsync.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── OptionAsync<Circle>
   * //       ▼
   * const option = ensureCircle(input);
   * ```
   */
  predicate<Criteria extends Predicate.Guard<any, any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => OptionAsync<Predicate.Guarded<Criteria>>;

  predicate<Criteria extends Predicate.Predicate<any>>(
    criteria: Criteria,
  ): (...args: Parameters<Criteria>) => OptionAsync<Parameters<Criteria>[0]>;

  /**
   * Declares a promise that must return an `Option`, returning a new function that returns an `OptionAsync` and never rejects.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Option<User>>
   *
   * //      ┌─── OptionAsync<User>
   * //      ▼
   * const option = OptionAsync.fn(() => findUserById('user_123'));
   * // Output: OptionAsync<User>
   * ```
   */
  fn<Args extends readonly unknown[], $Option extends Option.Any>(
    promise: (...args: Args) => Promise<$Option>,
  ): (...args: Args) => OptionAsync<OptionAsync.Unwrap<$Option>>;

  /**
   * Returns a function that evaluates an *async* generator when called with the defined arguments,
   * early returning when an `Option.None` is propagated or returning the `OptionAsync` returned by the generator.
   *
   * - Each `yield*` automatically awaits and unwraps the `OptionAsync` value or propagates `None`.
   * - If any operation resolves to `Option.None`, the entire generator exits early.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare const safeReadFile: (path: string) => OptionAsync<string>;
   * declare const safeWriteFile: (path: string, content: string) => OptionAsync<string>;
   *
   * //          ┌─── (output: string, pathA: string, pathB: string) => OptionAsync<string>
   * //          ▼
   * const safeMergeFiles = OptionAsync.fn(async function* (output: string, pathA: string, pathB: string) {
   *   const fileA: string = yield* safeReadFile(pathA);
   *   const fileB: string = yield* safeReadFile(pathB);
   *
   *   return safeWriteFile(output, `${fileA}\n${fileB}`);
   * });
   *
   * const mergedContent = safeMergeFiles('report.txt', 'q1.txt', 'q2.txt');
   * // Output: OptionAsync<string>
   * ```
   */
  fn<Args extends readonly unknown[], $Option extends Option.Any>(
    generator: (...args: Args) => AsyncGenerator<never, $Option>,
  ): (...args: Args) => OptionAsync<OptionAsync.Unwrap<$Option>>;

  /**
   * Evaluates an **async* generator early returning when an `Option.None` is propagated
   * or returning the `OptionAsync` returned by the generator.
   *
   * - Each `yield*` automatically awaits and unwraps the `OptionAsync` value or propagates `None`.
   * - If any operation resolves to `Option.None`, the entire generator exits early.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare const safeReadFile: (path: string) => OptionAsync<string>;
   * declare const safeWriteFile: (path: string, content: string) => OptionAsync<string>;
   *
   * //          ┌─── OptionAsync<string>
   * //          ▼
   * const mergedContent = OptionAsync.use(async function* () {
   *   const fileA: string = yield* safeReadFile('data.txt');
   *   const fileB: string = yield* safeReadFile('non-existent-file.txt'); // returns OptionAsync.None immediately
   *
   *   return safeWriteFile('output.txt', `${fileA}\n${fileB}`); // doesn't run
   * });
   * // Output: OptionAsync<never>
   * ```
   */
  use<$Option extends Option.Any>(
    generator: () => AsyncGenerator<never, $Option>,
  ): OptionAsync<OptionAsync.Unwrap<$Option>>;

  /**
   * Given an array of `OptionAsync`s, returns an array containing only the values inside `Some`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await OptionAsync.values([
   *   OptionAsync.some(1),
   *   OptionAsync.none<number>(),
   *   OptionAsync.some(3),
   * ]);
   * // Output: [1, 3]
   * ```
   */
  values: <Value>(
    asyncOptions: Array<OptionAsync<Value>>,
  ) => Promise<Array<DoNotation.Unbrand<Value>>>;
}

export declare namespace OptionAsync {
  type Any = OptionAsync<any>;

  interface Match<Value, Output, NoneOutput> {
    Some: (value: Value) => Output;
    None: () => NoneOutput;
  }

  interface Resource<Resource> {
    run<Output>(
      fn: (resource: Resource) => PromiseLike<Output>,
    ): OptionAsync<Output>;
  }

  type Unwrap<Output> = Output extends Option<infer Value>
    ? Value
    : Output extends OptionAsync<infer Value>
    ? Value
    : never;
}
