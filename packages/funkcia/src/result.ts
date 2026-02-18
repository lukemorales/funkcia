import type { DoNotation } from './do-notation';
import {
  FailedPredicateError,
  NoValueError,
  panic,
  UnhandledException,
} from './exceptions';
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
import type { Option } from './option';
import type { Predicate } from './predicate';

class Ok<T> {
  readonly _tag = 'Ok';
  readonly value: T;

  constructor(value: T) {
    this.value = value;
    Object.freeze(this);
  }

  bindTo(key: string) {
    return new Ok({ [key]: this.value });
  }

  bind(key: string, cb: (value: T) => Result<any, any>) {
    return catchDefect(
      () =>
        cb(this.value).map(
          (v) => Object.assign({ [key]: v }, this.value) as {},
        ) as never,
      `A defect occurred while binding “${key}” to a do-notation in Result.bind`,
    );
  }

  let(key: string, fn: (value: T) => any) {
    return catchDefect(
      () =>
        new Ok(fn(this.value)).map(
          (v) => Object.assign({ [key]: v }, this.value) as {},
        ) as never,
      `A defect occurred while binding “${key}” to a do-notation in Result.let`,
    );
  }

  map(cb: (value: T) => any) {
    return catchDefect(
      () => new Ok(cb(this.value)) as never,
      "A defect occurred while mapping a Result's value",
    );
  }

  mapError() {
    return this as never;
  }

  mapBoth(cases: { Ok: (value: T) => any; Error: (error: any) => any }) {
    return catchDefect(
      () => new Ok(cases.Ok(this.value)) as never,
      'A defect occurred while mapping both the Ok value of a Result',
    );
  }

  andThen(cb: (value: T) => Result<any, any>) {
    return catchDefect(
      () => cb(this.value) as never,
      'A defect occurred while chaining a Result',
    );
  }

  filter(cb: (value: T) => boolean, onUnfulfilled?: (value: T) => any) {
    return catchDefect(
      () =>
        (cb(this.value)
          ? this
          : new Err(
              onUnfulfilled?.(this.value) ??
                new FailedPredicateError(this.value),
            )) as never,
      "A defect occurred while filtering a Result's value",
    );
  }

  or() {
    return this as never;
  }

  swap() {
    return new Err(this.value) as never;
  }

  zip(that: Result<any, any>) {
    return that.map((val2) => [this.value, val2]);
  }

  zipWith(that: Result<any, any>, fn: (a: T, b: any) => any) {
    return that.map((val2) => fn(this.value, val2) as never) as never;
  }

  match(cases: { Ok: (value: T) => any; Error: (error: any) => any }) {
    return catchDefect(
      () => cases.Ok(this.value),
      `A defect occurred while matching the Ok case of a Result containing “${beautify(
        this.value,
      )}”`,
    );
  }

  unwrap() {
    return this.value;
  }

  unwrapError(): never {
    panic('called "Result.unwrapError()" on an "Ok" value');
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

  merge() {
    return this.value;
  }

  contains(predicate: (value: T) => boolean) {
    return catchDefect(
      () => predicate(this.value),
      `A defect occurred while checking if a Result contains a value`,
    );
  }

  toArray() {
    return [this.value];
  }

  tap(cb: (value: T) => unknown) {
    return catchDefect(() => {
      cb(this.value);
      return this;
    }, `A defect occurred while tapping a Result's value`);
  }

  tapError() {
    return this;
  }

  isOk = alwaysTrue as never;

  isError = alwaysFalse as never;

  equals(other: Result<any, any>, equalityFn: EqualityFn<T> = isEqual) {
    return catchDefect(
      () => other.contains((value) => equalityFn(this.value, value)),
      `A defect occurred while comparing a Result with another Result`,
    );
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `Result::Ok(${beautify(this.value)})`;
  }

  *[Symbol.iterator](): Iterator<never> {
    return this.value as never;
  }
}

class Err<E> {
  readonly _tag = 'Error';
  readonly error: E;

  constructor(error: E) {
    this.error = error;
    Object.freeze(this);
  }

  bindTo() {
    return this;
  }

  bind() {
    return this;
  }

  let() {
    return this;
  }

  map() {
    return this;
  }

  mapError(cb: (error: E) => any) {
    return catchDefect(
      () => new Err(cb(this.error)) as never,
      `A defect occurred while mapping an Error's value`,
    );
  }

  mapBoth(cases: { Ok: (value: any) => any; Error: (error: E) => any }) {
    return catchDefect(
      () => new Err(cases.Error(this.error)) as never,
      `A defect occurred while mapping Error case of a Result`,
    );
  }

  andThen() {
    return this;
  }

  filter() {
    return this;
  }

  or(onError: (error: E) => Result<any, any>) {
    return catchDefect(
      () => onError(this.error),
      `A defect occurred while or-ing a Result`,
    );
  }

  swap() {
    return new Ok(this.error) as never;
  }

  zip() {
    return this;
  }

  zipWith() {
    return this;
  }

  match(cases: { Ok: (value: any) => any; Error: (error: E) => any }) {
    return cases.Error(this.error);
  }

  unwrap(): never {
    panic('called "Result.unwrap()" on an "Error" value');
  }

  unwrapError() {
    return this.error;
  }

  unwrapOr(onError: (error: E) => any) {
    return catchDefect(
      () => onError(this.error),
      `A defect occurred while unwrapping or-ing a Result`,
    );
  }

  unwrapOrNull = alwaysNull;

  unwrapOrUndefined = alwaysUndefined;

  expect(onError: (error: E) => globalThis.Error): never {
    throw onError(this.error);
  }

