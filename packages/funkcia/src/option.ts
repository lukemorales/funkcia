import type { DoNotation } from './do-notation';
import { panic } from './exceptions';
import {
  alwaysFalse,
  alwaysNull,
  alwaysTrue,
  alwaysUndefined,
} from './functions';
import { EqualityFn, isEqual } from './internals/equality';
import type {
  AnyUnaryFn,
  Falsy,
  FunkciaIterable,
  Nullable,
  Thunk,
  Tuple,
} from './internals/types';
import { beautify, catchDefect } from './internals/utils';

import type { Predicate } from './predicate';
import type { Result } from './result';

class Some<T> {
  readonly _tag = 'Some';
  readonly value: T;

  constructor(value: T) {
    this.value = value;
    Object.freeze(this);
  }

  bindTo(key: string) {
    return new Some({ [key]: this.value });
  }

  bind(key: string, cb: (value: T) => Option<any>) {
    return catchDefect(
      () =>
        cb(this.value).map(
          (v) => Object.assign({ [key]: v }, this.value) as {},
        ) as never,
      `A defect occurred while binding “${key}” to a do-notation in Option.bind`,
    );
  }

  let(key: string, fn: (value: T) => any) {
    return catchDefect(() => {
      const output = fn(this.value) as never;
      const option = output == null ? new None() : new Some(output);

      return option.map(
        (v) => Object.assign({ [key]: v }, this.value) as {},
      ) as never;
    }, `A defect occurred while binding “${key}” to a do-notation in Option.let`);
  }

  map<Output>(cb: (value: T) => Output): Option<Output> {
    return catchDefect(() => {
      const output = cb(this.value);
      return (output == null ? new None() : new Some(output)) as never;
    }, `A defect occurred while mapping an Option's value`);
  }

  andThen(cb: (value: T) => Option<any>) {
    return catchDefect(
      () => cb(this.value) as never,
      `A defect occurred while chaining an Option`,
    );
  }

  filter(cb: (value: T) => boolean) {
    return catchDefect(
      () => (cb(this.value) ? this : new None()),
      `A defect occurred while filtering an Option's value`,
    );
  }

  or() {
    return this as never;
  }

  zip(that: Option<any>) {
    return that.map((val2) => [this.value, val2]);
  }

  zipWith(that: Option<any>, fn: (a: T, b: any) => any) {
    return that.map((val2) => fn(this.value, val2) as never) as never;
  }

  match(cases: { Some: (value: T) => any; None: () => any }) {
    return catchDefect(
      () => cases.Some(this.value),
      `A defect occurred while matching the Some case of an Option containing “${beautify(
        this.value,
      )}”`,
    );
  }

  unwrap() {
    return this.value;
  }

  unwrapOr() {
    return this.value;
  }

  unwrapOrNull() {
    return this.value;
  }

  unwrapOrUndefined() {
    return this.value;
  }

  expect() {
    return this.value;
  }

  toArray() {
    return [this.value];
  }

  contains(predicate: (value: T) => boolean): boolean {
    return catchDefect(
      () => predicate(this.value),
      `A defect occurred while checking if an Option's value contains a value`,
    );
  }

  tap(cb: (value: T) => unknown) {
    return catchDefect(() => {
      cb(this.value);
      return this;
    }, "A defect occurred while tapping an Option's value");
  }

  isSome = alwaysTrue as never;

  isNone = alwaysFalse as never;

  equals(
    that: Option<T>,
    equalityFn: EqualityFn<DoNotation.Unbrand<T>> = isEqual,
  ): boolean {
    return that.contains((value) =>
      equalityFn(this.value as DoNotation.Unbrand<T>, value),
    );
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `Option::Some(${beautify(this.value)})`;
  }

  *[Symbol.iterator](): Iterator<never> {
    return this.value as never;
  }
}

class None {
  readonly _tag = 'None';

  constructor() {
    Object.freeze(this);
  }

  bind() {
    return this;
  }

  bindTo() {
    return this;
  }

  let() {
    return this;
  }

  map() {
    return this;
  }

  andThen() {
    return this;
  }

  filter() {
    return this;
  }

  or(onNone: Thunk<any>) {
    return onNone();
  }

  zip() {
    return this;
  }

  zipWith() {
    return this;
  }

  match(cases: { Some: (value: any) => any; None: () => any }) {
    return catchDefect(
      () => cases.None(),
      `A defect occurred while matching the None case of an Option`,
    );
  }

