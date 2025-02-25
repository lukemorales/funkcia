import type { DoNotation } from './do-notation';
import { FunkciaStore } from './funkcia-store';
import { Queue } from './internals/queue';
import type { Task, Thunk, UnaryFn } from './internals/types';
import { emptyObject } from './internals/utils';
import type { Option } from './option';
import type { OptionAsync } from './option.async';
import type { AnyOption } from './option.proxy';

const proxySymbol = Symbol.for('OptionAsync::Proxy');

export function isOptionAsync(option: unknown): option is OptionAsync<unknown> {
  return typeof option === 'function' && proxySymbol in option;
}

type PromiseOption<Value> = Task<Option<Value>>;

type AnyOptionAsync = PromiseOption<any>;

type OptionMethods = keyof AnyOption;

const optionAsyncProxyHandler: ProxyHandler<AnyOptionAsync> = {
  get(rawPromise, prop, optionAsync) {
    const operation = prop as keyof OptionAsync<any>;

    const enqueue = Queue.createEnqueuer<AnyOption, OptionMethods>();

    const operations: OptionAsync<any> = {
      zip(that) {
        return this.andThen((a) => that.map((b) => [a, b])) as never;
      },
      zipWith(that, fn) {
        return this.zip(that).map(
          (options) => fn(...options) as never,
        ) as never;
      },
      bindTo(key) {
        return OptionAsyncProxy(() =>
          Promise.resolve(FunkciaStore.Some(emptyObject as DoNotation.Sign)),
        ).bind(key as never, () => optionAsync) as never;
      },
      bind(key, fn) {
        return (this as unknown as OptionAsync<any>).andThen(
          (ctx) =>
            fn(ctx).map(
              (value) =>
                // eslint-disable-next-line prefer-object-spread
                Object.assign({ [key]: value }, ctx) as {},
            ) as never,
        ) as never;
      },
      let(key, cb) {
        return (this as unknown as OptionAsync<DoNotation.Sign>).bind(
          key as never,
          (ctx) =>
            OptionAsyncProxy(async () => {
              try {
                const value = await cb(ctx);

                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                return value == null
                  ? (FunkciaStore.None() as never)
                  : FunkciaStore.Some(value);
              } catch {
                return FunkciaStore.None() as never;
              }
            }) as never,
        ) as never;
      },
      map(onSome) {
        const task = enqueue(rawPromise, 'map', onSome);

        return OptionAsyncProxy(task) as never;
      },
      andThen(onSome: UnaryFn<any, OptionAsync<any> | Option<any>>) {
        return OptionAsyncProxy(async () => {
          try {
            return await onSome(await this.unwrap());
          } catch {
            return FunkciaStore.None() as never;
          }
        });
      },
      filter(onSome: UnaryFn<any, boolean>) {
        const task = enqueue(rawPromise, 'filter', onSome);

        return OptionAsyncProxy(task);
      },
      or(onNone) {
        return OptionAsyncProxy(
          () =>
            this.then((option) =>
              option.isSome() ? option : onNone(),
            ) as never,
        );
      },
      async then(onfulfilled) {
        const queue = Queue.of(rawPromise);

        return rawPromise().then((option) =>
          onfulfilled?.(queue.execute(option) as never),
        ) as never;
      },
      async match(cases) {
        return this.then((option) => option.match(cases));
      },
      async unwrap() {
        return this.then((option) => option.unwrap());
      },
      async unwrapOr(onNone) {
        return this.then((option) => option.unwrapOr(onNone));
      },
      async unwrapOrNull() {
        return this.then((option) => option.unwrapOrNull());
      },
      async unwrapOrUndefined() {
        return this.then((option) => option.unwrapOrUndefined());
      },
      async expect(onNone) {
        return this.then((option) => option.expect(onNone));
      },
      async contains(predicate) {
        return this.then((option) => option.contains(predicate));
      },
      async toArray() {
        return this.then((option) => option.toArray());
      },
      toAsyncResult(onNone?: Thunk<any>) {
        return FunkciaStore.ResultAsync(
          () =>
            this.then((option) =>
              option.toAsyncResult(onNone as never),
            ) as never,
        ) as never;
      },
      tap(onSome) {
        return OptionAsyncProxy(
          () =>
            this.then(async (option) => {
              try {
                if (option.isSome()) await onSome(option.unwrap());
              } catch {
                // ignore errors
              }

              return option;
            }) as never,
        );
      },
      [Symbol.for('nodejs.util.inspect.custom')](): string {
        return `OptionAsync(Promise<Option>)`;
      },
      async *[Symbol.asyncIterator](): AsyncIterator<never> {
        return yield* await this;
      },
    };

    return operation in operations
      ? operations[operation]
      : Reflect.get(rawPromise, operation);
  },
  apply() {
    throw new TypeError('OptionAsync is not a function');
  },
  has(target, key) {
    if (key === proxySymbol) return true;

    return Reflect.has(target, key);
  },
};

type Unwrap<$Task extends AnyOptionAsync> = Awaited<
  ReturnType<$Task>
> extends Option<infer Value>
  ? Value
  : never;

export function OptionAsyncProxy<$Task extends AnyOptionAsync>(
  task: $Task,
): OptionAsync<Unwrap<$Task>> {
  return new Proxy(task, optionAsyncProxyHandler) as never;
}