  merge() {
    return this.error;
  }

  contains = alwaysFalse;

  toArray() {
    return [];
  }

  tap() {
    return this;
  }

  tapError(cb: (error: E) => unknown) {
    return catchDefect(() => {
      cb(this.error);
      return this;
    }, `A defect occurred while tapping Error case of a Result containing “${beautify(this.error)}”`);
  }

  isOk = alwaysFalse as never;

  isError = alwaysTrue as never;

  equals(
    other: Result<any, any>,
    _?: EqualityFn<any>,
    errorEqualityFn: EqualityFn<E> = isEqual,
  ) {
    return catchDefect(
      () => other.isError() && errorEqualityFn(this.error, other.unwrapError()),
      `A defect occurred while comparing Results`,
    );
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `Result::Error(${beautify(this.error)})`;
  }

  *[Symbol.iterator](): Iterator<E> {
    yield this.error as never;
  }
}

function ok(): Result<void, never>;
function ok<Value>(value: Value): Result<Value, never>;
function ok(value?: unknown): Result<unknown, never> {
  return new Ok(value) as never;
}

const error: ResultTrait['error'] = (err) => {
  return new Err(err) as never;
};

const tryCatch: ResultTrait['try'] = (fn: Thunk<any>, onThrow?: AnyUnaryFn) => {
  try {
    return ok(fn()) as never;
  } catch (e) {
    return error(onThrow?.(e) ?? new UnhandledException(String(e))) as never;
  }
};

const use: ResultTrait['use'] = (generator) => {
  const { done, value } = generator().next();

  return (done ? value : error(value)) as never;
};

function is(value: unknown): value is Result<unknown, unknown> {
  return value instanceof Ok || value instanceof Err;
}

/**
 * Error handling with `Result`.
 *
 * `Result` represents the result of an operation that can either be successful (`Ok`) or return an error (`Error`).
 *
 * `Result` is commonly used to represent the result of a function that can fail, such as a network request, a file read, or a database query.
 */
export const Result: ResultTrait = {
  is,
  ok,
  of: ok,
  error: error as never,
  fromNullable(value: any, onNullable?: Thunk<any>) {
    return value != null
      ? (ok(value) as never)
      : (error(onNullable?.() ?? new NoValueError()) as never);
  },
  fromFalsy(value: any, onFalsy?: AnyUnaryFn) {
    return (
      value ? ok(value) : error(onFalsy?.(value) ?? new NoValueError())
    ) as never;
  },
  fromOption(option: Option<any>, onNone?: Thunk<any>) {
    return (
      option.isSome()
        ? ok(option.unwrap())
        : error(onNone?.() ?? new NoValueError())
    ) as never;
  },
  get Do() {
    return ok(Object.create(null)) as never;
  },
  try: tryCatch,
  predicate(criteria: AnyUnaryFn, onUnfulfilled?: AnyUnaryFn) {
    return (value: any) =>
      ok(value).filter(criteria, onUnfulfilled as never) as never;
  },
  fn(fn: Function) {
    return (...args: any[]) => {
      const output = fn(...args);
      return (is(output) ? output : use(() => output)) as never;
    };
  },
  lift(callback: Function, onThrow?: AnyUnaryFn) {
    return (...args: any[]) =>
      tryCatch(() => callback(...args), onThrow as never) as never;
  },
  use,
  partition(results) {
    const values = [] as any[];
    const errors = [] as any[];

    for (const result of results) {
      result.match({
        Ok: (value) => values.push(value),
        Error: (error) => errors.push(error),
      });
    }

    return [values, errors];
  },
  values(results) {
    return results.reduce<Array<DoNotation.Unbrand<any>>>((acc, result) => {
      if (result.isOk()) acc.push(result.unwrap());

      return acc;
    }, []);
  },
  hydrate(value: any) {
    return (
      value._tag === 'Ok' ? ok(value.value) : error(value.error as {})
    ) as never;
  },
};

interface ResultTrait {
  /**
   * Checks if an unknown value is a `Result`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //              ┌─── unknown
   * //              ▼
   * if (Result.is(value)) {
   *   return value.map(handleUnknown);
   * //         ▲
   * //         └─── Result<unknown, unknown>
   *
   * }
   * ```
   */
  is(value: unknown): value is Result<unknown, unknown>;

  /**
   * Constructs an `Ok` `Result` with `void` as the value.
   *
   * Use it to explicitly construct an `OK`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<void, never>
   * //      ▼
   * const result = Result.ok();
   * ```
   */
  ok(): Result<void, never>;

  /**
   * Constructs an `Ok` `Result` with the provided value.
   *
   * Use it to explicitly construct an `OK`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<number, never>
   * //      ▼
   * const result = Result.ok(10);
   * ```
   */
  ok<Value>(value: Value): Result<Value, never>;

  /**
   * @alias
   * Alias of `Result.ok` - constructs an `Ok` `Result` with the provided value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<number, never>
   * //      ▼
   * const result = Result.of(10);
   * ```
   */
  of<Value>(value: Value): Result<Value, never>;

  /**
   * Constructs an `Error` result with the provided value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * function divide(dividend: number, divisor: number): Result<number, InvalidDivisor> {
   *   if (divisor === 0) {
   *     return Result.error(new InvalidDivisor());
   *   }
   *
   *   return Result.ok(dividend / divisor);
   * }
   * ```
   */
  error<Error extends {}>(error: Error): Result<never, Error>;

