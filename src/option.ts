import type { DoNotation } from './do-notation';
import type { NoValueError } from './exceptions';
import { UnwrapError } from './exceptions';
import { alwaysNull, alwaysUndefined, identity } from './functions';
import { FunkciaStore } from './funkcia-store';
import type { EqualityFn } from './internals/equality';
import { isEqual } from './internals/equality';
import type { Falsy, Nullable, Thunk, Tuple } from './internals/types';
import { beautify, emptyObject } from './internals/utils';
import type { AsyncOption } from './option.async';
import type { Predicate } from './predicate';
import type { Result } from './result';
import type { AsyncResult } from './result.async';

const Some = Symbol.for('Option::Some');
const None = Symbol.for('Option::None');

/**
 * `Option` represents an optional value: every `Option` is either `Some`,
 * and contains a value, or `None`, and it's empty.
 *
 * It is commonly used to represent the result of a function that may not
 * return a value due to failure or missing data, such as a network request,
 * a file read, or a database query.
 */
export class Option<Value> implements DoNotation.Signed<'Option', Value> {
  readonly #tag: Option.$some | Option.$none;

  readonly #value: Value;

  private constructor(tag: Option.$none);

  private constructor(tag: Option.$some, value: Value);

  private constructor(tag: Option.$some | Option.$none, value?: any) {
    this.#tag = tag;
    this.#value = value;
  }

  // ------------------------
  // #region: CONSTRUCTORS---
  // ------------------------

  /**
   * Constructs a `Some` `Option`, representing an optional value that exists.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.some(10);
   * // Output: Some(10)
   * ```
   */
  static some<Value extends {}>(value: Value): Option<Value> {
    return new Option(Some, value);
  }

  /**
   * @alias
   * Alias of `Option.some` - constructs a `Some` `Option`, representing an optional value that exists
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const divisor: number;
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.of(10);
   * // Output: Some(10)
   */
  static of: <Value extends {}>(value: Value) => Option<Value> = Option.some; // eslint-disable-line @typescript-eslint/member-ordering, @typescript-eslint/no-shadow

  /**
   * Constructs a `None` `Option`, representing an optional value that does not exist.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * function divide(dividend: number, divisor: number): Option<number> {
   *   if (divisor === 0) {
   *     return Option.none();
   *   }
   *
   *   return Option.some(dividend / divisor);
   * }
   * ```
   */
  static none<Value = never>(): Option<NonNullable<Value>> {
    return new Option(None);
  }

  /**
   * Constructs an `Option` from a nullable value.
   *
   * If the value is `null` or `undefined`, it returns an `Option.None`.
   * Otherwise, it returns an `Option.Some` containing the value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const user: User | null
   *
   * //       ┌─── Option<User>
   * //       ▼
   * const option = Option.fromNullable(user);
   * ```
   */
  static fromNullable<Value>(
    value: Nullable<Value>,
  ): Option<NonNullable<Value>> {
    return value != null ? Option.some(value) : Option.none();
  }

  /**
   * Constructs an `Option` from a falsy value.
   *
   * If the value is falsy, it returns an `Option.None`.
   * Otherwise, it returns an `Option.Some` with the value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * function getEnv(variable: string): string {
   *   return process.env[variable] ?? '';
   * }
   *
   * //       ┌─── Option<string>
   * //       ▼
   * const option = Option.fromFalsy(getEnv('BASE_URL'));
   * ```
   */
  static fromFalsy<Value>(
    value: Value | Falsy,
  ): Option<Exclude<NonNullable<Value>, Falsy>> {
    return (value ? Option.some(value) : Option.none()) as never;
  }

  /**
   * Constructs an `Option` from a function that may throw.
   *
   * If the function throws or returns `null` or `undefined`,
   * it returns an `Option.None`. Otherwise, it returns an `Option.Some` with the value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //     ┌─── Option<URL>
   * //     ▼
   * const url = Option.try(() => new URL('example.com'));
   * // Output: None
   * ```
   */
  static try<Value>(fn: Thunk<Value>): Option<NonNullable<Value>> {
    try {
      return Option.fromNullable(fn());
    } catch {
      return Option.none();
    }
  }

