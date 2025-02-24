import { describe } from 'vitest';

import type { NoValueError } from './exceptions';
import { UnwrapError } from './exceptions';
import { OptionAsync } from './option.async';
// import { AsyncResult } from './async-result';
import type { DoNotation } from './do-notation';
import type { Falsy, Nullable } from './internals/types';
import { Option } from './option';
import { Result } from './result';
import type { ResultAsync } from './result.async';

describe('OptionAsync', () => {
  describe('constructors', () => {
    describe('is', () => {
      it('returns true if the value is an OptionAsync', () => {
        const option = OptionAsync.some('hello world');

        expect(OptionAsync.is(option)).toBeTrue();
      });

      it('returns false if the value is not an OptionAsync', () => {
        expect(
          OptionAsync.is(() => Promise.resolve(Option.some('hello world'))),
        ).toBeFalse();
      });
    });

    describe('some', () => {
      it('creates a OptionAsync with a `Some` and the provided value', async () => {
        const task = OptionAsync.some('hello world');
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });
    });

    describe('of', () => {
      it('creates a OptionAsync with a `Some` and the provided value', async () => {
        const task = OptionAsync.of('hello world');
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.of('hello world'))).toBeTrue();
      });
    });

    describe('none', () => {
      it('creates a OptionAsync with a `None` value', async () => {
        const task = OptionAsync.none();
        expectTypeOf(task).toEqualTypeOf<OptionAsync<never>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('fromNullable', () => {
      function nullify(value: Nullable<string>): Nullable<string> {
        return value;
      }

      it('creates a new OptionAsync with a `Some` when the value is not nullable', async () => {
        const task = OptionAsync.fromNullable(nullify('hello world'));
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates a new OptionAsync with a `None` when the value is nullable', async () => {
        {
          const task = OptionAsync.fromNullable(nullify(null));
          expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

          const option = await task;
          expect(option.isNone()).toBeTrue();
        }

        {
          const task = OptionAsync.fromNullable(nullify(undefined));

          expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

          const option = await task;
          expect(option.isNone()).toBeTrue();
        }
      });
    });

    describe('fromFalsy', () => {
      it('creates a OptionAsync with a `Some` when the value is not falsy', async () => {
        const task = OptionAsync.fromFalsy('hello world' as string | Falsy);
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

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
          const task = OptionAsync.fromFalsy(value);
          expectTypeOf(task).toEqualTypeOf<OptionAsync<never>>();

          const option = await task;
          expect(option.isNone()).toBeTrue();
        }
      });
    });

    describe('Do', () => {
      it('creates an `OptionAsync` with an empty object branded with the DoNotation type', async () => {
        const task = OptionAsync.Do;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
        expectTypeOf(task).toEqualTypeOf<OptionAsync<DoNotation.Sign>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({});
      });
    });

    describe('try', () => {
      it('creates a OptionAsync with a `Some` when the Promise succeeds', async () => {
        const task = OptionAsync.try(() => Promise.resolve('hello world'));
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates a OptionAsync with the Option resolved from the Promise', async () => {
        const task = OptionAsync.try(() =>
          Promise.resolve(Option.of('hello world')),
        );
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates a OptionAsync with a `None` when the Promise succeeds but returns null', async () => {
        const task = OptionAsync.try(() =>
          Promise.resolve(null as string | null),
        );
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });

      it('creates a OptionAsync with a `None` when the Promise rejects', async () => {
        const task = OptionAsync.try<string>(() =>
          Promise.reject(new Error('computation failed')),
        );
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('firstSomeOf', () => {
      it('returns the first `Some` value', async () => {
        const task = OptionAsync.firstSomeOf([
          OptionAsync.some(1),
          OptionAsync.none<number>(),
          OptionAsync.some(3),
        ]);

        expectTypeOf(task).toEqualTypeOf<OptionAsync<number>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(1);
      });

      it('returns `None` if all values are `None`', async () => {
        const task = OptionAsync.firstSomeOf<number>([
          OptionAsync.none(),
          OptionAsync.none(),
          OptionAsync.none(),
        ]);

        expectTypeOf(task).toEqualTypeOf<OptionAsync<number>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('predicate', () => {
      it('creates a function that will return an `OptionAsync` with the refined type of a value if the predicate is fulfilled', async () => {
        interface Circle {
          kind: 'circle';
        }

        interface Square {
          kind: 'square';
        }

        type Shape = Circle | Square;

        const ensureCircle = OptionAsync.predicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        expectTypeOf(ensureCircle).toEqualTypeOf<
          (shape: Shape) => OptionAsync<Circle>
        >();

        const task = ensureCircle({ kind: 'circle' });

        expectTypeOf(task).toEqualTypeOf<OptionAsync<Circle>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that will return an `OptionAsync` if the predicate is fullfiled', async () => {
        const ensurePositive = OptionAsync.predicate(
          (value: number) => value > 0,
        );

        expectTypeOf(ensurePositive).toEqualTypeOf<
          (value: number) => OptionAsync<number>
        >();

        const task = ensurePositive(10);

        expectTypeOf(task).toEqualTypeOf<OptionAsync<number>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });
    });

    describe('promise', () => {
      it('creates a new OptionAsync from a Promise that resolves to an Option', async () => {
        const task = OptionAsync.promise(() =>
          Promise.resolve(Option.of('hello world')),
        );
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });
    });

    describe('enhance', () => {
      it('lifts a function that returns a Promise that resolves to a nullable value', async () => {
        const lifted = OptionAsync.enhance((greeting: string) =>
          Promise.resolve(greeting),
        );
        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => OptionAsync<string>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBe(true);
        expect(option.equals(Option.some('hello world'))).toBe(true);
      });

      it('lifts a function that returns a Promise that resolves to an Option', async () => {
        const lifted = OptionAsync.enhance((greeting: string) =>
          Promise.resolve(Option.some(greeting)),
        );
        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => OptionAsync<string>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('lifts a function that returns a Promise that rejects', async () => {
        const lifted = OptionAsync.enhance((_: string) =>
          Promise.reject<string>(new Error('computation failed')),
        );

        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => OptionAsync<string>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('use', () => {
      it('safely evaluates the generator, returning the returned OptionAsync when all yields are `Some`', async () => {
        const greeting = OptionAsync.some('hello');
        const subject = OptionAsync.some('world');

        const task = OptionAsync.use(async function* () {
          const a = yield* greeting;
          expect(a).toBe('hello');

          const b = yield* subject;
          expect(b).toBe('world');

          return OptionAsync.some(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('safely evaluates the generator, early returning when a yield is `None`', async () => {
        const greeting = OptionAsync.none<string>();
        const getSubject = vi.fn(() => OptionAsync.some('world'));

        const task = OptionAsync.use(async function* () {
          const a = yield* greeting;
          const b = yield* getSubject();

          return OptionAsync.some(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(getSubject).not.toHaveBeenCalled();
      });
    });

    describe('createUse', () => {
      it('returns a function that safely evaluates the generator, returning the returned OptionAsync when all yields are `Some`', async () => {
        const execute = OptionAsync.createUse(async function* (
          greeting: string,
          subject: string,
        ) {
          const a = yield* OptionAsync.fromFalsy(greeting);
          expect(a).toBe('hello');

          const b = yield* OptionAsync.fromFalsy(subject);
          expect(b).toBe('world');

          return OptionAsync.some(`${a} ${b}`);
        });

        expectTypeOf(execute).toEqualTypeOf<
          (greeting: string, subject: string) => OptionAsync<string>
        >();

        const task = execute('hello', 'world');
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });
    });

    describe('values', () => {
      it('returns an array containing only the values inside `Some`', async () => {
        const output = await OptionAsync.values([
          OptionAsync.some(1),
          OptionAsync.none<number>(),
          OptionAsync.some(3),
        ]);

        expect(output).toEqual([1, 3]);
      });
    });
  });

  describe('instance', () => {
    describe('bindTo', () => {
      it('binds the current `OptionAsync` to a `do-notation`', async () => {
        const task = OptionAsync.some(10).bindTo('a');

        expectTypeOf(task).toEqualTypeOf<
          OptionAsync<DoNotation.Sign<{ a: number }>>
        >();

        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 10 });
      });
    });

    describe('bind', async () => {
      it('accumulates multiple `bind` calls into an object and is a `Some` Option if all values are `Some`', async () => {
        const task = OptionAsync.Do.bind('a', () => OptionAsync.some(2))
          .bind('b', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<Readonly<{ a: number }>>();
            expect(ctx).toEqual({ a: 2 });

            return OptionAsync.some(2);
          })
          .bind('c', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{ a: number; b: number }>
            >();
            expect(ctx).toEqual({ a: 2, b: 2 });

            return OptionAsync.some(6);
          });

        expectTypeOf(task).toEqualTypeOf<
          OptionAsync<
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
        const bindC = vi.fn(() => OptionAsync.some(6));

        const task = OptionAsync.Do.bind('a', () => OptionAsync.some(2))
          .bind('b', () => OptionAsync.none<number>())
          .bind('c', bindC);

        expectTypeOf(task).toEqualTypeOf<
          OptionAsync<
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
        const task = OptionAsync.Do.let('a', () => Promise.resolve(4))
          .let('b', () => Promise.resolve(6))
          .let('c', (ctx) => Promise.resolve(ctx.a + ctx.b));

        expectTypeOf(task).toEqualTypeOf<
          OptionAsync<
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

    describe('map', () => {
      it('maps the value of a OptionAsync when it is a `Some`', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = OptionAsync.some('hello world').map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('HELLO WORLD'))).toBeTrue();

        expect(mapper).toHaveBeenCalledWith('hello world');
      });

      it('is a no-op if OptionAsync is a None', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = OptionAsync.none<string>().map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(mapper).not.toHaveBeenCalled();
      });
    });

    describe('andThen', () => {
      it('transforms the `Some` value while flattening the `OptionAsync`', async () => {
        const task = OptionAsync.some('hello world').andThen((str) =>
          OptionAsync.some(str.toUpperCase()),
        );

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('HELLO WORLD'))).toBeTrue();
      });

      it('has no effect when OptionAsync is a None and flattens the OptionAsync', async () => {
        const task = OptionAsync.none<string>().andThen(() =>
          OptionAsync.fromNullable('hello world'),
        );

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });

      it('transforms the `Some` value while lifting an `Option` to an `OptionAsync` and flattens it', async () => {
        const task = OptionAsync.some('hello world').andThen((str) =>
          Option.some(str.toUpperCase()),
        );

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('HELLO WORLD'))).toBeTrue();
      });
    });

    describe('filter', () => {
      it('keeps the Some value if the predicate is fulfilled', async () => {
        const task = OptionAsync.some('hello world').filter(
          (value) => value.length > 0,
        );

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('filters the Some value out if the predicate is not fulfilled', async () => {
        const task = OptionAsync.some('hello world').filter(
          (value) => value.length === 0,
        );

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });

      it('has no effect if the OptionAsync is a None', async () => {
        const predicate = vi.fn((value: string) => value.length > 0);

        const task = OptionAsync.none<string>().filter(predicate);

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(predicate).not.toHaveBeenCalled();
      });
    });

    describe('or', () => {
      it('returns the Some value if the OptionAsync is a Some', async () => {
        const fallback = vi.fn(() => OptionAsync.some('Good bye!'));

        const task = OptionAsync.some('hello world').or(fallback);

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();

        expect(fallback).not.toHaveBeenCalled();
      });

      it('returns the fallback value if the OptionAsync is a None', async () => {
        const fallback = vi.fn(() => OptionAsync.some('Good bye!'));

        const task = OptionAsync.none<string>().or(fallback);

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('Good bye!'))).toBeTrue();
      });
    });

    describe('zip', () => {
      it('combines two `OptionAsync`s into a single `OptionAsync` containing a tuple of their values, if both `OptionAsync`s are `Some` variants', async () => {
        const first = OptionAsync.some('hello');
        const second = OptionAsync.some('world');

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<OptionAsync<[string, string]>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual(['hello', 'world']);
      });

      it('returns `None` if one of the `OptionAsync`s is `None`', async () => {
        const first = OptionAsync.some('hello');
        const second = OptionAsync.none<string>();

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<OptionAsync<[string, string]>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('zipWith', () => {
      it('combines two `OptionAsync`s into a single `OptionAsync` producing a new value by applying the given function to both values, if both `OptionAsync`s are `Some` variants', async () => {
        const first = OptionAsync.some('hello');
        const second = OptionAsync.some('world');

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('returns `None` if one of the `OptionAsync`s is `None`', async () => {
        const first = OptionAsync.some('hello');
        const second = OptionAsync.none<string>();

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<OptionAsync<string>>();

        const option = await task;
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('then', () => {
      it('resolves the promise returning the underlying `Option`', async () => {
        const option = await OptionAsync.some(10);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some(10))).toBeTrue();
      });
    });

    describe('match', () => {
      it('resolves to the Some case if the OptionAsync is a Some', async () => {
        const task = OptionAsync.some('world').match({
          Some(value) {
            return `Hello ${value}`;
          },
          None() {
            return 'Good bye!';
          },
        });

        await expect(task).resolves.toBe('Hello world');
      });

      it('resolves to the None case if the OptionAsync is a None', async () => {
        const task = OptionAsync.none<string>().match({
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
      it('resolves to the value of the OptionAsync if it is a Some', async () => {
        const task = OptionAsync.some('hello world').unwrap();

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the OptionAsync is a None', async () => {
        const task = OptionAsync.none<string>();

        await expect(task.unwrap()).rejects.toEqual(new UnwrapError('Option'));
      });
    });

    describe('unwrapOr', () => {
      it('resolves to the value of the OptionAsync if it is a Some', async () => {
        const task = OptionAsync.some('hello world').unwrapOr(
          () => 'Good bye!',
        );

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to the fallback value if the OptionAsync is a None', async () => {
        const task = OptionAsync.none<string>().unwrapOr(() => 'Good bye!');

        await expect(task).resolves.toBe('Good bye!');
      });
    });

    describe('unwrapOrNull', () => {
      it('resolves to the value of the OptionAsync if it is a Some', async () => {
        const task = OptionAsync.some('hello world').unwrapOrNull();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the OptionAsync is a None', async () => {
        const task = OptionAsync.none<string>().unwrapOrNull();

        await expect(task).resolves.toBeNull();
      });
    });

    describe('unwrapOrUndefined', () => {
      it('resolves to the value of the OptionAsync if it is a Some', async () => {
        const task = OptionAsync.some('hello world').unwrapOrUndefined();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the OptionAsync is a None', async () => {
        const task = OptionAsync.none<string>().unwrapOrUndefined();

        await expect(task).resolves.toBeUndefined();
      });
    });

    describe('expect', () => {
      it('resolves to the value of the OptionAsync if it is a Some', async () => {
        const task = OptionAsync.some('hello world').expect(
          () => new Error('Expected some value'),
        );

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the OptionAsync is a None', async () => {
        const task = OptionAsync.none<string>().expect(
          () => new Error('Expected some value'),
        );

        await expect(task).rejects.toEqual(new Error('Expected some value'));
      });
    });

    describe('contains', () => {
      it('resolves to true if the OptionAsync is a Some and the predicate is fulfilled', async () => {
        const result = OptionAsync.some('hello world').contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(true);
      });

      it('resolves to false if the OptionAsync is a Some and the predicate is not fulfilled', async () => {
        const result = OptionAsync.some('hello world').contains(
          (value) => value.length === 0,
        );

        await expect(result).resolves.toBe(false);
      });

      it('resolves to false if the OptionAsync is a None', async () => {
        const result = OptionAsync.none<string>().contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(false);
      });
    });

    describe('toArray', () => {
      it('creates an array with the value if OptionAsync is Some', async () => {
        const task = OptionAsync.some('hello world').toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual(['hello world']);
      });

      it('creates an empty array if OptionAsync is None', async () => {
        const task = OptionAsync.none<string>().toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual([]);
      });
    });

    describe('toAsyncResult', () => {
      it('creates an AsyncResult with an `Ok` from a Some OptionAsync', async () => {
        const task = OptionAsync.some('hello world').toAsyncResult();

        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, NoValueError>>();
        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.fromNullable('hello world'))).toBeTrue();
      });

      it('creates an AsyncResult with an `Error` from a None OptionAsync', async () => {
        const task = OptionAsync.none<string>().toAsyncResult();

        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, NoValueError>>();
        const result = await task;

        expect(result.isError()).toBeTrue();
      });

      it('creates an AsyncResult with a custom error from a None OptionAsync', async () => {
        const task = OptionAsync.none<string>().toAsyncResult(
          () => new Error('computation failed'),
        );

        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, Error>>();
        const result = await task;

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toEqual(new Error('computation failed'));
      });
    });

    describe('tap', () => {
      it('executes the callback if the OptionAsync is a Some while ignoring the returned value and preserving the original value of the `OptionAsync`', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = OptionAsync.some('hello world').tap(callback);

        const option = await task;
        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();

        expect(callback).toHaveBeenCalledWith('hello world');
      });

      it('does not execute the callback if the OptionAsync is a None', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = OptionAsync.none<string>().tap(callback);

        const option = await task;
        expect(option.isNone()).toBeTrue();

        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
});
