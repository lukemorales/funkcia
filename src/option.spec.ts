import { MissingValueError, TaggedError, UnwrapError } from './exceptions';
import { FunkciaStore } from './funkcia-store';
import type { Falsy } from './internals/types';
import { Option } from './option';
import { Result } from './result';
import type { Nullish } from './types';

describe('Option', () => {
  describe('constructors', () => {
    describe('some', () => {
      it('creates a Some Option with the given value', () => {
        const option = Option.some('hello world');

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });
    });

    describe('of', () => {
      it('references the `some` method', () => {
        expect(Option.of).toEqual(Option.some);
      });
    });

    describe('none', () => {
      it('creates a None Option', () => {
        const option = Option.none();

        expectTypeOf(option).toEqualTypeOf<Option<never>>();

        expect(option.isNone()).toBeTrue();
      });
    });

    describe('Do', () => {
      it('accumulates multiple `bind` calls into an object and is a `Some` Option if all values are `Some`', () => {
        const option = Option.Do.bind('a', () => Option.some(2))
          .bind('b', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<Readonly<{ a: number }>>();
            expect(ctx).toEqual({ a: 2 });

            return Option.some(2);
          })
          .bind('c', (ctx) => {
            expectTypeOf(ctx).toEqualTypeOf<
              Readonly<{ a: number; b: number }>
            >();
            expect(ctx).toEqual({ a: 2, b: 2 });

            return Option.some(6);
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

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });

      it('accumulates multiple `bind` calls into an object and is a `None` Option if any value is `None`', () => {
        const bindC = vi.fn(() => Option.some(6));
        const sum = vi.fn(
          (ctx: Record<'a' | 'b' | 'c', number>) => ctx.a + ctx.b + ctx.c,
        );

        const option = Option.Do.bind('a', () => Option.some(2))
          .bind('b', () => Option.none<number>())
          .bind('c', bindC)
          .map(sum);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isNone()).toBeTrue();

        expect(bindC).not.toHaveBeenCalled();
        expect(sum).not.toHaveBeenCalled();
      });

      it('accumulates multiple `let` calls into an object', () => {
        const option = Option.Do.let('a', () => 4)
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

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });
    });

    describe('fromNullish', () => {
      function nullify(value: Nullish<string>): Nullish<string> {
        return value;
      }

      it('creates a Some Option when the value is not nullable', () => {
        const option = Option.fromNullish(nullify('hello world'));

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the value is nullable', () => {
        const option = Option.fromNullish(nullify(null));

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
      });
    });

    describe('fromFalsy', () => {
      it('creates a Some Option when the value is not falsy', () => {
        const value = 'hello world' as string | Falsy;

        const option = Option.fromFalsy(value);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
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
        ] satisfies Falsy[];

        for (const value of testValues) {
          const option = Option.fromFalsy(value);

          expectTypeOf(option).toEqualTypeOf<Option<never>>();

          expect(option.isNone()).toBeTrue();
        }
      });
    });

    describe('fromThrowable', () => {
      it('creates a Some Option when the function does not throw', () => {
        const option = Option.fromThrowable(() => 'hello world');

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the function does not throw but returns null', () => {
        const option = Option.fromThrowable(() => null as string | null);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
      });

      it('creates a None Option when the function throws', () => {
        const option = Option.fromThrowable<string>(() => {
          throw new Error('calculation failed');
        });

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
      });
    });

    describe('fn', () => {
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
        const normal = hasEnabledSetting(true);

        expectTypeOf(normal).toEqualTypeOf<
          Option<'YES'> | Option<'NO'> | Option<never>
        >();

        expect(normal.isSome()).toBeTrue();
        expect(normal.unwrap()).toBe('YES');

        const wrappedFn = Option.enhance(hasEnabledSetting);

        const option = wrappedFn(true);

        expectTypeOf(option).toEqualTypeOf<Option<'YES' | 'NO'>>();

        // @ts-expect-error `output` has same values but improved type inference
        expect(normal.equals(option)).toBeTrue();
      });
    });

    describe('wrap', () => {
      function divide(dividend: number, divisor: number): number {
        if (divisor === 0) {
          throw new Error('division by zero');
        }

        return dividend / divisor;
      }

      it('wraps a function that might throw exceptions returning a function that returns an Option', () => {
        const safeDivide = Option.wrap(divide);

        expectTypeOf(safeDivide).toEqualTypeOf<
          (dividend: number, divisor: number) => Option<number>
        >();

        const someOption = safeDivide(10, 2);
        expectTypeOf(someOption).toEqualTypeOf<Option<number>>();

        expect(someOption.isSome()).toBeTrue();
        expect(someOption.unwrap()).toBe(5);

        const noneOption = safeDivide(2, 0);
        expectTypeOf(noneOption).toEqualTypeOf<Option<number>>();

        expect(noneOption.isNone()).toBeTrue();
        expect(() => noneOption.unwrap()).toThrow(UnwrapError);
      });

      it('wraps a function that might return a nullish value returning a function that returns an Option', () => {
        const safeDivide = Option.wrap((dividend: number, divisor: number) => {
          try {
            return divide(dividend, divisor);
          } catch {
            return null;
          }
        });
        expectTypeOf(safeDivide).toEqualTypeOf<
          (dividend: number, divisor: number) => Option<number>
        >();

        const someOption = safeDivide(10, 2);
        expectTypeOf(someOption).toEqualTypeOf<Option<number>>();

        expect(someOption.isSome()).toBeTrue();
        expect(someOption.unwrap()).toBe(5);

        const noneOption = safeDivide(2, 0);
        expectTypeOf(noneOption).toEqualTypeOf<Option<number>>();

        expect(noneOption.isNone()).toBeTrue();
        expect(() => noneOption.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('predicate', () => {
      it('creates a function that will return an `Option` with the refined type of a value if the predicate is fulfilled', () => {
        interface Circle {
          kind: 'circle';
        }

        interface Square {
          kind: 'square';
        }

        type Shape = Circle | Square;

        const ensureCircle = Option.guard(
          (shape: Shape): shape is Circle => shape.kind === 'circle',
        );

        expectTypeOf(ensureCircle).toEqualTypeOf<
          (shape: Shape) => Option<Circle>
        >();

        const circleOption = ensureCircle({ kind: 'circle' });

        expectTypeOf(circleOption).toEqualTypeOf<Option<Circle>>();

        expect(circleOption.isSome()).toBeTrue();
        expect(circleOption.unwrap()).toEqual({ kind: 'circle' });
      });

      it('creates a function that will return an `Option` if the predicate is fullfiled', () => {
        const ensurePositive = Option.guard((value: number) => value > 0);

        expectTypeOf(ensurePositive).toEqualTypeOf<
          (value: number) => Option<number>
        >();

        const option = ensurePositive(10);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });
    });

    describe('try', () => {
      it('safely evaluates the generator, returning the returned Option when all yields are `Some`', () => {
        const greeting = Option.some('hello');
        const subject = Option.some('world');

        const option = Option.try(function* exec() {
          const a = yield* greeting;
          expect(a).toBe('hello');

          const b = yield* subject;
          expect(b).toBe('world');

          return Option.some(`${a} ${b}`);
        });

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('safely evaluates the generator, early returning when a yield is `None`', () => {
        const greeting = Option.none<string>();
        const getSubject = vi.fn(() => Option.some('world'));

        const option = Option.try(function* exec() {
          const a = yield* greeting;
          const b = yield* getSubject();

          return Option.some(`${a} ${b}`);
        });

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();

        expect(getSubject).not.toHaveBeenCalled();
      });
    });

    describe('values', () => {
      it('returns an array containing only the values inside `Some`', () => {
        const output = Option.values([
          Option.some(1),
          Option.none<number>(),
          Option.some(3),
        ]);

        expect(output).toEqual([1, 3]);
      });
    });
  });

  describe('conversions', () => {
    describe('match', () => {
      it('executes the Some case if the Option is a Some', () => {
        const option = Option.some(5);

        expect(
          option.match({
            Some(value) {
              return value * 2;
            },
            None() {
              return 0;
            },
          }),
        ).toBe(10);
      });

      it('executes the None case if the Option is a None', () => {
        const option = Option.none<number>();

        expect(
          option.match({
            Some(value) {
              return value * 2;
            },
            None() {
              return 0;
            },
          }),
        ).toBe(0);
      });
    });

    describe('unwrap', () => {
      it('returns the value of the Option if it is a Some', () => {
        const option = Option.some(10);

        expect(option.unwrap()).toBe(10);
      });

      it('throws an Error if the Option is a None', () => {
        const option = Option.none();

        expect(() => option.unwrap()).toThrow(UnwrapError);
      });
    });

    describe('unwrapOr', () => {
      it('returns the value of the Option if it is a Some', () => {
        const option = Option.some(10);

        expect(option.unwrapOr(() => 0)).toBe(10);
      });

      it('returns the fallback value if the Option is a None', () => {
        const option = Option.none<number>();

        expect(option.unwrapOr(() => 0)).toBe(0);
      });
    });

    describe('unwrapOrNull', () => {
      it('returns the value if the Option is a Some', () => {
        const output = Option.some(10).unwrapOrNull();

        expectTypeOf(output).toEqualTypeOf<number | null>();

        expect(output).toBe(10);
      });

      it('returns null if the Option is a None', () => {
        const output = Option.none<number>().unwrapOrNull();

        expectTypeOf(output).toEqualTypeOf<number | null>();

        expect(output).toBe(null);
      });
    });

    describe('unwrapOrUndefined', () => {
      it('returns the value if the Option is a Some', () => {
        const output = Option.some(10).unwrapOrUndefined();

        expectTypeOf(output).toEqualTypeOf<number | undefined>();

        expect(output).toBe(10);
      });

      it('returns undefined if the Option is a None', () => {
        const output = Option.none<number>().unwrapOrUndefined();

        expectTypeOf(output).toEqualTypeOf<number | undefined>();

        expect(output).toBe(undefined);
      });
    });

    describe('expect', () => {
      class MissingValue extends TaggedError {
        readonly _tag = 'MissingValue';
      }

      it('returns the value of the Option if it is a Some', () => {
        const value = Option.some(10).expect(() => new MissingValue());

        expect(value).toBe(10);
      });

      it('throws a custom Error if the Option is a None', () => {
        const option = Option.none();

        expect(() => option.expect(() => new MissingValue())).toThrow(
          MissingValue,
        );
      });
    });

    describe('toResult', () => {
      let unregister: () => void;

      beforeAll(() => {
        unregister = FunkciaStore.register(Result);
      });

      afterAll(() => {
        unregister();
      });

      it('returns `Ok` when Option is Some', () => {
        const result = Option.some('hello world').toResult();

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('returns `Error` when Option is None', () => {
        const result = Option.none<string>().toResult();

        expectTypeOf(result).toEqualTypeOf<Result<string, MissingValueError>>();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBeInstanceOf(MissingValueError);
      });
    });

    describe('toArray', () => {
      it('returns an array with the value if Option is Some', () => {
        const output = Option.some(10).toArray();

        expectTypeOf(output).toEqualTypeOf<number[]>();

        expect(output).toEqual([10]);
      });

      it('returns an empty array if Option is None', () => {
        const output = Option.none<number>().toArray();

        expectTypeOf(output).toEqualTypeOf<number[]>();

        expect(output).toEqual([]);
      });
    });

    describe('contains', () => {
      it('returns true if the Option is a Some and the predicate is fulfilled', () => {
        const option = Option.some(10);

        expect(option.contains((value) => value > 0)).toBeTrue();
      });

      it('returns false if the Option is a Some and the predicate is not fulfilled', () => {
        const option = Option.some(10);

        expect(option.contains((value) => value === 0)).toBeFalse();
      });

      it('returns false if the Option is a None', () => {
        const option = Option.none<number>();

        expect(option.contains((value) => value > 0)).toBeFalse();
      });
    });

    describe('bindTo', () => {
      it('binds the current `Option` to a `do-notation`', () => {
        const option = Option.some(10).bindTo('a');

        expectTypeOf(option).toEqualTypeOf<Option<Readonly<{ a: number }>>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 10 });
      });
    });
  });

  describe('transformations', () => {
    describe('map', () => {
      it('transforms the Some value', () => {
        const option = Option.some('hello world').map((value) =>
          value.toUpperCase(),
        );

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('HELLO WORLD');
      });

      it('has no effect if the Option is a None', () => {
        const callback = vi.fn((value: string) => value.toUpperCase());

        const option = Option.none<string>().map(callback);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(callback).not.toHaveBeenCalled();
        expect(option.isNone()).toBeTrue();
      });

      it('tells the developer to use `andThen` when returning an Option', () => {
        const option = Option.some('hello world').map((value) =>
          // @ts-expect-error this is testing the error message
          Option.fromFalsy(value.toUpperCase()),
        );

        expectTypeOf(option).toEqualTypeOf<Option<unknown>>();
      });
    });

    describe('andThen', () => {
      it('transforms the `Some` value while flattening the Option', () => {
        const option = Option.some('hello world').andThen((value) =>
          Option.some(value.length),
        );

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(11);
      });

      it('has no effect when Option is a None and flattens the Option', () => {
        const lazyOption = vi.fn(() => Option.some(10));

        const option = Option.none<string>().andThen(lazyOption);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(lazyOption).not.toHaveBeenCalled();
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('filter', () => {
      it('keeps the Some Option if the predicate is fulfilled', () => {
        const option = Option.some(10).filter((value) => value > 0);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });

      it('transforms the Some Option into a None Option if the predicate is not fulfilled', () => {
        const option = Option.some(10).filter((value) => value <= 0);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isNone()).toBeTrue();
      });

      it('has no effect if the Option is a None', () => {
        const predicate = vi.fn((value: number) => value > 0);

        const option = Option.none<number>().filter(predicate);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(predicate).not.toHaveBeenCalled();
        expect(option.isNone()).toBeTrue();
      });
    });
  });

  describe('fallbacks', () => {
    describe('or', () => {
      it('returns the Some value if the Option is a Some', () => {
        const lazyOption = vi.fn(() => Option.some(20));

        const option = Option.some(10).or(lazyOption);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(lazyOption).not.toHaveBeenCalled();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });

      it('returns the fallback value if the Option is a None', () => {
        const option = Option.none<number>().or(() => Option.some(20));

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(20);
      });
    });

    describe('firstSomeOf', () => {
      it('returns the first `Some` value', () => {
        const option = Option.fromFirstSome([
          Option.some(1),
          Option.none<number>(),
          Option.some(3),
        ]);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(1);
      });

      it('returns `None` if all values are `None`', () => {
        const option = Option.fromFirstSome([
          Option.none<number>(),
          Option.none<number>(),
          Option.none<number>(),
        ]);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isNone()).toBeTrue();
      });
    });
  });

  describe('comparisons', () => {
    describe('isSome', () => {
      it('returns true if the Option is a Some', () => {
        const option = Option.some(10);

        expect(option.isSome()).toBeTrue();
      });

      it('returns false if the Option is a None', () => {
        const option = Option.none<number>();

        expect(option.isSome()).toBeFalse();
      });
    });

    describe('isNone', () => {
      it('returns true if the Option is a None', () => {
        const option = Option.none<number>();

        expect(option.isNone()).toBeTrue();
      });

      it('returns false if the Option is a Some', () => {
        const option = Option.some(10);

        expect(option.isNone()).toBeFalse();
      });
    });

    describe('equals', () => {
      it('returns true if the Option is a Some and the other Option is a Some and the values are equal', () => {
        const isEqual = Option.some(10).equals(Option.some(10));

        expect(isEqual).toBeTrue();
      });

      it('returns the output of the equality function if the Option is a Some and the other Option is a Some', () => {
        const isSameObject = vi.fn((a, b) => a.value === b.value);

        const isEqual = Option.some({ value: 10 }).equals(
          Option.some({ value: 20 }),
          isSameObject,
        );

        expect(isEqual).toBeFalse();
        expect(isSameObject).toHaveBeenCalledExactlyOnceWith(
          { value: 10 },
          { value: 20 },
        );
      });

      it('does not call the equality function if one of the Options is a None', () => {
        const isSameObject = vi.fn((a, b) => a.value === b.value);

        const isEqual = Option.some({ value: 10 }).equals(
          Option.none(),
          isSameObject,
        );

        expect(isEqual).toBeFalse();
        expect(isSameObject).not.toHaveBeenCalled();
      });

      it('returns false if the Option is a Some and the other Option is a Some and the values are not equal', () => {
        const isEqual = Option.some(10).equals(Option.some(20));

        expect(isEqual).toBeFalse();
      });

      it('returns false if the Option is a Some and the other Option is a None', () => {
        const isEqual = Option.some(10).equals(Option.none());

        expect(isEqual).toBeFalse();
      });

      it('returns false if the Option is a None and the other Option is a Some', () => {
        const isEqual = Option.none<number>().equals(Option.some(20));

        expect(isEqual).toBeFalse();
      });

      it('returns true if the Option is a None and the other Option is a None', () => {
        const isEqual = Option.none().equals(Option.none());

        expect(isEqual).toBeTrue();
      });
    });
  });

  describe('other', () => {
    describe('tap', () => {
      it('executes the callback if the Option is a Some while ignoring the returned value and preserving the original value of the `Option`', () => {
        const callback = vi.fn((value: number) => {
          expect(value).toBe(10);

          return value * 2; // 20
        });

        const option = Option.some(10).tap(callback);

        expect(callback).toHaveBeenCalledWith(10);

        expect(option.unwrap()).toBe(10);
      });

      it('does not execute the callback if the Option is a None', () => {
        const callback = vi.fn((value: number) => value * 2);

        Option.none<number>().tap(callback);

        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
});