  /**
   * Converts a function that may throw or return a nullable value
   * to an enhanced function that returns an `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //         ┌─── (text: string, reviver?: Function) => Option<any>
   * //         ▼
   * const safeJsonParse = Option.liftFun(JSON.parse);
   *
   * //       ┌─── Option<any>
   * //       ▼
   * const profile = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Some({ name: 'John Doe' })
   * ```
   */
  static liftFun<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Option<NonNullable<Value>> {
    return (...args) => Option.try(() => callback(...args));
  }

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `Option.Some` narrowing down the value to the provided type predicate if the predicate is fulfilled.
   *
   * If the test fails, returns an `Option.None` instead.
   *
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //         ┌─── (shape: Shape) => Option<Circle>
   * //         ▼
   * const ensureCircle = Option.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * declare const input: Shape;
   *
   * //       ┌─── Option<Circle>
   * //       ▼
   * const option = ensureCircle(input);
   * ```
   */
  static predicate<Criteria extends Predicate.Guard<any, any>>(
    criteria: Criteria,
  ): (...args: Parameters<Criteria>) => Option<Predicate.Guarded<Criteria>>;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `Some` with the value tested if the predicate is fulfilled.
   *
   * If the test fails, returns a `None` instead.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   *
   * //          ┌─── (value: number) => Option<number>
   * //          ▼
   * const ensurePositive = Option.predicate(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── Option<number>
   * //       ▼
   * const option = ensurePositive(input);
   * ```
   */
  static predicate<Criteria extends Predicate.Predicate<any>>(
    criteria: Criteria,
  ): (...args: Parameters<Criteria>) => Option<Parameters<Criteria>[0]>;

  static predicate(
    criteria: Predicate.Predicate<any>,
  ): (input: any) => Option<any> {
    return (input) => Option.of(input).filter(criteria);
  }

  // ----------------
  // #endregion -----

  // ------------------------
  // #region: COMBINATORS---
  // ------------------------

  /**
   * Given an array of `Option`s, returns an array containing only the values inside `Option.Some`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = Option.values([
   *   Option.some(1),
   *   Option.none<number>(),
   *   Option.some(3),
   * ]);
   * // Output: [1, 3]
   * ```
   */
  static values<Value>(
    options: Array<Option<Value>>,
  ): Array<DoNotation.Unsign<Value>> {
    return options.reduce<Array<DoNotation.Unsign<Value>>>((acc, option) => {
      if (option.isSome()) acc.push(option.unwrap());

      return acc;
    }, []);
  }

  /**
   * Combines two `Option`s into a single `Option` containing a tuple of their values,
   * if both `Option`s are `Some` variants, otherwise, returns `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const first = Option.some('hello');
   * const second = Option.some('world');
   *
   * //       ┌─── Option<[string, string]>
   * //       ▼
   * const strings = first.zip(second);
   * // Output: Some(['hello', 'world'])
   * ```
   */
  zip<Value2 extends {}>(
    that: Option<Value2>,
  ): Option<Tuple<DoNotation.Unsign<Value>, DoNotation.Unsign<Value2>>> {
    return this.andThen((a) => that.map((b) => [a, b]));
  }

  /**
   * Combines two `Option`s into a single `Option`. The new value is produced
   * by applying the given function to both values, if both `Option`s are `Some` variants,
   * otherwise, returns `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   *
   * const first = Option.some('hello');
   * const second = Option.some('world');
   *
   * //        ┌─── Option<string>
   * //        ▼
   * const greeting = first.zipWith(second, (a, b) => `${a} ${b}`);
   * // Output: Some('hello world')
   * ```
   */
  zipWith<Value2 extends {}, Output extends {}>(
    that: Option<Value2>,
    fn: (
      arg0: DoNotation.Unsign<Value>,
      arg1: DoNotation.Unsign<Value2>,
    ) => Output,
  ): Option<Output> {
    return this.zip(that).map((options) => fn(...options) as never);
  }

  // ----------------
  // #endregion -----

  // -----------------------
  // #region: DO-NOTATION---
  // -----------------------

