/* eslint-disable @typescript-eslint/no-unnecessary-condition, import/export, @typescript-eslint/ban-types, require-yield, @typescript-eslint/method-signature-style */

import type { DoNotation } from './do-notation';
import type { NoValueError } from './exceptions';
import { identity, invoke } from './functions';
import type { EqualityFn } from './internals/equality';
import type {
  AnyUnaryFn,
  BetterIterable,
  Falsy,
  Nullable,
  Thunk,
  Tuple,
} from './internals/types';
import { emptyObject } from './internals/utils';
import type { OptionAsync } from './option.async';
import type { AnyOption, NoneTrait, SomeTrait } from './option.proxy';
import { isOption, None, Some } from './option.proxy';
import type { Predicate } from './predicate';
import type { Result } from './result';
import type { ResultAsync } from './result.async';

/**
 * `Option` represents an optional value: every `Option` is either `Some`,
 * and contains a value, or `None`, and it's empty.
 *
 * It is commonly used to represent the result of a function that may not
 * return a value due to failure or missing data, such as a network request,
 * a file read, or a database query.
 */
export const Option: OptionTrait = invoke((): OptionTrait => {
  const fromNullable: OptionTrait['fromNullable'] = (value) =>
    value == null ? (None() as never) : Some(value);

  const tryCatch: OptionTrait['try'] = (fn) => {
    try {
      return fromNullable(fn());
    } catch {
      return None() as never;
    }
  };

  const use: OptionTrait['use'] = (generator) => {
    const { done, value } = generator().next();

    return (done ? value : None()) as never;
  };

  return {
    is: isOption,
    some: Some,
    of: Some,
    none: None as never,
    fromNullable,
    fromFalsy(value) {
      return (value ? Some(value) : None()) as never;
    },
    get Do() {
      return Some(emptyObject) as never;
    },
    try: tryCatch,
    firstSomeOf(options) {
      for (const option of options) {
        if (option.isSome()) return option;
      }

      return None() as never;
    },
    predicate(criteria: AnyUnaryFn) {
      return (value: any) => Some(value).filter(criteria);
    },
    fun: identity as never,
    enhance(callback) {
      return (...args) => tryCatch(() => callback(...args));
    },
    use,
    createUse(generator) {
      return (...args) => use(() => generator(...args));
    },
    values(options) {
      return options.reduce<Array<DoNotation.Unsign<any>>>((acc, option) => {
        if (option.isSome()) acc.push(option.unwrap());

        return acc;
      }, []);
    },
  };
});