  /**
   * Constructs a `Result` from a nullable value.
   *
   * If the value is `null` or `undefined`, it returns a `Result.Error` with a `NoValueError` error.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const user: User | null;
   *
   * //      ┌─── Result<User, NoValueError>
   * //      ▼
   * const result = Result.fromNullable(user);
   * ```
   */
  fromNullable<Value>(
    value: Nullable<Value>,
  ): Result<NonNullable<Value>, NoValueError>;

  /**
   * Constructs a `Result` from a nullable value.
   *
   * If the value is `null` or `undefined`, it returns a `Result.Error` using the provided `onNullable` callback.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const user: User | null;
   *
   * //      ┌─── Result<string, UserNotFound>
   * //      ▼
   * const result = Result.fromNullable(
   *   user,
   *   () => new UserNotFound(),
   * );
   * ```
   */
  fromNullable<Value, Error extends {}>(
    value: Nullable<Value>,
    onNullable: Thunk<Error>,
  ): Result<NonNullable<Value>, Error>;

  /**
   * Constructs a `Result` from a _falsy_ value.
   *
   * If the value is _falsy_, it returns a `Result.Error` result with a `NoValueError` error.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── Result<string, NoValueError>
   * //      ▼
   * const result = Result.fromFalsy(user.lastName?.trim());
   * ```
   */
  fromFalsy<Value>(
    value: Value | Falsy,
  ): Result<Exclude<NonNullable<Value>, Falsy>, NoValueError>;

  /**
   * Constructs a `Result` from a _falsy_ value.
   *
   * If the value is _falsy_, it returns a `Result.Error` using the provided `onFalsy` callback.
   * Otherwise, it returns a `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * interface User {
   *   id: string;
   *   firstName: string;
   *   lastName: string | null;
   * }
   *
   * //      ┌─── Result<string, Error>
   * //      ▼
   * const result = Result.fromFalsy(
   *   user.lastName?.trim(),
   *   () => new Error('User missing last name'),
   * );
   * ```
   */
  fromFalsy<Value, Error extends {}>(
    value: Value | Falsy,
    onFalsy: (value: Falsy) => Error,
  ): Result<Exclude<NonNullable<Value>, Falsy>, Error>;

  fromOption<Value>(option: Option<Value>): Result<Value, NoValueError>;

  fromOption<Value, Error>(
    option: Option<Value>,
    onNone: () => Error,
  ): Result<Value, Error>;

  /**
   * Initiates a `Do-notation` for the `Result` type, allowing to write code
   * in a more declarative style, similar to the "do notation" in other programming languages.
   * It provides a way to define variables and perform operations on them
   * using functions like `bind` and `let`, piping the returned values into a context object.
   *
   * Within the `Do` scope, you can use the `bind` function to bind a value to a variable.
   * The `bind` function takes two arguments: the name of the variable and a function that returns a `Result` to be bound.
   * If the returned `Result` is `Ok`, the value is assigned to the variable in the context object.
   * If the returned `Result` is `Error`, the parent `Result` running the `Do` simulation becomes an `Error`.
   *
   * You can also use the `let` function to bind a simple value to a variable.
   * The `let` function takes two arguments: the name of the variable and a function that returns a value to be bound.
   * You can return any value from the function, like a `string`, `number`, `boolean` etc,
   * and it will be assigned to the variable in the context object.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUser(id: string): Result<User, UserNotFound>;
   * declare function getUserScore(user: User): Result<UserScore, UserNotScored>;
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserNotScored>
   * //        ▼
   * const userLevel = Result.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   */
  get Do(): Result<DoNotation, never>;

  /**
   * Constructs a `Result` from a function that may throw.
   *
   * If the function executes successfully, it returns a `Result.Ok`.
   * Otherwise, it returns a `Result.Error` containing an `UnknownError` with the thrown exception.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── Result<URL, UnknownError>
   * //     ▼
   * const url = Result.try(() => new URL('example.com'));
   * // Output: Error(UnknownError)
   * ```
   */
  try<Value>(fn: () => Value): Result<Value, UnhandledException>;

