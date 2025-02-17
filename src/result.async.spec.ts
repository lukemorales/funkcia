import type { DoNotation } from './do-notation';
import type {
  FailedPredicateError,
  NoValueError,
  UnknownError,
} from './exceptions';
import { TaggedError, UnwrapError } from './exceptions';
import { coerce } from './functions';
import { FunkciaStore } from './funkcia-store';
import type { Falsy, Nullable } from './internals/types';
import { Option } from './option';
import { AsyncOption } from './option.async';
import { Result } from './result';
import { AsyncResult } from './result.async';

describe('AsyncResult', () => {
  let unregisterOption: () => void;
  let unregisterResult: () => void;
  let unregisterAsyncOption: () => void;

  beforeAll(() => {
    unregisterOption = FunkciaStore.register(Option);
    unregisterResult = FunkciaStore.register(Result);
    unregisterAsyncOption = FunkciaStore.register(AsyncOption);
  });

  afterAll(() => {
    unregisterOption();
    unregisterResult();
    unregisterAsyncOption();
  });

  describe('constructors', () => {
    describe('ok', () => {
      it('creates a AsyncResult with an `Ok` and the provided value', async () => {
        const task = AsyncResult.ok('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, never>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });
    });

    describe('of', () => {
      it('references the `ok` constructor', () => {
        expect(AsyncResult.of).toEqual(AsyncResult.ok);
      });
    });

    describe('error', () => {
      it('creates a AsyncResult with an `Error` value', async () => {
        const task = AsyncResult.error(new Error('computation failed'));
        expectTypeOf(task).toEqualTypeOf<AsyncResult<never, Error>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('fromNullable', () => {
      function nullify(value: Nullable<string>): Nullable<string> {
        return value;
      }

      it('creates a new AsyncResult with an `Ok` when the value is not nullable', async () => {
        const task = AsyncResult.fromNullable(nullify('hello world'));
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, NoValueError>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('creates a new AsyncResult with an `Error` when the value is nullable', async () => {
        {
          const task = AsyncResult.fromNullable(nullify(null));
          expectTypeOf(task).toEqualTypeOf<AsyncResult<string, NoValueError>>();

          const result = await task;
          expect(result.isError()).toBeTrue();
        }

        {
          const task = AsyncResult.fromNullable(nullify(undefined));

          expectTypeOf(task).toEqualTypeOf<AsyncResult<string, NoValueError>>();

          const result = await task;
          expect(result.isError()).toBeTrue();
        }
      });
    });

    describe('fromFalsy', () => {
      it('creates a AsyncResult with an `Ok` when the value is not falsy', async () => {
        const task = AsyncResult.fromFalsy('hello world' as string | Falsy);
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, NoValueError>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('creates an `Error` Result when the value is falsy', async () => {
        const falsyValues = [
          '',
          0,
          0n,
          null,
          undefined,
          false,
        ] satisfies Falsy[];

        for (const value of falsyValues) {
          const task = AsyncResult.fromFalsy(value);
          expectTypeOf(task).toEqualTypeOf<AsyncResult<never, NoValueError>>();

          const result = await task;
          expect(result.isError()).toBeTrue();
        }
      });
    });

    describe('try', () => {
      it('creates a AsyncResult with an `Ok` when the Promise succeeds', async () => {
        const task = AsyncResult.try(() => Promise.resolve('hello world'));
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, UnknownError>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('creates a AsyncResult with an `Error` when the Promise rejects', async () => {
        const task = AsyncResult.try<string>(() =>
          Promise.reject(new Error('computation failed')),
        );
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, UnknownError>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('promise', () => {
      it('creates a new AsyncResult from a Promise that resolves to a Result', async () => {
        const task = AsyncResult.promise(() =>
          Promise.resolve(Result.of('hello world')),
        );
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, never>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });
    });

    describe('liftPromise', () => {
      it('lifts a function that returns a Promise that resolves to a raw value', async () => {
        const lifted = AsyncResult.liftPromise((greeting: string) =>
          Promise.resolve(greeting),
        );
        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncResult<string, UnknownError>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, UnknownError>>();

        const result = await task;

        expect(result.isOk()).toBe(true);
        expect(result.equals(Result.ok('hello world'))).toBe(true);
      });

      it('lifts a function that returns a Promise that resolves to a Result', async () => {
        const lifted = AsyncResult.liftPromise((greeting: string) =>
          Promise.resolve(Result.ok(greeting)),
        );
        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncResult<string, UnknownError>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, UnknownError>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('lifts a function that returns a Promise that rejects', async () => {
        const lifted = AsyncResult.liftPromise(
          (_: string) =>
            Promise.reject<string>(new Error('computation failed')),
          coerce<Error>,
        );

        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncResult<string, Error>
        >();

        const task = lifted('hello world');
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('predicate', () => {
      interface Circle {
        kind: 'circle';
      }

      interface Square {
        kind: 'square';
      }

      type Shape = Circle | Square;

      it('creates a function that can be used to refine the type of a value', async () => {
        const isCircle = AsyncResult.predicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        const task = isCircle({ kind: 'circle' });

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<Circle, FailedPredicateError<Square>>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to refine the type of a value and accepts a custom error', async () => {
        class InvalidShapeError extends TaggedError {
          readonly _tag = 'InvalidShapeError';
        }

        const isCircle = AsyncResult.predicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
          (shape) => {
            expectTypeOf(shape).toEqualTypeOf<Square>();

            return new InvalidShapeError(shape.kind);
          },
        );

        const task = isCircle({ kind: 'circle' });

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<Circle, InvalidShapeError>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to assert the type of a value', async () => {
        const isPositive = AsyncResult.predicate((value: number) => value > 0);

        const task = isPositive(10);

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<number, FailedPredicateError<number>>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });

      it('creates a function that can be used to assert the type of a value and accepts a custom error', async () => {
        class InvalidNumberError extends TaggedError {
          readonly _tag = 'InvalidNumberError';
        }

        const isPositive = AsyncResult.predicate(
          (value: number) => value > 0,
          () => new InvalidNumberError(),
        );

        const task = isPositive(10);

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<number, InvalidNumberError>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });
    });

    describe('relay', () => {
      it('safely evaluates the generator, returning the returned AsyncResult when all yields are `Ok`', async () => {
        const greeting = AsyncResult.ok('hello');
        const subject = AsyncResult.ok('world');

        const task = AsyncResult.relay(async function* exec() {
          const a = yield* greeting;
          expect(a).toBe('hello');

          const b = yield* subject;
          expect(b).toBe('world');

          return AsyncResult.ok(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, never>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('safely evaluates the generator, early returning when a yield is `Error`', async () => {
        const greeting = AsyncResult.error(new Error('computation failed'));
        const getSubject = vi.fn(() => AsyncResult.ok('world'));

        const task = AsyncResult.relay(async function* exec() {
          const a = yield* greeting;
          const b = yield* getSubject();

          return AsyncResult.ok(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(getSubject).not.toHaveBeenCalled();
      });
    });
  });

  describe('combinators', () => {
    describe('values', () => {
      it('returns an array containing only the values inside `Ok`', async () => {
        const output = await AsyncResult.values([
          AsyncResult.ok(1),
          AsyncResult.error(new Error('computation failed')),
          AsyncResult.ok(3),
        ]);

        expect(output).toEqual([1, 3]);
      });
    });

    describe('zip', () => {
      it('combines two `AsyncResult`s into a single `AsyncResult` containing a tuple of their values, if both `AsyncResult`s are `Ok` variants', async () => {
        const first = AsyncResult.ok('hello');
        const second = AsyncResult.ok('world');

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<[string, string], never>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual(['hello', 'world']);
      });

      it('returns `Error` if one of the `AsyncResult`s is `Error`', async () => {
        const first = AsyncResult.ok('hello');
        const second = AsyncResult.fromFalsy('' as string);

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<[string, string], NoValueError>
        >();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('zipWith', () => {
      it('combines two `AsyncResult`s into a single `AsyncResult` producing a new value by applying the given function to both values, if both `AsyncResult`s are `Ok` variants', async () => {
        const first = AsyncResult.ok('hello');
        const second = AsyncResult.ok('world');

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, never>>();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('returns `Error` if one of the `AsyncResult`s is `Error`', async () => {
        const first = AsyncResult.ok('hello');
        const second = AsyncResult.fromFalsy('' as string);

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, NoValueError>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });
  });

  describe('do-notation', () => {
    describe('Do', () => {
      it('creates an `AsyncResult` with an empty object branded with the DoNotation type', async () => {
        const task = AsyncResult.Do;

        expectTypeOf(task).toEqualTypeOf<
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
          AsyncResult<DoNotation.Sign<object>, never>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({});
      });
    });

    describe('bindTo', () => {
      it('binds the current `AsyncResult` to a `do-notation`', async () => {
        const task = AsyncResult.ok(10).bindTo('a');

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<DoNotation.Sign<{ a: number }>, never>
        >();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ a: 10 });
      });
    });

    describe('bind', async () => {
      it('accumulates multiple `bind` calls into an object and is an `Ok` Result if all values are `Ok`', async () => {
        const task = AsyncResult.Do.bind('a', () => AsyncResult.ok(2))
          .bind('b', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<Readonly<{ a: number }>>();
            expect(ctx).toEqual({ a: 2 });

            return AsyncResult.ok(2);
          })
          .bind('c', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{ a: number; b: number }>
            >();
            expect(ctx).toEqual({ a: 2, b: 2 });

            return AsyncResult.ok(6);
          });

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>,
            never
          >
        >();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ a: 2, b: 2, c: 6 });
      });

      it('accumulates multiple `bind` calls into an object and is an `Error` Result if any value is `Error`', async () => {
        const bindC = vi.fn(() => AsyncResult.ok(6));

        const task = AsyncResult.Do.bind('a', () => AsyncResult.ok(2))
          .bind('b', () => AsyncResult.fromFalsy(0 as number))
          .bind('c', bindC);

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>,
            NoValueError
          >
        >();

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(bindC).not.toHaveBeenCalled();
      });
    });

    describe('let', async () => {
      it('accumulates multiple `let` calls into an object', async () => {
        const task = AsyncResult.Do.let('a', () => Promise.resolve(4))
          .let('b', () => Promise.resolve(6))
          .let('c', (ctx) => Promise.resolve(ctx.a + ctx.b));

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>,
            never
          >
        >();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ a: 4, b: 6, c: 10 });
      });
    });
  });

  describe('conversions', () => {
    describe('then', () => {
      it('resolves the promise returning the underlying `Result`', async () => {
        const result = await AsyncResult.ok(10);

        expectTypeOf(result).toEqualTypeOf<Result<number, never>>();

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok(10))).toBeTrue();
      });
    });

    describe('match', () => {
      it('resolves to the Ok case if the `AsyncResult` is an `Ok`', async () => {
        const task = AsyncResult.ok('world').match({
          Ok(value) {
            return `Hello ${value}`;
          },
          Error() {
            return 'Good bye!';
          },
        });

        await expect(task).resolves.toBe('Hello world');
      });

      it('resolves to the Error case if the `AsyncResult` is an Error', async () => {
        const task = AsyncResult.fromFalsy('' as string).match({
          Ok(value) {
            return `Hello ${value}`;
          },
          Error() {
            return 'Good bye!';
          },
        });

        await expect(task).resolves.toBe('Good bye!');
      });
    });

    describe('unwrap', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = AsyncResult.ok('hello world').unwrap();

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the `AsyncResult` is an Error', async () => {
        const task = AsyncResult.fromFalsy('' as string);

        await expect(task.unwrap()).rejects.toBeInstanceOf(UnwrapError);
      });
    });

    describe('unwrapOr', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = AsyncResult.ok('hello world').unwrapOr(() => 'Good bye!');

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to the fallback value if the `AsyncResult` is an Error', async () => {
        const task = AsyncResult.fromFalsy('' as string).unwrapOr(
          () => 'Good bye!',
        );

        await expect(task).resolves.toBe('Good bye!');
      });
    });

    describe('unwrapOrNull', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = AsyncResult.ok('hello world').unwrapOrNull();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the `AsyncResult` is an Error', async () => {
        const task = AsyncResult.fromFalsy('' as string).unwrapOrNull();

        await expect(task).resolves.toBeNull();
      });
    });

    describe('unwrapOrUndefined', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = AsyncResult.ok('hello world').unwrapOrUndefined();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the `AsyncResult` is an Error', async () => {
        const task = AsyncResult.fromFalsy('' as string).unwrapOrUndefined();

        await expect(task).resolves.toBeUndefined();
      });
    });

    describe('expect', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = AsyncResult.ok('hello world').expect(
          () => new Error('Expected ok value'),
        );

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the `AsyncResult` is an Error', async () => {
        const task = AsyncResult.fromFalsy('' as string).expect(
          () => new Error('Expected ok value'),
        );

        await expect(task).rejects.toEqual(new Error('Expected ok value'));
      });
    });

    describe('contains', () => {
      it('resolves to true if the `AsyncResult` is an `Ok` and the predicate is fulfilled', async () => {
        const result = AsyncResult.ok('hello world').contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(true);
      });

      it('resolves to false if the `AsyncResult` is an `Ok` and the predicate is not fulfilled', async () => {
        const result = AsyncResult.ok('hello world').contains(
          (value) => value.length === 0,
        );

        await expect(result).resolves.toBe(false);
      });

      it('resolves to false if the `AsyncResult` is an Error', async () => {
        const result = AsyncResult.fromFalsy('' as string).contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(false);
      });
    });

    describe('toAsyncOption', () => {
      it('creates an AsyncOption with a `Some` from an `Ok` `AsyncResult`', async () => {
        const task = AsyncResult.ok('hello world').toAsyncOption();

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();
        const option = await task;

        expect(option.isSome()).toBeTrue();
        expect(option.equals(Option.some('hello world'))).toBeTrue();
      });

      it('creates an AsyncOption with a `None` from an `Error` `AsyncResult`', async () => {
        const task = AsyncResult.fromFalsy('' as string).toAsyncOption();

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();
        const option = await task;

        expect(option.isNone()).toBeTrue();
      });
    });

    describe('toArray', () => {
      it('creates an array with the value if AsyncResult is Ok', async () => {
        const task = AsyncResult.ok('hello world').toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual(['hello world']);
      });

      it('creates an empty array if AsyncResult is Error', async () => {
        const task = AsyncResult.fromFalsy('' as string).toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual([]);
      });
    });
  });

  describe('transformations', () => {
    describe('map', () => {
      it('maps the value of a AsyncResult when it is an `Ok`', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = AsyncResult.ok('hello world').map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('HELLO WORLD'))).toBeTrue();

        expect(mapper).toHaveBeenCalledWith('hello world');
      });

      it('is a no-op if AsyncResult is an Error', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = AsyncResult.fromFalsy('' as string).map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(mapper).not.toHaveBeenCalled();
      });
    });

    describe('andThen', () => {
      it('transforms the `Ok` value while flattening the `AsyncResult`', async () => {
        const task = AsyncResult.ok('hello world').andThen((str) =>
          AsyncResult.ok(str.toUpperCase()),
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('HELLO WORLD'))).toBeTrue();
      });

      it('has no effect when AsyncResult is an Error and flattens the `AsyncResult`', async () => {
        const task = AsyncResult.fromFalsy('' as string).andThen(() =>
          AsyncResult.fromNullable('hello world'),
        );

        const result = await task;
        expect(result.isError()).toBeTrue();
      });

      it('transforms the `Ok` value while lifting a `Result` to an `AsyncResult` and flattens it', async () => {
        const task = AsyncResult.ok('hello world').andThen((str) =>
          Result.ok(str.toUpperCase()),
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('HELLO WORLD'))).toBeTrue();
      });
    });

    describe('filter', () => {
      it('keeps the Ok value if the predicate is fulfilled', async () => {
        const task = AsyncResult.ok('hello world').filter(
          (value) => value.length > 0,
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('filters the Ok value out if the predicate is not fulfilled', async () => {
        const task = AsyncResult.ok('hello world').filter(
          (value) => value.length === 0,
        );

        const result = await task;
        expect(result.isError()).toBeTrue();
      });

      it('has no effect if the `AsyncResult` is an Error', async () => {
        const predicate = vi.fn((value: string) => value.length > 0);

        const task = AsyncResult.fromFalsy('' as string).filter(predicate);

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(predicate).not.toHaveBeenCalled();
      });
    });
  });

  describe('fallbacks', () => {
    describe('or', () => {
      it('returns the Ok value if the `AsyncResult` is an `Ok`', async () => {
        const fallback = vi.fn(() => AsyncResult.ok('Good bye!'));

        const task = AsyncResult.ok('hello world').or(fallback);

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();

        expect(fallback).not.toHaveBeenCalled();
      });

      it('returns the fallback value if the `AsyncResult` is an Error', async () => {
        const task = AsyncResult.fromFalsy('' as string).or(() =>
          AsyncResult.ok('Good bye!'),
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('Good bye!'))).toBeTrue();
      });
    });
  });

  describe('other', () => {
    describe('tap', () => {
      it('executes the callback if the `AsyncResult` is an `Ok` while ignoring the returned value and preserving the original value of the `AsyncResult`', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = AsyncResult.ok('hello world').tap(callback);

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();

        expect(callback).toHaveBeenCalledWith('hello world');
      });

      it('does not execute the callback if the `AsyncResult` is an Error', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = AsyncResult.fromFalsy('' as string).tap(callback);

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('tapError', () => {
      it('executes the callback if the `AsyncResult` is an `Error` while ignoring the returned value and preserving the original value of the `AsyncResult`', async () => {
        const callback = vi.fn((value: NoValueError) => value.message);

        const task = AsyncResult.fromNullable('hello world').tapError(callback);

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
        expect(callback).not.toHaveBeenCalled();
      });

      it('does not execute the callback if the `AsyncResult` is an Error', async () => {
        const callback = vi.fn((value: NoValueError) => value.message);

        const task = AsyncResult.fromFalsy('' as string).tapError(callback);

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(callback).toHaveBeenCalledOnce();
      });
    });
  });
});
