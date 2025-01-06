import type { FunkciaMode } from './do-notation';
import { DoNotation, FUNKCIA_MODE } from './do-notation';
import type { MissingValueError } from './exceptions';
import { UnwrapError } from './exceptions';
import { identity, stubNull, stubUndefined } from './functions';
import { FunkciaStore } from './funkcia-store';
import type { EqualityFn } from './internals/equality';
import { isEqual } from './internals/equality';
import type { Falsy } from './internals/types';
import { logiffy } from './internals/utils';
import type { Predicate } from './predicate';
import type { Result } from './result';
import type { Lazy, Nullish } from './types';

const $some = Symbol.for('Option::Some');
const $none = Symbol.for('Option::None');

/**
 * `Option` represents an optional value: every `Option` is either `Some` and contains a value, or `None`, and it's empty.
 *
 * It is commonly used to represent the result of a function that may not return a value due to failure or missing data, such as a network request, a file read, or a database query.
 *
 */
export class Option<T> extends DoNotation<T> {
  readonly #tag: Option.$some | Option.$none;

  readonly #value: T;

  private constructor(
    tag: Option.$none,
    value?: undefined,
    options?: FunkciaMode.Options,
  );

  private constructor(
    tag: Option.$some,
    value: T,
    options?: FunkciaMode.Options,
  );

  private constructor(
    tag: Option.$some | Option.$none,
    value?: any,
    options?: FunkciaMode.Options,
  ) {
    super(options?.mode);

    this.#tag = tag;
    this.#value = value;
  }

  // ------------------------
  // ---MARK: CONSTRUCTORS---
  // ------------------------

  /**
   * Constructs a `Some` Option with the provided value.
   *
   * Use it when to be explicit construct a `Some`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: Option<number>
   * const option = Option.some(10);
   * ```
   */
  static some<Value extends {}>(value: Value): Option<Value> {
    return new Option($some, value);
  }

  /**
   * @alias
   * Alias of `Option.some` - constructs a `Some` Option with the provided value.
   *
   * Useful to indicate the creation of an `Option` that is immediately going to be processed.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare const denominator: number;
   *
   * // Output: Option<number>
   * const option = Option.of(denominator)
   *   .filter((number) => number > 0)
   *   .map((number) => 10 / number);
   * ```
   */
  static of: <Value extends {}>(value: Value) => Option<Value> = Option.some; // eslint-disable-line @typescript-eslint/member-ordering, @typescript-eslint/no-shadow

  /**
   * Constructs a `None` Option, representing an empty value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * function divide(numerator: number, denominator: number): Option<number> {
   *   if (denominator === 0) {
   *     return Option.none();
   *   }
   *
   *   return Option.some(numerator / denominator);
   * }
   * ```
   */
  static none<Value = never>(): Option<Value> {
    return new Option($none);
  }

  /**
   * Initiates a `Do-notation`  for the `Option` type, allowing to write code
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
   * // Output: Option<number>
   * const option = Option.Do
   *   .bind('a', () => Option.some(10))
   *   .bind('b', (ctx) => Option.some(ctx.a * 2))
   *   .let('result', ({ a, b }) => a + b)
   *   .map(({ result }) => result);
   * ```
   */
  static get Do(): Option<Readonly<{}>> {
    return new Option($some, Object.create(null), {
      mode: FUNKCIA_MODE.DO_NOTATION,
    });
  }

  /**
   * Constructs an `Option` from a nullish value.
   *
   * If the value is `null` or `undefined`, returns a `None`.
   * Otherwise, returns a `Some` with the value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   *   age: number;
   * }
   *
   * // Output: Option<string>
   * const option = Option.fromNullish(user.lastName);
   * ```
   */
  static fromNullish<Value>(value: Nullish<Value>): Option<NonNullable<Value>> {
    return value != null ? Option.some(value) : Option.none();
  }

  /**
   * Constructs an `Option` from a _falsy_ value.
   *
   * If the value is _falsy_, returns a `None`.
   * Otherwise, returns a `Some` with the value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * function getEnv(variable: string): string {
   *   return process.env[variable] ?? '';
   * }
   *
   * // Output: Option<string>
   * const option = Option.fromFalsy(getEnv('BASE_URL'));
   * ```
   */
  static fromFalsy<Value>(
    value: Value | Falsy,
  ): Option<Exclude<NonNullable<Value>, Falsy>> {
    return (value ? Option.some(value) : Option.none()) as never;
  }