  /**
   * Constructs a `Result` from a function that may throw.
   *
   * If the function does not throw, it returns a `Result.Ok`.
   * Otherwise, it returns a `Result.Error` containing the output of the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── Result<URL, Error>
   * //     ▼
   * const url = Result.try(
   *   () => new URL('example.com'),
   *   (error) => new Error('Invalid URL'),
   * );
   * // Output: Error('Invalid URL')
   * ```
   */
  try<Value, Error extends {}>(
    fn: () => Value,
    onThrow: (error: unknown) => Error,
  ): Result<Value, Error>;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `Result.Ok`, narrowing the value to the specified type predicate, if the predicate is fulfilled.
   *
   * If the test fails, returns a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //         ┌─── (shape: Shape) => Result<Circle, FailedPredicateError<Square>>
   * //         ▼
   * const ensureCircle = Result.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   * );
   *
   * //       ┌─── Result<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = ensureCircle(input);
   * ```
   */
  predicate<Criteria extends Predicate.Guard<any, any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Guard<infer Input, infer Output>
    ? Result<Output, FailedPredicateError<Predicate.Unguarded<Input, Output>>>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, returns a `Result.Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //          ┌─── (value: number) => Result<number, FailedPredicateError<number>>
   * //          ▼
   * const ensurePositive = Result.predicate(
   *   (value: number) => value > 0,
   * );
   *
   * //       ┌─── Result<number, FailedPredicateError<number>>
   * //       ▼
   * const result = ensurePositive(10);
   * // Output: Ok(10)
   * ```
   */
  predicate<Criteria extends Predicate.Predicate<any>>(
    criteria: Criteria,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Predicate<infer Input>
    ? Result<Input, FailedPredicateError<Input>>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating a `Result.Ok`, narrowing the value to the specified type predicate, if the predicate is fulfilled.
   *
   * If the test fails, it returns a `Result.Error` with the value provided by the `onUnfulfilled` function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //          ┌─── (shape: Shape) => Result<Circle, InvalidShapeError>
   * //          ▼
   * const ensureCircle = Result.predicate(
   *   (shape: Shape): shape is Circle => shape.kind === 'circle',
   *   (shape) => new InvalidShapeError(shape.kind),
   * //   ▲
   * //   └─── Square
   * );
   *
   * //       ┌─── Result<Circle, InvalidShapeError>
   * //       ▼
   * const result = ensureCircle(input);
   * ```
   */
  predicate<Criteria extends Predicate.Guard<any, any>, Error extends {}>(
    criteria: Criteria,
    onUnfulfilled: (
      input: Criteria extends Predicate.Guard<infer Input, infer Output>
        ? Predicate.Unguarded<Input, Output>
        : never,
    ) => Error,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Guard<infer _, infer Output>
    ? Result<Output, Error>
    : never;

  /**
   * Returns a function that asserts that a value passes the test implemented by the provided function,
   * creating an `Result.Ok`, with the value tested, if the predicate is fulfilled.
   *
   * If the test fails, it returns a `Result.Error` with the value provided by the `onUnfulfilled` function.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //          ┌─── (value: number) => Result<number, InvalidNumberError>
   * //          ▼
   * const ensurePositive = Result.predicate(
   *   (value: number) => value > 0,
   *   (value) => new InvalidNumberError(value),
   * );
   *
   * //       ┌─── Result<number, InvalidNumberError>
   * //       ▼
   * const result = ensurePositive(10);
   * // Output: Ok(10)
   * ```
   */
  predicate<Criteria extends Predicate.Predicate<any>, Error extends {}>(
    criteria: Criteria,
    onUnfulfilled: (
      input: Criteria extends Predicate.Predicate<infer Input> ? Input : never,
    ) => Error,
  ): (
    ...args: Parameters<Criteria>
  ) => Criteria extends Predicate.Predicate<infer Input>
    ? Result<Input, Error>
    : never;

  /**
   * Declare a function that always returns a `Result`.
   *
   * This method improves the inference of the function's
   * return value and guarantees that it will always return a `Result`.
   * It is extremely useful when your function can return multiple errors.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * // When defining a normal function allowing typescript to infer the return type,
   * // the return type is always a union of `Result<T, never>` and `Result<never, E>`
   * function hasAcceptedTermsOfService(user: User) {
   *   if (typeof user.termsOfService !== 'boolean') {
   *     return Result.error('NOT ACCEPTED' as const);
   *   }
   *
   *   return user.termsOfService ?
   *       Result.ok('ACCEPTED' as const)
   *     : Result.error('REJECTED' as const);
   * }
   *
   * //       ┌─── Result<'ACCEPTED', never> | Result<never, 'REJECTED'> | Result<never, 'NOT ACCEPTED'>
   * //       ▼
   * const result = hasAcceptedTermsOfService(user);
   *
   * // When using the `fun` method, the return type is always `Result<T, E>`
   * const improvedHasAcceptedTermsOfService = Result.fun(hasAcceptedTermsOfService);
   *
   * //       ┌─── Result<'ACCEPTED', 'REJECTED' | 'NOT ACCEPTED'>
   * //       ▼
   * const result = improvedHasAcceptedTermsOfService(user);
   * ```
   */
  fn<Args extends readonly unknown[], $Result extends Result.Any>(
    fn: (...args: Args) => Awaited<$Result>,
  ): (...args: Args) => Result<Result.Unwrap<$Result>, Result.Panic<$Result>>;

  /**
   * Returns a function that evaluates a generator when called with the declared arguments,
   * early returning when a `Result.Error` is propagated or returning the `Result` returned by the generator.
   *
   * - Each `yield*` automatically unwraps the `Result` value or propagates `Error`s.
   *
   * - If any operation returns `Result.Error`, the entire generator exits early.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function safeParseInt(string: string, radix?: number): Result<number, TypeError>;
   *
   * //           ┌─── (a: string, b: string) => Result<number, TypeError>
   * //           ▼
   * const sumParsedIntegers = Result.createFlow(function* (a: string, b: string) {
   *   const x: number = yield* safeParseInt(a);
   *   const y: number = yield* safeParseInt(b);
   *
   *   return Result.ok(x + y);
   * });
   *
   * const result = sumParsedIntegers('10', '20');
   * // Output: Ok(30)
   * ```
   */
  fn<
    Args extends readonly unknown[],
    $Result extends Result.Any,
    Error extends {},
  >(
    fn: (...args: Args) => Generator<Error, $Result>,
  ): (
    ...args: Args
  ) => Result<Result.Unwrap<$Result>, Error | Result.Panic<$Result>>;

  /**
   * Converts a function that may throw an exception to an enhanced function that returns a `Result`.
   *
   * If the function executes successfully, it returns a `Result.Ok` with the value obtained.
   * If an exception occurs, it returns a `Result.Error` with an `UnknownError` that contains the thrown exception.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── (text: string, reviver?: Function) => Result<any, UnknownError>
   * //         ▼
   * const safeJsonParse = Result.lift(JSON.parse);
   *
   * //       ┌─── Result<any, UnknownError>
   * //       ▼
   * const result = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Ok({ name: 'John Doe' })
   * ```
   */
  lift<Args extends readonly unknown[], Value>(
    callback: (...args: Args) => Value,
  ): (...args: Args) => Result<Value, UnhandledException>;

  /**
   * Converts a function that may throw an exception to an enhanced function that returns a `Result`.
   *
   * If the function executes successfully, it returns a `Result.Ok` with the obtained value.
   * If an exception occurs, it returns a `Result.Error` from the provided `onThrow` callback.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── (text: string, reviver?: Function) => Result<any, TypeError>
   * //         ▼
   * const safeJsonParse = Result.lift(
   *   JSON.parse,
   *   (error) => new TypeError('Invalid JSON'),
   * );
   *
   * //       ┌─── Result<any, TypeError>
   * //       ▼
   * const result = safeJsonParse('{ "name": "John Doe" }');
   * // Output: Ok({ name: 'John Doe' })
   * ```
   */
  lift<Args extends readonly unknown[], Value, Error extends {}>(
    callback: (...args: Args) => Value,
    onThrow: (error: unknown) => Error,
  ): (...args: Args) => Result<Value, Error>;

  /**
   * Evaluates a generator early returning when a `Result.Error` is propagated
   * or returning the `Result` returned by the generator.
   *
   * `yield*` a `Result<Value, Error>` unwraps values and propagates `Error`s.
   *
   * If the value is `Result.error<E>`, then it will return `Result.Error<E>`
   * from the enclosing function.
   *
   * If applied to `Result.Ok<U>`, then it will unwrap the value to evaluate `U`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const safeParseInt: (string: string, radix?: number) => Result<number, TypeError>;
   *
   * //       ┌─── Result<number, ParseIntError>
   * //       ▼
   * const result = Result.use(function* () {
   *   const x: number = yield* safeParseInt('10');
   *   const y: number = yield* safeParseInt('invalid'); // returns Result.Error<ParseIntError> immediately
   *
   *   return Result.ok(x + y); // doesn't run
   * });
   * // Output: Error(ParseIntError)
   * ```
   */
  use<$Result extends Result.Any, Error extends {}>(
    generator: () => Generator<Error, $Result>,
  ): Result<Result.Unwrap<$Result>, Error | Result.Panic<$Result>>;

  /**
   * Given an array of `Result`s, returns a tuple of arrays containing only the values inside `Ok` on the first position and `Error` on the second position.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── [number[], string[]]
   * //       ▼
   * const [values, errors] = Result.partition([
   *   Result.ok(1),
   *   Result.error('Failed computation'),
   *   Result.ok(3),
   * ]);
   * // Output: [1, 3], ['Failed computation']
   * ```
   */
  partition<T extends Array<Result.Any>>(
    results: T,
  ): Tuple<
    Array<DoNotation.Unbrand<Result.Unwrap<T[number]>>>,
    Array<DoNotation.Unbrand<Result.Panic<T[number]>>>
  >;

  /**
   * Given an array of `Result`s, returns an array containing only the values inside `Result.Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = Result.values([
   *   Result.ok(1),
   *   Result.error('Failed computation'),
   *   Result.ok(3),
   * ]);
   * // Output: [1, 3]
   * ```
   */
  values<$Results extends Result.Any[]>(
    results: $Results,
  ): Array<Result.Unwrap<DoNotation.Unbrand<$Results[number]>>>;

  hydrate<T extends Result<any, any>>(value: T): T;
}

/**
 * Error handling with `Result`.
 *
 * `Result` represents the result of an operation that can either be successful (`Ok`) or return an error (`Error`).
 *
 * `Result` is commonly used to represent the result of a function that can fail, such as a network request, a file read, or a database query.
 */
export interface Result<Value, Error>
  extends FunkciaIterable<Error, DoNotation.Unbrand<Value>> {
  /**
   * Initiates a `Do-notation` with the current `Result`, binding it to a
   * context object with the provided key.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUserScore(user: User): Result<UserScore, UserNotScored>;
   *
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * declare const user: Result<User, UserNotFound>;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserNotScored>
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
  ): Result<DoNotation<{ [K in Key]: Value }>, Error>;

  /**
   * Binds a `Result` to the context object in a `Do-notation`.
   *
   * If the `Result` is `Ok`, the value is assigned to the key in the context object.
   * If the `Result` is `Error`, the parent `Result` running the `Do` simulation becomes an `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getUser(id: string): Result<User, UserNotFound>;
   * declare function getUserScore(user: User): Result<UserScore, UserNotScored>;
   * declare function getUserLevel(user: User, score: UserScore): UserLevel;
   *
   * //        ┌─── Result<UserLevel, UserNotFound | UserNotScored>
   * //        ▼
   * const userLevel = Result.Do
   *   .bind('user', () => getUser('user_123'))
   * //                 ┌─── { user: User }
   * //                 ▼
   *   .bind('score', (ctx) => getUserScore(ctx.user))
   *   .map((ctx) => getUserLevel(ctx.user, ctx.score));
   * //       ▲
   * //       └─── { user: User; score: UserScore }
   * ```
   */
  bind<Key extends string, ValueToBind, NewError>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbidden<'Result', 'bind'>,
    key: Exclude<Key, keyof Value>,
    cb: (ctx: DoNotation.Unbrand<Value>) => Result<ValueToBind, NewError>,
  ): Result<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error | NewError
  >;

