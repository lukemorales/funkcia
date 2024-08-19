import { UnexpectedOptionException, UnwrapError } from './exceptions';
import { type Falsy } from './internals/types';
import { Option } from './option';
import type { Nullable } from './types';

describe('Option', () => {
  describe('constructors', () => {
    describe('some', () => {
      it('creates a Some Option with the given value', () => {
        const option = Option.some('hello world');

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBe(true);
        expect(option.isNone()).toBe(false);
        expect(option.unwrap()).toBe('hello world');
      });
    });

    describe('none', () => {
      it('creates a None Option', () => {
        const option = Option.none();

        expectTypeOf(option).toEqualTypeOf<Option<never>>();

        expect(option.isSome()).toBe(false);
        expect(option.isNone()).toBe(true);
        expect(() => option.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('fromNullable', () => {
      function nullable(value: Nullable<string>): Nullable<string> {
        return value;
      }

      it('creates a Some Option when the value is not nullable', () => {
        const option = Option.fromNullable(nullable('hello world'));

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBe(true);
        expect(option.isNone()).toBe(false);
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the value is nullable', () => {
        const option = Option.fromNullable(nullable(null));

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBe(false);
        expect(option.isNone()).toBe(true);
        expect(() => option.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('fromFalsy', () => {
      it('creates a Some Option when the value is not falsy', () => {
        const value = 'hello world' as string | Falsy;

        const option = Option.fromFalsy(value);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBe(true);
        expect(option.isNone()).toBe(false);
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the value is falsy', () => {
        const testValues = [
          '',
          0,
          0n,
          null,
          undefined,
          false,
        ] as const satisfies Falsy[];

        for (const value of testValues) {
          const option = Option.fromFalsy(value);

          expectTypeOf(option).toEqualTypeOf<Option<never>>();

          expect(option.isSome()).toBe(false);
          expect(option.isNone()).toBe(true);
          expect(() => option.unwrap()).toThrow(UnwrapError);
        }
      });
    });

    describe('try', () => {
      it('creates a Some Option when the function does not throw', () => {
        const option = Option.try(() => 'hello world');

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBe(true);
        expect(option.isNone()).toBe(false);
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the function does not throw but returns null', () => {
        const option = Option.try(() => null as string | null);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBe(false);
        expect(option.isNone()).toBe(true);
        expect(() => option.unwrap()).toThrow(UnwrapError);
      });

      it('creates a None Option when the function throws', () => {
        const option = Option.try<string>(() => {
          throw new Error('calculation failed');
        });

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBe(false);
        expect(option.isNone()).toBe(true);
        expect(() => option.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('wrap', () => {
      function hasEnabledSetting(enabled: boolean | null) {
        switch (enabled) {
          case true:
            return Option.some('YES' as const);
          case false:
            return Option.some('NO' as const);
          default:
            return Option.none();
        }
      }

      it('returns a function with improved inference without changing behavior', () => {
        const output = hasEnabledSetting(true);

        expectTypeOf(output).toEqualTypeOf<
          Option<'YES'> | Option<'NO'> | Option<never>
        >();

        expect(output.isSome()).toBe(true);
        expect(output.isNone()).toBe(false);
        expect(output.unwrap()).toBe('YES');

        const wrapped = Option.wrap(hasEnabledSetting);

        const result = wrapped(true);

        expectTypeOf(result).toEqualTypeOf<Option<'YES' | 'NO'>>();

        expect(result.isSome()).toBe(true);
        expect(result.isNone()).toBe(false);
        expect(result.unwrap()).toBe('YES');
      });
    });

    describe('produce', () => {
      it('wraps a function that might throw exceptions into a function that returns an Option', () => {
        function divide(dividend: number, divisor: number): number {
          if (divisor === 0) {
            throw new Error('division by zero');
          }

          return dividend / divisor;
        }

        const safeDivide = Option.produce(divide);

        const someOption = safeDivide(10, 2);
        expectTypeOf(someOption).toEqualTypeOf<Option<number>>();

        expect(someOption.isSome()).toBe(true);
        expect(someOption.isNone()).toBe(false);
        expect(someOption.unwrap()).toBe(5);

        const noneOption = safeDivide(2, 0);
        expectTypeOf(noneOption).toEqualTypeOf<Option<number>>();

        expect(noneOption.isSome()).toBe(false);
        expect(noneOption.isNone()).toBe(true);
        expect(() => noneOption.unwrap()).toThrow(UnwrapError);
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

        const isCircle = Option.definePredicate(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        const circleOption = isCircle({ kind: 'circle' });

        expectTypeOf(circleOption).toEqualTypeOf<Option<Circle>>();

        expect(circleOption.isSome()).toBe(true);
        expect(circleOption.isNone()).toBe(false);
        expect(circleOption.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that can be used to assert the type of a value', () => {
        const isPositive = Option.definePredicate((value: number) => value > 0);

        const positiveOption = isPositive(10);

        expectTypeOf(positiveOption).toEqualTypeOf<Option<number>>();

        expect(positiveOption.isSome()).toBe(true);
        expect(positiveOption.isNone()).toBe(false);
        expect(positiveOption.unwrap()).toBe(10);
      });
    });
  });

  describe('conversions', () => {
    describe('match', () => {
      it('executes the Some case if the Option is a Some', () => {
        const result = Option.some(5).match({
          Some(value) {
            return value * 2;
          },
          None() {
            return 0;
          },
        });

        expect(result).toBe(10);
      });

      it('executes the None case if the Option is a None', () => {
        const result = Option.none<number>().match({
          Some(value) {
            return value * 2;
          },
          None() {
            return 0;
          },
        });

        expect(result).toBe(0);
      });
    });

    describe('unwrap', () => {
      it('returns the value of the Option if it is a Some', () => {
        const result = Option.some(10).unwrap();

        expect(result).toBe(10);
      });

      it('throws an Error if the Option is a None', () => {
        const option = Option.none();

        expect(() => option.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('unwrapOr', () => {
      it('returns the value of the Option if it is a Some', () => {
        const result = Option.some(10).unwrapOr(() => 0);

        expect(result).toBe(10);
      });

      it('returns the fallback value if the Option is a None', () => {
        const result = Option.none<number>().unwrapOr(() => 0);

        expect(result).toBe(0);
      });
    });

    describe('expect', () => {
      it('returns the value of the Option if it is a Some', () => {
        const result = Option.some(10).expect('Missing value');

        expect(result).toBe(10);
      });

      it('throws a custom Error if the Option is a None', () => {
        class MissingValue extends Error {
          readonly _tag = 'MissingValue';
        }

        const option = Option.none();

        expect(() => option.expect(() => new MissingValue())).toThrow(
          MissingValue,
        );
      });

      it('throws an UnexpectedOptionError if the Option is a None and a string is provided', () => {
        const option = Option.none();

        expect(() => option.expect('Value must be provided')).toThrow(
          new UnexpectedOptionException('Value must be provided'),
        );
      });
    });

    describe('toNullable', () => {
      it('returns the value if the Option is a Some', () => {
        const result = Option.some(10).toNullable();

        expectTypeOf(result).toEqualTypeOf<number | null>();

        expect(result).toBe(10);
      });

      it('returns null if the Option is a None', () => {
        const result = Option.none<number>().toNullable();

        expectTypeOf(result).toEqualTypeOf<number | null>();

        expect(result).toBe(null);
      });
    });

    describe('toUndefined', () => {
      it('returns the value if the Option is a Some', () => {
        const result = Option.some(10).toUndefined();

        expectTypeOf(result).toEqualTypeOf<number | undefined>();

        expect(result).toBe(10);
      });

      it('returns undefined if the Option is a None', () => {
        const result = Option.none<number>().toUndefined();

        expectTypeOf(result).toEqualTypeOf<number | undefined>();

        expect(result).toBe(undefined);
      });
    });

    describe('contains', () => {
      it('returns true if the Option is a Some and the predicate is fulfilled', () => {
        const result = Option.some(10).contains((value) => value > 0);

        expect(result).toBe(true);
      });

      it('returns false if the Option is a Some and the predicate is not fulfilled', () => {
        const result = Option.some(10).contains((value) => value === 0);

        expect(result).toBe(false);
      });

      it('returns false if the Option is a None', () => {
        const result = Option.none<number>().contains((value) => value > 0);

        expect(result).toBe(false);
      });
    });
  });

  describe('transformations', () => {
    describe('map', () => {
      it('transforms the Some value', () => {
        const result = Option.some('hello world').map((value) =>
          value.toUpperCase(),
        );

        expectTypeOf(result).toEqualTypeOf<Option<string>>();

        expect(result.isSome()).toBe(true);
        expect(result.isNone()).toBe(false);
        expect(result.unwrap()).toBe('HELLO WORLD');
      });

      it('has no effect if the Option is a None', () => {
        const result = Option.none<string>().map((value) =>
          value.toUpperCase(),
        );

        expectTypeOf(result).toEqualTypeOf<Option<string>>();

        expect(result.isSome()).toBe(false);
        expect(result.isNone()).toBe(true);
        expect(() => result.unwrap()).toThrow(UnwrapError);
      });

      it('tells the developer to use andThen when returning an Option', () => {
        const result = Option.some('hello world').map((value) =>
          // @ts-expect-error this is testing the error message
          Option.fromFalsy(value.toUpperCase()),
        );

        expectTypeOf(result).toEqualTypeOf<Option<{}>>();
      });
    });

    describe('andThen', () => {
      it('transforms the Some value while flattening the Option', () => {
        const result = Option.some('hello world').andThen((value) =>
          Option.some(value.length),
        );

        expectTypeOf(result).toEqualTypeOf<Option<number>>();

        expect(result.isSome()).toBe(true);
        expect(result.isNone()).toBe(false);
        expect(result.unwrap()).toBe(11);
      });

      it('has no effect when Option is a None and flattens the Option', () => {
        const result = Option.none<string>().andThen(() => Option.some(10));

        expectTypeOf(result).toEqualTypeOf<Option<number>>();

        expect(result.isSome()).toBe(false);
        expect(result.isNone()).toBe(true);
        expect(() => result.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('filter', () => {
      it('keeps the Some Option if the predicate is fulfilled', () => {
        const result = Option.some(10).filter((value) => value > 0);

        expectTypeOf(result).toEqualTypeOf<Option<number>>();

        expect(result.isSome()).toBe(true);
        expect(result.isNone()).toBe(false);
        expect(result.unwrap()).toBe(10);
      });

      it('transforms the Some Option into a None Option if the predicate is not fulfilled', () => {
        const result = Option.some(10).filter((value) => value <= 0);

        expectTypeOf(result).toEqualTypeOf<Option<number>>();

        expect(result.isSome()).toBe(false);
        expect(result.isNone()).toBe(true);
        expect(() => result.unwrap()).toThrow(UnwrapError);
      });

      it('has no effect if the Option is a None', () => {
        const result = Option.none<number>().filter((value) => value > 0);

        expectTypeOf(result).toEqualTypeOf<Option<number>>();

        expect(result.isSome()).toBe(false);
        expect(result.isNone()).toBe(true);
        expect(() => result.unwrap()).toThrow(UnwrapError);
      });
    });
  });

  describe('fallbacks', () => {
    describe('or', () => {
      it('returns the Some value if the Option is a Some', () => {
        const result = Option.some(10).or(() => Option.some(20));

        expectTypeOf(result).toEqualTypeOf<Option<number>>();

        expect(result.isSome()).toBe(true);
        expect(result.isNone()).toBe(false);
        expect(result.unwrap()).toBe(10);
      });

      it('returns the fallback value if the Option is a None', () => {
        const result = Option.none<number>().or(() => Option.some(20));

        expectTypeOf(result).toEqualTypeOf<Option<number>>();

        expect(result.isSome()).toBe(true);
        expect(result.isNone()).toBe(false);
        expect(result.unwrap()).toBe(20);
      });
    });
  });

  describe('comparisons', () => {
    describe('equals', () => {
      it('returns true if the Option is a Some and the other Option is a Some and the values are equal', () => {
        const result = Option.some(10).equals(Option.some(10));

        expect(result).toBe(true);
      });

      it('returns the output of the equality function if the Option is a Some and the other Option is a Some', () => {
        const isSameObject = vi.fn((a, b) => a.value === b.value);

        const result = Option.some({ value: 10 }).equals(
          Option.some({ value: 20 }),
          isSameObject,
        );

        expect(result).toBe(false);
        expect(isSameObject).toHaveBeenCalledExactlyOnceWith(
          { value: 10 },
          { value: 20 },
        );
      });

      it('does not call the equality function if one of the Options is a None', () => {
        const isSameObject = vi.fn((a, b) => a.value === b.value);

        Option.some({ value: 10 }).equals(Option.none(), isSameObject);

        expect(isSameObject).not.toHaveBeenCalled();
      });

      it('returns false if the Option is a Some and the other Option is a Some and the values are not equal', () => {
        const result = Option.some(10).equals(Option.some(20));

        expect(result).toBe(false);
      });

      it('returns false if the Option is a Some and the other Option is a None', () => {
        const result = Option.some(10).equals(Option.none());

        expect(result).toBe(false);
      });

      it('returns false if the Option is a None and the other Option is a Some', () => {
        const result = Option.none<number>().equals(Option.some(20));

        expect(result).toBe(false);
      });

      it('returns true if the Option is a None and the other Option is a None', () => {
        const result = Option.none().equals(Option.none());

        expect(result).toBe(true);
      });
    });
  });
});
