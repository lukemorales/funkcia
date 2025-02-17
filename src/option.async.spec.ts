import { describe } from 'vitest';

import type { NoValueError } from './exceptions';
import { UnwrapError } from './exceptions';
import { AsyncOption } from './option.async';
// import { AsyncResult } from './async-result';
import type { DoNotation } from './do-notation';
import { FunkciaStore } from './funkcia-store';
import type { Falsy, Nullable } from './internals/types';
import { Option } from './option';
import { Result } from './result';
import { AsyncResult } from './result.async';

describe('AsyncOption', () => {
  describe('constructors', () => {
    describe('some', () => {
      it('creates a AsyncOption with a `Some` and the provided value', async () => {
        const task = AsyncOption.some('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });
    });

    describe('of', () => {
      it('references the `some` constructor', () => {
        expect(AsyncOption.of).toEqual(AsyncOption.some);
      });
    });

    describe('none', () => {
      it('creates a AsyncOption with a `None` value', async () => {
        const task = AsyncOption.none();
        expectTypeOf(task).toEqualTypeOf<AsyncOption<never>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('fromNullable', () => {
      function nullify(value: Nullable<string>): Nullable<string> {
        return value;
      }

      it('creates a new AsyncOption with a `Some` when the value is not nullable', async () => {
        const task = AsyncOption.fromNullable(nullify('hello world'));
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates a new AsyncOption with a `None` when the value is nullable', async () => {
        {
          const task = AsyncOption.fromNullable(nullify(null));
          expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

          const option = await task;
          expect(option.isNone()).toBeTrue();
        }

        {
          const task = AsyncOption.fromNullable(nullify(undefined));

          expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

          const option = await task;
          expect(option.isNone()).toBeTrue();
        }
      });
    });

    describe('fromFalsy', () => {
      it('creates a AsyncOption with a `Some` when the value is not falsy', async () => {
        const task = AsyncOption.fromFalsy('hello world' as string | Falsy);
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates a None Option when the value is falsy', async () => {
        const falsyValues = [
          '',
          0,
          0n,
          null,
          undefined,
          false,
        ] satisfies Falsy[];

        for (const value of falsyValues) {
          const task = AsyncOption.fromFalsy(value);
          expectTypeOf(task).toEqualTypeOf<AsyncOption<never>>();

          const option = await task;
          expect(option.isNone()).toBeTrue();
        }
      });
    });

    describe('try', () => {
      it('creates a AsyncOption with a `Some` when the Promise succeeds', async () => {
        const task = AsyncOption.try(() => Promise.resolve('hello world'));
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates a AsyncOption with the Option resolved from the Promise', async () => {
        const task = AsyncOption.try(() =>
          Promise.resolve(Option.of('hello world')),
        );
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates a AsyncOption with a `None` when the Promise succeeds but returns null', async () => {
        const task = AsyncOption.try(() =>
          Promise.resolve(null as string | null),
        );
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });

      it('creates a AsyncOption with a `None` when the Promise rejects', async () => {
        const task = AsyncOption.try<string>(() =>
          Promise.reject(new Error('computation failed')),
        );
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('promise', () => {
      it('creates a new AsyncOption from a Promise that resolves to an Option', async () => {
        const task = AsyncOption.promise(() =>
          Promise.resolve(Option.of('hello world')),
        );
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });
    });

    describe('liftPromise', () => {
      it('lifts a function that returns a Promise that resolves to a nullable value', async () => {
        const lifted = AsyncOption.liftPromise((greeting: string) =>
          Promise.resolve(greeting),
        );
        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncOption<string>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBe(true);
        expect(option.equals(Option.some('hello world'))).toBe(true);
      });

      it('lifts a function that returns a Promise that resolves to an Option', async () => {
        const lifted = AsyncOption.liftPromise((greeting: string) =>
          Promise.resolve(Option.some(greeting)),
        );
        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncOption<string>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('lifts a function that returns a Promise that rejects', async () => {
        const lifted = AsyncOption.liftPromise((_: string) =>
          Promise.reject<string>(new Error('computation failed')),
        );

        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncOption<string>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('predicate', () => {
      it('creates a function that will return an `AsyncOption` with the refined type of a value if the predicate is fulfilled', async () => {
        interface Circle {
          kind: 'circle';
        }

        interface Square {
          kind: 'square';
        }

        type Shape = Circle | Square;

        const ensureCircle = AsyncOption.predicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        expectTypeOf(ensureCircle).toEqualTypeOf<
          (shape: Shape) => AsyncOption<Circle>
        >();

        const task = ensureCircle({ kind: 'circle' });

        expectTypeOf(task).toEqualTypeOf<AsyncOption<Circle>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that will return an `AsyncOption` if the predicate is fullfiled', async () => {
        const ensurePositive = AsyncOption.predicate(
          (value: number) => value > 0,
        );

        expectTypeOf(ensurePositive).toEqualTypeOf<
          (value: number) => AsyncOption<number>
        >();

        const task = ensurePositive(10);

        expectTypeOf(task).toEqualTypeOf<AsyncOption<number>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });
    });

    describe('relay', () => {
      it('safely evaluates the generator, returning the returned AsyncOption when all yields are `Some`', async () => {
        const greeting = AsyncOption.some('hello');
        const subject = AsyncOption.some('world');

        const task = AsyncOption.relay(async function* exec() {
          const a = yield* greeting;
          expect(a).toBe('hello');

          const b = yield* subject;
          expect(b).toBe('world');

          return AsyncOption.some(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('safely evaluates the generator, early returning when a yield is `None`', async () => {
        const greeting = AsyncOption.none<string>();
        const getSubject = vi.fn(() => AsyncOption.some('world'));

        const task = AsyncOption.relay(async function* exec() {
          const a = yield* greeting;
          const b = yield* getSubject();

          return AsyncOption.some(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(getSubject).not.toHaveBeenCalled();
      });
    });

    describe('firstSomeOf', () => {
      it('returns the first `Some` value', async () => {
        const task = AsyncOption.firstSomeOf([
          AsyncOption.some(1),
          AsyncOption.none<number>(),
          AsyncOption.some(3),
        ]);

        expectTypeOf(task).toEqualTypeOf<AsyncOption<number>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(1);
      });

      it('returns `None` if all values are `None`', async () => {
        const task = AsyncOption.firstSomeOf<number>([
          AsyncOption.none(),
          AsyncOption.none(),
          AsyncOption.none(),
        ]);

        expectTypeOf(task).toEqualTypeOf<AsyncOption<number>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });
  });

  describe('combinators', () => {
    describe('values', () => {
      it('returns an array containing only the values inside `Some`', async () => {
        const output = await AsyncOption.values([
          AsyncOption.some(1),
          AsyncOption.none<number>(),
          AsyncOption.some(3),
        ]);

        expect(output).toEqual([1, 3]);
      });
    });

    describe('zip', () => {
      it('combines two `AsyncOption`s into a single `AsyncOption` containing a tuple of their values, if both `AsyncOption`s are `Some` variants', async () => {
        const first = AsyncOption.some('hello');
        const second = AsyncOption.some('world');

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<AsyncOption<[string, string]>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual(['hello', 'world']);
      });

      it('returns `None` if one of the `AsyncOption`s is `None`', async () => {
        const first = AsyncOption.some('hello');
        const second = AsyncOption.none<string>();

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<AsyncOption<[string, string]>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('zipWith', () => {
      it('combines two `AsyncOption`s into a single `AsyncOption` producing a new value by applying the given function to both values, if both `AsyncOption`s are `Some` variants', async () => {
        const first = AsyncOption.some('hello');
        const second = AsyncOption.some('world');

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('returns `None` if one of the `AsyncOption`s is `None`', async () => {
        const first = AsyncOption.some('hello');
        const second = AsyncOption.none<string>();

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });
  });

  describe('do-notation', () => {
    describe('Do', () => {
      it('creates a `AsyncOption` with an empty object branded with the DoNotation type', async () => {
        const task = AsyncOption.Do;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
        expectTypeOf(task).toEqualTypeOf<AsyncOption<DoNotation.Sign>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({});
      });
    });

    describe('bindTo', () => {
      it('binds the current `AsyncOption` to a `do-notation`', async () => {
        const task = AsyncOption.some(10).bindTo('a');

        expectTypeOf(task).toEqualTypeOf<
          AsyncOption<DoNotation.Sign<{ a: number }>>
        >();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 10 });
      });
    });

    describe('bind', async () => {
      it('accumulates multiple `bind` calls into an object and is a `Some` Option if all values are `Some`', async () => {
        const task = AsyncOption.Do.bind('a', () => AsyncOption.some(2))
          .bind('b', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<Readonly<{ a: number }>>();
            expect(ctx).toEqual({ a: 2 });

            return AsyncOption.some(2);
          })
          .bind('c', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{ a: number; b: number }>
            >();
            expect(ctx).toEqual({ a: 2, b: 2 });

            return AsyncOption.some(6);
          });

        expectTypeOf(task).toEqualTypeOf<
          AsyncOption<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>
          >
        >();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 2, b: 2, c: 6 });
      });

      it('accumulates multiple `bind` calls into an object and is a `None` Option if any value is `None`', async () => {
        const bindC = vi.fn(() => AsyncOption.some(6));

        const task = AsyncOption.Do.bind('a', () => AsyncOption.some(2))
          .bind('b', () => AsyncOption.none<number>())
          .bind('c', bindC);

        expectTypeOf(task).toEqualTypeOf<
          AsyncOption<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>
          >
        >();

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(bindC).not.toHaveBeenCalled();
      });
    });

    describe('let', async () => {
      it('accumulates multiple `let` calls into an object', async () => {
        const task = AsyncOption.Do.let('a', () => Promise.resolve(4))
          .let('b', () => Promise.resolve(6))
          .let('c', (ctx) => Promise.resolve(ctx.a + ctx.b));

        expectTypeOf(task).toEqualTypeOf<
          AsyncOption<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>
          >
        >();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 4, b: 6, c: 10 });
      });
    });
  });

  describe('conversions', () => {
    describe('then', () => {
      it('resolves the promise returning the underlying `Option`', async () => {
        const option = await AsyncOption.some(10);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some(10))).toBeTrue();
      });
    });

    describe('match', () => {
      it('resolves to the Some case if the AsyncOption is a Some', async () => {
        const task = AsyncOption.some('world').match({
          Some(value) {
            return `Hello ${value}`;
          },
          None() {
            return 'Good bye!';
          },
        });

        await expect(task).resolves.toBe('Hello world');
      });

      it('resolves to the None case if the AsyncOption is a None', async () => {
        const task = AsyncOption.none<string>().match({
          Some(value) {
            return `Hello ${value}`;
          },
          None() {
            return 'Good bye!';
          },
        });

        await expect(task).resolves.toBe('Good bye!');
      });
    });

    describe('unwrap', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const task = AsyncOption.some('hello world').unwrap();

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the AsyncOption is a None', async () => {
        const task = AsyncOption.none<string>();

        await expect(task.unwrap()).rejects.toEqual(new UnwrapError('Option'));
      });
    });

    describe('unwrapOr', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const task = AsyncOption.some('hello world').unwrapOr(
          () => 'Good bye!',
        );

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to the fallback value if the AsyncOption is a None', async () => {
        const task = AsyncOption.none<string>().unwrapOr(() => 'Good bye!');

        await expect(task).resolves.toBe('Good bye!');
      });
    });

    describe('unwrapOrNull', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const task = AsyncOption.some('hello world').unwrapOrNull();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the AsyncOption is a None', async () => {
        const task = AsyncOption.none<string>().unwrapOrNull();

        await expect(task).resolves.toBeNull();
      });
    });

    describe('unwrapOrUndefined', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const task = AsyncOption.some('hello world').unwrapOrUndefined();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the AsyncOption is a None', async () => {
        const task = AsyncOption.none<string>().unwrapOrUndefined();

        await expect(task).resolves.toBeUndefined();
      });
    });

    describe('expect', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const task = AsyncOption.some('hello world').expect(
          () => new Error('Expected some value'),
        );

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the AsyncOption is a None', async () => {
        const task = AsyncOption.none<string>().expect(
          () => new Error('Expected some value'),
        );

        await expect(task).rejects.toEqual(new Error('Expected some value'));
      });
    });

    describe('contains', () => {
      it('resolves to true if the AsyncOption is a Some and the predicate is fulfilled', async () => {
        const result = AsyncOption.some('hello world').contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(true);
      });

      it('resolves to false if the AsyncOption is a Some and the predicate is not fulfilled', async () => {
        const result = AsyncOption.some('hello world').contains(
          (value) => value.length === 0,
        );

        await expect(result).resolves.toBe(false);
      });

      it('resolves to false if the AsyncOption is a None', async () => {
        const result = AsyncOption.none<string>().contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(false);
      });
    });

    describe('toAsyncResult', () => {
      let unregister: () => void;
      let unregisterTask: () => void;

      beforeAll(() => {
        unregister = FunkciaStore.register(Result);
        unregisterTask = FunkciaStore.register(AsyncResult);
      });

      afterAll(() => {
        unregister();
        unregisterTask();
      });

      it('creates an AsyncResult with an `Ok` from a Some AsyncOption', async () => {
        const task = AsyncOption.some('hello world').toAsyncResult();

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, NoValueError>>();
        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.fromNullable('hello world'))).toBeTrue();
      });

      it('creates an AsyncResult with an `Error` from a None AsyncOption', async () => {
        const task = AsyncOption.none<string>().toAsyncResult();

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, NoValueError>>();
        const result = await task;

        expect(result.isError()).toBeTrue();
      });

      it('creates an AsyncResult with a custom error from a None AsyncOption', async () => {
        const task = AsyncOption.none<string>().toAsyncResult(
          () => new Error('computation failed'),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();
        const result = await task;

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toEqual(new Error('computation failed'));
      });
    });

    describe('toArray', () => {
      it('creates an array with the value if AsyncOption is Some', async () => {
        const task = AsyncOption.some('hello world').toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual(['hello world']);
      });

      it('creates an empty array if AsyncOption is None', async () => {
        const task = AsyncOption.none<string>().toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual([]);
      });
    });
  });

  describe('transformations', () => {
    describe('map', () => {
      it('maps the value of a AsyncOption when it is a `Some`', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = AsyncOption.some('hello world').map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('HELLO WORLD'))).toBeTrue();

        expect(mapper).toHaveBeenCalledWith('hello world');
      });

      it('is a no-op if AsyncOption is a None', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = AsyncOption.none<string>().map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(mapper).not.toHaveBeenCalled();
      });
    });

    describe('andThen', () => {
      it('transforms the `Some` value while flattening the `AsyncOption`', async () => {
        const task = AsyncOption.some('hello world').andThen((str) =>
          AsyncOption.some(str.toUpperCase()),
        );

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('HELLO WORLD'))).toBeTrue();
      });

      it('has no effect when AsyncOption is a None and flattens the AsyncOption', async () => {
        const task = AsyncOption.none<string>().andThen(() =>
          AsyncOption.fromNullable('hello world'),
        );

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });

      it('transforms the `Some` value while lifting an `Option` to an `AsyncOption` and flattens it', async () => {
        const task = AsyncOption.some('hello world').andThen((str) =>
          Option.some(str.toUpperCase()),
        );

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('HELLO WORLD'))).toBeTrue();
      });
    });

    describe('filter', () => {
      it('keeps the Some value if the predicate is fulfilled', async () => {
        const task = AsyncOption.some('hello world').filter(
          (value) => value.length > 0,
        );

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('filters the Some value out if the predicate is not fulfilled', async () => {
        const task = AsyncOption.some('hello world').filter(
          (value) => value.length === 0,
        );

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });

      it('has no effect if the AsyncOption is a None', async () => {
        const predicate = vi.fn((value: string) => value.length > 0);

        const task = AsyncOption.none<string>().filter(predicate);

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(predicate).not.toHaveBeenCalled();
      });
    });
  });

  describe('fallbacks', () => {
    describe('or', () => {
      it('returns the Some value if the AsyncOption is a Some', async () => {
        const fallback = vi.fn(() => AsyncOption.some('Good bye!'));

        const task = AsyncOption.some('hello world').or(fallback);

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();

        expect(fallback).not.toHaveBeenCalled();
      });

      it('returns the fallback value if the AsyncOption is a None', async () => {
        const fallback = vi.fn(() => AsyncOption.some('Good bye!'));

        const task = AsyncOption.none<string>().or(fallback);

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('Good bye!'))).toBeTrue();
      });
    });
  });

  describe('other', () => {
    describe('tap', () => {
      it('executes the callback if the AsyncOption is a Some while ignoring the returned value and preserving the original value of the `AsyncOption`', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = AsyncOption.some('hello world').tap(callback);

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();

        expect(callback).toHaveBeenCalledWith('hello world');
      });

      it('does not execute the callback if the AsyncOption is a None', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = AsyncOption.none<string>().tap(callback);

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
});