  /**
   * Binds a raw value to the context object in a `Do-notation`.
   *
   * The value is assigned to the key in the context object.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── Result<number, never>
   * //      ▼
   * const result = Result.Do
   *   .let('subtotal', () => 120)
   * //               ┌─── { subtotal: number }
   * //               ▼
   *   .let('tax', (ctx) => ctx.subtotal * 0.08)
   *   .map((ctx) => ctx.subtotal + ctx.tax);
   * //      ▲
   * //      └─── { subtotal: number; tax: number }
   * ```
   */
  let<Key extends string, ValueToBind>(
    this: DoNotation.is<Value> extends true
      ? this
      : DoNotation.Forbidden<'Result', 'let'>,
    key: Exclude<Key, keyof Value>,
    cb: (scope: DoNotation.Unbrand<Value>) => ValueToBind,
  ): Result<
    DoNotation<{
      [K in Key | keyof DoNotation.Unbrand<Value>]: K extends keyof Value
        ? Value[K]
        : ValueToBind;
    }>,
    Error
  >;

  /**
   * Applies a callback function to the value of the `Result` when it is `Ok`,
   * returning a new `Result` containing the new value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<number, never>
   * //       ▼
   * const result = Result.ok(10).map(number => number * 2);
   * // Output: Ok(20)
   * ```
   */
  map<Output>(
    onOk: (
      value: DoNotation.Unbrand<Value>,
    ) => NoResultGuard<Output, 'andThen'>,
  ): Result<Output, Error>;