  /**
   * Returns the first `Some` value in the array. If all values are `None`, returns `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: Option<1>
   * const option = Option.fromFirstSome([
   *   Option.some(1),
   *   Option.none<number>(),
   *   Option.some(3),
   * ]);
   *
   * ```
   */
  static fromFirstSome<Value>(options: Array<Option<Value>>): Option<Value> {
    for (const option of options) {
      if (option.isSome()) return option;
    }

    return Option.none();
  }

  /**
   * Constructs an `Option` from a function that may throw.
   *
   * If the function throws, or returns `null` or `undefined`, returns a `None`.
   * Otherwise, returns a `Some` with the value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const url = Option.fromThrowable(() => new URL('example.com'));
   * //     ^? Option<URL>
   * ```
   */
  static fromThrowable<Value>(fn: () => Value): Option<NonNullable<Value>> {
    try {
      return Option.fromNullish(fn());
    } catch {
      return Option.none();
    }
  }

  /**
   * Utility wrapper to ensure a function always returns an `Option`.
   *
   * This method provides a better inference over the return of the function,
   * and guarantees that the function will always return an `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // When defining a normal function allowing typescript to infer the return type,
   * //the return type is always a union of `Option<T>` and `Option<never>`
   * function greaterThanZero(value: number) {
   *   return value > 0 ? Option.some(value) : Option.none();
   * }
   *
   * // Output: Option<number> | Option<never>
   * const option = greaterThanZero(10);
   *
   * // When using the `wrap` method, the return type is always `Option<T>`
   * const greaterThanZero = Option.wrap((value: number) => {
   *   return value > 0 ? Option.some(value) : Option.none();
   * });
   *
   * // Output: Option<number>
   * const option = greaterThanZero(10);
   * ```
   */
  static enhance<
    Callback extends (...args: any[]) => Option<any> | Option<never>,
  >(
    fn: Callback,
  ): (
    ...args: Parameters<Callback>
  ) => Option<Option.UnwrapOption<ReturnType<Callback>>> {
    return (...args) => fn(...args);
  }

  /**
   * Decorates a function that may throw or return a nullable value
   * returning a modified function that returns an `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const safeJsonParse = Option.wrap(JSON.parse);
   * //         ^?  (text: string, reviver?: Function) => Option<any>
   *
   * // Output: Option<any>
   * const profile = safeJsonParse('{ "name": "John Doe" }');
   * ```
   */
  static wrap<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Option<NonNullable<Value>> {
    return (...args) => Option.fromThrowable(() => callback(...args));
  }

  /**
   * Creates a function that can be used to refine the type of a value.
   *
   * The predicate function takes a value and returns a `Option` with either
   * the narrowed value or a `None` Option.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const ensureCircle = Option.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * // Output: Option<Circle>
   * const option = ensureCircle(shape);
   * ```
   */
  static guard<Guard extends Predicate.Guard<any, any>>(
    refinement: Guard,
  ): (
    ...args: Parameters<Guard>
  ) => Option<Predicate.$inferRefinedValue<Guard>>;

  /**
   * Creates a function that can be used to assert the type of a value.
   *
   * The predicate function takes a value and returns a `Option` with either
   * the value or a `None` Option.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const ensurePositive = Option.predicate(
   *   (value: number) => value > 0,
   * );
   *
   * // Output: Option<number>
   * const option = ensurePositive(input);
   * ```
   */
  static guard<Guard extends Predicate.Predicate<any>>(
    predicate: Guard,
  ): (...args: Parameters<Guard>) => Option<Parameters<Guard>[0]>;

  static guard(
    predicate: Predicate.Predicate<any>,
  ): (input: any) => Option<any> {
    return (input) => Option.of(input).filter(predicate);
  }

  /**
   * Evaluates a generator early returning when a `None` is propagated
   * or returning the `Option` returned by the generator.
   *
   * `yield*` an `Option<Value>` unwraps values and propagates `None`s.
   *
   * If the value is `Option.None`, then it will return `Option.None`
   * from the enclosing function.
   *
   * If applied to `Option.Some<x>`, then it will unwrap the value to evaluate `x`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function safeParseInt(value: string): Option<number>;
   *
   * // Output: Option<number>
   * const result = Option.try(function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('24a'); // returns Option.None immediately
   *
   *   return Option.some(x + y); // doesn't run
   * });
   * ```
   */
  static try<Value extends {}>(
    generator: () => Generator<never, Option<Value>>,
  ): Option<Value> {
    const next = generator().next();

    if (!next.done) return Option.none();

    return next.value;
  }