  unwrap(): never {
    panic('Called “unwrap” on an empty Option');
  }

  unwrapOr(onNone: Thunk<never>) {
    return catchDefect(
      () => onNone(),
      `A defect occurred while generating the fallback value of an empty Option`,
    );
  }

  expect(onNone: Thunk<globalThis.Error>): never {
    throw onNone();
  }

  unwrapOrNull = alwaysNull;

  unwrapOrUndefined = alwaysUndefined;

  toArray() {
    return [];
  }

  contains = alwaysFalse;

  tap() {
    return this;
  }

  isSome = alwaysFalse as never;

  isNone = alwaysTrue as never;

  equals(other: Option<any>) {
    return other.isNone();
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return 'Option::None';
  }

  *[Symbol.iterator](): Iterator<never> {
    yield undefined as never;
  }
}

function some<Value extends {}>(value: Value): Option<Value> {
  return new Some(value) as never;
}

function none<Value extends {} = never>(): Option<Value> {
  return new None() as never;
}

const fromNullable: OptionTrait['fromNullable'] = (value) =>
  value == null ? (none() as never) : some(value);

const tryCatch: OptionTrait['try'] = (fn) => {
  try {
    return fromNullable(fn());
  } catch {
    return none() as never;
  }
};

const use: OptionTrait['use'] = (generator) => {
  const { done, value } = generator().next();

  return (done ? value : none()) as never;
};

function is(value: any): value is Option<unknown> {
  return value instanceof Some || value instanceof None;
}

/**
 * `Option` represents an optional value: every `Option` is either `Some`,
 * and contains a value, or `None`, and it's empty.
 *
 * It is commonly used to represent the result of a function that may not
 * return a value due to failure or missing data, such as a network request,
 * a file read, or a database query.
 */
export const Option: OptionTrait = {
  is,
  some,
  of: some,
  none: none as never,
  fromNullable,
  fromFalsy(value) {
    return (value ? some(value) : none()) as never;
  },
  fromResult(result) {
    return result.match({ Ok: fromNullable, Error: none }) as never;
  },
  get Do() {
    return some(Object.create(null)) as never;
  },
  try: tryCatch,
  firstSomeOf(options) {
    for (const option of options) {
      if (option.isSome()) return option;
    }

    return none() as never;
  },
  predicate(criteria: AnyUnaryFn) {
    return (value: any) => some(value).filter(criteria);
  },
  fn(cb: Function) {
    return (...args: any[]) => {
      const output = cb(...args);
      return (is(output) ? output : use(() => output)) as never;
    };
  },
  lift(callback) {
    return (...args) => tryCatch(() => callback(...args));
  },
  use,
  values(options) {
    return options.reduce<Array<DoNotation.Unbrand<any>>>((acc, option) => {
      if (option.isSome()) acc.push(option.unwrap());

      return acc;
    }, []);
  },
};

