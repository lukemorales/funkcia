// eslint-disable-next-line import/no-cycle

import type { DoNotation } from './do-notation';
import type { NoValueError } from './exceptions';
import { UnwrapError } from './exceptions';
import {
  alwaysFalse,
  alwaysNull,
  alwaysUndefined,
  identity,
  invoke,
  lazyCompute,
} from './functions';
import { FunkciaStore } from './funkcia-store';
import { Queue } from './internals/queue';
import type { Falsy, Nullable, Task, Thunk, Tuple } from './internals/types';
import type { Option } from './option';
import type { Predicate } from './predicate';
import type { AsyncResult } from './result.async';

const OptionRef = lazyCompute(() => FunkciaStore.Option);

/**
 * `AsyncOption` represents a `Promise` that **never** rejects of an asynchronous optional value .
 * Every `AsyncOption` resolves to either `Option.Some`, containing a value, or `Option.None`, which is empty.
 *
 * An `AsyncOption` allows you to chain the same methods as an `Option`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `AsyncOption`, the Promise inside will resolve to the underlying `Option`.
 */
export class AsyncOption<Value>
  implements
    DoNotation.Signed<'AsyncOption', Value>,
    PromiseLike<Option<Value>>
{
  readonly #promise: Task<Option<Value>>;

  readonly #q: Queue<Option<Value>> | undefined;

  private constructor(
    promise: Task<Option<Value>>,
    queue?: Queue<Option<Value>>,
  ) {
    this.#promise = promise;
    this.#q = queue;
  }

  // ------------------------
  // #region: CONSTRUCTORS---
  // ------------------------

  /**
   * Constructs an `AsyncOption` that resolves to an `Option.Some` containing a value.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //       ┌─── AsyncOption<number>
   * //       ▼
   * const option = AsyncOption.some(10);
   * // Output: Some(10)
   * ```
   */
  static some<Value extends {}>(value: Value): AsyncOption<Value> {
    return new AsyncOption(() => Promise.resolve(OptionRef.value.some(value)));
  }

  /**
   * @alias
   * Alias of `AsyncOption.some` - constructs an `AsyncOption` that resolves to a `Some` `Option` containing a value.
   *
   * Useful to indicate the creation of an `AsyncOption` that is immediately going to be processed.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare const divisor: number;
   *
   * //       ┌─── AsyncOption<number>
   * //       ▼
   * const option = AsyncOption.of(divisor)
   *   .filter((number) => number > 0)
   *   .map((number) => 10 / number);
   * ```
   */
  static of: <Value extends {}>(value: Value) => AsyncOption<Value> = // eslint-disable-line @typescript-eslint/no-shadow
    AsyncOption.some;

  /**
   * Constructs an `AsyncOption` that resolves to a `None` `Option`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * function rateLimit(clientId: ClientId, ip: IpAddress): AsyncOption<ClientId> {
   *   const attempts = cache.get(`ratelimit:${clientId}:${ip}`)
   *
   *   if (attempts.total > 10) {
   *     return AsyncOption.none();
   *   }
   *
   *   return AsyncOption.some(clientId);
   * }
   * ```
   */
  static none<Value = never>(): AsyncOption<NonNullable<Value>> {
    return new AsyncOption(() =>
      Promise.resolve(OptionRef.value.none<NonNullable<Value>>()),
    );
  }

  /**
   * Constructs an `AsyncOption` from a nullable value.
   *
   * If the value is `null` or `undefined`, resolves to an `Option.None`.
   * Otherwise, resolves to an `Option.Some` with the value.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare const user: User | null
   *
   * //       ┌─── AsyncOption<User>
   * //       ▼
   * const option = AsyncOption.fromNullable(user);
   * ```
   */
  static fromNullable<Value>(
    value: Nullable<Value>,
  ): AsyncOption<NonNullable<Value>> {
    return new AsyncOption(() =>
      Promise.resolve(OptionRef.value.fromNullable(value)),
    );
  }

  /**
   * Constructs an `AsyncOption` from a _falsy_ value.
   *
   * If the value is _falsy_, resolves to a `None`.
   * Otherwise, resolves to a `Some` with the value.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * function getEnv(variable: string): string {
   *   return process.env[variable] ?? '';
   * }
   *
   * //       ┌─── AsyncOption<string>
   * //       ▼
   * const option = AsyncOption.fromFalsy(getEnv('BASE_URL'));
   * ```
   */
  static fromFalsy<Value>(
    value: Value | Falsy,
  ): AsyncOption<Exclude<NonNullable<Value>, Falsy>> {
    return (value ? AsyncOption.some(value) : AsyncOption.none()) as never;
  }

  /**
   * Constructs an `AsyncOption` from a `Promise` that resolves to an `Option`, but may reject.
   *
   * If the promise rejects, it resolves to an `Option.None`.
   * Otherwise, resolves to the returned `Option.Some`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Option<User>>
   *
   * //      ┌─── AsyncOption<User>
   * //      ▼
   * const option = AsyncOption.try(() => findUserById('user_123'));
   * // Output: Promise<Some(User)>
   * ```
   */
  static try<Value extends Option<any>>(
    promise: Task<Value>,
  ): AsyncOption<AsyncOption.Unwrap<Value>>;

  /**
   * Constructs an `AsyncOption` from a `Promise` that may reject.
   *
   * If the promise rejects, or resolves to `null` or `undefined`, resolves to an `Option.None`.
   * Otherwise, resolves to an `Option.Some` with the value.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<User | null>
   *
   * //      ┌─── AsyncOption<User>
   * //      ▼
   * const option = AsyncOption.try(() => findUserById('user_123'));
   * // Output: Promise<Some(User)>
   * ```
   */
  static try<Value>(promise: Task<Value>): AsyncOption<NonNullable<Value>>;

  static try(promise: Task<any>): AsyncOption<any> {
    return new AsyncOption(async () => {
      try {
        return await promise().then((value) =>
          OptionRef.value.is(value)
            ? value
            : OptionRef.value.fromNullable(value),
        );
      } catch {
        return OptionRef.value.none();
      }
    });
  }

  /**
   * Constructs an `AsyncOption` from a `Promise` that returns an `Option`, and never rejects.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Option<User>>
   *
   * //      ┌─── AsyncOption<User>
   * //      ▼
   * const option = AsyncOption.promise(() => findUserById('user_123'));
   * // Output: Promise<Some(User)>
   * ```
   */
  static promise<$Option extends Option<any>>(
    promise: Task<$Option>,
  ): AsyncOption<AsyncOption.Unwrap<$Option>> {
    return new AsyncOption(promise);
  }

  /**
   * Lifts a `Promise` that resolves to an `Option` to a function that returns an `AsyncOption`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Option<User>>
   *
   * //           ┌─── (id: string) => AsyncOption<User>
   * //           ▼
   * const safeFindUserById = AsyncOption.liftPromise(findUserById);
   *
   * //     ┌─── AsyncOption<User>
   * //     ▼
   * const user = safeFindUserById('user_123');
   * ```
   */
  static liftPromise<Args extends readonly unknown[], Value>(
    promise: (...args: Args) => Promise<Option<Value>>,
  ): (...args: Args) => AsyncOption<NonNullable<Value>>;

  /**
   * Lifts a `Promise` that resolves to a nullable value to a function that returns an `AsyncOption`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<User | null>
   *
   * //           ┌─── (id: string) => AsyncOption<User>
   * //           ▼
   * const safeFindUserById = AsyncOption.liftPromise(findUserById);
   *
   * //     ┌─── AsyncOption<User>
   * //     ▼
   * const user = safeFindUserById('user_123');
   * ```
   */
  static liftPromise<Args extends readonly unknown[], Value>(
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    promise: (...args: Args) => Promise<Nullable<Value>>,
  ): (...args: Args) => AsyncOption<NonNullable<Value>>;

  static liftPromise<Args extends readonly unknown[], Value>(
    promise: (...args: Args) => Promise<Nullable<Value> | Option<Value>>,
  ): (...args: Args) => AsyncOption<NonNullable<Value>> {
    return (...args) =>
      new AsyncOption(
        () =>
          promise(...args).then(
            (value) =>
              OptionRef.value.is(value)
                ? value
                : OptionRef.value.fromNullable(value),
            OptionRef.value.none,
          ) as never,
      );
  }

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `AsyncOption` that resolves to a `Some` narrowing down the value to the provided type predicate if the predicate is fulfilled.
   *
   * If the test fails, the `AsyncOption` resolves to a `None` instead.
   *
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //         ┌─── (shape: Shape) => AsyncOption<Circle>
   * //         ▼
   * const ensureCircle = AsyncOption.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── AsyncOption<Circle>
   * //       ▼
   * const option = ensureCircle(input);
   * ```
   */
  static predicate<Criteria extends Predicate.Guard<any, any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => AsyncOption<Predicate.Guarded<Criteria>>;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `AsyncOption` that resolves to a `Some` with the value tested if the predicate is fulfilled.
   *
   * If the test fails, the `AsyncOption` resolves to a `None` instead.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   *
   * //          ┌─── (value: number) => AsyncOption<number>
   * //          ▼
   * const ensurePositive = AsyncOption.predicate(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── AsyncOption<number>
   * //       ▼
   * const option = ensurePositive(input);
   * ```
   */
  static predicate<Criteria extends Predicate.Predicate<any>>(
    criteria: Criteria,
  ): (...args: Parameters<Criteria>) => AsyncOption<Parameters<Criteria>[0]>;

  static predicate(
    criteria: Predicate.Predicate<any>,
  ): (input: any) => AsyncOption<any> {
    return (input) => AsyncOption.of(input).filter(criteria);
  }

  /**
   * Evaluates an **async*& generator early returning when an `Option.None` is propagated
   * or returning the `AsyncOption` returned by the generator.
   *
   * `yield*` an `AsyncOption<Value>` unwraps values and propagates `Option.None`s.
   *
   * If the value is `Option.None`, then it will return an `AsyncOption` that resolves to `Option.None`
   * from the enclosing function.
   *
   * If applied to an `AsyncOption` that resolves to `Option.Some<U>`, then it will unwrap the value to evaluate `U`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * const safeParseInt = AsyncOption.liftFun(parseInt)
   *
   * //       ┌─── AsyncOption<number>
   * //       ▼
   * const option = AsyncOption.relay(async function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns AsyncOption.None immediately
   *
   *   return AsyncOption.some(x + y); // doesn't run
   * });
   * // Output: Promise<None>
   * ```
   */
  static relay<Value extends {}>(
    generator: () => AsyncGenerator<never, Option<Value>>,
  ): AsyncOption<Value> {
    return new AsyncOption(async () => {
      const { done, value } = await generator().next();

      return done ? value : OptionRef.value.none();
    });
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: COMBINATORS---
  // -----------------------

  /**
   * Given an array of `AsyncOption`s, returns an array containing only the values inside `Some`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await AsyncOption.values([
   *   AsyncOption.some(1),
   *   AsyncOption.none<number>(),
   *   AsyncOption.some(3),
   * ]);
   * // Output: [1, 3]
   * ```
   */
  static async values<Value>(
    asyncOptions: Array<AsyncOption<Value>>,
  ): Promise<Array<DoNotation.Unsign<Value>>> {
    return Promise.all(asyncOptions).then(OptionRef.value.values);
  }

  /**
   * Combines two `AsyncOption`s into a single `AsyncOption` containing a tuple of their values,
   * if both `AsyncOption`s are `Some` variants, otherwise, returns `None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * const first = AsyncOption.some('hello');
   * const second = AsyncOption.some('world');
   *
   * //       ┌─── AsyncOption<[string, string]>
   * //       ▼
   * const strings = first.zip(second);
   * // Output: Promise<Some(['hello', 'world'])>
   * ```
   */
  zip<Value2 extends {}>(
    that: AsyncOption<Value2>,
  ): AsyncOption<Tuple<DoNotation.Unsign<Value>, DoNotation.Unsign<Value2>>> {
    return this.andThen((a) => that.map((b) => [a, b])) as never;
  }

  /**
   * Combines two `AsyncOption`s into a single `AsyncOption`. The new value is produced
   * by applying the given function to both values, if both `AsyncOption`s are `Some` variants,
   * otherwise, returns `None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   *
   * const first = AsyncOption.some('hello');
   * const second = AsyncOption.some('world');
   *
   * //        ┌─── AsyncOption<string>
   * //        ▼
   * const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
   * // Output: Promise<Some('hello world')>
   * ```
   */
  zipWith<Value2 extends {}, Output extends {}>(
    that: AsyncOption<Value2>,
    fn: (
      arg0: DoNotation.Unsign<Value>,
      arg1: DoNotation.Unsign<Value2>,
    ) => Output,
  ): AsyncOption<Output> {
    return this.zip(that).map((options) => fn(...options) as never) as never;
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: DO-NOTATION---
  // -----------------------

  /**
   * Initiates a `Do-notation` for the `AsyncOption` type, allowing to write code
   * in a more declarative style, similar to the “do notation” in other programming languages.
   * It provides a way to define variables and perform operations on them
   * using functions like `bind` and `let`, piping the returned values into a context object.
   *
   * Within the `Do` scope, you can use the `bind` function to bind a value to a variable.
   * The `bind` function takes two arguments: the name of the variable and a function that returns an `AsyncOption` to be bound.
   * If the returned `AsyncOption` resolves to `Option.Some`, the value is assigned to the variable in the context object.
   * If the returned `AsyncOption` resolves to `Option.None`, the parent `AsyncOption` running the `Do` simulation resolves to an `Option.None`.
   *
   * You can also use the `let` function to bind a simple value to a variable.
   * The `let` function takes two arguments: the name of the variable and a function that returns a value to be bound.
   * You can return any value from the function, like a `string`, `number`, `boolean` etc,
   * and it will be assigned to the variable in the context object.
   * If the resolves value is `null` or `undefined`, the parent `AsyncOption` running the `Do` simulation resolves to an `Option.None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function getUser(id: string): AsyncOption<User>;
   *
   * declare function getUserScore(user: User): AsyncOption<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── AsyncOption<UserLevel>
   * //        ▼
   * const userLevel = AsyncOption.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user)) // getUserScore is dependent on getUser result
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  static get Do(): AsyncOption<DoNotation.Sign> {
    return new AsyncOption(() => Promise.resolve(OptionRef.value.Do));
  }

  /**
   * Initiates a `Do-notation` with the current `AsyncOption`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function getUserScore(user: User): AsyncOption<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * declare const user: AsyncOption<User>;
   *
   * //        ┌─── AsyncOption<UserLevel>
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
  ): AsyncOption<DoNotation.Sign<{ [K in Key]: Value }>> {
    return AsyncOption.Do.bind(key as never, () => this as never) as never;
  }

  /**
   * Binds an `AsyncOption` to the context object in a `Do-notation`.
   *
   * If the `AsyncOption` resolves to `Some`, the value is assigned to the key in the context object.
   * If the `AsyncOption` resolves to `None`, the parent `AsyncOption` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function getUser(id: string): AsyncOption<User>;
   *
   * declare function getUserScore(user: User): AsyncOption<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── AsyncOption<UserLevel>
   * //        ▼
   * const userLevel = AsyncOption.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   * ```
   */
  bind<Key extends string, U extends {}>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'AsyncOption', 'bind'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unsign<Value>) => AsyncOption<U>,
  ): AsyncOption<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : U;
    }>
  > {
    return (this as AsyncOption<Value>).andThen((ctx) =>
      fn(ctx).map(
        (value) =>
          // eslint-disable-next-line prefer-object-spread
          Object.assign({ [key]: value }, ctx) as {},
      ),
    ) as never;
  }

  /**
   * Binds a non-rejecting promise to the context object in a `Do-notation`.
   *
   * If the promise resolves to a non-nullable value, the value is assigned to the key in the context object.
   * If the promise resolves to `null` or `undefined`, the parent `AsyncOption` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * const option = AsyncOption.Do
   *   .let('a', () => 10)
   * //            ┌─── { a: number }
   * //            ▼
   *   .let('b', (ctx) => Promise.resolve(ctx.a * 2))
   *   .map((ctx) => a + b);
   * //       ▲
   * //       └─── { a: number; b: number }
   * ```
   */
  let<Key extends string, U extends {}>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'AsyncOption', 'let'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unsign<Value>) => Promise<U>,
  ): AsyncOption<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : U;
    }>
  > {
    // @ts-expect-error the compiler is complaining because of DoNotation check in argument `this`
    return (this as AsyncOption<Value>).bind(
      key,
      (ctx) => invoke(AsyncOption.liftPromise(() => fn(ctx))) as never,
    );
  }

  // -----------------------
  // #endregion ------------

  // -----------------------
  // #region: CONVERSIONS---
  // -----------------------

  /**
   * Attaches a callback for the resolution of the Promise inside the `AsyncOption`.
   */
  async then<Fulfilled = Value>(
    onfulfilled?:
      | ((value: Option<Value>) => Fulfilled | PromiseLike<Fulfilled>)
      | null,
  ): Promise<Fulfilled> {
    return this.#promise().then(
      (option) => onfulfilled?.(this.#q?.execute(option) ?? option) as never,
    );
  }

  /**
   * Returns a promise that compares the underlying `Option` against the possible patterns,
   * and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncOption<string>;
   *
   * declare function parseJsonFile(contents: string): AsyncOption<FileContent>;
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
  async match<Output, NoneOutput>(
    cases: AsyncOption.Match<DoNotation.Unsign<Value>, NoneOutput, Output>,
  ): Promise<NoneOutput | Output> {
    return this.then((option) => option.match(cases));
  }

  /**
   * Returns a promise that unwraps the underlying `Option` value.
   *
   * @throws `UnwrapError` if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //     ┌─── User
   * //     ▼
   * const user = await AsyncOption.some(databaseUser).unwrap();
   *
   * const team = await AsyncOption.none().unwrap();
   * // Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
   * ```
   */
  async unwrap(): Promise<DoNotation.Unsign<Value>> {
    return this.unwrapOr(() => {
      throw new UnwrapError('Option');
    });
  }

  /**
   * Returns a promise that unwraps the underlying `Option` value.
   *
   * If the promise resolves to an `Option.None`, returns the result of the provided callback.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //       ┌─── string
   * //       ▼
   * const baseUrl = await AsyncOption.some(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://funkcia.lukemorales.io'
   *
   * const apiKey = await AsyncOption.none()
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * // Output: 'sk_test_9FK7CiUnKaU'
   * ```
   */
  async unwrapOr(
    onNone: Thunk<DoNotation.Unsign<Value>>,
  ): Promise<DoNotation.Unsign<Value>> {
    return this.match({ Some: identity, None: onNone });
  }

  /**
   * Returns a promise that unwraps the value of the underlying `Option`
   * if it is an `Option.Some`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = await AsyncOption.some(databaseUser).unwrapOrNull();
   * ```
   */
  async unwrapOrNull(): Promise<DoNotation.Unsign<Value> | null> {
    return this.unwrapOr(alwaysNull as never);
  }

  /**
   * Returns a promise that unwraps the value of the underlying `Option`
   * if it is an `Option.Some`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //     ┌─── User | undefined
   * //     ▼
   * const user = await AsyncOption.some(databaseUser).unwrapOrUndefined();
   * ```
   */
  async unwrapOrUndefined(): Promise<DoNotation.Unsign<Value> | undefined> {
    return this.unwrapOr(alwaysUndefined as never);
  }

  /**
   * Returns a promise that unwraps the underlying `Option` value.
   *
   * @throws the provided Error if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function findUserById(id: string): AsyncOption<User>;
   *
   * //     ┌─── User
   * //     ▼
   * const user = await findUserById('user_123').expect(
   *   () => new UserNotFound(userId),
   * );
   *
   * const anotherUser = await findUserById('invalid_id').expect(
   *   () => new UserNotFound('team_01'),
   * );
   * // Output: Uncaught exception: 'User not found: "user_123"'
   * ```
   */
  async expect<Exception extends globalThis.Error>(
    onNone: Thunk<Exception>,
  ): Promise<DoNotation.Unsign<Value>> {
    return this.unwrapOr(() => {
      throw onNone();
    });
  }

  /**
   * Returns a Promise that verifies if the `Option` contains a value that passes the test implemented by the provided function.
   *
   * Resolves to `true` if the predicate is fullfiled by the wrapped value.
   * If the predicate is not fullfiled or if the resolved `Option` is `None`, returns `false`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //         ┌─── boolean
   * //         ▼
   * const isPositive = await AsyncOption.some(10).contains(num => num > 0);
   * // Output: true
   * ```
   */
  async contains(
    criteria: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ): Promise<boolean> {
    return this.match({ Some: criteria, None: alwaysFalse });
  }

  /**
   * Converts the `AsyncOption` to an `AsyncResult`.
   *
   * If the resolved `Option` is `Some`, returns an `AsyncResult.Ok`.
   * If the resolved `Option` is `None`, returns an `AsyncResult.Error` with a `NoValueError`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncOption<string>;
   *
   * declare function parseJsonFile(contents: string): AsyncOption<FileContent>;
   *
   * //       ┌─── AsyncResult<FileContent, NoValueError>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncResult();
   * // Output: Promise<Ok(FileContent)>
   * ```
   */
  toAsyncResult(): AsyncResult<Value, NoValueError>;

  /**
   * Converts the `AsyncOption` to a `AsyncResult`.
   *
   * If the resolved `Option` is `Some`, returns an `AsyncResult.ok`.
   * If the resolved `Option` is `None`, returns an `AsyncResult.error` with the return of the provided `onNone` callback.
   *
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncOption<string>;
   *
   * declare function parseJsonFile(contents: string): AsyncOption<FileContent>;
   *
   * //       ┌─── AsyncResult<FileContent, InvalidFile>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncResult(() => new InvalidFile('data.json'));
   * // Output: Promise<Ok(FileContent)>
   * ```
   */
  toAsyncResult<Error extends {}>(
    onNone: Thunk<Error>,
  ): AsyncResult<Value, Error>;

  toAsyncResult(onNone?: Thunk<any>): AsyncResult<Value, any> {
    return FunkciaStore.AsyncResult.promise(
      () =>
        this.then(
          (option) => option.toResult(onNone as never) as never,
        ) as never,
    );
  }

  /**
   * Returns a Promise that converts the underlying `Option` to an array.
   *
   * If the resolved `Option` is `Some`, returns an array with the value.
   * If the resolved `Option` is `None`, returns an empty array.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = await AsyncOption.some(10).toArray();
   * // Output: [10]
   * ```
   */
  toArray(): Promise<Array<DoNotation.Unsign<Value>>> {
    return this.match({ Some: (value) => [value], None: () => [] });
  }

  // ---------------------------
  // #endregion ----------------

  // ---------------------------
  // #region: TRANSFORMATIONS---
  // ---------------------------

  /**
   * Applies a callback function to the value of the `AsyncOption` when it is `Some`,
   * returning a new `AsyncOption` containing the new value.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //       ┌─── AsyncOption<number>
   * //       ▼
   * const option = AsyncOption.some(10).map(number => number * 2);
   * // Output: Promise<Some(20)>
   * ```
   */
  map<Output>(
    onSome: (value: DoNotation.Unsign<Value>) => NonNullable<Output>,
  ): AsyncOption<NonNullable<Output>> {
    return new AsyncOption(
      this.#promise,
      Queue.of(this.#q).enqueue('map', onSome),
    ) as never;
  }

  /**
   * Applies a callback function to the value of the `AsyncOption` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `Option` or an `AsyncOption`, not a raw value.
   * This allows chaining multiple calls that return `AsyncOption`s together.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncOption<string>;
   *
   * declare function parseJsonFile(contents: string): Option<FileContent>;
   *
   * //       ┌─── AsyncOption<FileContent>
   * //       ▼
   * const option = readFile('data.json').andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends Option<any>>(
    onSome: (value: DoNotation.Unsign<Value>) => Output,
  ): AsyncOption<AsyncOption.Unwrap<Output>>;

  /**
   * Applies a callback function to the value of the `AsyncOption` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `Option` or an `AsyncOption`, not a raw value.
   * This allows chaining multiple calls that return `AsyncOption`s together.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncOption<string>;
   *
   * declare function parseJsonFile(contents: string): AsyncOption<FileContent>;
   *
   * //       ┌─── AsyncOption<FileContent>
   * //       ▼
   * const option = readFile('data.json').andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends AsyncOption<any>>(
    onSome: (value: DoNotation.Unsign<Value>) => Output,
  ): AsyncOption<NonNullable<AsyncOption.Unwrap<Output>>>;

  andThen<Output>(
    onSome: (
      value: DoNotation.Unsign<Value>,
    ) => Option<NonNullable<Output>> | AsyncOption<NonNullable<Output>>,
  ): AsyncOption<NonNullable<AsyncOption.Unwrap<Output>>>;

  /**
   * Applies a callback function to the value of the `AsyncOption` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `AsyncOption`, not a raw value.
   * This allows chaining multiple calls that return `AsyncOption`s together.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare function readFile(path: string): AsyncOption<string>;
   *
   * declare function parseJsonFile(contents: string): AsyncOption<FileContent>;
   *
   * //       ┌─── AsyncOption<FileContent>
   * //       ▼
   * const option = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<Output>(
    onSome: (
      value: DoNotation.Unsign<Value>,
    ) => Option<NonNullable<Output>> | AsyncOption<NonNullable<Output>>,
  ): any {
    const flattenedPromise = async () => {
      try {
        let output = onSome(await this.unwrap());
        if (OptionRef.value.is(output)) output = output.toAsyncOption();

        return await output;
      } catch {
        return AsyncOption.none();
      }
    };

    return new AsyncOption(flattenedPromise as never);
  }

  /**
   * Asserts that the `AsyncOption` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `AsyncOption`, resolving to an `Option.None` instead.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //      ┌─── AsyncOption<Circle>
   * //      ▼
   * const circle = AsyncOption.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'circle',
   * );
   * ```
   */
  filter<Output extends DoNotation.Unsign<Value>>(
    guard: Predicate.Guard<DoNotation.Unsign<Value>, Output>,
  ): AsyncOption<Output>;

  /**
   * Asserts that the `AsyncOption` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `AsyncOption`, resolving to an `Option.None` instead.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //       ┌─── AsyncOption<User>
   * //       ▼
   * const option = AsyncOption.of(user).filter((user) => user.age >= 21);
   * ```
   */
  filter(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ): AsyncOption<Value>;

  filter(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ): AsyncOption<Value> {
    return new AsyncOption(
      this.#promise,
      Queue.of(this.#q).enqueue('filter', predicate),
    );
  }

  // ---------------------
  // #endregion ----------

  // ---------------------
  // #region: FALLBACKS---
  // ---------------------

  /**
   * Replaces the current `AsyncOption` with the provided fallback `AsyncOption` when it is `None`.
   *
   * If the current `AsyncOption` is `Some`, it returns the current `AsyncOption`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * // Output: Promise<Some('Paul')>
   * const option = AsyncOption.some('Paul')
   *   .or(() => AsyncOption.some('John'))
   *
   *
   * // Output: Promise<Some('John')>
   * const greeting = AsyncOption.none()
   *   .or(() => AsyncOption.some('John'))
   * ```
   */
  or(onNone: Thunk<AsyncOption<Value>>): AsyncOption<Value> {
    return new AsyncOption(() =>
      this.then((option) => (option.isSome() ? option : onNone())),
    );
  }

  /**
   * Resolves to the first `AsyncOption.Some` value in the iterable. If all values are `AsyncOption.None`, resolves to `None`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * interface Contacts {
   *   primary: AsyncOption<string>;
   *   secondary: AsyncOption<string>;
   *   emergency: AsyncOption<string>;
   * }
   *
   * declare const contacts: Contacts;
   *
   * //       ┌─── AsyncOption<string>
   * //       ▼
   * const option = AsyncOption.firstSomeOf([
   *   contacts.primary,
   *   contacts.secondary,
   *   contacts.emergency,
   * ]);
   * ```
   */
  static firstSomeOf<Value>(
    asyncOptions: Iterable<AsyncOption<Value>>,
  ): AsyncOption<Value> {
    return new AsyncOption(async () =>
      Promise.all(asyncOptions).then((options) =>
        OptionRef.value.firstSomeOf(options),
      ),
    );
  }

  // -----------------
  // #endregion ------

  // -----------------------
  // #region: COMPARISONS---
  // -----------------------

  /**
   * Asserts that an *unknown* value is an `AsyncOption`.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * declare const maybeAnAsyncOptionWithUser: unknown;
   *
   * if (AsyncOption.is(maybeAnAsyncOptionWithUser)) {
   * //                     ┌─── AsyncOption<unknown>
   * //                     ▼
   *   const user = maybeAnAsyncOptionWithUser.filter(isUser);
   * //        ▲
   * //        └─── AsyncOption<User>
   * }
   */
  static is(value: unknown): value is AsyncOption<unknown> {
    return value instanceof AsyncOption;
  }

  // -----------------
  // #endregion ------

  // -----------------
  // #region: OTHER---
  // -----------------

  /**
   * Calls the function with the `AsyncOption` value, then returns the `AsyncOption` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { AsyncOption } from 'funkcia';
   *
   * //       ┌─── AsyncOption<number>
   * //       ▼
   * const option = AsyncOption.some(10).tap((value) => console.log(value)); // LOG: 10
   * ```
   */
  tap(onSome: (value: DoNotation.Unsign<Value>) => unknown): this {
    return new AsyncOption(() =>
      this.then(async (_option) => {
        const option = this.#q?.execute(_option) ?? _option;

        if (option.isSome()) await onSome(option.unwrap());

        return option;
      }),
    ) as never;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<
    never,
    DoNotation.Unsign<Value>
  > {
    return yield* await this;
  }

  protected [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'AsyncOption(Promise<Option>)';
  }

  // ----------------
  // #endregion -----
}

FunkciaStore.register(AsyncOption);

declare namespace AsyncOption {
  type Unwrap<Output> = Output extends Option<infer Value>
    ? Value
    : Output extends AsyncOption<infer Value>
    ? Value
    : never;

  interface Match<Value, Output, NoneOutput> {
    Some: (value: Value) => Output;
    None: () => NoneOutput;
  }
}