interface OptionTrait {
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
   *   const user = maybeAnOptionWithUser.filter(User.is);
   * //       ▲
   * //       └─── Option<User>
   * }
   */
  is(value: unknown): value is Option<unknown>;

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
  some<Value extends {}>(value: Value): Option<Value>;

  /**
   * @alias
   * Alias of `Option.some` - constructs a `Some` `Option`, representing an optional value that exists
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.of(10);
   * // Output: Some(10)
   */
  of<Value extends {}>(value: Value): Option<Value>;

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
  none<Value = never>(): Option<NonNullable<Value>>;

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
   * declare const user: User | null;
   *
   * //       ┌─── Option<User>
   * //       ▼
   * const option = Option.fromNullable(user);
   * ```
   */
  fromNullable<Value>(value: Nullable<Value>): Option<NonNullable<Value>>;

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
  fromFalsy<Value>(
    value: Value | Falsy,
  ): Option<Exclude<NonNullable<Value>, Falsy>>;

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
   * declare function findUserById(id: string): Option<User>;
   * declare function getUserScore(user: User): Option<UserScore>;
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Option<UserLevel>
   * //        ▼
   * const userLevel = Option.Do
   *   .bind('user', () => findUserById('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user)) // getUserScore is dependent on findUserById result
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  get Do(): Option<DoNotation.Sign>;

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
  try<Value>(fn: Thunk<Value>): Option<NonNullable<Value>>;

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
  firstSomeOf<Value>(options: Iterable<Option<Value>>): Option<Value>;

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
  predicate<Criteria extends Predicate.Guard<any, any>>(
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
  predicate<Criteria extends Predicate.Predicate<any>>(
    criteria: Criteria,
  ): (...args: Parameters<Criteria>) => Option<Parameters<Criteria>[0]>;

  /**
   * Declare a function that always returns an `Option`.
   *
   * This method offers improved type inference for the function's return value
   * and guarantees that the function will always return an `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // When defining a normal function allowing typescript to infer the return type,
   * // sometimes the return type will be a union of `Option<T>` and `Option<U>` and `Option<never>`
   * function hasAcceptedTermsOfService(user: User) {
   *   if (typeof user.termsOfService !== 'boolean')
   *     return Option.none();
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
   * // When using the `fun` method, the return type is always `Option<T | U>`
   * const improvedHasAcceptedTermsOfService = Option.fun(hasAcceptedTermsOfService);
   *
   * //       ┌─── Option<'ACCEPTED' | 'DECLINED'>
   * //       ▼
   * const option = improvedHasAcceptedTermsOfService(user);
   * ```
   */
  fun<
    Callback extends
      | ((...args: any[]) => AnyOption)
      | ((...args: any[]) => Promise<AnyOption>),
  >(
    fn: Callback,
  ): (
    ...args: Parameters<Callback>
  ) => ReturnType<Callback> extends Promise<any>
    ? Promise<Option<Option.Unwrap<Awaited<ReturnType<Callback>>>>>
    : Option<Option.Unwrap<ReturnType<Callback>>>;

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
   * const safeJsonParse = Option.enhance(JSON.parse);
   *
   * //       ┌─── Option<any>
   * //       ▼
   * const profile = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Some({ name: 'John Doe' })
   * ```
   */
  enhance<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Option<NonNullable<Value>>;

  /**
   * Returns a function that evaluates the declared generator with the provided arguments, early returning when an `Option.None` is propagated
   * or returning the `Option` returned by the generator.
   *
   * - Each yield* automatically unwraps the `Option` value or propagates `None`.
   *
   * - If any operation returns `Option.None`, the entire generator exits early.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const safeParseInt: (string: string, radix?: number) => Option<number>;
   *
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.use(function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns Option.None immediately
   *
   *   return Option.some(x + y); // doesn't run
   * });
   * // Output: None
   * ```
   */
  use<$Option extends AnyOption>(
    generator: () => Generator<never, $Option>,
  ): Option<Option.Unwrap<$Option>>;

  /**
   * Returns a function that evaluates a generator when called with the declared arguments,
   * early returning when an `Option.None` is propagated or returning the `Option` returned by the generator.
   *
   * - Each `yield*` automatically unwraps the `Option` value or propagates `None`.
   *
   * - If any operation returns `Option.None`, the entire generator exits early.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const safeParseInt: (string: string, radix?: number) => Option<number>;
   *
   * //           ┌─── (a: string, b: string) => Option<number>
   * //           ▼
   * const sumParsedIntegers = Option.createUse(function* (a: string, b: string) {
   *   const x: number = yield* safeParseInt(a);
   *   const y: number = yield* safeParseInt(b);
   *
   *   return Option.some(x + y);
   * });
   *
   * const option = sumParsedIntegers('10', '20');
   * // Output: Some(30)
   * ```
   */
  createUse<Args extends readonly unknown[], $Option extends AnyOption>(
    generator: (...args: Args) => Generator<never, $Option>,
  ): (...args: Args) => Option<Option.Unwrap<$Option>>;

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
  values<$Options extends AnyOption>(
    options: $Options[],
  ): Array<Option.Unwrap<DoNotation.Unsign<$Options>>>;
}

/**
 * `Option` represents an optional value: every `Option` is either `Some`,
 * and contains a value, or `None`, and it's empty.
 *
 * It is commonly used to represent the result of a function that may not
 * return a value due to failure or missing data, such as a network request,
 * a file read, or a database query.
 */
