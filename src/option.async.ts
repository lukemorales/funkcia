/* eslint-disable import/export, @typescript-eslint/method-signature-style, import/no-cycle */

import type { DoNotation } from './do-notation';
import type { NoValueError } from './exceptions';
import { invoke } from './functions';
import { FunkciaStore } from './funkcia-store';
import type {
  $AsyncIterable,
  Falsy,
  Nullable,
  Task,
  Thunk,
  Tuple,
  UnaryFn,
} from './internals/types';
import { emptyObject } from './internals/utils';
import { Option } from './option';
import { isOptionAsync, OptionAsyncProxy } from './option.async.proxy';
import type { Predicate } from './predicate';
import type { ResultAsync } from './result.async';

/**
 * `OptionAsync` represents a `Promise` that **never** rejects of an asynchronous optional value .
 * Every `OptionAsync` resolves to either `Option.Some`, containing a value, or `Option.None`, which is empty.
 *
 * An `OptionAsync` allows you to chain the same methods as an `Option`, but in an asynchronous context.
 * This empowers you to write code and manipulate data in a seamless, synchronous-like manner without worrying about awaiting `Promise`s.
 *
 * By awaiting the `OptionAsync`, the Promise inside will resolve to the underlying `Option`.
 */
export const OptionAsync: OptionAsyncTrait = invoke((): OptionAsyncTrait => {
  const some: OptionAsyncTrait['some'] = (value) =>
    OptionAsyncProxy(() => Promise.resolve(FunkciaStore.Some(value))) as never;

  const none: OptionAsyncTrait['none'] = () =>
    OptionAsyncProxy(() =>
      Promise.resolve(FunkciaStore.None() as never),
    ) as never;

  const tryCatch: OptionAsyncTrait['try'] = (promise: any) =>
    OptionAsyncProxy(async () => {
      try {
        return await (promise as Task<any>)().then(
          (value) =>
            (Option.is(value) ? value : Option.fromNullable(value)) as never,
        );
      } catch {
        return FunkciaStore.None() as never;
      }
    });

  const use: OptionAsyncTrait['use'] = (generator) =>
    OptionAsyncProxy(async () => {
      const { done, value } = await generator().next();

      return (done ? value : FunkciaStore.None()) as Option<any>;
    });

  return {
    some,
    of: some,
    none,
    fromNullable(value) {
      return (value != null ? some(value) : none()) as never;
    },
    fromFalsy(value) {
      return (value ? some(value) : none()) as never;
    },
    try: tryCatch,
    promise(promise: Task<Option<any>>) {
      return OptionAsyncProxy(promise);
    },
    enhance(promise) {
      return (...args: any) =>
        tryCatch(() => promise(...args) as never) as never;
    },
    predicate(criteria: UnaryFn<any, boolean>) {
      return (input: any) => some(input).filter(criteria);
    },
    firstSomeOf(asyncOptions) {
      return OptionAsyncProxy(() =>
        Promise.all(asyncOptions).then((options) => {
          for (const option of options) {
            if (option.isSome()) return option as never;
          }

          return FunkciaStore.None() as never;
        }),
      );
    },
    async values(asyncOptions) {
      return Promise.all(asyncOptions).then((options) =>
        options.reduce<any[]>((acc, option) => {
          if (option.isSome()) acc.push(option.unwrap());

          return acc;
        }, []),
      ) as never;
    },
    get Do() {
      return OptionAsyncProxy(() =>
        Promise.resolve(FunkciaStore.Some(emptyObject)),
      ) as never;
    },
    is: isOptionAsync,
    use,
    createUse(generator) {
      return (...args) => use(() => generator(...args));
    },
  };
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
export interface OptionAsync<Value>
  extends PromiseLike<Option<Value>>,
    $AsyncIterable<never, DoNotation.Unsign<Value>> {
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
  ) => OptionAsync<DoNotation.Sign<{ [K in Key]: Value }>>;

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
   * declare function getUser(id: string): OptionAsync<User>;
   *
   * declare function getUserScore(user: User): OptionAsync<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── OptionAsync<UserLevel>
   * //        ▼
   * const userLevel = OptionAsync.Do
   *   .bind('user', () => getUser('user_123'))
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
      : DoNotation.Forbid<'OptionAsync', 'bind'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unsign<Value>) => OptionAsync<U>,
  ) => OptionAsync<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
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
   * const option = OptionAsync.Do
   *   .let('a', () => 10)
   * //            ┌─── { a: number }
   * //            ▼
   *   .let('b', (ctx) => Promise.resolve(ctx.a * 2))
   *   .map((ctx) => a + b);
   * //       ▲
   * //       └─── { a: number; b: number }
   * ```
   */
  let: <Key extends string, U extends {}>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'OptionAsync', 'let'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unsign<Value>) => Promise<U>,
  ) => OptionAsync<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : U;
    }>
  >;

  /**
   * Combines two `OptionAsync`s into a single `OptionAsync` containing a tuple of their values,
   * if both `OptionAsync`s are `Some` variants, otherwise, returns `None`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * const first = OptionAsync.some('hello');
   * const second = OptionAsync.some('world');
   *
   * //       ┌─── OptionAsync<[string, string]>
   * //       ▼
   * const strings = first.zip(second);
   * // Output: Promise<Some(['hello', 'world'])>
   * ```
   */
  zip: <Value2 extends {}>(
    that: OptionAsync<Value2>,
  ) => OptionAsync<Tuple<DoNotation.Unsign<Value>, DoNotation.Unsign<Value2>>>;

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
   * const first = OptionAsync.some('hello');
   * const second = OptionAsync.some('world');
   *
   * //        ┌─── OptionAsync<string>
   * //        ▼
   * const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
   * // Output: Promise<Some('hello world')>
   * ```
   */
  zipWith: <Value2 extends {}, Output extends {}>(
    that: OptionAsync<Value2>,
    fn: (
      arg0: DoNotation.Unsign<Value>,
      arg1: DoNotation.Unsign<Value2>,
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
   *
   * declare function parseJsonFile(contents: string): OptionAsync<FileContent>;
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
    cases: OptionAsync.Match<DoNotation.Unsign<Value>, NoneOutput, Output>,
  ) => Promise<NoneOutput | Output>;

  /**
   * Returns a promise that unwraps the underlying `Option` value.
   *
   * @throws `UnwrapError` if the `Option` is `None`.
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
  unwrap: () => Promise<DoNotation.Unsign<Value>>;

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
   * const baseUrl = await OptionAsync.some(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://funkcia.lukemorales.io'
   *
   * const apiKey = await OptionAsync.none()
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * // Output: 'sk_test_9FK7CiUnKaU'
   * ```
   */
  unwrapOr: (
    onNone: Thunk<DoNotation.Unsign<Value>>,
  ) => Promise<DoNotation.Unsign<Value>>;

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
  unwrapOrNull: () => Promise<DoNotation.Unsign<Value> | null>;

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
  unwrapOrUndefined: () => Promise<DoNotation.Unsign<Value> | undefined>;

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
  expect: <Exception extends globalThis.Error>(
    onNone: Thunk<Exception>,
  ) => Promise<DoNotation.Unsign<Value>>;

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
    criteria: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ) => Promise<boolean>;

  /**
   * Converts the `OptionAsync` to an `AsyncResult`.
   *
   * If the resolved `Option` is `Some`, returns an `AsyncResult.Ok`.
   * If the resolved `Option` is `None`, returns an `AsyncResult.Error` with a `NoValueError`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   *
   * declare function parseJsonFile(contents: string): OptionAsync<FileContent>;
   *
   * //       ┌─── AsyncResult<FileContent, NoValueError>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncResult();
   * // Output: Promise<Ok(FileContent)>
   * ```
   */
  toAsyncResult(): ResultAsync<Value, NoValueError>;

  /**
   * Converts the `OptionAsync` to a `AsyncResult`.
   *
   * If the resolved `Option` is `Some`, returns an `AsyncResult.ok`.
   * If the resolved `Option` is `None`, returns an `AsyncResult.error` with the return of the provided `onNone` callback.
   *
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare function readFile(path: string): OptionAsync<string>;
   *
   * declare function parseJsonFile(contents: string): OptionAsync<FileContent>;
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
  ): ResultAsync<Value, Error>;

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
  toArray(): Promise<Array<DoNotation.Unsign<Value>>>;

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
   * // Output: Promise<Some(20)>
   * ```
   */
  map<Output>(
    onSome: (value: DoNotation.Unsign<Value>) => NonNullable<Output>,
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
  andThen<Output extends Option<any>>(
    onSome: (value: DoNotation.Unsign<Value>) => Output,
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
    onSome: (value: DoNotation.Unsign<Value>) => Output,
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
      value: DoNotation.Unsign<Value>,
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
  filter<Output extends DoNotation.Unsign<Value>>(
    guard: Predicate.Guard<DoNotation.Unsign<Value>, Output>,
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
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
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
   * // Output: Promise<Some('Paul')>
   * const option = OptionAsync.some('Paul')
   *   .or(() => OptionAsync.some('John'))
   *
   *
   * // Output: Promise<Some('John')>
   * const greeting = OptionAsync.none()
   *   .or(() => OptionAsync.some('John'))
   * ```
   */
  or: (onNone: Thunk<OptionAsync<Value>>) => OptionAsync<Value>;

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
  tap: (onSome: (value: DoNotation.Unsign<Value>) => unknown) => this;
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
   * Constructs an `OptionAsync` from a `Promise` that resolves to an `Option`, but may reject.
   *
   * If the promise rejects, it resolves to an `Option.None`.
   * Otherwise, resolves to the returned `Option.Some`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Option<User>>
   *
   * //      ┌─── OptionAsync<User>
   * //      ▼
   * const option = OptionAsync.try(() => findUserById('user_123'));
   * // Output: Promise<Some(User)>
   * ```
   */
  try<Value extends Option<any>>(
    promise: Task<Value>,
  ): OptionAsync<OptionAsync.Unwrap<Value>>;

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
   * // Output: Promise<Some(User)>
   * ```
   */
  try<Value>(promise: Task<Value>): OptionAsync<NonNullable<Value>>;

  /**
   * Constructs an `OptionAsync` from a `Promise` that returns an `Option`, and never rejects.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Option<User>>
   *
   * //      ┌─── OptionAsync<User>
   * //      ▼
   * const option = OptionAsync.promise(() => findUserById('user_123'));
   * // Output: Promise<Some(User)>
   * ```
   */
  promise: <$Option extends Option<any>>(
    promise: Task<$Option>,
  ) => OptionAsync<OptionAsync.Unwrap<$Option>>;

  /**
   * Lifts a `Promise` that resolves to an `Option` to a function that returns an `OptionAsync`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<Option<User>>
   *
   * //           ┌─── (id: string) => OptionAsync<User>
   * //           ▼
   * const safeFindUserById = OptionAsync.enhance(findUserById);
   *
   * //     ┌─── OptionAsync<User>
   * //     ▼
   * const user = safeFindUserById('user_123');
   * ```
   */
  enhance<Args extends readonly unknown[], Value>(
    promise: (...args: Args) => Promise<Option<Value>>,
  ): (...args: Args) => OptionAsync<NonNullable<Value>>;

  /**
   * Lifts a `Promise` that resolves to a nullable value to a function that returns an `OptionAsync`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare async function findUserById(id: string): Promise<User | null>
   *
   * //           ┌─── (id: string) => OptionAsync<User>
   * //           ▼
   * const safeFindUserById = OptionAsync.enhance(findUserById);
   *
   * //     ┌─── OptionAsync<User>
   * //     ▼
   * const user = safeFindUserById('user_123');
   * ```
   */
  enhance<Args extends readonly unknown[], Value>(
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    promise: (...args: Args) => Promise<Nullable<Value>>,
  ): (...args: Args) => OptionAsync<NonNullable<Value>>;

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
  predicate: (<Criteria extends Predicate.Guard<any, any>>(
    criteria: Criteria,
  ) => (
    ...args: Parameters<Criteria>
  ) => OptionAsync<Predicate.Guarded<Criteria>>) &
    (<Criteria extends Predicate.Predicate<any>>(
      criteria: Criteria,
    ) => (
      ...args: Parameters<Criteria>
    ) => OptionAsync<Parameters<Criteria>[0]>);

  /**
   * Evaluates an **async* generator early returning when an `Option.None` is propagated
   * or returning the `OptionAsync` returned by the generator.
   *
   * `yield*` an `OptionAsync<Value>` unwraps values and propagates `Option.None`s.
   *
   * If the value is `Option.None`, then it will return an `OptionAsync` that resolves to `Option.None`
   * from the enclosing function.
   *
   * If applied to an `OptionAsync` that resolves to `Option.Some<U>`, then it will unwrap the value to evaluate `U`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * const safeParseInt = OptionAsync.liftFun(parseInt)
   *
   * //       ┌─── OptionAsync<number>
   * //       ▼
   * const option = OptionAsync.use(async function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns OptionAsync.None immediately
   *
   *   return OptionAsync.some(x + y); // doesn't run
   * });
   * // Output: Promise<None>
   * ```
   */
  use<$Option extends Option<any>>(
    generator: () => AsyncGenerator<never, $Option>,
  ): OptionAsync<OptionAsync.Unwrap<$Option>>;

  /**
   * Returns a function that evaluates an **async* generator when called, early returning when an `Option.None` is propagated
   * or returning the `OptionAsync` returned by the generator.
   *
   * `yield*` an `OptionAsync<Value>` unwraps values and propagates `Option.None`s.
   *
   * If the value is `Option.None`, then it will return an `OptionAsync` that resolves to `Option.None`
   * from the enclosing function.
   *
   * If applied to an `OptionAsync` that resolves to `Option.Some<U>`, then it will unwrap the value to evaluate `U`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * const safeParseInt = OptionAsync.liftFun(parseInt)
   *
   * //       ┌─── OptionAsync<number>
   * //       ▼
   * const option = OptionAsync.use(async function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns OptionAsync.None immediately
   *
   *   return OptionAsync.some(x + y); // doesn't run
   * });
   * // Output: Promise<None>
   * ```
   */
  createUse<Args extends readonly unknown[], $Option extends Option<any>>(
    generator: (...args: Args) => AsyncGenerator<never, $Option>,
  ): (...args: Args) => OptionAsync<OptionAsync.Unwrap<$Option>>;

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
  ) => Promise<Array<DoNotation.Unsign<Value>>>;

  /**
   * Initiates a `Do-notation` for the `OptionAsync` type, allowing to write code
   * in a more declarative style, similar to the “do notation” in other programming languages.
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
   * declare function getUser(id: string): OptionAsync<User>;
   *
   * declare function getUserScore(user: User): OptionAsync<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── OptionAsync<UserLevel>
   * //        ▼
   * const userLevel = OptionAsync.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user)) // getUserScore is dependent on getUser result
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  get Do(): OptionAsync<DoNotation.Sign>;

  /**
   * Asserts that an *unknown* value is an `OptionAsync`.
   *
   * @example
   * ```ts
   * import { OptionAsync } from 'funkcia';
   *
   * declare const maybeAnOptionAsyncWithUser: unknown;
   *
   * if (OptionAsync.is(maybeAnOptionAsyncWithUser)) {
   * //                     ┌─── OptionAsync<unknown>
   * //                     ▼
   *   const user = maybeAnOptionAsyncWithUser.filter(isUser);
   * //        ▲
   * //        └─── OptionAsync<User>
   * }
   */
  is: (value: unknown) => value is OptionAsync<unknown>;

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
}

export declare namespace OptionAsync {
  interface Match<Value, Output, NoneOutput> {
    Some: (value: Value) => Output;
    None: () => NoneOutput;
  }

  type Unwrap<Output> = Output extends Option<infer Value>
    ? Value
    : Output extends OptionAsync<infer Value>
    ? Value
    : never;
}