  /**
   * Initiates a `Do-notation` for the `Option` type, allowing to write code
   * in a more declarative style, similar to the “do notation” in other programming languages.
   * It provides a way to define variables and perform operations on them
   * using functions like `bind` and `let`, piping the returned values into a context object.
   *
   * Within the `Do` scope, you can use the `bind` function to bind a value to a variable.
   * The `bind` function takes two arguments: the name of the variable and a function that returns an `Option` to be bound.
   * If the returned `Option` is `Some`, the value is assigned to the variable in the context object.
   * If the returned `Option` is `None`, the parent `Option` running the `Do` simulation becomes a `None`.
   *
   * You can also use the `let` function to bind a simple value to a variable.
   * The `let` function takes two arguments: the name of the variable and a function that returns a value to be bound.
   * You can return any value from the function, like a `string`, `number`, `boolean` etc,
   * and it will be assigned to the variable in the context object.
   * If the returned value is `null` or `undefined`, the parent `Option` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function getUser(id: string): Option<User>;
   *
   * declare function getUserScore(user: User): Option<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Option<UserLevel>
   * //        ▼
   * const userLevel = Option.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user)) // getUserScore is dependent on getUser result
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  static get Do(): Option<DoNotation.Sign> {
    return new Option(Some, emptyObject) as never;
  }

  /**
   * Initiates a `Do-notation` with the current `Option`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function getUser(id: string): Option<User>;
   *
   * declare function getUserScore(user: User): Option<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Option<UserLevel>
   * //        ▼
   * const userLevel = getUser('user_123')
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
  ): Option<DoNotation.Sign<{ [K in Key]: Value }>> {
    return Option.Do.bind(key as never, () => this as never) as never;
  }

  /**
   * Binds an `Option` to the context object in a `Do-notation`.
   *
   * If the `Option` is `Some`, the value is assigned to the key in the context object.
   * If the `Option` is `None`, the parent `Option` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function getUser(id: string): Option<User>;
   *
   * declare function getUserScore(user: User): Option<UserScore>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Option<UserLevel>
   * //        ▼
   * const userLevel = Option.Do
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
      : DoNotation.Forbid<'Option', 'bind'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unsign<Value>) => Option<U>,
  ): Option<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : U;
    }>
  > {
    return (this as Option<Value>).andThen((ctx) =>
      fn(ctx).map(
        (value) =>
          // eslint-disable-next-line prefer-object-spread
          Object.assign({ [key]: value }, ctx) as {},
      ),
    ) as never;
  }

  /**
   * Binds a raw value to the context object in a `Do-notation`.
   *
   * If the value is not nullable, the value is assigned to the key in the context object.
   * If the value is `null` or `undefined`, the parent `Option` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const option = Option.Do
   *   .let('a', () => 10)
   * //            ┌─── { a: number }
   * //            ▼
   *   .let('b', (ctx) => ctx.a * 2)
   *   .map((ctx) => a + b);
   * //       ▲
   * //       └─── { a: number; b: number }
   * ```
   */
  let<Key extends string, ValueToBind extends {}>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbid<'Option', 'let'>,
    key: Exclude<Key, keyof Value>,
    fn: (
      ctx: DoNotation.Unsign<Value>,
    ) => Option.NoOptionGuard<ValueToBind, 'bind'>,
  ): Option<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : NonNullable<ValueToBind>;
    }>
  > {
    // @ts-expect-error the compiler is complaining because of DoNotation check in argument `this`
    return (this as Option<Value>).bind(
      key,
      (ctx) => Option.fromNullable(fn(ctx)) as never,
    );
  }

  // ----------------
  // #endregion -----

  // -----------------------
  // #region: CONVERSIONS---
  // -----------------------

  /**
   * Compare the `Option` against the possible patterns and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   *
   * declare function parseJsonFile(contents: string): Option<FileContent>;
   *
   * //         ┌─── string
   * //         ▼
   * const userGreeting = readFile('data.json')
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
  match<Output, NoneOutput>(
    cases: Option.Match<DoNotation.Unsign<Value>, Output, NoneOutput>,
  ): Output | NoneOutput {
    return this.isSome() ? cases.Some(this.#value as never) : cases.None();
  }

  /**
   * Unwraps the `Option` value.
   *
   * @throws `UnwrapError` if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //     ┌─── User
   * //     ▼
   * const user = Option.some(databaseUser).unwrap();
   *
   * const team = Option.none().unwrap();
   * // Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
   * ```
   */
  unwrap(): DoNotation.Unsign<Value> {
    return this.unwrapOr(() => {
      throw new UnwrapError('Option');
    }) as never;
  }

  /**
   * Unwraps the `Option` value.
   *
   * If the Option is `None`, returns the result of the provided callback.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── string
   * //       ▼
   * const baseUrl = Option.some(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://funkcia.lukemorales.io'
   *
   * const apiKey = Option.none()
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * // Output: 'sk_test_9FK7CiUnKaU'
   * ```
   */
  unwrapOr(onNone: Thunk<DoNotation.Unsign<Value>>): DoNotation.Unsign<Value> {
    return this.match({ Some: identity, None: onNone });
  }

  /**
   * Unwraps the value of the `Option` if it is a `Some`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = Option.some(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull(): DoNotation.Unsign<Value> | null {
    return this.unwrapOr(alwaysNull as never);
  }

  /**
   * Unwraps the value of the `Option` if it is a `Some`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //     ┌─── User | undefined
   * //     ▼
   * const user = Option.some(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined(): DoNotation.Unsign<Value> | undefined {
    return this.unwrapOr(alwaysUndefined as never);
  }

  /**
   * Unwraps the `Option` value.
   *
   * @throws the provided Error if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * //     ┌─── User
   * //     ▼
   * const user = findUserById('user_123').expect(
   *   () => new UserNotFound(userId),
   * );
   *
   * const anotherUser = findUserById('invalid_id').expect(
   *   () => new UserNotFound('invalid_id'),
   * );
   * // Output: Uncaught exception: 'User not found: "user_123"'
   * ```
   */
  expect<Exception extends globalThis.Error>(
    onNone: Thunk<Exception>,
  ): DoNotation.Unsign<Value> {
    return this.unwrapOr(() => {
      throw onNone();
    });
  }

  /**
   * Verifies if the `Option` contains a value that passes the test implemented by the provided function.
   *
   * Returns `true` if the predicate is fullfiled by the wrapped value.
   * If the predicate is not fullfiled or if the `Option` is `None`, returns `false`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //         ┌─── boolean
   * //         ▼
   * const isPositive = Option.some(10).contains(num => num > 0);
   * // Output: true
   * ```
   */
  contains(predicate: Predicate.Predicate<DoNotation.Unsign<Value>>): boolean {
    return this.isSome() && predicate(this.#value as never);
  }

  /**
   * Converts an `Option` to a `Result`.
   *
   * If `Option` is `Some`, returns a `Result.ok`.
   * If `Option` is `None`, returns a `Result.error` with a `NoValueError`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * //          ┌─── Result<User, NoValueError>
   * //          ▼
   * const authorizedUser = findUserById('user_123')
   *   .toResult()
   */
  toResult(): Result<NonNullable<Value>, NoValueError>;

  /**
   * Converts an `Option` to a `Result`.
   *
   * If `Option` is `Some`, returns a `Result.ok`.
   * If `Option` is `None`, returns a `Result.error` with the return of the provided `onNone` callback.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * //          ┌─── Result<User, UserNotFound>
   * //          ▼
   * const authorizedUser = findUserById('user_123')
   *   .toResult(() => new UserNotFound('user_123'))
   */
  toResult<Error extends {}>(
    onNone: Thunk<Error>,
  ): Result<NonNullable<Value>, Error>;

  toResult(onNone?: Thunk<any>): Result<NonNullable<Value>, any> {
    return FunkciaStore.Result.fromNullable(
      this.unwrapOrNull(),
      onNone as never,
    ) as never;
  }

  /**
   * Converts the `Option` to a `AsyncOption`.
   *
   * @example
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   *
   * declare function parseJsonFile(contents: string): Option<FileContent>;
   *
   * //       ┌─── AsyncOption<FileContent>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncOption();
   * // Output: Promise<Some(FileContent)>
   */
  toAsyncOption(): AsyncOption<NonNullable<Value>> {
    return FunkciaStore.AsyncOption.promise(() =>
      Promise.resolve(this),
    ) as never;
  }

  /**
   * Converts the `Option` to a `AsyncResult`.
   *
   * If `Option` is `Some`, returns an `AsyncResult.ok`.
   * If `Option` is `None`, returns an `AsyncResult.error` with a `NoValueError`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   *
   * declare function parseJsonFile(contents: string): Option<FileContent>;
   *
   * //       ┌─── AsyncResult<FileContent, NoValueError>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncResult();
   * // Output: Promise<Ok(FileContent)>
   * ```
   */
  toAsyncResult(): AsyncResult<NonNullable<Value>, NoValueError>;

  /**
   * Converts the `Option` to a `AsyncResult`.
   *
   * If `Option` is `Some`, returns an `AsyncResult.ok`.
   * If `Option` is `None`, returns an `AsyncResult.error` with the return of the provided `onNone` callback.
   *
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   *
   * declare function parseJsonFile(contents: string): Option<FileContent>;
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
  ): AsyncResult<NonNullable<Value>, Error>;

  toAsyncResult(onNone?: Thunk<any>): AsyncResult<NonNullable<Value>, any> {
    return FunkciaStore.AsyncResult.promise(() =>
      Promise.resolve(this.toResult(onNone as never)),
    );
  }

  /**
   * Converts an `Option` to an array.
   *
   * If `Option` is `Some`, returns an array with the value.
   * If `Option` is `None`, returns an empty array.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = Option.of(10).toArray();
   * // Output: [10]
   * ```
   */
  toArray(): Array<DoNotation.Unsign<Value>> {
    return this.match({ Some: (value) => [value], None: () => [] });
  }

  // ----------------
  // #endregion -----

  // ---------------------------
  // #region: TRANSFORMATIONS---
  // ---------------------------

  /**
   * Applies a callback function to the value of the `Option` when it is `Some`,
   * returning a new `Option` containing the new value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.of(10).map(number => number * 2);
   * // Output: Some(20)
   * ```
   */
  map<Output>(
    onSome: (
      value: DoNotation.Unsign<Value>,
    ) => Option.NoOptionGuard<Output, 'andThen'>,
  ): Option<NonNullable<Output>> {
    if (this.isNone()) return this as never;

    // @ts-expect-error the compiler is complaining because of NoOptionInMapGuard
    return Option.fromNullable(onSome(this.#value));
  }

  /**
   * Applies a callback function to the value of the `Option` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to `chain` (also known as `flatMap`), with the difference
   * that the callback must return an `Option`, not a raw value.
   * This allows chaining multiple calls that return `Option`s together.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   *
   * declare function parseJsonFile(contents: string): Option<FileContent>;
   *
   * //       ┌─── Option<FileContent>
   * //       ▼
   * const option = readFile('data.json').andThen(parseJsonFile);
   * ```
   */
  andThen<Output extends {}>(
    onSome: (value: DoNotation.Unsign<Value>) => Option<Output>,
  ): Option<Output> {
    return this.isSome() ? onSome(this.#value as never) : (this as never);
  }

  /**
   * Asserts that the `Option` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `Option`, returning a `None` instead.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //      ┌─── Option<Circle>
   * //      ▼
   * const circle = Option.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'circle',
   * );
   * ```
   */
  filter<Output extends DoNotation.Unsign<Value>>(
    refinement: Predicate.Guard<DoNotation.Unsign<Value>, Output>,
  ): Option<Output>;

  /**
   * Asserts that the `Option` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `Option`, returning a `None` instead.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── Option<User>
   * //       ▼
   * const option = Option.of(user).filter((user) => user.age >= 21);
   * ```
   */
  filter(
    predicate: Predicate.Predicate<DoNotation.Unsign<Value>>,
  ): Option<Value>;

  filter(predicate: Predicate.Predicate<DoNotation.Unsign<Value>>): this {
    if (this.isNone()) return this;

    return predicate(this.#value as never) ? this : (Option.none() as never);
  }

  // ----------------
  // #endregion -----

  // -----------------------
  // #region: FALLBACKS---
  // -----------------------

  /**
   * Replaces the current `Option` with the provided fallback `Option` when it is `None`.
   *
   * If the current `Option` is `Some`, it returns the current `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: Some('Paul')
   * const option = Option.some('Paul')
   *   .or(() => Option.some('John'))
   *
   *
   * // Output: Some('John')
   * const greeting = Option.none()
   *   .or(() => Option.some('John'))
   * ```
   */
  or(onNone: Thunk<Option<Value>>): Option<Value> {
    return this.isSome() ? this : onNone();
  }

  /**
   * Returns the first `Option.Some` value in the iterable. If all values are `Option.None`, returns `Option.None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * interface ContactInformation {
   *   primary: Option<string>;
   *   secondary: Option<string>;
   *   emergency: Option<string>;
   * }
   *
   * declare const contact: ContactInformation;
   *
   * //       ┌─── Option<string>
   * //       ▼
   * const option = Option.firstSomeOf([
   *   contact.primary,
   *   contact.secondary,
   *   contact.emergency,
   * ]);
   * ```
   */
  static firstSomeOf<Value>(options: Iterable<Option<Value>>): Option<Value> {
    for (const option of options) {
      if (option.isSome()) return option;
    }

    return Option.none();
  }

  // ----------------
  // #endregion -----

  // -----------------------
  // #region: COMPARISONS---
  // -----------------------

  /**
   * Asserts that an *unknown* value is an `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const maybeAnOptionWithUser: unknown;
   *
   * if (Option.is(maybeAnOptionWithUser)) {
   * //                     ┌─── Option<unknown>
   * //                     ▼
   *   const user = maybeAnOptionWithUser.filter(isUser);
   * //        ▲
   * //        └─── Option<User>
   * }
   */
  static is(value: unknown): value is Option<unknown> {
    return value instanceof Option;
  }

  /**
   * Returns `true` is the `Option` contains a value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * const user = findUserById('user_123');
   *
   * if (user.isSome()) {
   *   return user.unwrap(); // `unwrap` will not throw
   * }
   * ```
   */
  isSome(): this is Option.Some<Value> {
    return this.#tag === Some;
  }

  /**
   * Returns `true` is the `Option` is empty.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserByEmail(email: string): Option<User>;
   *
   * const user = findUserByEmail(data.email);
   *
   * if (user.isNone()) {
   *   return await createUser(data);
   * }
   *
   * return user.unwrap();
   * ```
   */
  isNone(): this is Option.None {
    return this.#tag === None;
  }

  /**
   * Compares the `Option` with another `Option` and returns `true` if they are equal.
   *
   * By default, it uses referential equality to compare the values,
   * but you can provide a custom equality function for more complex cases.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const option = Option.of(10).equals(Option.some(10));
   * // Output: true
   * ```
   */
  equals(
    that: Option<Value>,
    equalityFn: EqualityFn<DoNotation.Unsign<Value>> = isEqual,
  ): boolean {
    try {
      return equalityFn(this.unwrap(), that.unwrap());
    } catch {
      return this.isNone() && that.isNone();
    }
  }

  // ----------------
  // #endregion -----

  // -----------------
  // #region: OTHER---
  // -----------------

  /**
   * Calls the function with the `Option` value, then returns the `Option` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.some(10).tap((value) => console.log(value)); // LOG: 10
   * ```
   */
  tap(onSome: (value: DoNotation.Unsign<Value>) => unknown): this {
    if (this.isSome()) onSome(this.#value as never);

    return this;
  }

  /**
   * Utility to ensure a function always returns an `Option`.
   *
   * This method offers improved type inference for the function's
   * return value and guarantees that the function will consistently return an `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // When defining a normal function allowing typescript to infer the return type,
   * // sometimes the return type will be a union of `Option<T>` and `Option<U>` or `Option<never>`
   * function hasAcceptedTermsOfService(user: User) {
   *   if (typeof user.termsOfService !== 'boolean') return Option.none();
   *
   *   return user.termsOfService
   *     ? Option.some('ACCEPTED' as const)
   *     : Option.some('DECLINED' as const);
   * }
   *
   * //       ┌─── Option<'ACCEPTED'> | Option<'DECLINED'> | Option<never>
   * //       ▼
   * const option = hasAcceptedTermsOfService(user);
   *
   * // When using the `fun` method, the return type is always `Option<T>`
   * const hasAcceptedTermsOfService = Option.fun((user: User) => {
   *   if (typeof user.termsOfService !== 'boolean') return Option.none();
   *
   *   return user.termsOfService
   *     ? Option.some('ACCEPTED' as const)
   *     : Option.some('DECLINED' as const);
   * });
   *
   * //       ┌─── Option<'ACCEPTED' | 'DECLINED'>
   * //       ▼
   * const option = hasAcceptedTermsOfService(user);
   * ```
   */
  static fun<
    Callback extends
      | ((...args: any[]) => Option<any> | Option<never>)
      | ((...args: any[]) => Promise<Option<any> | Option<never>>),
  >(
    fn: Callback,
  ): (
    ...args: Parameters<Callback>
  ) => ReturnType<Callback> extends Promise<any>
    ? Promise<Option<Option.Unwrap<Awaited<ReturnType<Callback>>>>>
    : Option<Option.Unwrap<ReturnType<Callback>>> {
    return fn as never;
  }

  *[Symbol.iterator](): Iterator<never, DoNotation.Unsign<Value>> {
    if (this.isNone()) yield undefined as never;

    return this.#value as never;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.match({
      Some: (value) => `Some(${beautify(value)})`,
      None: () => 'None',
    });
  }

  /**
   * Evaluates a generator early returning when an `Option.None` is propagated
   * or returning the `Option` returned by the generator.
   *
   * `yield*` an `Option<Value>` unwraps values and propagates `None`s.
   *
   * If the value is `Option.None`, then it will return `Option.None`
   * from the enclosing function.
   *
   * If applied to `Option.Some<U>`, then it will unwrap the value to evaluate `U`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const safeParseInt = Option.liftFun(parseInt);
   *
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.relay(function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns Option.None immediately
   *
   *   return Option.some(x + y); // doesn't run
   * });
   * // Output: None
   * ```
   */
  static relay<Value extends {}>(
    generator: () => Generator<never, Option<Value>>,
  ): Option<Value> {
    const { done, value } = generator().next();

    return done ? value : Option.none();
  }

  // ----------------
  // #endregion -----
}

FunkciaStore.register(Option);

declare namespace Option {
  type $some = typeof Some;
  type $none = typeof None;

  interface Match<Value, Output, NoneOutput> {
    Some: (value: Value) => Output;
    None: () => NoneOutput;
  }

  type NoOptionInReturn<CorrectMethod extends string> =
    `ERROR: Use ${CorrectMethod} instead. Cause: the transformation is returning an Option, use ${CorrectMethod} to flatten the Option.`;

  type NoOptionGuard<
    Value,
    AnotherMethod extends string,
  > = Value extends Option<infer _> ? NoOptionInReturn<AnotherMethod> : Value;

  type Unwrap<Output> = [Output] extends [Option<infer Value>] ? Value : never;

  interface Some<Value> {
    /**  @override this method will not throw the expected error on a `Some` Option, use `unwrap` instead */
    match: never;
    /**  @override this method is safe to call on a `Some` Option */
    unwrap: () => Value;
    /**  @override this method has no effect on a `Some` Option */
    unwrapOr: never;
    /**  @override this method will not throw the expected error on a `Some` Option, use `unwrap` instead */
    expect: never;
    /**  @override this method has no effect on a `Some` Option */
    unwrapOrNull: never;
    /**  @override this method has no effect on a `Some` Option */
    unwrapOrUndefined: never;
    /**  @override this method has no effect on a `Some` Option */
    or: never;
    /**  @override this method has no effect on a `Some` Option */
    isNone: never;
  }

  interface None {
    /** @override this method has no effect on a `None` Option */
    zip: never;
    /** @override this method has no effect on a `None` Option */
    zipWith: never;
    /** @override this method has no effect on a `None` Option */
    bindTo: never;
    /** @override this method has no effect on a `None` Option */
    bind: never;
    /** @override this method has no effect on a `None` Option */
    let: never;
    /** @override this method has no effect on a `None` Option */
    match: never;
    /** @override this method has no effect on a `None` Option */
    unwrap: never;
    /** @override `unwrapOrNull` will not return a `Value` in this context. Option is guaranteed to be None. */
    unwrapOrNull: () => null;
    /** @override `unwrapOrUndefined` will not return a `Value` in this context. Option is guaranteed to be None. */
    unwrapOrUndefined: () => undefined;
    /** @override this method has no effect on a `None` Option */
    expect: never;
    /** @override this method has no effect on a `None` Option */
    contains: never;
    /** @override this method has no effect on a `None` Option */
    toResult: never;
    /** @override this method has no effect on a `None` Option */
    toAsyncOption: never;
    /** @override this method has no effect on a `None` Option */
    toAsyncResult: never;
    /** @override this method has no effect on a `None` Option */
    map: never;
    /** @override this method has no effect on a `None` Option */
    andThen: never;
    /** @override this method has no effect on a `None` Option */
    filter: never;
    /** @override this method has no effect on a `None` Option */
    isSome: never;
    /** @override this method has no effect on a `None` Option */
    tap: never;
  }
}
