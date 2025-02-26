/* eslint-disable @typescript-eslint/no-unnecessary-condition, import/export, @typescript-eslint/ban-types, require-yield, @typescript-eslint/method-signature-style */

import type { DoNotation } from './do-notation';
import { FailedPredicateError, UnwrapError } from './exceptions';
import {
  alwaysFalse,
  alwaysNull,
  alwaysTrue,
  alwaysUndefined,
} from './functions';
import { FunkciaStore } from './funkcia-store';
import { isEqual } from './internals/equality';
import { beautify } from './internals/utils';
import type { Result } from './result';

interface OkImpl<Value> {
  readonly _tag: typeof $ok;
  readonly value: Value;
}

interface ErrorImpl<Error> {
  readonly _tag: typeof $error;
  readonly error: Error;
}

const $ok = Symbol('Result::Ok');
const $error = Symbol('Result::Error');

const proxySymbol = Symbol('Result::Proxy');

export function isResult(result: unknown): result is Result<unknown, unknown> {
  return (
    result != null &&
    typeof result === 'object' &&
    '_tag' in result &&
    (result._tag === $ok || result._tag === $error) &&
    proxySymbol in result
  );
}

const okProxyHandler: ProxyHandler<OkImpl<any>> = {
  get(target, prop, $result) {
    const value = target.value as DoNotation.Unsign<any>;
    const operation = prop as keyof Result<any, any>;

    const getResult = () => $result;
    const getValue = () => value;

    const operations: Result<any, any> = {
      bindTo(key) {
        return Ok({ [key]: value }) as never;
      },
      bind(key, cb) {
        return cb(value).map(
          (newValue) =>
            // eslint-disable-next-line prefer-object-spread
            Object.assign({ [key]: newValue }, value) as {},
        ) as never;
      },
      let(key, cb) {
        const result = Ok(cb(value) as never);

        return result.map(
          (newValue) =>
            // eslint-disable-next-line prefer-object-spread
            Object.assign({ [key]: newValue }, value) as {},
        ) as never;
      },
      map(cb) {
        return Ok(cb(value)) as never;
      },
      mapError: getResult,
      mapBoth(cases) {
        return Ok(cases.Ok(value)) as never;
      },
      andThen(cb) {
        return cb(value);
      },
      filter(cb: Function, onUnfulfilled?: Function) {
        return (
          cb(value)
            ? getResult()
            : Err(onUnfulfilled?.(value) ?? new FailedPredicateError(value))
        ) as never;
      },
      or: getResult,
      swap() {
        return Err(value) as never;
      },
      zip(that) {
        return that.map((value2) => [value, value2]) as never;
      },
      zipWith(that, fn) {
        return that.map((value2) => fn(value, value2) as never) as never;
      },
      match(cases) {
        return cases.Ok(value);
      },
      unwrap: getValue,
      unwrapError() {
        throw new UnwrapError('ResultError');
      },
      unwrapOr: getValue,
      unwrapOrNull: getValue,
      unwrapOrUndefined: getValue,
      expect: getValue,
      merge: getValue,
      contains(predicate) {
        return predicate(value);
      },
      toArray() {
        return [value];
      },
      toOption() {
        return (
          value != null ? FunkciaStore.Some(value) : FunkciaStore.None()
        ) as never;
      },
      toAsyncOption() {
        return FunkciaStore.OptionAsync(() => Promise.resolve(this.toOption()));
      },
      toAsyncResult() {
        return FunkciaStore.ResultAsync(() => Promise.resolve($result));
      },
      tap: (cb) => {
        try {
          cb(value);
        } catch {
          // ignore errors
        }

        return Ok(value) as never;
      },
      tapError: getResult,
      isOk: alwaysTrue as never,
      isError: alwaysFalse as never,
      equals(other: Result<any, any>, equalityFn = isEqual) {
        return other.isOk() && equalityFn(value, other.unwrap());
      },
      [Symbol.for('nodejs.util.inspect.custom')](): string {
        return `Ok(${beautify(value)})`;
      },
      *[Symbol.iterator](): Iterator<never> {
        return value;
      },
    };

    return operation in operations
      ? operations[operation]
      : Reflect.get(target, operation);
  },
  has(target, key) {
    if (key === proxySymbol) return true;

    return Reflect.has(target, key);
  },
};

