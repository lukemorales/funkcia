import {
  FailedPredicateError,
  MissingValueError,
  TaggedError,
  UnexpectedResultError,
  UnwrapError,
  type UnknownError,
} from './exceptions';
import type { Falsy } from './internals/types';
import { Option } from './option';
import { Result } from './result';

describe('Result', () => {
  describe('constructors', () => {
    describe('ok', () => {
      it('creates a Result with the given value', () => {
        const result = Result.ok('hello world');

        expectTypeOf(result).toEqualTypeOf<Result<string, never>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('hello world');
      });
    });

    describe('of', () => {
      it('creates a Result with the given value', () => {
        const result = Result.of('hello world');

        expectTypeOf(result).toEqualTypeOf<Result<string, never>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('hello world');
      });
    });

    describe('error', () => {
      it('creates a Result with the given error', () => {
        const result = Result.error('failed');

        expectTypeOf(result).toEqualTypeOf<Result<never, 'failed'>>();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
        expect(result.unwrapError()).toBe('failed');
      });
    });

    describe('fromNullable', () => {
      it('creates an Ok Result when the value is not nullable', () => {
        const result = Result.fromNullable('hello world');

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('hello world');
      });

      it('creates an Error Result when the value is nullable', () => {
        const value = null as string | null | undefined;

        {
          const result = Result.fromNullable(value);

          expectTypeOf(result).toEqualTypeOf<
            Result<string, MissingValueError>
          >();

          expect(result.isOk()).toBe(false);
          expect(result.isError()).toBe(true);
          expect(result.unwrapError()).toEqual(new MissingValueError());
        }

        {
          const result = Result.fromNullable(
            value,
            () => new Error('missing value'),
          );

          expectTypeOf(result).toEqualTypeOf<Result<string, Error>>();

          expect(result.isOk()).toBe(false);
          expect(result.isError()).toBe(true);
          expect(result.unwrapError()).toEqual(new Error('missing value'));
        }

        {
          const result = Result.fromNullable(
            value,
            () => new Error('null value'),
          );

          expectTypeOf(result).toEqualTypeOf<Result<string, Error>>();

          expect(result.isOk()).toBe(false);
          expect(result.isError()).toBe(true);
          expect(result.unwrapError()).toEqual(new Error('null value'));
        }
      });
    });

    describe('fromFalsy', () => {
      it('creates an Ok Result when the value is not falsy', () => {
        const value = 'hello world' as string | Falsy;

        const result = Result.fromFalsy(value);

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
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
        ] as const satisfies Falsy[];

        for (const value of testValues) {
          const result = Result.fromFalsy(value);

          expectTypeOf(result).toEqualTypeOf<
            Result<never, MissingValueError>
          >();

          expect(result.isOk()).toBe(false);
          expect(result.isError()).toBe(true);
          expect(result.unwrapError()).toEqual(new MissingValueError());
        }
      });
    });

    describe('fromOption', () => {
      it('returns Ok when Option is Some', () => {
        const result = Result.fromOption(Option.some('hello world'));

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('hello world');
      });

      it('returns Error when Option is None', () => {
        const result = Result.fromOption(Option.none<string>());

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isError()).toBe(true);
        expect(() => result.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('try', () => {
      it('creates an Ok Result when the function does not throw', () => {
        const result = Result.try(() => 'hello world');

        expectTypeOf(result).toEqualTypeOf<Result<string, UnknownError>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('hello world');
      });

      it('creates an Error Result when the function throws', () => {
        {
          const result = Result.try(() => {
            throw new Error('computation failed');
          });

          expectTypeOf(result).toEqualTypeOf<Result<never, UnknownError>>();

          expect(result.isOk()).toBe(false);
          expect(result.isError()).toBe(true);
          expect(result.unwrapError()).toEqual(new Error('computation failed'));
        }

        {
          const result = Result.try(
            () => {
              throw new Error('computation failed');
            },
            () => new TypeError('custom error'),
          );

          expectTypeOf(result).toEqualTypeOf<Result<never, TypeError>>();

          expect(result.isOk()).toBe(false);
          expect(result.isError()).toBe(true);
          expect(result.unwrapError()).toEqual(new TypeError('custom error'));
        }
      });
    });

    describe('wrap', () => {
      describe('wrap', () => {
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

          expect(output.isOk()).toBe(true);
          expect(output.isError()).toBe(false);
          expect(output.unwrap()).toBe(true);

          const wrapped = Result.wrap(hasEnabledSetting);

          const result = wrapped(true);

          expectTypeOf(result).toEqualTypeOf<
            Result<true, UnsetSetting | DisabledSetting>
          >();

          expect(result.isOk()).toBe(true);
          expect(result.isError()).toBe(false);
          expect(result.unwrap()).toBe(true);
        });
      });
    });

    describe('produce', () => {
      class InvalidDivisor extends TaggedError {
        readonly _tag = 'InvalidDivisor';
      }

      function divide(dividend: number, divisor: number): number {
        if (divisor === 0) {
          throw new InvalidDivisor('Divisor can’t be zero');
        }

        return dividend / divisor;
      }

      const safeDivide = Result.produce<
        Parameters<typeof divide>,
        number,
        InvalidDivisor
      >(divide, (e) => e as InvalidDivisor);

      it('creates an Ok Result when the lifted function does not throw', () => {
        const result = safeDivide(10, 2);

        expectTypeOf(result).toEqualTypeOf<Result<number, InvalidDivisor>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe(5);
      });

      it('creates an Error Result when the lifted function throws', () => {
        const result = safeDivide(2, 0);

        expectTypeOf(result).toEqualTypeOf<Result<number, InvalidDivisor>>();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
        expect(result.unwrapError()).toEqual(
          new InvalidDivisor('Divisor can’t be zero'),
        );
      });
    });

    describe('definePredicate', () => {
      it('creates a function that can be used to refine the type of a value', () => {
        interface Circle {
          kind: 'circle';
        }

        interface Square {
          kind: 'square';
        }

        type Shape = Circle | Square;

        const isCircle = Result.definePredicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        const circleResult = isCircle({ kind: 'circle' });

        expectTypeOf(circleResult).toEqualTypeOf<
          Result<Circle, FailedPredicateError<Square>>
        >();

        expect(circleResult.isOk()).toBe(true);
        expect(circleResult.isError()).toBe(false);
        expect(circleResult.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to assert the type of a value', () => {
        const isPositive = Result.definePredicate((value: number) => value > 0);

        const positiveResult = isPositive(10);

        expectTypeOf(positiveResult).toEqualTypeOf<
          Result<number, FailedPredicateError<number>>
        >();

        expect(positiveResult.isOk()).toBe(true);
        expect(positiveResult.isError()).toBe(false);
        expect(positiveResult.unwrap()).toBe(10);
      });

      it('creates a function that can be used to refine the type of a value and accepts a custom error', () => {
        class InvalidShapeError extends TaggedError {
          readonly _tag = 'InvalidShapeError';
        }

        interface Circle {
          kind: 'circle';
        }

        interface Square {
          kind: 'square';
        }

        type Shape = Circle | Square;

        const isCircle = Result.definePredicate(
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

        expect(circleResult.isOk()).toBe(true);
        expect(circleResult.isError()).toBe(false);
        expect(circleResult.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to assert the type of a value and accepts a custom error', () => {
        class InvalidNumberError extends TaggedError {
          readonly _tag = 'InvalidNumberError';
        }

        const isPositive = Result.definePredicate(
          (value: number) => value > 0,
          () => new InvalidNumberError(),
        );

        const positiveResult = isPositive(10);

        expectTypeOf(positiveResult).toEqualTypeOf<
          Result<number, InvalidNumberError>
        >();

        expect(positiveResult.isOk()).toBe(true);
        expect(positiveResult.isError()).toBe(false);
        expect(positiveResult.unwrap()).toBe(10);
      });
    });
  });

  describe('conversions', () => {
    describe('match', () => {
      it('executes the Ok callback when the Result is Ok', () => {
        const result = Result.fromNullable('hello world').match({
          Ok(value) {
            return value.toUpperCase();
          },
          Error(error) {
            return error.message.toLowerCase();
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
      class NotFoundError extends Error {
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

      it('throws an UnexpectedResultError when Result is an Error and the onError callback returns a string', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        );

        expect(() => result.expect('custom error message')).toThrow(
          new UnexpectedResultError(
            'custom error message',
            new Error('computation failed'),
          ),
        );
      });
    });

    describe('toNullable', () => {
      it('returns the Ok value when Result is an Ok', () => {
        const result = Result.ok('hello world').toNullable();

        expectTypeOf(result).toEqualTypeOf<string | null>();

        expect(result).toBe('hello world');
      });

      it('returns null when Result is an Error', () => {
        const result = Result.error(
          new Error('computation failed'),
        ).toNullable();

        expectTypeOf(result).toEqualTypeOf<null>();

        expect(result).toBe(null);
      });
    });

    describe('toUndefined', () => {
      it('returns the Ok value when Result is an Ok', () => {
        const result = Result.ok('hello world').toUndefined();

        expectTypeOf(result).toEqualTypeOf<string | undefined>();

        expect(result).toBe('hello world');
      });

      it('returns undefined when Result is an Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).toUndefined();

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

        expect(result).toBe(true);
      });

      it('returns false when Result is an Ok and the predicate is not fulfilled', () => {
        const result = Result.ok('hello world').contains(
          (value) => value.length === 0,
        );

        expectTypeOf(result).toEqualTypeOf<boolean>();

        expect(result).toBe(false);
      });

      it('returns false when Result is an Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).contains((value) => value.length > 0);

        expectTypeOf(result).toEqualTypeOf<boolean>();

        expect(result).toBe(false);
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

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('HELLO WORLD');
      });

      it('has no effect if Result is an Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).map((value) => value.toUpperCase());

        expectTypeOf(result).toEqualTypeOf<Result<string, Error>>();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
        expect(result.unwrapError()).toEqual(new Error('computation failed'));
      });
    });

    describe('mapError', () => {
      it('transforms the Error value', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).mapError((error) => error.message.toUpperCase());

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
        expect(result.unwrapError()).toBe('COMPUTATION FAILED');
      });

      it('has no effect if Result is an Ok', () => {
        const result = Result.ok('hello world').mapError((error) =>
          (error as string).toUpperCase(),
        );

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('hello world');
      });
    });

    describe('mapBoth', () => {
      it('executes the Ok callback when the Result is Ok', () => {
        const result = Result.fromFalsy('hello world').mapBoth({
          Ok(value) {
            return value.toUpperCase();
          },
          Error(error) {
            return error.message.toLowerCase();
          },
        });

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('HELLO WORLD');
      });

      describe('executes the Error callback when the Result is Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).mapBoth({
          Ok(value) {
            return value.toLowerCase();
          },
          Error(error) {
            return error.message.toUpperCase();
          },
        });

        expectTypeOf(result).toEqualTypeOf<Result<string, string>>();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
        expect(result.unwrapError()).toBe('COMPUTATION FAILED');
      });
    });

    describe('andThen', () => {
      it('transforms the Ok value while flattening the Result', () => {
        const result = Result.ok('hello world').andThen((value) =>
          Result.fromFalsy(value.toUpperCase()),
        );

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('HELLO WORLD');
      });

      it('does not transform the Error value and flattens the Result', () => {
        const result = Result.error(new Error('computation failed')).andThen(
          () => Result.fromNullable(null as string | null | undefined),
        );

        expectTypeOf(result).toEqualTypeOf<
          Result<string, Error | MissingValueError>
        >();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
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

        expect(result.isOk()).toBe(true);
        expect(result.isError()).toBe(false);
        expect(result.unwrap()).toBe('hello world');
      });

      it('transforms the Ok Result into an Error Result if the predicate is not fulfilled', () => {
        const result = Result.ok('hello world').filter(
          (value) => value.length === 0,
        );

        expectTypeOf(result).toEqualTypeOf<
          Result<string, FailedPredicateError<string>>
        >();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
        expect(result.unwrapError()).toEqual(
          new FailedPredicateError('hello world'),
        );
      });

      it('has no effect if the Result is an Error', () => {
        const result = Result.fromFalsy<string, Error>(
          '',
          () => new Error('computation failed'),
        ).filter((value) => value.length > 0);

        expectTypeOf(result).toEqualTypeOf<
          Result<string, Error | FailedPredicateError<string>>
        >();

        expect(result.isOk()).toBe(false);
        expect(result.isError()).toBe(true);
        expect(result.unwrapError()).toEqual(new Error('computation failed'));
      });
    });
  });
});
