/* eslint-disable @typescript-eslint/no-namespace */
import { UnexpectedOptionException, UnwrapError } from './exceptions';
import { identity } from './functions';
import { refEquality } from './internals/equality';
import { INSPECT_SYMBOL } from './internals/inspect';
import type { Falsy } from './internals/types';
import type { EqualityFn, Predicate, Refinement } from './predicate';
import type { Result } from './result';
import type { Lazy, Nullable } from './types';

const $some = Symbol('Option::Some');
const $none = Symbol('Option::None');

declare namespace Type {
  type Some = typeof $some;
  type None = typeof $none;
}

interface PatternMatch<Value, Output, NoneOutput> {
  Some: (value: Value) => Output;
  None: () => NoneOutput;
}

type NoOptionReturnedInMapGuard<Value> =
  Value extends Option<infer _> ?
    'ERROR: Use `andThen` instead. Cause: the transformation is returning an Option, use `andThen` to flatten the Option.'
  : Value;

type InferOptionValue<Output> =
  Output extends Option<infer Value> ?
    /* removes `never` from union */
    Value extends never ? never
    : /* removes `any` from union */
    unknown extends Value ? never
    : Value
  : never;

/**
 * `Option` represents an optional value: every `Option` is either `Some` and contains a value, or `None`, and it's empty.
 *
 * It is commonly used to represent the result of a function that may not return a value due to failure or missing data, such as a network request, a file read, or a database query.
 *
 */
export class Option<Value> {
  readonly #tag: Type.Some | Type.None;

  readonly #value: Value;

  private constructor(tag: Type.None);

  private constructor(tag: Type.Some, value: Value);