  // ------------------------
  // ---MARK: COMBINATIONS---
  // ------------------------

  /**
   * Given an array of `Option`s, returns an array containing only the values inside `Some`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: [1, 3]
   * const output = Option.values([
   *   Option.some(1),
   *   Option.none<number>(),
   *   Option.some(3),
   * ]);
   * ```
   */
  static values<Value>(options: Array<Option<Value>>): Value[] {
    return options.reduce<Value[]>((acc, option) => {
      if (option.isSome()) acc.push(option.unwrap());

      return acc;
    }, []);
  }

  // -----------------------
  // ---MARK: DO-NOTATION---
  // -----------------------

  /**
   * Initiates a `Do-notation` with the current `Option`, binding it to the
   * context object with the provided variable.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: Option<number>
   * const option = Option.some(10)
   *   .bindTo('a')
   *   .let('b', (ctx) => ctx.a * 2)
   *   .map(({ a, b }) => a + b);
   * ```
   */
  bindTo<Key extends string>(key: Key): Option<Readonly<{ [K in Key]: T }>> {
    return Option.Do.bind(key, () => this as never) as never;
  }

  /**
   * Binds an `Option` to the context object in a `Do-notation`.
   *
   * If the `Option` is `Some`, the value is assigned to the variable in the context object.
   * If the `Option` is `None`, the parent `Option` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: Option<number>
   * const option = Option.Do
   *   .bind('a', (ctx) => Option.some(10))
   *   .bind('a', (ctx) => Option.some(ctx * 2))
   *   .map(({ a, b }) => a + b);
   * ```
   */
  bind<Key extends string, U extends {}>(
    key: Exclude<Key, keyof T>,
    fn: (ctx: T) => Option<U>,
  ): Option<
    Readonly<{
      [K in Key | keyof T]: K extends keyof T ? T[K] : U;
    }>
  > {
    this.assertDoNotation('bind');

    return this.andThen((ctx) =>
      fn(ctx).map(
        (value) =>
          // eslint-disable-next-line prefer-object-spread
          Object.assign({ [key]: value }, ctx) as {},
      ),
    ).match({
      Some: (ctx) => new Option($some, ctx, { mode: this.mode }) as never,
      None: () =>
        this.isNone() ?
          (this as never)
        : (new Option($none, undefined, { mode: this.mode }) as never),
    });
  }

  /**
   * Binds a simple value to the context object in a `Do-notation`.
   *
   * If the value is not nullish, the value is assigned to the variable in the context object.
   * If the value is `null` or `undefined`, the parent `Option` running the `Do` simulation becomes a `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: Option<number>
   * const option = Option.Do
   *   .let('a', (ctx) => 10)
   *   .let('b', (ctx) => ctx.a * 2)
   *   .map(({ a, b }) => a + b);
   * ```
   */
  let<Key extends string, ValueToBind extends {}>(
    key: Exclude<Key, keyof T>,
    fn: (ctx: T) => Option.NoOptionInReturnGuard<ValueToBind, 'bind'>,
  ): Option<
    Readonly<{
      readonly [K in Key | keyof T]: K extends keyof T ? T[K]
      : NonNullable<ValueToBind>;
    }>
  > {
    this.assertDoNotation('let');

    return this.bind(key, (ctx) => Option.fromNullish(fn(ctx)) as never);
  }

  // -----------------------
  // ---MARK: CONVERSIONS---
  // -----------------------

