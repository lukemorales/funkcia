import type { DoNotation } from './do-notation';
import {
  FailedPredicateError,
  NoValueError,
  Panic,
  TaggedError,
  UnhandledException,
} from './exceptions';
import type { Falsy, Nullable } from './internals/types';
import { Option } from './option';
import { Result } from './result';
import { ResultAsync } from './result-async';

describe('ResultAsync', () => {
  describe('constructors', () => {
    describe('ok', () => {
      it('creates a AsyncResult with an `Ok` and the provided value', async () => {
        const task = ResultAsync.ok('hello world');
        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, never>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });
    });

    describe('of', () => {
      it('creates a AsyncResult with an `Ok` and the provided value', async () => {
        const task = ResultAsync.of('hello world');
        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, never>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.of('hello world'))).toBeTrue();
      });
    });

    describe('error', () => {
      it('creates a AsyncResult with an `Error` value', async () => {
        const task = ResultAsync.error(new Error('computation failed'));
        expectTypeOf(task).toEqualTypeOf<ResultAsync<never, Error>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('fromNullable', () => {
      function nullify(value: Nullable<string>): Nullable<string> {
        return value;
      }

      it('creates a new AsyncResult with an `Ok` when the value is not nullable', async () => {
        const task = ResultAsync.fromNullable(nullify('hello world'));
        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, NoValueError>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('creates a new AsyncResult with an `Error` when the value is nullable', async () => {
        {
          const task = ResultAsync.fromNullable(nullify(null));
          expectTypeOf(task).toEqualTypeOf<ResultAsync<string, NoValueError>>();

          const result = await task;
          expect(result.isError()).toBeTrue();
        }

        {
          const task = ResultAsync.fromNullable(nullify(undefined));

          expectTypeOf(task).toEqualTypeOf<ResultAsync<string, NoValueError>>();

          const result = await task;
          expect(result.isError()).toBeTrue();
        }
      });
    });

    describe('fromFalsy', () => {
      it('creates a AsyncResult with an `Ok` when the value is not falsy', async () => {
        const task = ResultAsync.fromFalsy('hello world' as string | Falsy);
        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, NoValueError>>();

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
          const task = ResultAsync.fromFalsy(value);
          expectTypeOf(task).toEqualTypeOf<ResultAsync<never, NoValueError>>();

          const result = await task;
          expect(result.isError()).toBeTrue();
        }
      });
    });

    describe('fromOption', () => {
      it('converts a Some Option to an Ok ResultAsync', async () => {
        const task = ResultAsync.fromOption(Option.some(10));
        expectTypeOf(task).toEqualTypeOf<ResultAsync<number, NoValueError>>();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok(10))).toBeTrue();
      });

      it('converts a None Option to an Error ResultAsync', async () => {
        const task = ResultAsync.fromOption(Option.none<number>());
        expectTypeOf(task).toEqualTypeOf<ResultAsync<number, NoValueError>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('fromResult', () => {
      it('converts an Ok Result to a ResultAsync Ok', async () => {
        const task = ResultAsync.fromResult(Result.ok(10));
        expectTypeOf(task).toEqualTypeOf<ResultAsync<number, never>>();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok(10))).toBeTrue();
      });

      it('converts an Error Result to a ResultAsync Error', async () => {
        const error = new Error('computation failed');
        const task = ResultAsync.fromResult(Result.error(error));
        expectTypeOf(task).toEqualTypeOf<ResultAsync<never, Error>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('Do', () => {
      it('creates an `AsyncResult` with an empty object branded with the DoNotation type', async () => {
        const task = ResultAsync.Do;

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<DoNotation<object>, never>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({});
      });
    });

    describe('try', () => {
      it('creates a AsyncResult with an `Ok` when the Promise succeeds', async () => {
        const task = ResultAsync.try(() => Promise.resolve('hello world'));
        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<string, UnhandledException>
        >();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('creates a AsyncResult with an `Error` when the Promise rejects', async () => {
        const task = ResultAsync.try(() =>
          Promise.reject<string>(new Error('computation failed')),
        );
        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<string, UnhandledException>
        >();

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
        const isCircle = ResultAsync.predicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        const task = isCircle({ kind: 'circle' });

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<Circle, FailedPredicateError<Square>>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to refine the type of a value and accepts a custom error', async () => {
        class InvalidShapeError extends TaggedError('InvalidShapeError') {}

        const isCircle = ResultAsync.predicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
          (shape) => {
            expectTypeOf(shape).toEqualTypeOf<Square>();

            return new InvalidShapeError(shape.kind);
          },
        );

        const task = isCircle({ kind: 'circle' });

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<Circle, InvalidShapeError>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to assert the type of a value', async () => {
        const isPositive = ResultAsync.predicate((value: number) => value > 0);

        const task = isPositive(10);

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<number, FailedPredicateError<number>>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });

      it('creates a function that can be used to assert the type of a value and accepts a custom error', async () => {
        class InvalidNumberError extends TaggedError('InvalidNumberError') {}

        const isPositive = ResultAsync.predicate(
          (value: number) => value > 0,
          () => new InvalidNumberError(),
        );

        const task = isPositive(10);

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<number, InvalidNumberError>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });
    });

    describe('use', () => {
      it('safely evaluates the generator, returning the returned AsyncResult when all yields are `Ok`', async () => {
        const greeting = ResultAsync.ok('hello').mapError(() => new Error(''));
        const subject = ResultAsync.ok('world').mapError(() => {
          class UniqueException extends TaggedError('UniqueException') {}

          return new UniqueException('Life is hard');
        });

        const task = ResultAsync.use(async function* () {
          const a = yield* greeting;
          expect(a).toBe('hello');

          const b = yield* subject;
          expect(b).toBe('world');

          return Result.ok(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, Error>>();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('safely evaluates the generator, early returning when a yield is `Error`', async () => {
        const greeting = ResultAsync.error(new Error('computation failed'));
        const getSubject = vi.fn(() => ResultAsync.ok('world'));

        const task = ResultAsync.use(async function* () {
          const a = yield* greeting;
          const b = yield* getSubject();

          return ResultAsync.ok(`${a} ${b}`);
        });

        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, Error>>();

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(getSubject).not.toHaveBeenCalled();
      });
    });

    describe('fn', () => {
      it('returns a function that safely evaluates the generator, returning the returned ResultAsync when all yields are `Ok`', async () => {
        const propagator = ResultAsync.fn(async function* (target: string) {
          const greeting = yield* ResultAsync.fromNullable('hello');

          const subject = yield* ResultAsync.fromNullable(target);

          return Result.ok(`${greeting} ${subject}`);
        });

        expectTypeOf(propagator).toEqualTypeOf<
          (name: string) => ResultAsync<string, NoValueError>
        >();

        const result = await propagator('world');

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });
    });

    describe('values', () => {
      it('returns an array containing only the values inside `Ok`', async () => {
        const output = await ResultAsync.values([
          ResultAsync.ok(1),
          ResultAsync.error(new Error('computation failed')),
          ResultAsync.ok(3),
        ]);

        expect(output).toEqual([1, 3]);
      });
    });

    describe('resource', () => {
      const database = {
        query: {
          users: {
            findMany: async () => [{ id: '1' }, { id: '2' }],
            findOne: async () => {
              throw new Error('Invalid database credentials');
            },
          },
        },
      };

      class DatabaseError extends TaggedError('DatabaseError') {}

      it('wraps a resource and allows safe usage with run()', async () => {
        const db = ResultAsync.resource(database);

        const result = await db.run((client) => client.query.users.findMany());
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual([{ id: '1' }, { id: '2' }]);
      });

      it('wraps a resource and allows safe usage with use() and a custom error handler', async () => {
        const db = ResultAsync.resource(
          database,
          (error) =>
            new DatabaseError('Failed to connect to the database', {
              cause: error,
            }),
        );

        const result = await db.run((client) => client.query.users.findOne());
        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBeInstanceOf(DatabaseError);
      });
    });
  });

  describe('instance', () => {
    describe('bindTo', () => {
      it('binds the current `AsyncResult` to a `do-notation`', async () => {
        const task = ResultAsync.ok(10).bindTo('a');

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<DoNotation<{ a: number }>, never>
        >();

        const result = await task;

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual({ a: 10 });
      });
    });

    describe('bind', async () => {
      it('accumulates multiple `bind` calls into an object and is an `Ok` Result if all values are `Ok`', async () => {
        const task = ResultAsync.Do.bind('a', () => ResultAsync.ok(2))
          .bind('b', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<Readonly<{ a: number }>>();
            expect(ctx).toEqual({ a: 2 });

            return ResultAsync.ok(2);
          })
          .bind('c', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{ a: number; b: number }>
            >();
            expect(ctx).toEqual({ a: 2, b: 2 });

            return ResultAsync.ok(6);
          });

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<
            DoNotation<{
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
        const bindC = vi.fn(() => ResultAsync.ok(6));

        const task = ResultAsync.Do.bind('a', () => ResultAsync.ok(2))
          .bind('b', () => ResultAsync.fromFalsy(0 as number))
          .bind('c', bindC);

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<
            DoNotation<{
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
        const task = ResultAsync.Do.let('a', () => Promise.resolve(4))
          .let('b', () => Promise.resolve(6))
          .let('c', (ctx) => Promise.resolve(ctx.a + ctx.b));

        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<
            DoNotation<{
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

    describe('map', () => {
      it('maps the value of a AsyncResult when it is an `Ok`', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = ResultAsync.ok('hello world').map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('HELLO WORLD'))).toBeTrue();

        expect(mapper).toHaveBeenCalledWith('hello world');
      });

      it('is a no-op if AsyncResult is an Error', async () => {
        const mapper = vi.fn((str: string) => str.toUpperCase());

        const task = ResultAsync.fromFalsy('' as string).map(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(mapper).not.toHaveBeenCalled();
      });
    });

    describe('mapError', () => {
      it('maps the error of a AsyncResult when it is an `Error`', async () => {
        const mapper = vi.fn((err: Error) => err.message.toUpperCase());

        const task = ResultAsync.error(
          new Error('computation failed'),
        ).mapError(mapper);
        // asserting lazy evaluation of function being enqueued
        expect(mapper).not.toHaveBeenCalled();

        await expect(task.unwrapError()).resolves.toBe('COMPUTATION FAILED');
        expect(mapper).toHaveBeenCalledOnce();
      });
    });

    describe('mapBoth', () => {
      it('executes the Ok callback when the AsyncResult is Ok', async () => {
        const errorCallback = vi.fn((error: NoValueError) =>
          error._tag.toLowerCase(),
        );

        const task = ResultAsync.fromFalsy('hello world' as string).mapBoth({
          Ok(value) {
            return value.toUpperCase();
          },
          Error: errorCallback,
        });

        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, string>>();

        await expect(task.unwrap()).resolves.toBe('HELLO WORLD');
        expect(errorCallback).not.toHaveBeenCalled();
      });

      describe('executes the Error callback when the AsyncResult is Error', async () => {
        const okCallback = vi.fn((value: string) => value.toUpperCase());

        const result = ResultAsync.fromFalsy(
          '' as string,
          () => new Error('computation failed'),
        ).mapBoth({
          Ok: okCallback,
          Error(error) {
            return error.message.toUpperCase();
          },
        });

        expectTypeOf(result).toEqualTypeOf<ResultAsync<string, string>>();

        await expect(result.unwrapError()).resolves.toBe('COMPUTATION FAILED');
        expect(okCallback).not.toHaveBeenCalled();
      });
    });

    describe('andThen', () => {
      it('transforms the `Ok` value while flattening the `AsyncResult`', async () => {
        const task = ResultAsync.ok('hello world').andThen((str) =>
          ResultAsync.ok(str.toUpperCase()),
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('HELLO WORLD'))).toBeTrue();
      });

      it('has no effect when AsyncResult is an Error and flattens the `AsyncResult`', async () => {
        const task = ResultAsync.fromFalsy('' as string).andThen(() =>
          ResultAsync.fromNullable('hello world'),
        );

        const result = await task;
        expect(result.isError()).toBeTrue();
      });

      it('transforms the `Ok` value while lifting a `Result` to an `AsyncResult` and flattens it', async () => {
        const task = ResultAsync.ok('hello world').andThen((str) =>
          Result.ok(str.toUpperCase()),
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('HELLO WORLD'))).toBeTrue();
      });
    });

    describe('filter', () => {
      it('keeps the Ok value if the predicate is fulfilled', async () => {
        const task = ResultAsync.ok('hello world').filter(
          (value) => value.length > 0,
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
      });

      it('filters the Ok value out if the predicate is not fulfilled', async () => {
        const task = ResultAsync.ok('hello world').filter(
          (value) => value.length === 0,
        );

        const result = await task;
        expect(result.isError()).toBeTrue();
      });

      it('has no effect if the `AsyncResult` is an Error', async () => {
        const predicate = vi.fn((value: string) => value.length > 0);

        const task = ResultAsync.fromFalsy('' as string).filter(predicate);

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(predicate).not.toHaveBeenCalled();
      });
    });

    describe('or', () => {
      it('returns the Ok value if the `AsyncResult` is an `Ok`', async () => {
        const fallback = vi.fn(() => ResultAsync.ok('Good bye!'));

        const task = ResultAsync.ok('hello world').or(fallback);

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();

        expect(fallback).not.toHaveBeenCalled();
      });

      it('returns the fallback value if the `AsyncResult` is an Error', async () => {
        const task = ResultAsync.fromFalsy('' as string).or(() =>
          ResultAsync.ok('Good bye!'),
        );

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('Good bye!'))).toBeTrue();
      });
    });

    describe('swap', () => {
      it('swaps the value of the AsyncResult', async () => {
        const task = ResultAsync.fromNullable('hello world');

        const swapped = task.swap();
        expectTypeOf(swapped).toEqualTypeOf<
          ResultAsync<NoValueError, string>
        >();

        await expect(swapped.unwrapError()).resolves.toBe('hello world');
      });
    });

    describe('zip', () => {
      it('combines two `AsyncResult`s into a single `AsyncResult` containing a tuple of their values, if both `AsyncResult`s are `Ok` variants', async () => {
        const first = ResultAsync.ok('hello');
        const second = ResultAsync.ok('world');

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<[string, string], never>
        >();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toEqual(['hello', 'world']);
      });

      it('returns `Error` if one of the `AsyncResult`s is `Error`', async () => {
        const first = ResultAsync.ok('hello');
        const second = ResultAsync.fromFalsy('' as string);

        const task = first.zip(second);
        expectTypeOf(task).toEqualTypeOf<
          ResultAsync<[string, string], NoValueError>
        >();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('zipWith', () => {
      it('combines two `AsyncResult`s into a single `AsyncResult` producing a new value by applying the given function to both values, if both `AsyncResult`s are `Ok` variants', async () => {
        const first = ResultAsync.ok('hello');
        const second = ResultAsync.ok('world');

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, never>>();

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('returns `Error` if one of the `AsyncResult`s is `Error`', async () => {
        const first = ResultAsync.ok('hello');
        const second = ResultAsync.fromFalsy('' as string);

        const task = first.zipWith(second, (a, b) => `${a} ${b}`);
        expectTypeOf(task).toEqualTypeOf<ResultAsync<string, NoValueError>>();

        const result = await task;
        expect(result.isError()).toBeTrue();
      });
    });

    describe('then', () => {
      it('resolves the promise returning the underlying `Result`', async () => {
        const result = await ResultAsync.ok(10);

        expectTypeOf(result).toEqualTypeOf<Result<number, never>>();

        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok(10))).toBeTrue();
      });
    });

    describe('match', () => {
      it('resolves to the Ok case if the `AsyncResult` is an `Ok`', async () => {
        const task = ResultAsync.ok('world').match({
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
        const task = ResultAsync.fromFalsy('' as string).match({
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
        const task = ResultAsync.ok('hello world').unwrap();

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the `AsyncResult` is an Error', async () => {
        const task = ResultAsync.fromFalsy('' as string);

        await expect(task.unwrap()).rejects.toBeInstanceOf(Panic);
      });
    });

    describe('unwrapError', () => {
      it('unwraps the error of the AsyncResult', async () => {
        const task = ResultAsync.error(new Error('Failed computation'));

        await expect(task.unwrapError()).resolves.toBeInstanceOf(Error);
      });
    });

    describe('unwrapOr', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = ResultAsync.ok('hello world').unwrapOr(() => 'Good bye!');

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to the fallback value if the `AsyncResult` is an Error', async () => {
        const task = ResultAsync.fromFalsy('' as string).unwrapOr(
          () => 'Good bye!',
        );

        await expect(task).resolves.toBe('Good bye!');
      });
    });

    describe('unwrapOrNull', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = ResultAsync.ok('hello world').unwrapOrNull();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the `AsyncResult` is an Error', async () => {
        const task = ResultAsync.fromFalsy('' as string).unwrapOrNull();

        await expect(task).resolves.toBeNull();
      });
    });

    describe('unwrapOrUndefined', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = ResultAsync.ok('hello world').unwrapOrUndefined();

        await expect(task).resolves.toBe('hello world');
      });

      it('resolves to null if the `AsyncResult` is an Error', async () => {
        const task = ResultAsync.fromFalsy('' as string).unwrapOrUndefined();

        await expect(task).resolves.toBeUndefined();
      });
    });

    describe('expect', () => {
      it('resolves to the value of the `AsyncResult` if it is an `Ok`', async () => {
        const task = ResultAsync.ok('hello world').expect(
          () => new Error('Expected ok value'),
        );

        await expect(task).resolves.toBe('hello world');
      });

      it('rejects if the `AsyncResult` is an Error', async () => {
        const task = ResultAsync.fromFalsy('' as string).expect(
          () => new Error('Expected ok value'),
        );

        await expect(task).rejects.toEqual(new Error('Expected ok value'));
      });
    });

    describe('merge', () => {
      it('returns the value of the AsyncResult', async () => {
        const task = ResultAsync.fromNullable('hello world');

        await expect(task.merge()).resolves.toBe('hello world');
      });

      it('returns the error of the AsyncResult', async () => {
        const task = ResultAsync.error(new Error('Failed computation'));

        await expect(task.merge()).resolves.toBeInstanceOf(Error);
      });
    });

    describe('contains', () => {
      it('resolves to true if the `AsyncResult` is an `Ok` and the predicate is fulfilled', async () => {
        const result = ResultAsync.ok('hello world').contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(true);
      });

      it('resolves to false if the `AsyncResult` is an `Ok` and the predicate is not fulfilled', async () => {
        const result = ResultAsync.ok('hello world').contains(
          (value) => value.length === 0,
        );

        await expect(result).resolves.toBe(false);
      });

      it('resolves to false if the `AsyncResult` is an Error', async () => {
        const result = ResultAsync.fromFalsy('' as string).contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(false);
      });
    });

    describe('toArray', () => {
      it('creates an array with the value if AsyncResult is Ok', async () => {
        const task = ResultAsync.ok('hello world').toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual(['hello world']);
      });

      it('creates an empty array if AsyncResult is Error', async () => {
        const task = ResultAsync.fromFalsy('' as string).toArray();

        const array = await task;
        expectTypeOf(array).toEqualTypeOf<string[]>();

        expect(array).toEqual([]);
      });
    });

    describe('tap', () => {
      it('executes the callback if the `AsyncResult` is an `Ok` while ignoring the returned value and preserving the original value of the `AsyncResult`', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = ResultAsync.ok('hello world').tap(callback);

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();

        expect(callback).toHaveBeenCalledWith('hello world');
      });

      it('does not execute the callback if the `AsyncResult` is an Error', async () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const task = ResultAsync.fromFalsy('' as string).tap(callback);

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(callback).not.toHaveBeenCalled();
      });
    });

    describe('tapError', () => {
      it('executes the callback if the `AsyncResult` is an `Error` while ignoring the returned value and preserving the original value of the `AsyncResult`', async () => {
        const callback = vi.fn((value: NoValueError) => value.message);

        const task = ResultAsync.fromNullable('hello world').tapError(callback);

        const result = await task;
        expect(result.isOk()).toBeTrue();
        expect(result.equals(Result.ok('hello world'))).toBeTrue();
        expect(callback).not.toHaveBeenCalled();
      });

      it('does not execute the callback if the `AsyncResult` is an Error', async () => {
        const callback = vi.fn((value: NoValueError) => value.message);

        const task = ResultAsync.fromFalsy('' as string).tapError(callback);

        const result = await task;
        expect(result.isError()).toBeTrue();

        expect(callback).toHaveBeenCalledOnce();
      });
    });
  });
});
