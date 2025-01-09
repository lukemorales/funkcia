import {
  FailedPredicateError,
  MissingValueError,
  TaggedError,
  UnknownError,
  UnwrapError,
} from './exceptions';
import { FunkciaStore } from './funkcia-store';
import type { Falsy } from './internals/types';
import { Option } from './option';
import { Result } from './result';

describe('Result', () => {
  describe('constructors', () => {
    describe('ok', () => {
      it('creates a Result with the given value', () => {
        const result = Result.ok('hello world');

        expectTypeOf(result).toEqualTypeOf<Result<string, never>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });
    });

    describe('of', () => {
      it('references the `ok` method', () => {
        expect(Result.of).toEqual(Result.ok);
      });
    });

    describe('error', () => {
      it('creates a Result with the given error', () => {
        const result = Result.error('failed');

        expectTypeOf(result).toEqualTypeOf<Result<never, 'failed'>>();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBe('failed');
      });
    });

    describe('Do', () => {
      it('accumulates multiple `bind` calls into an object and is an `Ok` Result if all values are `Ok`', () => {
        const result = Result.Do.bind('a', () => Result.ok(2))
          .bind('b', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<Readonly<{ a: number }>>();
            expect(ctx).toEqual({ a: 2 });

            return Result.ok(2);
          })
          .bind('c', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{ a: number; b: number }>
            >();
            expect(ctx).toEqual({ a: 2, b: 2 });

            return Result.ok(6);
          })
          .map((ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{
                a: number;
                b: number;
                c: number;
              }>
            >();
            expect(ctx).toEqual({ a: 2, b: 2, c: 6 });

            return ctx.a + ctx.b + ctx.c;
          });

        expectTypeOf(result).toEqualTypeOf<Result<number, never>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });

      it('accumulates multiple `bind` calls into an object and is a `None` Option if any value is `None`', () => {
        const bindC = vi.fn(() => Result.ok(6));
        const sum = vi.fn(
          (ctx: Record<'a' | 'b' | 'c', number>) => ctx.a + ctx.b + ctx.c,
        );

        const result = Result.Do.bind('a', () => Result.ok(2))
          .bind('b', () => Result.error(new Error()))
          .bind('c', bindC)
          .map(sum);

        expectTypeOf(result).toEqualTypeOf<Result<number, Error>>();

        expect(result.isError()).toBeTrue();

        expect(bindC).not.toHaveBeenCalled();
        expect(sum).not.toHaveBeenCalled();
      });

      it('accumulates multiple `let` calls into an object', () => {
        const result = Result.Do.let('a', () => 4)
          .let('b', () => 6)
          .let('c', (ctx) => ctx.a + ctx.b)
          .map((ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{
                a: number;
                b: number;
                c: number;
              }>
            >();

            return ctx.c;
          });

        expectTypeOf(result).toEqualTypeOf<Result<number, UnknownError>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });
    });

    describe('fromNullish', () => {
      it('creates an Ok Result when the value is not nullable', () => {
        const result = Result.fromNullish('hello world');

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('creates an Error Result when the value is nullable', () => {
        const value = null as string | null | undefined;

        {
          const result = Result.fromNullish(value);

          expectTypeOf(result).toEqualTypeOf<
            Result<string, MissingValueError>
          >();

          expect(result.isError()).toBeTrue();
          expect(result.unwrapError()).toEqual(new MissingValueError());
        }

        {
          const result = Result.fromNullish(
            value,
            () => new Error('missing value'),
          );

          expectTypeOf(result).toEqualTypeOf<Result<string, Error>>();

          expect(result.isError()).toBeTrue();
          expect(result.unwrapError()).toEqual(new Error('missing value'));
        }

        {
          const result = Result.fromNullish(
            value,
            () => new Error('null value'),
          );

          expectTypeOf(result).toEqualTypeOf<Result<string, Error>>();

          expect(result.isError()).toBeTrue();
          expect(result.unwrapError()).toEqual(new Error('null value'));
        }
      });
    });

    describe('fromFalsy', () => {
      it('creates an Ok Result when the value is not falsy', () => {
        const value = 'hello world' as string | Falsy;

        const result = Result.fromFalsy(value);

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('creates an Error Result when the value is falsy', () => {
        const testValues = [
          '',
          0,
          0n,
          null,
          undefined,
          false,
        ] satisfies Falsy[];

        for (const value of testValues) {
          const result = Result.fromFalsy(value);

          expectTypeOf(result).toEqualTypeOf<
            Result<never, MissingValueError>
          >();

          expect(result.isError()).toBeTrue();
          expect(result.unwrapError()).toEqual(new MissingValueError());
        }
      });
    });

    describe('fromThrowable', () => {
      it('creates an Ok Result when the function does not throw', () => {
        const result = Result.fromThrowable(() => 'hello world');

        expectTypeOf(result).toEqualTypeOf<Result<string, UnknownError>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('creates an Error Result when the function throws', () => {
        {
          const result = Result.fromThrowable(() => {
            throw new Error('computation failed');
          });

          expectTypeOf(result).toEqualTypeOf<Result<never, UnknownError>>();

          expect(result.isError()).toBeTrue();
          expect(result.unwrapError()).toEqual(
            new UnknownError(String(new Error('computation failed'))),
          );
        }

        {
          const result = Result.fromThrowable(
            () => {
              throw new Error('computation failed');
            },
            () => new TypeError('custom error'),
          );

          expectTypeOf(result).toEqualTypeOf<Result<never, TypeError>>();

          expect(result.isError()).toBeTrue();
          expect(result.unwrapError()).toEqual(new TypeError('custom error'));
        }
      });
    });

    describe('fun', () => {
      class UnsetSetting extends TaggedError {
        readonly _tag = 'UnsetSetting';
      }

      class DisabledSetting extends TaggedError {
        readonly _tag = 'DisabledSetting';
      }

      function hasEnabledSetting(enabled: boolean | null) {
        switch (enabled) {
          case true:
            return Result.ok(true as const);
          case false:
            return Result.error(new DisabledSetting());
          default:
            return Result.error(new UnsetSetting());
        }
      }

      it('returns a function with improved inference without changing behavior', () => {
        const output = hasEnabledSetting(true);

        expectTypeOf(output).toEqualTypeOf<
          | Result<true, never>
          | Result<never, DisabledSetting>
          | Result<never, UnsetSetting>
        >();

        expect(output.isOk()).toBeTrue();
        expect(output.unwrap()).toBeTrue();

        const wrapped = Result.fun(hasEnabledSetting);

        const result = wrapped(true);

        expectTypeOf(result).toEqualTypeOf<
          Result<true, UnsetSetting | DisabledSetting>
        >();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBeTrue();
      });
    });

    describe('wrap', () => {
      class InvalidDivisor extends TaggedError {
        readonly _tag = 'InvalidDivisor';
      }

      function divide(dividend: number, divisor: number): number {
        if (divisor === 0) {
          throw new InvalidDivisor('Divisor can’t be zero');
        }

        return dividend / divisor;
      }

      const safeDivide = Result.wrap<
        Parameters<typeof divide>,
        number,
        InvalidDivisor
      >(divide, (e) => e as InvalidDivisor);

      it('creates an Ok Result when the lifted function does not throw', () => {
        const result = safeDivide(10, 2);

        expectTypeOf(result).toEqualTypeOf<Result<number, InvalidDivisor>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(5);
      });

      it('creates an Error Result when the lifted function throws', () => {
        const result = safeDivide(2, 0);

        expectTypeOf(result).toEqualTypeOf<Result<number, InvalidDivisor>>();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toEqual(
          new InvalidDivisor('Divisor can’t be zero'),
        );
      });
    });

    describe('guard', () => {
      interface Circle {
        kind: 'circle';
      }

      interface Square {
        kind: 'square';
      }

      type Shape = Circle | Square;

      it('creates a function that can be used to refine the type of a value', () => {
        const isCircle = Result.guard(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        const circleResult = isCircle({ kind: 'circle' });

        expectTypeOf(circleResult).toEqualTypeOf<
          Result<Circle, FailedPredicateError<Square>>
        >();

        expect(circleResult.isOk()).toBeTrue();
        expect(circleResult.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to refine the type of a value and accepts a custom error', () => {
        class InvalidShapeError extends TaggedError {
          readonly _tag = 'InvalidShapeError';
        }

        const isCircle = Result.guard(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
          (shape) => {
            expectTypeOf(shape).toEqualTypeOf<Square>();

            return new InvalidShapeError(shape.kind);
          },
        );

        const circleResult = isCircle({ kind: 'circle' });

        expectTypeOf(circleResult).toEqualTypeOf<
          Result<Circle, InvalidShapeError>
        >();

        expect(circleResult.isOk()).toBeTrue();
        expect(circleResult.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to assert the type of a value', () => {
        const isPositive = Result.guard((value: number) => value > 0);

        const positiveResult = isPositive(10);

        expectTypeOf(positiveResult).toEqualTypeOf<
          Result<number, FailedPredicateError<number>>
        >();

        expect(positiveResult.isOk()).toBeTrue();
        expect(positiveResult.unwrap()).toBe(10);
      });

      it('creates a function that can be used to assert the type of a value and accepts a custom error', () => {
        class InvalidNumberError extends TaggedError {
          readonly _tag = 'InvalidNumberError';
        }

        const isPositive = Result.guard(
          (value: number) => value > 0,
          () => new InvalidNumberError(),
        );

        const positiveResult = isPositive(10);

        expectTypeOf(positiveResult).toEqualTypeOf<
          Result<number, InvalidNumberError>
        >();

        expect(positiveResult.isOk()).toBeTrue();
        expect(positiveResult.unwrap()).toBe(10);
      });
    });

    describe('try', () => {
      class DivisionByZeroError extends TaggedError {
        readonly _tag = 'DivisionByZeroError';
      }

      const isPositiveNumber = Result.guard((value: number) => value > 0);

      const isValidDenominator = Result.guard(
        (value: number) => value !== 0,
        () => new DivisionByZeroError(),
      );

      it('returns an Ok Result with the value returned by the generator when no errors are yielded', () => {
        const result = Result.try(function* compute() {
          const nominator = yield* isPositiveNumber(20);
          const denominator = yield* isValidDenominator(2);

          return Result.ok(nominator / denominator);
        });

        expectTypeOf(result).toEqualTypeOf<
          Result<number, DivisionByZeroError | FailedPredicateError<number>>
        >();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });

      it('returns an Error Result when an error is yielded by a result in the generator', () => {
        const result = Result.try(function* compute() {
          const nominator = yield* isPositiveNumber(-20);
          const denominator = yield* isValidDenominator(2);

          return Result.ok(nominator / denominator);
        });

        expectTypeOf(result).toEqualTypeOf<
          Result<number, DivisionByZeroError | FailedPredicateError<number>>
        >();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBeInstanceOf(FailedPredicateError);
      });

      it('returns an Error Result when an error is yielded in the generator', () => {
        const result = Result.try(function* compute() {
          const nominator = yield* isPositiveNumber(20);

          yield new DivisionByZeroError();

          return Result.ok(nominator / 2);
        });

        expectTypeOf(result).toEqualTypeOf<
          Result<number, DivisionByZeroError | FailedPredicateError<number>>
        >();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBeInstanceOf(DivisionByZeroError);
      });
    });
  });

  describe('conversions', () => {
    describe('match', () => {
      it('executes the Ok callback when the Result is Ok', () => {
        const result = Result.fromNullish('hello world').match({
          Ok(value) {
            return value.toUpperCase();
          },
          Error(error) {
            return error._tag.toLowerCase();
          },
        });

        expectTypeOf(result).toEqualTypeOf<string>();

        expect(result).toBe('HELLO WORLD');
      });

      it('executes the Error callback when the Result is Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).match({
          Ok(value) {
            return value.toLowerCase();
          },
          Error(error) {
            return error.message.toUpperCase();
          },
        });

        expectTypeOf(result).toEqualTypeOf<string>();

        expect(result).toBe('COMPUTATION FAILED');
      });
    });

    describe('unwrap', () => {
      it('unwraps the Ok value when Result is an Ok', () => {
        const result = Result.ok('hello world').unwrap();

        expectTypeOf(result).toEqualTypeOf<string>();

        expect(result).toBe('hello world');
      });

      it('throws an Error when Result is an Error', () => {
        const result = Result.error(new Error('computation failed'));

        expect(() => result.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('unwrapOr', () => {
      it('returns the Ok value when the Result is Ok', () => {
        const result = Result.ok('hello world').unwrapOr(() => 'fallback');

        expectTypeOf(result).toEqualTypeOf<string>();

        expect(result).toBe('hello world');
      });

      it('executes and returns the onError callback value when the Result is Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).unwrapOr(() => 'fallback');

        expectTypeOf(result).toEqualTypeOf<string>();

        expect(result).toBe('fallback');
      });
    });

    describe('unwrapError', () => {
      it('unwraps the Error value when Result is an Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).unwrapError();

        expectTypeOf(result).toEqualTypeOf<Error>();

        expect(result).toEqual(new Error('computation failed'));
      });

      it('throws an Error when Result is an Ok', () => {
        const result = Result.ok('hello world');

        expect(() => result.unwrapError()).toThrow(UnwrapError);
      });
    });

    describe('expect', () => {
      class NotFoundError extends TaggedError {
        readonly _tag = 'NotFoundError';
      }

      it('returns the Ok value when Result is an Ok', () => {
        const result = Result.ok('hello world').expect(
          () => new NotFoundError(),
        );

        expectTypeOf(result).toEqualTypeOf<string>();

        expect(result).toBe('hello world');
      });

      it('throws a custom Error when Result is an Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        );

        expect(() => result.expect(() => new NotFoundError())).toThrow(
          new NotFoundError(),
        );
      });
    });

    describe('toOption', () => {
      let unregister: () => void;

      beforeAll(() => {
        unregister = FunkciaStore.register(Option);
      });

      afterAll(() => {
        unregister();
      });

      it('returns Some when Result is Ok', () => {
        const result = Result.ok('hello world').toOption();

        expectTypeOf(result).toEqualTypeOf<Option<string>>();

        expect(result.isSome()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('returns None when Result is Error', () => {
        const result = Result.fromFalsy<string>('').toOption();

        expectTypeOf(result).toEqualTypeOf<Option<string>>();

        expect(result.isNone()).toBeTrue();
      });
    });

    describe('unwrapOrNull', () => {
      it('returns the Ok value when Result is an Ok', () => {
        const result = Result.ok('hello world').unwrapOrNull();

        expectTypeOf(result).toEqualTypeOf<string | null>();

        expect(result).toBe('hello world');
      });

      it('returns null when Result is an Error', () => {
        const result = Result.error(
          new Error('computation failed'),
        ).unwrapOrNull();

        expectTypeOf(result).toEqualTypeOf<null>();

        expect(result).toBe(null);
      });
    });

    describe('unwrapOrUndefined', () => {
      it('returns the Ok value when Result is an Ok', () => {
        const result = Result.ok('hello world').unwrapOrUndefined();

        expectTypeOf(result).toEqualTypeOf<string | undefined>();

        expect(result).toBe('hello world');
      });

      it('returns undefined when Result is an Error', () => {
        const result = Result.fromFalsy<string>('').unwrapOrUndefined();

        expectTypeOf(result).toEqualTypeOf<string | undefined>();

        expect(result).toBe(undefined);
      });
    });

    describe('contains', () => {
      it('returns true when Result is an Ok and the predicate is fulfilled', () => {
        const result = Result.ok('hello world').contains(
          (value) => value.length > 0,
        );

        expectTypeOf(result).toEqualTypeOf<boolean>();

        expect(result).toBeTrue();
      });

      it('returns false when Result is an Ok and the predicate is not fulfilled', () => {
        const result = Result.ok('hello world').contains(
          (value) => value.length === 0,
        );

        expectTypeOf(result).toEqualTypeOf<boolean>();

        expect(result).toBeFalse();
      });

      it('returns false when Result is an Error', () => {
        const result = Result.fromFalsy<string>('').contains(
          (value) => value.length > 0,
        );

        expectTypeOf(result).toEqualTypeOf<boolean>();

        expect(result).toBeFalse();
      });
    });

    describe('bindTo', () => {
      it('binds the current `Result` to a `do-notation`', () => {
        const option = Result.ok(10).bindTo('a');

        expectTypeOf(option).toEqualTypeOf<
          Result<Readonly<{ a: number }>, never>
        >();

        expect(option.isOk()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 10 });
      });
    });
  });

  describe('transformations', () => {
    describe('map', () => {
      it('transforms the Ok value', () => {
        const result = Result.ok('hello world').map((value) =>
          value.toUpperCase(),
        );

        expectTypeOf(result).toEqualTypeOf<Result<string, never>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('HELLO WORLD');
      });

      it('is not invoked if Result is an Error', () => {
        const valueMap = vi.fn((value: string) => value.toUpperCase());

        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).map(valueMap);

        expectTypeOf(result).toEqualTypeOf<Result<string, Error>>();
        expect(valueMap).not.toHaveBeenCalled();
      });
    });

    describe('mapError', () => {
      it('transforms the Error value', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).mapError((error) => error.message.toUpperCase());

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBe('COMPUTATION FAILED');
      });

      it('is not invoked if Result is an Ok', () => {
        const errorMap = vi.fn((error: Error) => error.message.toUpperCase());

        const result = Result.ok('hello world').mapError(errorMap);

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();
        expect(errorMap).not.toHaveBeenCalled();
      });
    });

    describe('mapBoth', () => {
      it('executes the Ok callback when the Result is Ok', () => {
        const errorCallback = vi.fn((error: TaggedError) =>
          error._tag.toLowerCase(),
        );

        const result = Result.fromFalsy('hello world').mapBoth({
          Ok(value) {
            return value.toUpperCase();
          },
          Error: errorCallback,
        });

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();

        expect(errorCallback).not.toHaveBeenCalled();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('HELLO WORLD');
      });

      describe('executes the Error callback when the Result is Error', () => {
        const mapCallback = vi.fn((value: string) => value.toUpperCase());

        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).mapBoth({
          Ok: mapCallback,
          Error(error) {
            return error.message.toUpperCase();
          },
        });

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();

        expect(mapCallback).not.toHaveBeenCalled();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBe('COMPUTATION FAILED');
      });
    });

    describe('andThen', () => {
      it('transforms the Ok value while flattening the Result', () => {
        const result = Result.ok('hello world').andThen((value) =>
          Result.fromFalsy(value.toUpperCase()),
        );

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('HELLO WORLD');
      });

      it('does not transform the Error value and flattens the Result', () => {
        const result = Result.error(new Error('computation failed')).andThen(
          () => Result.fromNullish(null as string | null | undefined),
        );

        expectTypeOf(result).toEqualTypeOf<
          Result<string, Error | MissingValueError>
        >();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toEqual(new Error('computation failed'));
      });
    });

    describe('filter', () => {
      it('keeps the Ok Result if the predicate is fulfilled', () => {
        const result = Result.ok('hello world').filter(
          (value) => value.length > 0,
        );

        expectTypeOf(result).toEqualTypeOf<
          Result<string, FailedPredicateError<string>>
        >();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('transforms the Ok Result into an Error Result if the predicate is not fulfilled', () => {
        const result = Result.ok('hello world').filter(
          (value) => value.length === 0,
        );

        expectTypeOf(result).toEqualTypeOf<
          Result<string, FailedPredicateError<string>>
        >();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toEqual(
          new FailedPredicateError('hello world'),
        );
      });

      it('is not invoked if the Result is an Error', () => {
        const predicate = vi.fn((value: string) => value.length > 0);

        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).filter(predicate);

        expectTypeOf(result).toEqualTypeOf<
          Result<string, Error | FailedPredicateError<string>>
        >();
        expect(predicate).not.toHaveBeenCalled();
      });
    });
  });

  describe('fallbacks', () => {
    describe('or', () => {
      it('returns the OK value if the Result is a OK', () => {
        const lazyResult = vi.fn(() => Result.ok(20));

        const result = Result.ok(10).or(lazyResult);

        expectTypeOf(result).toEqualTypeOf<Result<number, never>>();

        expect(lazyResult).not.toHaveBeenCalled();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(10);
      });

      it('returns the fallback value if the Result is a None', () => {
        const result = Result.error(new Error()).or(() => Result.ok(20));

        expectTypeOf(result).toEqualTypeOf<Result<number, Error>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe(20);
      });
    });
  });

  describe('comparisons', () => {
    describe('isOk', () => {
      it('returns true if the Result is Ok', () => {
        const result = Result.ok(10);

        expect(result.isOk()).toBeTrue();
        expect(result.isError()).toBeFalse();
      });

      it('returns false if the Result is Error', () => {
        const result = Result.error(new Error());

        expect(result.isOk()).toBeFalse();
        expect(result.isError()).toBeTrue();
      });
    });

    describe('isError', () => {
      it('returns true if the Result is Error', () => {
        const option = Result.error(new Error());

        expect(option.isError()).toBeTrue();
        expect(option.isOk()).toBeFalse();
      });

      it('returns false if the Result is a Some', () => {
        const result = Result.ok(10);

        expect(result.isError()).toBeFalse();
        expect(result.isOk()).toBeTrue();
      });
    });
  });

  describe('other', () => {
    describe('tap', () => {
      it('executes the callback if the Result is Ok while ignoring the returned value and preserving the original value of the `Result`', () => {
        const callback = vi.fn((value: number) => {
          expect(value).toBe(10);

          return value * 2; // 20
        });

        const result = Result.ok(10).tap(callback);

        expect(callback).toHaveBeenCalledWith(10);

        expect(result.unwrap()).toBe(10);
      });

      it('does not execute the callback if the Result is Error', () => {
        const callback = vi.fn((value: number) => value * 2);

        Result.error(new Error()).tap(callback);

        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
});
