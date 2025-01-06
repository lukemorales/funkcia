import { AsyncResult } from './async-result';
import { Option } from './option.bak';
import { Result } from './result';

describe.todo('AsyncResult', () => {
  describe('constructors', () => {
    describe('fromResult', () => {
      it('creates a new AsyncResult from a Result', async () => {
        const task = AsyncResult.fromResult(
          Result.ok<string, Error>('hello world'),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncResult from a Error Result', async () => {
        const task = AsyncResult.fromResult(
          Result.error<string, Error>(new Error('calculation failed')),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();

        await expect(task.unwrap()).rejects.toEqual(
          UnableToUnwrapAsyncResultError.raise(await task.unwrapError()),
        );
      });
    });

    describe('fromOption', () => {
      it('creates a new AsyncResult from a Some Option', async () => {
        const task = AsyncResult.fromOption(Option.some('hello world'));

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<string, NullableValueError>
        >();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncResult from a None Option', async () => {
        const task = AsyncResult.fromOption(Option.none<string>());

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<string, NullableValueError>
        >();

        await expect(task.unwrapError()).resolves.toEqual(
          NullableValueError.raise(),
        );
      });

      it('creates a new AsyncResult from a None Option with a custom error', async () => {
        const task = AsyncResult.fromOption(
          Option.none<string>(),
          () => new Error('Expected some value'),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();

        await expect(task.unwrapError()).resolves.toEqual(
          new Error('Expected some value'),
        );
      });
    });

    describe('fromNullable', () => {
      it('creates a new AsyncResult from a nullable value', async () => {
        const task = AsyncResult.fromNullable('hello world' as string | null);

        expectTypeOf(task).toEqualTypeOf<
          AsyncResult<string, NullableValueError>
        >();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncResult from a nullish value', async () => {
        {
          const task = AsyncResult.fromNullable(null as string | null);

          expectTypeOf(task).toEqualTypeOf<
            AsyncResult<string, NullableValueError>
          >();

          await expect(task.unwrapError()).resolves.toEqual(
            NullableValueError.raise(),
          );
        }

        {
          const task = AsyncResult.fromNullable(
            undefined as string | undefined,
          );

          expectTypeOf(task).toEqualTypeOf<
            AsyncResult<string, NullableValueError>
          >();

          await expect(task.unwrapError()).resolves.toEqual(
            NullableValueError.raise(),
          );
        }
      });

      it('creates an AsyncResult from a nullish value with a custom error', async () => {
        const task = AsyncResult.fromNullable(
          null as string | null,
          () => new Error('Expected some value'),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();

        await expect(task.unwrapError()).resolves.toEqual(
          new Error('Expected some value'),
        );
      });
    });

    describe('fromPromise', () => {
      it('creates a new AsyncResult from a Promise that resolves to a value', async () => {
        const task = AsyncResult.fromPromise(() =>
          Promise.resolve('hello world'),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, unknown>>();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncResult from a Promise that resolves to an Result', async () => {
        const task = AsyncResult.fromPromise(() =>
          Promise.resolve(Result.ok<string, Error>('hello world')),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, Error>>();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncResult from a Promise that rejects to a value', async () => {
        const task = AsyncResult.fromPromise(() =>
          Promise.reject<string | null>(new Error('calculation failed')),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncResult<string, unknown>>();

        await expect(task.unwrap()).rejects.toEqual(
          UnableToUnwrapAsyncResultError.raise(),
        );
      });
    });
  });

  // describe('lifting', () => {});

  // describe('conversions', () => {});

  // describe('transformations', () => {});
});
