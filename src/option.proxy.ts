/* eslint-disable @typescript-eslint/no-unnecessary-condition, import/export, @typescript-eslint/ban-types, require-yield, @typescript-eslint/method-signature-style */

import type { DoNotation } from './do-notation';
import { NoValueError, UnwrapError } from './exceptions';
import {
  alwaysFalse,
  alwaysNull,
  alwaysTrue,
  alwaysUndefined,
} from './functions';
import { FunkciaStore } from './funkcia-store';
import { isEqual } from './internals/equality';
import type { Thunk } from './internals/types';
import { beautify } from './internals/utils';
import type { Option } from './option';

export interface SomeImpl<T> {
  readonly _tag: typeof $some;
  readonly value: T;
}

export interface NoneImpl {
  readonly _tag: typeof $none;
}

const $some = Symbol.for('Option::Some');
const $none = Symbol.for('Option::None');

const proxySymbol = Symbol.for('Option::Proxy');

export function isOption(result: unknown): result is Option<unknown> {
  return (
    result != null &&
    typeof result === 'object' &&
    '_tag' in result &&
    (result._tag === $some || result._tag === $none) &&
    proxySymbol in result
  );
}

const someProxyHandler: ProxyHandler<SomeImpl<any>> = {
  get(raw, prop, $option) {
    const val = raw.value as DoNotation.Unsign<any>;
    const operation = prop as keyof Option<any>;

    const getValue = () => val;
    const getSelf = () => $option;

    const operations: Option<any> = {
      bindTo(key) {
        return Some({ [key]: val }) as never;
      },
      bind(key, cb) {
        return cb(val).map(
          (v) =>
            // eslint-disable-next-line prefer-object-spread
            Object.assign({ [key]: v }, val) as {},
        ) as never;
      },
      let(key, fn) {
        const output = fn(val) as never;
        const option = output == null ? None() : Some(output);

        return option.map(
          (v) =>
            // eslint-disable-next-line prefer-object-spread
            Object.assign({ [key]: v }, val) as {},
        ) as never;
      },
      map(cb) {
        const output = cb(val) as never;

        return (output == null ? None() : Some(output)) as never;
      },
      andThen(cb) {
        return cb(val) as never;
      },
      filter(cb: Function) {
        return (cb(val) ? getSelf() : None()) as never;
      },
      or: getSelf,
      zip(that) {
        return that.map((val2) => [val, val2]);
      },
      zipWith(that, fn) {
        return that.map((val2) => fn(val, val2) as never) as never;
      },
      match(cases) {
        return cases.Some(val);
      },
      unwrap: getValue,
      unwrapOr: getValue,
      unwrapOrNull: getValue,
      unwrapOrUndefined: getValue,
      expect: getValue,
      toArray() {
        return [val];
      },
      contains(predicate) {
        return predicate(val);
      },
      toResult() {
        return FunkciaStore.Ok(val) as never;
      },
      toAsyncOption() {
        return FunkciaStore.OptionAsync(() => Promise.resolve($option));
      },
      toAsyncResult(onNone?: Thunk<any>) {
        return FunkciaStore.ResultAsync(() =>
          Promise.resolve(this.toResult(onNone as never)),
        ) as never;
      },
      tap: (cb) => {
        try {
          cb(val);
        } catch {
          // ignore errors
        }

        return Some(val) as never;
      },
      isSome: alwaysTrue as never,
      isNone: alwaysFalse as never,
      equals(other: Option<any>, equalityFn = isEqual) {
        return other.isSome() && equalityFn(val, other.unwrap());
      },
      [Symbol.for('nodejs.util.inspect.custom')](): string {
        return `Some(${beautify(val)})`;
      },
      *[Symbol.iterator](): Iterator<never> {
        return val as never;
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

export function Some<Value extends {}>(value: Value): Option<Value> {
  const some: SomeImpl<Value> = {
    _tag: $some,
    value,
  };

  return new Proxy(some, someProxyHandler) as never;
}

const noneProxyHandler: ProxyHandler<NoneImpl> = {
  get(raw, prop, $option) {
    const operation = prop as keyof Option<any>;

    const getSelf = () => $option;
    const fallback = (onNone: Thunk<any>) => onNone();

    const operations: Option<any> = {
      bind: getSelf,
      bindTo: getSelf,
      let: getSelf,
      map: getSelf,
      andThen: getSelf,
      filter: getSelf,
      or: fallback,
      zip: getSelf,
      zipWith: getSelf,
      match(cases) {
        return cases.None();
      },
      unwrap() {
        throw new UnwrapError('Option');
      },
      unwrapOr: fallback,
      expect(onNone) {
        throw onNone();
      },
      unwrapOrNull: alwaysNull,
      unwrapOrUndefined: alwaysUndefined,
      toArray() {
        return [];
      },
      contains: alwaysFalse,
      toResult(onNone?: Thunk<any>) {
        return FunkciaStore.Err(onNone?.() ?? new NoValueError()) as never;
      },
      toAsyncOption() {
        return FunkciaStore.OptionAsync(() => Promise.resolve($option));
      },
      toAsyncResult(onNone?: Thunk<any>) {
        return FunkciaStore.ResultAsync(() =>
          Promise.resolve(this.toResult(onNone as never)),
        ) as never;
      },
      tap() {
        return None() as never;
      },
      isSome: alwaysFalse as never,
      isNone: alwaysTrue as never,
      equals(other: Option<any>) {
        return other.isNone();
      },
      [Symbol.for('nodejs.util.inspect.custom')](): string {
        return 'None';
      },
      *[Symbol.iterator](): Iterator<never> {
        yield undefined as never;
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

export function None(): Option<never> {
  const none: NoneImpl = {
    _tag: $none,
  };

  return new Proxy(none, noneProxyHandler) as never;
}

export type AnyOption = Option<any> | Option<never>;

export interface SomeTrait<Value> {
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

export interface NoneTrait {
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

FunkciaStore.register(Some);
FunkciaStore.register(None);
