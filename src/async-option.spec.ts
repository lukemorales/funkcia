import { AsyncOption } from './async-option';
import { UnwrapError } from './exceptions';
// import { AsyncResult } from './async-result';
import { Option } from './option';
import { Result } from './result';

describe('AsyncOption', () => {
  describe('constructors', () => {
    describe('fromOption', () => {
      it('creates a new AsyncOption from a Some Option', async () => {
        const task = AsyncOption.fromOption(Option.some('hello world'));

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncOption from a None Option', async () => {
        const task = AsyncOption.fromOption(Option.none());

        expectTypeOf(task).toEqualTypeOf<AsyncOption<never>>();

        await expect(task.unwrap()).rejects.toEqual(new UnwrapError('Option'));
      });
    });

    describe('fromResult', () => {
      it('creates a new AsyncOption from an Ok Result', async () => {
        const task = AsyncOption.fromResult(Result.of('hello world'));

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncOption from an Error Result', async () => {
        const task = AsyncOption.fromResult(
          Result.error(new Error('calculation failed')),
        );

        await expect(task.unwrap()).rejects.toEqual(new UnwrapError('Option'));
      });
    });

    describe('fromNullable', () => {
      it('creates a new AsyncOption from a nullable value', async () => {
        const task = AsyncOption.fromNullable('hello world' as string | null);

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncOption from a nullish value', async () => {
        {
          const task = AsyncOption.fromNullable(null as string | null);

          expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

          await expect(task.unwrap()).rejects.toEqual(
            new UnwrapError('Option'),
          );
        }

        {
          const task = AsyncOption.fromNullable(
            undefined as string | undefined,
          );

          expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

          await expect(task.unwrap()).rejects.toEqual(
            new UnwrapError('Option'),
          );
        }
      });
    });

    describe('fromPromise', () => {
      it('creates a new AsyncOption from a Promise that resolves to a value', async () => {
        const task = AsyncOption.fromPromise(() =>
          Promise.resolve('hello world'),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncOption from a Promise that resolves to an Option', async () => {
        const task = AsyncOption.fromPromise(() =>
          Promise.resolve(Option.some('hello world')),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        await expect(task.unwrap()).resolves.toBe('hello world');
      });

      it('creates a new AsyncOption from a Promise that rejects to a value', async () => {
        const task = AsyncOption.fromPromise(() =>
          Promise.reject<string | null>(new Error('calculation failed')),
        );

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        await expect(task.unwrap()).rejects.toEqual(new UnwrapError('Option'));
      });
    });
  });

  describe('lifting', () => {
    describe('liftPromise', () => {
      it('lifts a function that returns a Promise that resolves to a value', async () => {
        const lifted = AsyncOption.liftPromise((greeting: string) =>
          Promise.resolve({ greeting }),
        );

        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncOption<{ greeting: string }>
        >();

        const result = lifted('hello world');

        expectTypeOf(result).toEqualTypeOf<AsyncOption<{ greeting: string }>>();

        await expect(result.unwrap()).resolves.toEqual({
          greeting: 'hello world',
        });
      });

      it('lifts a function that returns a Promise that resolves to an Option', async () => {
        const lifted = AsyncOption.liftPromise((greeting: string) =>
          Promise.resolve(Option.some({ greeting })),
        );

        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncOption<{ greeting: string }>
        >();

        const result = lifted('hello world');

        expectTypeOf(result).toEqualTypeOf<AsyncOption<{ greeting: string }>>();

        await expect(result.unwrap()).resolves.toEqual({
          greeting: 'hello world',
        });
      });

      it('lifts a function that returns a Promise that rejects to a value', async () => {
        const lifted = AsyncOption.liftPromise((_: string) =>
          Promise.reject<string>(new Error('calculation failed')),
        );

        expectTypeOf(lifted).toEqualTypeOf<
          (greeting: string) => AsyncOption<string>
        >();

        const result = lifted('hello world');

        expectTypeOf(result).toEqualTypeOf<AsyncOption<string>>();

        await expect(result.unwrap()).rejects.toEqual(
          new UnwrapError('Option'),
        );
      });
    });
  });

  describe('conversions', () => {
    describe('match', () => {
      it('resolves to the Some case if the AsyncOption is a Some', async () => {
        const result = AsyncOption.fromOption(Option.some('world')).match({
          Some(value) {
            return `Hello ${value}`;
          },
          None() {
            return 'Greeting!';
          },
        });

        await expect(result).resolves.toBe('Hello world');
      });

      it('resolves to the None case if the AsyncOption is a None', async () => {
        const result = AsyncOption.fromOption(Option.none<string>()).match({
          Some(value) {
            return `Hello ${value}`;
          },
          None() {
            return 'Greeting!';
          },
        });

        await expect(result).resolves.toBe('Greeting!');
      });
    });

    describe('getOrElse', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const result = AsyncOption.fromOption(
          Option.some('hello world'),
        ).getOrElse(() => 'Greeting!');

        await expect(result).resolves.toBe('hello world');
      });

      it('resolves to the fallback value if the AsyncOption is a None', async () => {
        const result = AsyncOption.fromOption(Option.none()).getOrElse(
          () => 'Greeting!',
        );

        await expect(result).resolves.toBe('Greeting!');
      });
    });

    describe('unwrap', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const result = AsyncOption.fromOption(
          Option.some('hello world'),
        ).unwrap();

        await expect(result).resolves.toBe('hello world');
      });

      it('rejects if the AsyncOption is a None', async () => {
        const task = AsyncOption.fromOption(Option.none());

        await expect(task.unwrap()).rejects.toEqual(new UnwrapError('Option'));
      });
    });

    describe('expect', () => {
      it('resolves to the value of the AsyncOption if it is a Some', async () => {
        const result = AsyncOption.fromOption(
          Option.some('hello world'),
        ).expect(() => new Error('Expected some value'));

        await expect(result).resolves.toBe('hello world');
      });

      it('rejects if the AsyncOption is a None', async () => {
        const task = AsyncOption.fromOption(Option.none());

        await expect(
          task.expect(() => new Error('Expected some value')),
        ).rejects.toEqual(new Error('Expected some value'));
      });
    });

    describe('satisfies', () => {
      it('resolves to true if the AsyncOption is a Some and the predicate is fulfilled', async () => {
        const result = AsyncOption.fromOption(
          Option.some('hello world'),
        ).contains((value) => value.length > 0);

        await expect(result).resolves.toBe(true);
      });

      it('resolves to false if the AsyncOption is a Some and the predicate is not fulfilled', async () => {
        const result = AsyncOption.fromOption(
          Option.some('hello world'),
        ).contains((value) => value.length === 0);

        await expect(result).resolves.toBe(false);
      });

      it('resolves to false if the AsyncOption is a None', async () => {
        const result = AsyncOption.fromOption(Option.none<string>()).contains(
          (value) => value.length > 0,
        );

        await expect(result).resolves.toBe(false);
      });
    });

    // describe('toAsyncResult', () => {
    //   it('creates an AsyncResult that resolves from a Some AsyncOption', async () => {
    //     const result = AsyncOption.fromOption(
    //       Option.some('hello world'),
    //     ).toAsyncResult();

    //     expect(result).toBeInstanceOf(AsyncResult);
    //     expectTypeOf(result).toEqualTypeOf<
    //       AsyncResult<string, NullableValueError>
    //     >();

    //     await expect(result.unwrap()).resolves.toBe('hello world');
    //   });

    //   it('creates an AsyncResult that rejects from a None AsyncOption', async () => {
    //     const result = AsyncOption.fromOption(
    //       Option.none<string>(),
    //     ).toAsyncResult(() => new Error('Expected some value'));

    //     expect(result).toBeInstanceOf(AsyncResult);
    //     expectTypeOf(result).toEqualTypeOf<AsyncResult<string, Error>>();

    //     await expect(
    //       result.unwrap(),
    //     ).rejects.toThrowErrorMatchingInlineSnapshot(
    //       `[UnableToUnwrapAsyncResultError: Failed to unwrap AsyncResult]`,
    //     );
    //   });
    // });
  });

  describe('transformations', () => {
    describe('map', () => {
      it('maps the value of an AsyncOption', async () => {
        const task = AsyncOption.fromOption(Option.some('hello world'));

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const result = task.map((str) => str.toUpperCase());

        await expect(result.unwrap()).resolves.toBe('HELLO WORLD');
      });
    });

    describe('flatMap', () => {
      it('transforms the Some value while flattening the AsyncOption', async () => {
        const task = AsyncOption.fromOption(Option.some('hello world'));

        expectTypeOf(task).toEqualTypeOf<AsyncOption<string>>();

        const result = task.andThen((str) =>
          AsyncOption.fromOption(Option.some(str.toUpperCase())),
        );

        await expect(result.unwrap()).resolves.toBe('HELLO WORLD');
      });

      it('has no effect when AsyncOption is a None and flattens the AsyncOption', async () => {
        const task = AsyncOption.fromOption(Option.none());

        expectTypeOf(task).toEqualTypeOf<AsyncOption<never>>();

        const result = task.andThen(() =>
          AsyncOption.fromOption(Option.fromNullish('hello world')),
        );

        await expect(result.unwrap()).rejects.toEqual(
          new UnwrapError('Option'),
        );
      });
    });

    describe('filter', () => {
      it('resolves if the predicate is fulfilled and it the AsyncOption is a Some', async () => {
        const result = AsyncOption.fromOption(
          Option.some('hello world'),
        ).filter((value) => value.length > 0);

        await expect(result.unwrap()).resolves.toBe('hello world');
      });

      it('rejects if the predicate is not fulfilled and the AsyncOption is a Some', async () => {
        const result = AsyncOption.fromOption(
          Option.some('hello world'),
        ).filter((value) => value.length === 0);

        await expect(result.unwrap()).rejects.toEqual(
          new UnwrapError('Option'),
        );
      });

      it('has no effect if the AsyncOption is a None', async () => {
        const result = AsyncOption.fromOption(Option.none<string>()).filter(
          (value) => value.length > 0,
        );

        await expect(result.unwrap()).rejects.toEqual(
          new UnwrapError('Option'),
        );
      });
    });
  });
});