  private constructor(tag: Type.Some | Type.None, value?: any) {
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
  static of = Option.some; // eslint-disable-line @typescript-eslint/member-ordering

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
   * Constructs an `Option` from a nullable value.
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
   * const option = Option.fromNullable(user.lastName);
   * ```
   */
  static fromNullable<Value>(
    value: Nullable<Value>,
  ): Option<NonNullable<Value>> {
    return value == null ? Option.none() : Option.some(value);
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
   * Constructs an `Option` from a `Result`.
   *
   * If the `Result` is `Ok`, returns a `Some` with the value.
   * Otherwise, returns a `None` Option.
   *
   * If the `Result` is `Ok` but its value is `null` or `undefined`, a `None` Option is returned.
   *
   * @example
   * ```ts
   * import { Option, Result } from 'funkcia';
   *
   * declare const result: Result<User, UserNotFound>;
   *
   * // Output: Option<User>
   * const option = Option.fromResult(result);
   * ```
   */
  static fromResult<Value, _>(
    result: Result<Value, _>,
  ): Option<NonNullable<Value>> {
    return result.match({
      Ok: Option.fromNullable,
      Error: () => Option.none(),
    });
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
   * const url = Option.try(() => new URL('example.com'));
   * //     ^? Option<URL>
   * ```
   */
  static try<Value>(fn: () => Value): Option<NonNullable<Value>> {
    try {
      return Option.fromNullable(fn());
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
  static wrap<Callback extends (...args: any[]) => Option<any> | Option<never>>(
    fn: Callback,
  ): (
    ...args: Parameters<Callback>
  ) => Option<InferOptionValue<ReturnType<Callback>>> {
    return (...args) => fn(...args);
  }

  /**
   * Produces a function that returns an `Option` from a function
   * that may throw or return a nullable value.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * const safeJsonParse = Option.produce(JSON.parse);
   * //         ^?  (text: string, reviver?: Function) => Option<any>
   *
   * // Output: Option<any>
   * const profile = safeJsonParse('{ "name": "John Doe" }');
   * ```
   */
  static produce<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Option<NonNullable<Value>> {
    return (...args) => Option.try(() => callback(...args));
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
   * const isCircle = Option.definePredicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * // Output: Option<Circle>
   * const option = isCircle(input);
   * ```
   */
  static definePredicate<Value, Output extends Value>(
    refinement: Refinement<Value, Output>,
  ): (input: Value) => Option<Output>;

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
   * const isPositive = Option.definePredicate(
   *   (value: number) => value > 0,
   * );
   *
   * // Output: Option<number>
   * const option = isPositive(input);
   * ```
   */
  static definePredicate<Value>(
    predicate: Predicate<Value>,
  ): (input: Value) => Option<Value>;

  static definePredicate(
    predicate: Predicate<any>,
  ): (input: any) => Option<any> {
    return (input) => Option.of(input).filter(predicate);
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
    cases: PatternMatch<Value, Output, NoneOutput>,
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
  unwrap(): Value {
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
  unwrapOr(onNone: () => Value): Value {
    return this.match({ Some: identity, None: onNone });
  }

  /**
   * Unwraps the `Option` value.
   *
   * @throws `UnexpectedOptionError` with the provided message if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: User
   * const user = Option.some(maybeUser).expect('User not found');
   *
   * // Uncaught exception: 'Team not found'
   * const team = Option.none().expect('Team not found');
   * ```
   */
  expect(onNone: string): Value;

  /**
   * Unwraps the `Option` value.
   *
   * @throws the provided Error if the `Option` is `None`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   * // Output: User
   * const user = Option.some(maybeUser).expect(
   *   () => new UserNotFound(userId)
   * );
   *
   * // Uncaught exception: 'Team not found: "team_01"'
   * const team = Option.none().expect(
   *   () => new TeamNotFound('team_01')
   * );
   * ```
   */
  expect<Exception extends globalThis.Error>(onNone: Lazy<Exception>): Value;

  expect(onNone: string | Lazy<globalThis.Error>): Value {
    return this.unwrapOr(() => {
      if (typeof onNone === 'string') {
        throw new UnexpectedOptionException(onNone);
      }

      throw onNone();
    });
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
   * const user = Option.some(databaseUser).toNullable();
   * ```
   */
  toNullable(): Value | null {
    return this.match({ Some: identity, None: () => null });
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
   * const user = Option.some(databaseUser).toUndefined();
   * ```
   */
  toUndefined(): Value | undefined {
    return this.match({ Some: identity, None: () => undefined });
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
  contains(predicate: Predicate<Value>): boolean {
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
  map<Output extends {}>(
    onSome: (value: Value) => NoOptionReturnedInMapGuard<Output>,
  ): Option<Output> {
    if (this.isNone()) {
      return this as never;
    }

    // @ts-expect-error the compiler is complaining because of the NoOptionReturnedInMapGuard guard
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
    onSome: (value: Value) => Option<Output>,
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
  filter<Output extends Value>(
    refinement: Refinement<Value, Output>,
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
  filter(predicate: Predicate<Value>): Option<Value>;

  filter(predicate: Predicate<Value>): this {
    if (this.isNone()) {
      return this;
    }

    return predicate(this.#value) ? this : (Option.none() as never);
  }

  // -----------------------
  // ---MARK: FALLBACKS---
  // -----------------------

  /**
   * Replaces the current `Option` with the provided fallback `Option`, when it is `None`.
   *
   * If the current `Option` is `Some`, it returns the current `Option`.
   *
   * @example
   * ```ts
   * import { Option } from 'funkcia';
   *
   *  // Output: 'Smith'
   * const option = Option.some('Smith')
   *   .or(() => Option.some('John'))
   *   .unwrap();
   *
   *
   * // Output: 'John'
   * const greeting = Option.none()
   *   .or(() => Option.some('John'))
   *   .unwrap();
   * ```
   */
  or(onNone: Lazy<Option<Value>>): Option<Value> {
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
   * const maybeUser = findUserById('user_01');
   *
   * if (maybeUser.isSome()) {
   *   // Output: User
   *   const user = maybeUser.unwrap(); // `unwrap` will not throw
   * }
   * ```
   */
  isSome(): this is Option.Some<Value> {
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
   * const maybeUser = findUserByEmail(data.email);
   *
   * if (maybeUser.isNone()) {
   *   return await createUser(data)
   * }
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
  equals = (
    other: Option<Value>,
    equalityFn: EqualityFn<Value> = refEquality,
  ): boolean => {
    try {
      return equalityFn(this.unwrap(), other.unwrap());
    } catch {
      return this.isNone() && other.isNone();
    }
  };

  protected [INSPECT_SYMBOL] = (): string =>
    this.match({
      Some: (value) => `Some(${JSON.stringify(value)})`,
      None: () => 'None',
    });
}

declare namespace Option {
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
