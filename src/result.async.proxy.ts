import type { DoNotation } from './do-notation';
import { identity } from './functions';
import { FunkciaStore } from './funkcia-store';
import { Queue } from './internals/queue';
import type { Task, UnaryFn } from './internals/types';
import { emptyObject } from './internals/utils';
import type { Result } from './result';
import type { ResultAsync } from './result.async';

const proxySymbol = Symbol.for('ResultAsync::Proxy');

export function isResultAsync(
  result: unknown,
): result is ResultAsync<any, any> {
  return typeof result === 'function' && proxySymbol in result;
}

export type AnyResultAsync<Value = any> =
  | ResultAsync<Value, any>
  | ResultAsync<Value, never>
  | ResultAsync<never, any>;

type PromiseResult<Value, Error> = Task<Result<Value, Error>>;

type AnyPromiseResult =
  | PromiseResult<any, any>
  | PromiseResult<any, never>
  | PromiseResult<never, any>;

type AnyResult = Result<any, any> | Result<any, never> | Result<never, any>;

type ResultMethods = keyof AnyResult;

const resultAsyncProxyHandler: ProxyHandler<AnyPromiseResult> = {
  get(rawPromise, prop, resultAsync) {
    const operation = prop as keyof ResultAsync<any, any>;

    const enqueue = Queue.createEnqueuer<AnyResult, ResultMethods>();

    const operations: ResultAsync<any, any> = {
      zip(that) {
        return this.andThen((a) => that.map((b) => [a, b])) as never;
      },
      zipWith(that, fn) {
        return this.zip(that).map(
          (results) => fn(...(results as [any, any])) as never,
        ) as never;
      },
      bindTo(key) {
        return ResultAsyncProxy(() =>
          Promise.resolve(FunkciaStore.Ok(emptyObject as DoNotation.Sign)),
        ).bind(key as never, () => resultAsync) as never;
      },
      bind(key, fn) {
        return (this as unknown as ResultAsync<any, any>).andThen(
          (ctx) =>
            fn(ctx).map(
              (value) =>
                // eslint-disable-next-line prefer-object-spread
                Object.assign({ [key]: value }, ctx) as {},
            ) as never,
        ) as never;
      },
      let(key, cb) {
        return (this as unknown as ResultAsync<DoNotation.Sign, never>).bind(
          key as never,
          (ctx) =>
            ResultAsyncProxy(async () => {
              try {
                const value = await cb(ctx);

                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                return value == null
                  ? (FunkciaStore.None() as never)
                  : FunkciaStore.Ok(value);
              } catch {
                return FunkciaStore.None() as never;
              }
            }) as never,
        ) as never;
      },
      map(onOk) {
        const task = enqueue(rawPromise, 'map', onOk);

        return ResultAsyncProxy(task) as never;
      },
      mapError(onError) {
        const task = enqueue(rawPromise, 'mapError', onError);

        return ResultAsyncProxy(task) as never;
      },
      mapBoth(cases) {
        const task = enqueue(rawPromise, 'mapBoth', cases);

        return ResultAsyncProxy(task) as never;
      },
      andThen(onOk: UnaryFn<any, ResultAsync<any, any> | Result<any, any>>) {
        return ResultAsyncProxy(async () => {
          try {
            return await onOk(await this.expect(identity));
          } catch (e) {
            return FunkciaStore.Err(e) as never;
          }
        });
      },
      filter(onOk: UnaryFn<any, boolean>, onUnfulfilled?: UnaryFn<any, any>) {
        const task = enqueue(
          rawPromise,
          'filter',
          onOk,
          onUnfulfilled as never,
        );

        return ResultAsyncProxy(task) as never;
      },
      or(onError) {
        return ResultAsyncProxy(
          () =>
            this.then(
              (result) =>
                (result.isOk()
                  ? result
                  : onError((result as any).unwrapError())) as never,
            ) as never,
        );
      },
      swap() {
        return ResultAsyncProxy(
          () => this.then((result) => result.swap()) as never,
        );
      },
      async then(onfulfilled) {
        const queue = Queue.of(rawPromise);

        return rawPromise().then((result) =>
          onfulfilled?.(queue.execute(result) as never),
        ) as never;
      },
      async match(cases) {
        return this.then((result) => result.match(cases));
      },
      async unwrap() {
        return this.then((result) => result.unwrap());
      },
      async unwrapError() {
        return this.then((result) => result.unwrapError());
      },
      async unwrapOr(onError) {
        return this.then((result) => result.unwrapOr(onError));
      },
      async unwrapOrNull() {
        return this.then((result) => result.unwrapOrNull());
      },
      async unwrapOrUndefined() {
        return this.then((result) => result.unwrapOrUndefined());
      },
      async expect(onError) {
        return this.then((result) => result.expect(onError));
      },
      async merge() {
        return this.then((result) => result.merge());
      },
      async contains(predicate) {
        return this.then((result) => result.contains(predicate));
      },
      async toArray() {
        return this.then((result) => result.toArray());
      },
      toAsyncOption() {
        return FunkciaStore.OptionAsync(
          () => this.then((result) => result.toOption()) as never,
        );
      },
      tap(onOk) {
        return ResultAsyncProxy(
          () =>
            this.then(async (result) => {
              if (result.isOk()) await onOk(result.unwrap());

              return result;
            }) as never,
        );
      },
      tapError(onError) {
        return ResultAsyncProxy(
          () =>
            this.then(async (result) => {
              if (result.isError()) await onError(result.unwrapError());

              return result;
            }) as never,
        );
      },
      [Symbol.for('nodejs.util.inspect.custom')](): string {
        return `ResultAsync(Promise<Result>)`;
      },
      async *[Symbol.asyncIterator](): AsyncIterator<any> {
        return yield* await this;
      },
    };

    return operation in operations
      ? operations[operation]
      : Reflect.get(rawPromise, operation);
  },
  has(target, key) {
    if (key === proxySymbol) return true;

    return Reflect.has(target, key);
  },
};

export function ResultAsyncProxy<$Task extends AnyPromiseResult>(
  task: $Task,
): ResultAsync<Unwrap<$Task>, UnwrapError<$Task>> {
  return new Proxy(task, resultAsyncProxyHandler) as never;
}

type Unwrap<$Task extends AnyPromiseResult> = Awaited<
  ReturnType<$Task>
> extends Result<infer Value, infer _> | ResultAsync<infer Value, infer _>
  ? Value
  : never;

type UnwrapError<$Task extends AnyPromiseResult> = Awaited<
  ReturnType<$Task>
> extends Result<infer _, infer Error> | ResultAsync<infer _, infer Error>
  ? Error
  : never;