interface OptionTrait {
  /**
   * Checks if an unknown value is an `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * //              ┌─── unknown
   * //              ▼
   * if (Option.is(value)) {
   *   return value.map(handleUnknown);
   * //         ▲
   * //         └─── Option<unknown>
   *
   * }
   * ```
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
   * Converts an `Option` from a `Result`.
   *
   * If `Result` is `Ok` and has a value, returns `Option.Some`.
   * If `Result` is `Error` or has no value, returns `Option.None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, NoValueError>;
   *
   * //          ┌─── Option<User>
   * //          ▼
   * const authorizedUser = Option.fromResult(findUserById('user_123'));
   */
  fromResult<Value, Error>(
    result: Result<Value, Error>,
  ): Option<NonNullable<Value>>;

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
  get Do(): Option<DoNotation>;

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
   * const url = Option.try(() => new URL('https://api.example.com'));
   * // Output: Some(URL)
   * ```
   */
  try<Value>(fn: Thunk<Awaited<Value>>): Option<NonNullable<Value>>;

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
  fn<Args extends readonly unknown[], $Option extends Option.Any>(
    fn: (...args: Args) => $Option,
  ): (...args: Args) => Option<Option.Unwrap<$Option>>;

  /**
   *
   * Declare a generator function that always returns an `Option`.
   *
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
   * declare function safeParseInt(string: string, radix?: number): Option<number>;
   *
   * //           ┌─── (a: string, b: string) => Option<number>
   * //           ▼
   * const sumParsedIntegers = Option.fn(function* (a: string, b: string) {
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
  fn<Args extends readonly unknown[], $Option extends Option.Any>(
    fn: (...args: Args) => Generator<never, $Option>,
  ): (...args: Args) => Generator<never, Option<Option.Unwrap<$Option>>>;

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
   * const safeJsonParse = Option.lift(JSON.parse);
   *
   * //       ┌─── Option<any>
   * //       ▼
   * const profile = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Some({ name: 'John Doe' })
   * ```
   */
  lift<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Awaited<Value>,
  ): (...args: Args) => Option<NonNullable<Value>>;

  /**
   * Evaluates a generator early returning when an `Option.None` is propagated
   * or returning the `Option` returned by the generator.
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
   * //       ┌─── Option<number>
   * //       ▼
   * const option = Option.gen(function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns Option.None immediately
   *
   *   return Option.some(x + y); // doesn't run
   * });
   * // Output: None
   * ```
   */
  use<$Option extends Option.Any>(
    generator: () => Generator<never, $Option>,
  ): Option<Option.Unwrap<$Option>>;

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
  values<$Options extends Option.Any>(
    options: $Options[],
  ): Array<Option.Unwrap<DoNotation.Unbrand<$Options>>>;
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
  extends FunkciaIterable<never, DoNotation.Unbrand<Value>> {
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
  ): Option<DoNotation<{ [K in Key]: Value }>>;

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
      : DoNotation.Forbidden<'Option', 'bind'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unbrand<Value>) => Option<U>,
  ): Option<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
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
   * //      ┌─── Option<number>
   * //      ▼
   * const orderTotal = Option.Do
   *   .let('subtotal', () => 120)
   * //               ┌─── { subtotal: number }
   * //               ▼
   *   .let('tax', (ctx) => ctx.subtotal * 0.08)
   *   .map((ctx) => ctx.subtotal + ctx.tax);
   * //      ▲
   * //      └─── { subtotal: number; tax: number }
   * ```
   */
  let<Key extends string, ValueToBind extends {}>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbidden<'Option', 'let'>,
    key: Exclude<Key, keyof Value>,
    fn: (ctx: DoNotation.Unbrand<Value>) => NoOptionGuard<ValueToBind, 'bind'>,
  ): Option<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
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
      value: DoNotation.Unbrand<Value>,
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
  andThen<$Option extends Option.Any>(
    onSome: (value: DoNotation.Unbrand<Value>) => $Option,
  ): $Option;

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
  filter<Output extends DoNotation.Unbrand<Value>>(
    refinement: Predicate.Guard<DoNotation.Unbrand<Value>, Output>,
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
    predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>,
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
  ): Option<Tuple<DoNotation.Unbrand<Value>, DoNotation.Unbrand<Value2>>>;

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
      arg0: DoNotation.Unbrand<Value>,
      arg1: DoNotation.Unbrand<Value2>,
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
    cases: Option.Match<DoNotation.Unbrand<Value>, Output, NoneOutput>,
  ): Output | NoneOutput;

  /**
   * Unwraps the `Option` value.
   *
   * @throws `Panic` if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const findUserById: (id: string) => User | null;
   *
   * //     ┌─── User
   * //     ▼
   * const user = Option.fromNullable(findUserById('user_123')).unwrap();
   *
   * const team = Option.none<Team>().unwrap();
   * // Output: Uncaught exception: 'called "Option.unwrap()" on a "None" value'
   * ```
   */
  unwrap(): DoNotation.Unbrand<Value>;

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
   * const baseUrl = Option.fromNullable(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://app.example.com'
   *
   * const apiKey = Option.none<string>()
   *   .unwrapOr(() => 'api_test_123');
   * // Output: 'api_test_123'
   * ```
   */
  unwrapOr(onNone: () => DoNotation.Unbrand<Value>): DoNotation.Unbrand<Value>;

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
  unwrapOrNull(): DoNotation.Unbrand<Value> | null;

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
  unwrapOrUndefined(): DoNotation.Unbrand<Value> | undefined;

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
  ): DoNotation.Unbrand<Value>;

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
  contains(predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>): boolean;

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
  toArray(): Array<DoNotation.Unbrand<Value>>;

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
  tap(onSome: (value: DoNotation.Unbrand<Value>) => unknown): Option<Value>;

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
  isSome(): boolean;

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
  isNone(): boolean;

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
    equalityFn?: EqualityFn<DoNotation.Unbrand<Value>>,
  ): boolean;
}

export declare namespace Option {
  type Any = Option<any> | Option<never>;

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