export interface Option<Value>
  extends BetterIterable<never, DoNotation.Unsign<Value>> {
  /**
   * Initiates a `Do-notation` with the current `Option`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Option<User>;
   * declare function getUserScore(user: User): Option<UserScore>;
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Option<UserLevel>
   * //        ▼
   * const userLevel = findUserById('user_123')
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
  ): Option<DoNotation.Sign<{ [K in Key]: Value }>>;

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
   * declare function findUserById(id: string): Option<User>;
   * declare function getUserScore(user: User): Option<UserScore>;
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Option<UserLevel>
   * //        ▼
   * const userLevel = Option.Do
   *   .bind('user', () => findUserById('user_123'))
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
  >;

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
    fn: (ctx: DoNotation.Unsign<Value>) => NoOptionGuard<ValueToBind, 'bind'>,
  ): Option<
    DoNotation.Sign<{
      [K in Key | keyof DoNotation.Unsign<Value>]: K extends keyof Value
        ? Value[K]
        : NonNullable<ValueToBind>;
    }>
  >;

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
    ) => NoOptionGuard<Output, 'andThen'>,
  ): unknown extends Output ? Option<Output> : Option<NonNullable<Output>>;

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
   * declare function parseJsonFile(contents: string): Option<FileContent>;
   *
   * //       ┌─── Option<FileContent>
   * //       ▼
   * const option = readFile('data.json').andThen(parseJsonFile);
   * ```
   */
  andThen<$Option extends AnyOption>(
    onSome: (value: DoNotation.Unsign<Value>) => $Option,
  ): Option<Option.Unwrap<$Option>>;

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

  /**
   * Replaces the current `Option` with the provided fallback `Option` when it is `None`.
   *
   * If the current `Option` is `Some`, it returns the current `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const option = Option.some('Paul').or(() => Option.some('John'));
   * // Output: Some('Paul')
   *
   * const greeting = Option.none().or(() => Option.some('John'));
   * // Output: Some('John')
   * ```
   */
  or(onNone: Thunk<Option<Value>>): Option<Value>;

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
  ): Option<Tuple<DoNotation.Unsign<Value>, DoNotation.Unsign<Value2>>>;

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
  ): Option<Output>;

  /**
   * Compare the `Option` against the possible patterns and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   * declare function parseSalesRecords(content: string): Option<SalesRecord[]>;
   * declare function aggregateSales(salesRecords: SalesRecord[]): AggregatedSaleRecord[];
   *
   * //             ┌─── AggregatedSaleRecord[]
   * //             ▼
   * const aggregatedSalesRecords = readFile('data.json')
   *   .andThen(parseSalesRecords)
   *   .match({
   *     Some(contents) {
   *       return aggregateSales(contents);
   *     },
   *     None() {
   *       return [];
   *     },
   *   });
   * ```
   */
  match<Output, NoneOutput>(
    cases: Option.Match<DoNotation.Unsign<Value>, Output, NoneOutput>,
  ): Output | NoneOutput;

  /**
   * Unwraps the `Option` value.
   *
   * @throws `UnwrapError` if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const findUserById: (id: string) => User | null;
   *
   * //     ┌─── 10
   * //     ▼
   * const user = Option.some(findUserById('user_123')).unwrap();
   *
   * const team = Option.none<Team>().unwrap();
   * // Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
   * ```
   */
  unwrap(): DoNotation.Unsign<Value>;

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
  unwrapOr(onNone: () => DoNotation.Unsign<Value>): DoNotation.Unsign<Value>;

  /**
   * Unwraps the value of the `Option` if it is a `Some`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const findUserById: (id: string) => Option<User>;
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = findUserById('user_123').unwrapOrNull();
   * ```
   */
  unwrapOrNull(): DoNotation.Unsign<Value> | null;

  /**
   * Unwraps the value of the `Option` if it is a `Some`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const findUserById: (id: string) => Option<User>;
   *
   * //     ┌─── User | undefined
   * //     ▼
   * const user = findUserById('user_123').unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined(): DoNotation.Unsign<Value> | undefined;

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
  ): DoNotation.Unsign<Value>;

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
  contains(predicate: Predicate.Predicate<DoNotation.Unsign<Value>>): boolean;

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
   *   .toResult();
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
   *   .toResult(() => new UserNotFound('user_123'));
   */
  toResult<Error extends {}>(
    onNone: Thunk<Error>,
  ): Result<NonNullable<Value>, Error>;

  /**
   * Converts the `Option` to an `OptionAsync`.
   *
   * @example
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   * declare function parseSalesRecords(content: string): Option<SalesRecord[]>;
   *
   * //       ┌─── OptionAsync<SalesRecord[]>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseSalesRecords)
   *   .toAsyncOption();
   * // Output: Promise<Some(SalesRecord[])>
   */
  toAsyncOption(): OptionAsync<NonNullable<Value>>;

  /**
   * Converts the `Option` to a `ResultAsync`.
   *
   * If `Option` is `Some`, returns an `ResultAsync.ok`.
   * If `Option` is `None`, returns an `ResultAsync.error` with a `NoValueError`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function readFile(path: string): Option<string>;
   * declare function parseSalesRecords(content: string): Option<SalesRecord[]>;
   *
   * //       ┌─── ResultAsync<SalesRecord[], NoValueError>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseSalesRecords)
   *   .toAsyncResult();
   * // Output: Promise<Ok(SalesRecord[])>
   * ```
   */
  toAsyncResult(): ResultAsync<NonNullable<Value>, NoValueError>;

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
   * declare function parseSalesRecords(content: string): Option<SalesRecord[]>;
   *
   * //       ┌─── AsyncResult<SalesRecord[], InvalidFile>
   * //       ▼
   * const asyncFile = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .toAsyncResult(() => new InvalidFile('data.json'));
   * // Output: Promise<Ok(SalesRecord[])>
   * ```
   */
  toAsyncResult<Error extends {}>(
    onNone: Thunk<Error>,
  ): ResultAsync<NonNullable<Value>, Error>;

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
  toArray(): Array<DoNotation.Unsign<Value>>;

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
   * const option = Option.some(10)
   *   .tap((value) => console.log(value)); // Console output: 10
   * ```
   */
  tap(onSome: (value: DoNotation.Unsign<Value>) => unknown): Option<Value>;

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
  isSome(): this is SomeTrait<Value>;

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
   *   return await createUser(data); // Creates a new user
   * }
   * ```
   */
  isNone(): this is NoneTrait;

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
    equalityFn?: EqualityFn<DoNotation.Unsign<Value>>,
  ): boolean;
}

export declare namespace Option {
  interface Match<Value, Output, NoneOutput> {
    Some: (value: Value) => Output;
    None: () => NoneOutput;
  }

  type Unwrap<Output> = Output extends Option<infer Value> ? Value : never;
}

type NoOptionInReturn<CorrectMethod extends string> =
  `ERROR: Use ${CorrectMethod} instead. Cause: the transformation is returning an Option, use ${CorrectMethod} to flatten the Option.`;

type NoOptionGuard<Value, AnotherMethod extends string> = Value extends Option<
  infer _
>
  ? NoOptionInReturn<AnotherMethod>
  : Value;