  /**
   * Compare the `Option` against the possible patterns and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   *   age: number;
   * }
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * declare function getUserLastName(user: User): Option<string>;
   *
   * // Output: string
   * const userGreeting = findUserById('user_01')
   *   .andThen(getUserLastName)
   *   .match({
   *     Some(lastName) {
   *       return `Hello, Mr. ${lastName}`;
   *     },
   *     None() {
   *       return 'Hello, stranger';
   *     },
   *   });
   * ```
   */
  match<Output, NoneOutput>(
    cases: Option.Match<T, Output, NoneOutput>,
  ): Output | NoneOutput {
    return this.isSome() ? cases.Some(this.#value) : cases.None();
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
   * // Output: User
   * const user = Option.some(databaseUser).unwrap();
   *
   * // Uncaught exception: 'called "Option.unwrap()" on a "None" value'
   * const team = Option.none().unwrap();
   * ```
   */
  unwrap(): T {
    return this.unwrapOr(() => {
      throw new UnwrapError('Option');
    });
  }

  /**
   * Unwraps the `Option` value.
   * If the Option is `None`, returns the result of the provided callback.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: 'https://docs.funkcia.io'
   * const baseUrl = Option.some(process.env.BASE_URL)
   *   .unwrapOr(() => 'http://localhost:3000');
   *
   * // Output: 'sk_test_9FK7CiUnKaU'
   * const apiKey = Option.none()
   *   .unwrapOr(() => 'sk_test_9FK7CiUnKaU');
   * ```
   */
  unwrapOr(onNone: () => T): T {
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
   * // Output: User | null
   * const user = Option.some(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull(): T | null {
    return this.unwrapOr(stubNull as never);
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
   * // Output: User | undefined
   * const user = Option.some(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined(): T | undefined {
    return this.unwrapOr(stubUndefined as never);
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
   * declare function findUserById(id: string): Option<User>
   *
   * // Output: User
   * const user = findUserById('user_01').expect(
   *   () => new UserNotFound(userId),
   * );
   *
   * // Uncaught exception: 'User not found: "user_01"'
   * const anotherUser = findUserById('invalid_id').expect(
   *   () => new UserNotFound('team_01'),
   * );
   * ```
   */
  expect<Exception extends globalThis.Error>(onNone: Lazy<Exception>): T {
    return this.unwrapOr(() => {
      throw onNone();
    });
  }

  /**
   * Converts an `Option` to a `Result`.
   *
   * If `Option` is `Some`, returns a `Result.ok`.
   * If `Option` is `None`, returns a `Result.error` with a `MissingValueError`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * declare function authorizeUser(user: User): Result<User, MissingValueError | UnauthorizedUserError>;
   *
   * // Output: Result<User, MissingValueError | UnauthorizedUserError>
   * const authorizedUser = findUserById('user_01')
   *   .toResult()
   *   .andThen(authorizeUser);
   */
  toResult(): Result<NonNullable<T>, MissingValueError> {
    return FunkciaStore.Result.fromNullish(this.unwrapOrNull());
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
   * // Output: number[]
   * const output = Option.some(10).toArray();
   * ```
   */
  toArray(): T[] {
    return this.match({ Some: (value) => [value], None: () => [] });
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
   * // Output: true
   * const isPositive = Option.some(10).contains(num => num > 0);
   * ```
   */
  contains(predicate: Predicate.Predicate<T>): boolean {
    return this.isSome() && predicate(this.#value);
  }

  // ---------------------------
  // ---MARK: TRANSFORMATIONS---
  // ---------------------------

  /**
   * Applies a callback function to the value of the `Option` when it is `Some`,
   * returning a new `Option` containing the new value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: Option<number>
   * const option = Option.some(10).map(number => number * 2);
   * ```
   */
  map<Output>(
    onSome: (value: T) => Option.NoOptionInReturnGuard<Output, 'andThen'>,
  ): Option<Output> {
    if (this.isNone()) {
      return this as never;
    }

    // @ts-expect-error the compiler is complaining because of NoOptionInMapGuard
    return Option.some(onSome(this.#value));
  }

  /**
   * Applies a callback function to the value of the `Option` when it is `Some`,
   * and returns the new value.
   *
   * This is similar to map (also known as `flatMap`), with the difference
   * that the callback must return an `Option`, not a raw value.
   * This allows chaining multiple calls that return `Option`s together.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   *   age: number;
   * }
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * declare function getUserLastName(user: User): Option<string>;
   *
   *  // Output: Option<string>
   * const option = findUserById('user_01').andThen(getUserLastName)
   * ```
   */
  andThen<Output extends {}>(
    onSome: (value: T) => Option<Output>,
  ): Option<Output> {
    return this.isSome() ? onSome(this.#value) : (this as never);
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
   * // Output: Option<Circle>
   * const circle = Option.of<Square | Circle>(input).filter(
   *   (shape): shape is Circle => shape.kind === 'circle',
   * );
   * ```
   */
  filter<Output extends T>(
    refinement: Predicate.Guard<T, Output>,
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
   * const option = Option.of(user).filter((user) => user.age >= 21);
   * ```
   */
  filter(predicate: Predicate.Predicate<T>): Option<T>;

  filter(predicate: Predicate.Predicate<T>): this {
    if (this.isNone()) {
      return this;
    }

    return predicate(this.#value) ? this : (Option.none() as never);
  }

  // -----------------------
  // ---MARK: FALLBACKS---
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
   *  // Output: "Paul"
   * const option = Option.some('Paul')
   *   .or(() => Option.some('John'))
   *   .unwrap();
   *
   *
   * // Output: "John"
   * const greeting = Option.none()
   *   .or(() => Option.some('John'))
   *   .unwrap();
   * ```
   */
  or(onNone: Lazy<Option<T>>): Option<T> {
    return this.isSome() ? this : onNone();
  }

  // -----------------------
  // ---MARK: COMPARISONS---
  // -----------------------

  /**
   * Returns `true` is the Option contains a value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * declare function findUserById(id: string): Option<User>;
   *
   * const user = findUserById('user_01');
   *
   * if (user.isSome()) {
   *   return user.unwrap(); // `unwrap` will not throw
   * }
   * ```
   */
  isSome(): this is Option.Some<T> {
    return this.#tag === $some;
  }

  /**
   * Returns `true` is the Option is empty.
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
    return this.#tag === $none;
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
   * // Output: true
   * const option = Option.of(10).equals(Option.some(10));
   * ```
   */
  equals = (that: Option<T>, equalityFn: EqualityFn<T> = isEqual): boolean => {
    try {
      return equalityFn(this.unwrap(), that.unwrap());
    } catch {
      return this.isNone() && that.isNone();
    }
  };

  // -----------------
  // ---MARK: OTHER---
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
   * // Output: Option<number>
   * const option = Option.some(10).tap((value) => console.log(value)); // Logs: 10
   * ```
   */
  tap(onSome: (value: T) => void): this {
    if (this.isSome()) onSome(this.#value);

    return this;
  }

  *[Symbol.iterator](): Iterator<never, T> {
    if (this.isNone()) {
      yield undefined as never;
    }

    return this.#value;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.match({
      Some: (value) => `Some(${logiffy(value)})`,
      None: () => 'None',
    });
  }
}

FunkciaStore.register(Option);

declare namespace Option {
  type $some = typeof $some;
  type $none = typeof $none;

  interface Match<Value, Output, NoneOutput> {
    Some: (value: Value) => Output;
    None: () => NoneOutput;
  }

  type NoOptionInReturnGuard<Value, AnotherMethod extends string> =
    Value extends Option<infer _> ?
      `ERROR: Use "${AnotherMethod}" instead. Cause: the transformation is returning an Option, use "${AnotherMethod}" to flatten the Option.`
    : Value extends null ? never
    : undefined extends Value ? never
    : Value;

  type UnwrapOption<Output> =
    Output extends Option<infer Value> ?
      /* removes `never` from union */
      Value extends never ? never
      : /* removes `any` from union */
      unknown extends Value ? never
      : Value
    : never;

  interface Some<Value> {
    /**  @override this method is safe to call on a `Some` Option */
    unwrap: () => Value;
    /**  @override this method has no effect on a `Some` Option */
    unwrapOr: never;
    /**  @override this method will not throw the expected error on a `Some` Option, use `unwrap` instead */
    expect: never;
    /**  @override this method has no effect on a `Some` Option */
    toNullable: never;
    /**  @override this method has no effect on a `Some` Option */
    toUndefined: never;
    /**  @override this method has no effect on a `Some` Option */
    or: never;
    /**  @override this method has no effect on a `Some` Option */
    isNone: never;
  }

  interface None {
    /** @override this method has no effect on a `None` Option */
    match: never;
    /** @override this method has no effect on a `None` Option */
    unwrap: never;
    /** @override this method has no effect on a `None` Option */
    expect: never;
    /** @override this method has no effect on a `None` Option */
    map: never;
    /** @override this method has no effect on a `None` Option */
    andThen: never;
    /** @override this method has no effect on a `None` Option */
    filter: never;
    /** @override this method has no effect on a `None` Option */
    contains: never;
    /** @override this method has no effect on a `None` Option */
    isSome: never;
  }
}