export function Ok<Value>(value: Value): Result<Value, never> {
  const ok: OkImpl<Value> = {
    _tag: $ok,
    value,
  };

  return new Proxy(ok, okProxyHandler) as never;
}

const errorProxyHandler: ProxyHandler<ErrorImpl<any>> = {
  get(raw, prop, $result) {
    const error = raw.error as DoNotation.Unsign<any>;
    const operation = prop as keyof Result<any, any>;

    const getResult = () => $result;

    const operations: Result<any, any> = {
      bindTo: getResult,
      bind: getResult,
      let: getResult,
      map: getResult,
      mapError(cb) {
        return Err(cb(error) as never) as never;
      },
      mapBoth(cases) {
        return Err(cases.Error(error) as never) as never;
      },
      andThen: getResult,
      filter: getResult,
      or(cb) {
        return cb(error);
      },
      swap() {
        return Ok(error) as never;
      },
      zip: getResult,
      zipWith: getResult,
      match(cases) {
        return cases.Error(error);
      },
      unwrap() {
        throw new UnwrapError('Result');
      },
      unwrapError() {
        return error;
      },
      unwrapOr(onError) {
        return onError(error);
      },
      unwrapOrNull: alwaysNull,
      unwrapOrUndefined: alwaysUndefined,
      expect(onError) {
        throw onError(error);
      },
      merge() {
        return error;
      },
      contains: alwaysFalse,
      toArray() {
        return [];
      },
      toOption() {
        return FunkciaStore.None() as never;
      },
      toAsyncOption() {
        return FunkciaStore.OptionAsync(() => FunkciaStore.None() as never);
      },
      toAsyncResult() {
        return FunkciaStore.ResultAsync(() => Promise.resolve($result));
      },
      tap: getResult,
      tapError(onError) {
        try {
          onError(error);
        } catch {
          // ignore errors
        }

        return Err(error) as never;
      },
      isOk: alwaysFalse as never,
      isError: alwaysTrue as never,
      equals(other: Result<any, any>, _, errorEqualityFn = isEqual) {
        return other.isError() && errorEqualityFn(error, other.unwrapError());
      },
      [Symbol.for('nodejs.util.inspect.custom')](): string {
        return `Error(${beautify(error)})`;
      },
      *[Symbol.iterator](): Iterator<any> {
        yield error as never;
      },
    };

    return operation in operations
      ? operations[operation]
      : Reflect.get(raw, operation);
  },
  has(target, key) {
    if (key === proxySymbol) return true;

    return Reflect.has(target, key);
  },
};

export function Err<Error>(error: Error): Result<never, Error> {
  const err: ErrorImpl<Error> = {
    _tag: $error,
    error,
  };

  return new Proxy(err, errorProxyHandler) as never;
}

export type AnyResult =
  | Result<any, any>
  | Result<any, never>
  | Result<never, any>;

export interface OkTrait<Value> {
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  match: never;
  /** @override `unwrap` will not throw in this context. Result value is guaranteed to exist. */
  unwrap: () => Value;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  unwrapError: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  unwrapOr: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  unwrapOrNull: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  unwrapOrUndefined: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  expect: never;
  /** @override `merge` will not return an `Error` in this context. Result value is guaranteed to exist. */
  merge: () => Value;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  mapError: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  mapBoth: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  or: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  isError: never;
  /** @override this method has no effect in this context. Result value is guaranteed to exist. */
  tapError: never;
}

export interface ErrorTrait<Err> {
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  zip: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  zipWith: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  bindTo: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  bind: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  let: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  match: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  unwrap: never;
  /** @override `unwrapError` will not throw in this context. Result is guaranteed to be Error. */
  unwrapError: () => Err;
  /** @override `unwrapOrNull` will not return a `Value` in this context. Result is guaranteed to be Error. */
  unwrapOrNull: () => null;
  /** @override `unwrapOrUndefined` will not return a `Value` in this context. Result is guaranteed to be Error. */
  unwrapOrUndefined: () => undefined;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  expect: never;
  /** @override `merge` will not return a `Value` in this context. Result is guaranteed to be Error. */
  merge: () => Err;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  contains: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  toOption: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  toAsyncOption: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  toAsyncResult: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  map: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  mapBoth: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  andThen: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  filter: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  isOk: never;
  /** @override this method has no effect in this context. Result is guaranteed to be Error. */
  tap: never;
}

FunkciaStore.register(Ok);
FunkciaStore.register(Err);