  /**
   * Applies a callback function to the value of the `Result` when it is `Error`,
   * returning a new `Result` containing the new error value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const user: User | null;
   *
   * //       ┌─── Result<User, UserNotFound>
   * //       ▼
   * const result = Result.fromNullable(user).mapError(
   *   (error) => new UserNotFound()
   * //   ▲
   * //   └─── NoValueError
   * );
   * ```
   */
  mapError<NewError extends {}>(
    onError: (value: Error) => NoResultGuard<NewError, 'andThen'>,
  ): Result<Value, NewError>;

  /**
   * Maps both the `Result` value and the `Result` error to new values.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<string, UserMissingInformationError>
   * //       ▼
   * const result = Result.fromNullable(user.lastName).mapBoth({
   *   Ok: (lastName) => `Hello, Mr. ${lastName}`,
   *   Error: (error) => new UserMissingInformationError(),
   * //          ▲
   * //          └─── NoValueError
   * });
   * ```
   */
  mapBoth<Output, NewError extends {}>(
    cases: Result.Match<
      DoNotation.Unbrand<Value>,
      Error,
      NoResultGuard<Output, 'andThen'>,
      NoResultGuard<NewError, 'andThen'>
    >,
  ): Result<Output, NewError>;

  /**
   * Applies a callback function to the value of the `Result` when it is `Ok`,
   * and returns the new value.
   *
   * This is similar to map (also known as `flatMap`), with the difference
   * that the callback must return an `Result` or an `AsyncResult`, not a raw value.
   * This allows chaining multiple calls that return `Result`s together.
   *
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   *
   * //       ┌─── Result<FileContent, FileNotFoundError | FileReadError | InvalidJsonError>
   * //       ▼
   * const result = readFile('data.json')
   *   .andThen(parseJsonFile);
   * ```
   */
  andThen<$Result extends Result.Any>(
    onOk: (value: DoNotation.Unbrand<Value>) => $Result,
  ): Result<Result.Unwrap<$Result>, Result.Panic<$Result> | Error>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `Result`, returning a `Error`
   * with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //       ┌─── Result<Circle, FailedPredicateError<Square>>
   * //       ▼
   * const result = Result.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * );
   * ```
   */
  filter<Output extends DoNotation.Unbrand<Value>>(
    refinement: Predicate.Guard<DoNotation.Unbrand<Value>, Output>,
  ): Result<
    Output,
    | Error
    | FailedPredicateError<
        Predicate.Unguarded<DoNotation.Unbrand<Value>, Output>
      >
  >;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning an `Error` with a `FailedPredicateError` instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<string, FailedPredicateError<string>>
   * //       ▼
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   * );
   * ```
   */
  filter(
    predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>,
  ): Result<Value, Error | FailedPredicateError<Value>>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function,
   * narrowing down the value to the provided type predicate.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning a `Result.Error` with the value returned by the `onUnfulfilled` callback instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare const input: Shape;
   *
   * //       ┌─── Result<Circle, Error>
   * //       ▼
   * const result = Result.of(input).filter(
   *   (shape): shape is Circle => shape.kind === 'CIRCLE',
   * //   ┌─── Square
   * //   ▼
   *   (shape) => new Error(`Expected Circle, received ${shape.kind}`),
   * );
   * ```
   */
  filter<Output extends DoNotation.Unbrand<Value>, NewError extends {}>(
    refinement: Predicate.Guard<DoNotation.Unbrand<Value>, Output>,
    onUnfulfilled: (
      value: Predicate.Unguarded<DoNotation.Unbrand<Value>, Output>,
    ) => NewError,
  ): Result<Output, Error | NewError>;

  /**
   * Asserts that the `Result` value passes the test implemented by the provided function.
   *
   * If the test fails, the value is filtered out of the `Result`,
   * returning an `Result.Error` with the value returned by the `onUnfulfilled` callback instead.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<string, Error>
   * //       ▼
   * const result = Result.of(user.lastName).filter(
   *   (value) => value.length > 0,
   *   (value) => new Error(`Expected non-empty string, received ${value}`),
   * );
   * ```
   */
  filter<NewError extends {}>(
    predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>,
    onUnfulfilled: (value: DoNotation.Unbrand<Value>) => NewError,
  ): Result<Value, Error | NewError>;

  /**
   * Replaces the current `Result` with the provided fallback `Result` when it is `Error`.
   *
   * If the current `Result` is `Ok`, it returns the current `Result`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const personalEmail = Result.ok('alex@gmail.com')
   *   .or(() => Result.ok('alex@acme.com'))
   *   .unwrap();
   * // Output: 'alex@gmail.com'
   *
   * const workEmail = Result.error(new Error('Missing personal email'))
   *   .or(() => Result.ok('alex@acme.com'))
   *   .unwrap();
   * // Output: 'alex@acme.com'
   * ```
   */
  or<NewValue, NewError>(
    onError: (error: Error) => Result<NewValue, NewError>,
  ): Result<Value | NewValue, Error | NewError>;

  /**
   * Swaps the `Result` value and error.
   *
   * If the `Result` is `Ok`, it returns a `Result.Error` with the value.
   * If the `Result` is `Error`, it returns a `Result.Ok` with the error.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): Result<User, CacheMissError<Email>>;
   *
   * declare function findOrCreateUserByEmail(email: Email): User;
   *
   * //       ┌─── Result<User, User>
   * //       ▼
   * const result = getCachedUser('customer@acme.com')
   *   .swap() // Result<CacheMissError<Email>, User>
   *   .map((cacheMiss) => findOrCreateUserByEmail(cacheMiss.input));
   * //         ▲
   * //         └─── CacheMissError<Email>
   * ```
   */
  swap(): Result<Error, DoNotation.Unbrand<Value>>;

  /**
   * Combines two `Result`s into a single `Result` containing a tuple of their values,
   * if both `Result`s are `Ok` variants, otherwise, returns `Result.Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const firstName = Result.ok('Jane');
   * const lastName = Result.ok('Doe');
   *
   * //       ┌─── Result<[string, string], never>
   * //       ▼
   * const strings = firstName.zip(lastName);
   * // Output: Ok(['Jane', 'Doe'])
   * ```
   */
  zip<Value2, Error2>(
    that: Result<Value2, Error2>,
  ): Result<
    Tuple<DoNotation.Unbrand<Value>, DoNotation.Unbrand<Value2>>,
    Error | Error2
  >;

  /**
   * Combines two `Result`s into a single `Result`. The new value is produced
   * by applying the given function to both values, if both `Result`s are `Ok` variants,
   * otherwise, returns `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   *
   * const firstName = Result.ok('Jane');
   * const lastName = Result.ok('Doe');
   *
   * //        ┌─── Result<string, never>
   * //        ▼
   * const fullName = firstName.zipWith(lastName, (a, b) => `${a} ${b}`);
   * // Output: Ok('Jane Doe')
   * ```
   */
  zipWith<Value2, Error2, Output>(
    that: Result<Value2, Error2>,
    fn: (
      arg0: DoNotation.Unbrand<Value>,
      arg1: DoNotation.Unbrand<Value2>,
    ) => Output,
  ): Result<Output, Error | Error2>;

  /**
   * Compare the `Result` against the possible patterns and then execute code based on which pattern matches.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function readFile(path: string): Result<string, FileNotFoundError | FileReadError>;
   *
   * declare function parseJsonFile(contents: string): Result<FileContent, InvalidJsonError>;
   * declare function processFile(contents: FileContent): string;
   *
   * //     ┌─── string
   * //     ▼
   * const data = readFile('data.json')
   *   .andThen(parseJsonFile)
   *   .match({
   *     Ok(contents) {
   *       return processFile(contents);
   *     },
   * //          ┌─── FileNotFoundError | FileReadError | InvalidJsonError
   * //          ▼
   *     Error(error) {
   *       return 'File is invalid JSON';
   *     },
   *   });
   * ```
   */
  match<Output, ErrorOutput>(
    cases: Result.Match<DoNotation.Unbrand<Value>, Error, Output, ErrorOutput>,
  ): Output | ErrorOutput;

  /**
   * Unwraps the `Result` value.
   *
   * @throws `Panic` if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //      ┌─── number
   * //      ▼
   * const number = Result.ok(10).unwrap();
   *
   * Result.error(new Error('Validation failed')).unwrap();
   * // Output: Uncaught exception: 'called "Result.unwrap()" on an "Error" value'
   * ```
   */
  unwrap(): DoNotation.Unbrand<Value>;

  /**
   * Unwraps the `Result` error.
   *
   * @throws `Panic` if the `Result` is `Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const result = Result.error(new UserNotFound());
   *
   * if (result.isError()) {
   * //        ┌─── UserNotFound
   * //        ▼
   *   const error = result.unwrapError();
   * }
   * ```
   */
  unwrapError(): Error;

  /**
   * Returns the value of the `Result`.
   * If the `Result` is `Error`, returns the fallback value.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── string
   * //       ▼
   * const baseUrl = Result.ok('https://app.acme.com')
   *   .unwrapOr(() => 'http://localhost:3000');
   * // Output: 'https://app.acme.com'
   *
   * const apiKey = Result.error('Missing API key')
   *   .unwrapOr(() => 'api_test_acme_123');
   * // Output: 'api_test_acme_123'
   * ```
   */
  unwrapOr(
    onError: (error: Error) => DoNotation.Unbrand<Value>,
  ): DoNotation.Unbrand<Value>;

  /**
   * Unwraps the value of the `Result` if it is an `Ok`, otherwise returns `null`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── User | null
   * //     ▼
   * const user = Result.ok(databaseUser).unwrapOrNull();
   * ```
   */
  unwrapOrNull(): DoNotation.Unbrand<Value> | null;

  /**
   * Unwraps the value of the `Result` if it is an `Ok`, otherwise returns `undefined`.
   *
   * Use this method at the edges of the system, when storing values in a database or serializing to JSON.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //     ┌─── User | undefined
   * //     ▼
   * const user = Result.ok(databaseUser).unwrapOrUndefined();
   * ```
   */
  unwrapOrUndefined(): DoNotation.Unbrand<Value> | undefined;

  /**
   * Unwraps the `Result` value.
   *
   * Receives an `onError` callback that returns an Error to be thrown
   * if the `Result` is `Error`.
   *
   * @throws the provided Error if the `Result` is `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, NoValueError>;
   *
   * const userId = 'user_123';
   *
   * //     ┌─── User
   * //     ▼
   * const user = findUserById(userId).expect(
   *   (error) => new UserNotFound(userId)
   * //   ▲
   * //   └─── NoValueError
   * );
   * ```
   */
  expect<Exception extends globalThis.Error>(
    onError: (error: Error) => Exception,
  ): DoNotation.Unbrand<Value>;

  /**
   * Returns the value inside the `Result`.
   *
   * If the `Result` is `Ok`, returns the value inside the `Ok` variant.
   * If the `Result` is `Error`, returns the value inside the `Error` variant.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function getCachedUser(email: Email): Result<User, CacheMissError>;
   *
   * declare function getUserByEmail(email: Email): User;
   *
   * //       ┌─── User
   * //       ▼
   * const result = getCachedUser('customer@acme.com')
   *   .swap() // Result<CacheMissError, User>
   *   .map((cacheMiss) => getUserByEmail(cacheMiss.input)) // Result<User, User>
   *   .merge();
   * // Output: { id: 'user_123', email: 'customer@acme.com' }
   * ```
   */
  merge(): DoNotation.Unbrand<Value> | Error;

  /**
   * Returns `true` if the predicate is fullfiled by the wrapped value.
   *
   * If the predicate is not fullfiled or the `Result` is `Error`, it returns `false`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //         ┌─── boolean
   * //         ▼
   * const isPositive = Result.ok(10).contains(num => num > 0);
   * // Output: true
   *
   * const isNegative = Result.error(10).contains(num => num < 0);
   * // Output: false
   * ```
   */
  contains(predicate: Predicate.Predicate<DoNotation.Unbrand<Value>>): boolean;

  /**
   * Converts an `Result` to an array.
   *
   * If `Result` is `Ok`, returns an array with the value.
   * If `Result` is `Error`, returns an empty array.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── number[]
   * //       ▼
   * const output = Result.ok(10).toArray();
   * // Output: [10]
   * ```
   */
  toArray(): Array<DoNotation.Unbrand<Value>>;

  /**
   * Calls the function with the `Result` value, then returns the `Result` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * //       ┌─── Result<number, never>
   * //       ▼
   * const result = Result.ok(10).tap(
   *   (value) => console.log(value), // Console output: 10
   * );
   * ```
   */
  tap(onOk: (value: Value) => unknown): Result<Value, Error>;

  /**
   * Calls the function with the `Result` error, then returns the `Result` itself.
   * The return value of the provided function is ignored.
   *
   * This allows "tapping into" a function sequence in a pipe, to perform side effects
   * on intermediate results.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, UserNotFound>;
   *
   * //       ┌─── Result<User, UserNotFound>
   * //       ▼
   * const result = findUserById('invalid_id')
   *   .tapError((error) => console.log(error));
   * ```
   */
  tapError(onError: (error: Error) => unknown): Result<Value, Error>;

  /**
   * Returns `true` if the Result is `Ok`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, UserNotFound>;
   *
   * const maybeUser = findUserById('user_123');
   *
   * if (maybeUser.isOk()) {
   *   // Output: User
   *   const user = maybeUser.unwrap(); // `unwrap` will not throw
   * }
   * ```
   */
  isOk(): boolean;

  /**
   * Returns `true` if the Result is `Error`.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * declare function findUserById(id: string): Result<User, UserNotFound>;
   *
   * const maybeUser = findUserById('invalid_id');
   *
   * if (maybeUser.isError()) {
   *   const error = maybeUser.unwrapError();
   * }
   * ```
   */
  isError(): boolean;

  /**
   * Compares the `Result` with another `Result` and returns `true` if they are equal.
   *
   * By default, it uses referential equality to compare the values,
   * but you can provide a custom equality function for more complex cases.
   *
   * @example
   * ```ts
   * import { Result } from 'funkcia';
   *
   * const result = Result.of(10).equals(Result.ok(10));
   * // Output: true
   * ```
   */
  equals<OtherErrors>(
    that: Result<Value, Error | OtherErrors> | Result<Value, OtherErrors>,
    equalityFn?: EqualityFn<DoNotation.Unbrand<Value>>,
    errorEqualityFn?: EqualityFn<Error | OtherErrors>,
  ): boolean;
}

export declare namespace Result {
  type Any = Result<any, any> | Result<any, never> | Result<never, any>;

  interface Match<Value, Error, Output, ErrorOutput> {
    Ok: (value: Value) => Output;
    Error: (error: Error) => ErrorOutput;
  }

  type Unwrap<Output> = Output extends Result<infer Value, infer _>
    ? Value
    : never;

  type Panic<Output> = Output extends Result<infer _, infer Error>
    ? Error
    : never;
}

type NoResultInReturn<CorrectMethod extends string> =
  `ERROR: Use ${CorrectMethod} instead. Cause: the transformation is returning a Result, use ${CorrectMethod} to flatten the Result.`;

type NoResultGuard<
  Output,
  CorrectMethod extends string,
> = Output extends Result<infer _, infer _>
  ? NoResultInReturn<CorrectMethod>
  : Output;
