import type { DoNotation } from './do-notation';
import { NoValueError, TaggedError, UnwrapError } from './exceptions';
import { FunkciaStore } from './funkcia-store';
import type { Falsy, Nullable } from './internals/types';
import { Option } from './option';
import { AsyncOption } from './option.async';
import { Result } from './result';
import { AsyncResult } from './result.async';

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

    describe('fromNullable', () => {
      function nullify(value: Nullable<string>): Nullable<string> {
        return value;
      }

      it('creates a Some Option when the value is not nullable', () => {
        const option = Option.fromNullable(nullify('hello world'));

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the value is nullable', () => {
        const option = Option.fromNullable(nullify(null));

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
      });
    });

    describe('fromFalsy', () => {
      it('creates a Some Option when the value is not falsy', () => {
        const option = Option.fromFalsy('hello world' as string | Falsy);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the value is falsy', () => {
        const falsyValues = [
          '',
          0,
          0n,
          null,
          undefined,
          false,
        ] satisfies Falsy[];

        for (const value of falsyValues) {
          const option = Option.fromFalsy(value);

          expectTypeOf(option).toEqualTypeOf<Option<never>>();

          expect(option.isNone()).toBeTrue();
        }
      });
    });

    describe('try', () => {
      it('creates a Some Option when the function does not throw', () => {
        const option = Option.try(() => 'hello world');

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('creates a None Option when the function does not throw but returns null', () => {
        const option = Option.try(() => null as string | null);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
      });

      it('creates a None Option when the function throws', () => {
        const option = Option.try<string>(() => {
          throw new Error('computation failed');
        });

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
      });
    });

    describe('fun', () => {
      it('returns a function with improved inference without changing behavior', () => {
        function hasEnabledSetting(enabled: boolean | null) {
          if (typeof enabled !== 'boolean') return Option.none();

          return enabled
            ? Option.some('YES' as const)
            : Option.some('NO' as const);
        }

        const normal = hasEnabledSetting(true);

        expectTypeOf(normal).toEqualTypeOf<Option<'YES'> | Option<'NO'>>();

        expect(normal.isSome()).toBeTrue();
        expect(normal.unwrap()).toBe('YES');

        const wrappedFn = Option.fun(hasEnabledSetting);

        const option = wrappedFn(true);

        expectTypeOf(option).toEqualTypeOf<Option<'YES' | 'NO'>>();

        // @ts-expect-error `output` has same values but improved type inference
        expect(normal.equals(option)).toBeTrue();
      });

      it('returns an async function with improved inference without changing behavior', async () => {
        async function hasEnabledSetting(enabled: boolean | null) {
          if (typeof enabled !== 'boolean') return Option.none();

          return enabled
            ? Option.some('YES' as const)
            : Option.some('NO' as const);
        }

        expectTypeOf(hasEnabledSetting).toEqualTypeOf<
          (enabled: boolean | null) => Promise<Option<'YES'> | Option<'NO'>>
        >();

        const wrappedFn = Option.fun(hasEnabledSetting);

        expectTypeOf(wrappedFn).toEqualTypeOf<
          (enabled: boolean | null) => Promise<Option<'YES' | 'NO'>>
        >();
      });
    });

    describe('liftFun', () => {
      it('wraps a function that might throw exceptions returning a function that returns an Option', () => {
        const safeDivide = Option.liftFun(
          (dividend: number, divisor: number): number => {
            if (divisor === 0) {
              throw new Error('division by zero');
            }

            return dividend / divisor;
          },
        );

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

      it('wraps a function that might return a nullable value returning a function that returns an Option', () => {
        const safeDivide = Option.liftFun(
          (dividend: number, divisor: number) => {
            if (divisor === 0) {
              return null;
            }

            return dividend / divisor;
          },
        );
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

        const ensureCircle = Option.predicate(
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
        const ensurePositive = Option.predicate((value: number) => value > 0);

        expectTypeOf(ensurePositive).toEqualTypeOf<
          (value: number) => Option<number>
        >();

        const option = ensurePositive(10);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(10);
      });
    });

    describe('relay', () => {
      it('safely evaluates the generator, returning the returned Option when all yields are `Some`', () => {
        const greeting = Option.some('hello');
        const subject = Option.some('world');

        const option = Option.relay(function* exec() {
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

        const option = Option.relay(function* exec() {
          const a = yield* greeting;
          const b = yield* getSubject();

          return Option.some(`${a} ${b}`);
        });

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();

        expect(getSubject).not.toHaveBeenCalled();
      });
    });

    describe('firstSomeOf', () => {
      it('returns the first `Some` value', () => {
        const option = Option.firstSomeOf([
          Option.some(1),
          Option.none<number>(),
          Option.some(3),
        ]);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe(1);
      });

      it('returns `None` if all values are `None`', () => {
        const option = Option.firstSomeOf<number>([
          Option.none(),
          Option.none(),
          Option.none(),
        ]);

        expectTypeOf(option).toEqualTypeOf<Option<number>>();

        expect(option.isNone()).toBeTrue();
      });
    });
  });

  describe('combinators', () => {
    describe('values', () => {
      it('returns an array containing only the values inside `Some`', () => {
        const output = Option.values([
          Option.some(1),
          Option.none<number>(),
          Option.some(3),
        ]);

        expect(output).toEqual([1, 3]);
      });

      it('returns an empty array if all values are `None`', () => {
        const output = Option.values<number>([
          Option.none(),
          Option.none(),
          Option.none(),
        ]);

        expect(output).toEqual([]);
      });
    });

    describe('zip', () => {
      it('combines two `Options` into a single `Option` containing a tuple of their values, if both `Options` are `Some`', () => {
        const first = Option.some('hello');
        const second = Option.some('world');

        const option = first.zip(second);

        expectTypeOf(option).toEqualTypeOf<Option<[string, string]>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual(['hello', 'world']);
      });

      it('returns `None` if one of the `Options` is `None`', () => {
        const first = Option.some('hello');
        const second = Option.none<string>();

        const option = first.zip(second);

        expectTypeOf(option).toEqualTypeOf<Option<[string, string]>>();

        expect(option.isNone()).toBeTrue();
      });
    });

    describe('zipWith', () => {
      it('combines two `Options` into a single `Option` producing a new value by applying the given function to both values, if both `Options` are `Some`', () => {
        const first = Option.some('hello');
        const second = Option.some('world');

        const option = first.zipWith(second, (a, b) => `${a} ${b}`);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('hello world');
      });

      it('returns `None` if one of the `Options` is `None`', () => {
        const first = Option.some('hello');
        const second = Option.none<string>();

        const option = first.zipWith(second, (a, b) => `${a} ${b}`);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
      });
    });
  });

  describe('do-notation', () => {
    describe('Do', () => {
      it('creates an `Option` with an empty object branded with the DoNotation type', () => {
        const option = Option.Do;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
        expectTypeOf(option).toEqualTypeOf<Option<DoNotation.Sign<object>>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({});
      });
    });

    describe('bindTo', () => {
      it('binds the current `Option` to a `do-notation`', () => {
        const option = Option.some(10).bindTo('a');

        expectTypeOf(option).toEqualTypeOf<
          Option<DoNotation.Sign<{ a: number }>>
        >();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 10 });
      });
    });

    describe('bind', () => {
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
          });

        expectTypeOf(option).toEqualTypeOf<
          Option<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>
          >
        >();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 2, b: 2, c: 6 });
      });

      it('accumulates multiple `bind` calls into an object and is a `None` Option if any value is `None`', () => {
        const bindC = vi.fn(() => Option.some(6));

        const option = Option.Do.bind('a', () => Option.some(2))
          .bind('b', () => Option.none<number>())
          .bind('c', bindC);

        expectTypeOf(option).toEqualTypeOf<
          Option<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>
          >
        >();

        expect(option.isNone()).toBeTrue();

        expect(bindC).not.toHaveBeenCalled();
      });
    });

    describe('let', () => {
      it('accumulates multiple `let` calls into an object', () => {
        const option = Option.Do.let('a', () => 4)
          .let('b', () => 6)
          .let('c', (ctx) => ctx.a + ctx.b);

        expectTypeOf(option).toEqualTypeOf<
          Option<
            DoNotation.Sign<{
              a: number;
              b: number;
              c: number;
            }>
          >
        >();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toEqual({ a: 4, b: 6, c: 10 });
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

      it('improves the inferred type if the fallback value is an empty array', () => {
        const option = Option.none<number[]>();

        expectTypeOf(option.unwrapOr(() => [])).toEqualTypeOf<number[]>();
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

        expectTypeOf(result).toEqualTypeOf<Result<string, NoValueError>>();

        expect(result.isOk()).toBeTrue();
        expect(result.unwrap()).toBe('hello world');
      });

      it('returns `Error` when Option is None', () => {
        const result = Option.none<string>().toResult();

        expectTypeOf(result).toEqualTypeOf<Result<string, NoValueError>>();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toBeInstanceOf(NoValueError);
      });

      it('returns the custom error when Option is None', () => {
        const result = Option.none<string>().toResult(
          () => new Error('computation failed'),
        );

        expectTypeOf(result).toEqualTypeOf<Result<string, Error>>();

        expect(result.isError()).toBeTrue();
        expect(result.unwrapError()).toEqual(new Error('computation failed'));
      });
    });

    describe('toAsyncOption', () => {
      let unregister: () => void;

      beforeAll(() => {
        unregister = FunkciaStore.register(AsyncOption);
      });

      afterAll(() => {
        unregister();
      });

      it('returns a `AsyncOption` from the original `Option`', async () => {
        const option = Option.some('hello world');
        const taskOption = option.toAsyncOption();

        expectTypeOf(taskOption).toEqualTypeOf<AsyncOption<string>>();
        expect(await taskOption).toEqual(option);
      });
    });

    describe('toAsyncResult', () => {
      let unregisterResult: () => void;
      let unregisterAsyncResult: () => void;

      beforeAll(() => {
        unregisterResult = FunkciaStore.register(Result);
        unregisterAsyncResult = FunkciaStore.register(AsyncResult);
      });

      afterAll(() => {
        unregisterResult();
        unregisterAsyncResult();
      });

      it('returns a `AsyncResult` from the original `Option`', async () => {
        const option = Option.some('hello world');
        const taskResult = option.toAsyncResult();

        expectTypeOf(taskResult).toEqualTypeOf<
          AsyncResult<string, NoValueError>
        >();
        expect(await taskResult.unwrap()).toEqual(option.unwrap());
      });

      it('returns a `AsyncResult` from the original `Option` with a custom error', async () => {
        const option = Option.none<string>();
        const taskResult = option.toAsyncResult(
          () => new Error('computation failed'),
        );

        expectTypeOf(taskResult).toEqualTypeOf<AsyncResult<string, Error>>();
        expect(await taskResult.unwrapError()).toEqual(
          new Error('computation failed'),
        );
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

      it('transforms the Some value and removes nullable type from the output', () => {
        interface Profile {
          lastName?: string;
        }

        const option = Option.some<Profile>({ lastName: 'Doe' })
          .map((value) => value.lastName)
          .map((value) => {
            expectTypeOf(value).toEqualTypeOf<string>();

            return value.toUpperCase();
          });

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isSome()).toBeTrue();
        expect(option.unwrap()).toBe('DOE');
      });

      it('returns a None Option if the callback returns null', () => {
        interface Profile {
          lastName?: string;
        }

        const option = Option.some<Profile>({}).map((value) => value.lastName);

        expectTypeOf(option).toEqualTypeOf<Option<string>>();

        expect(option.isNone()).toBeTrue();
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
  });

  describe('comparisons', () => {
    describe('isSome', () => {
      it('returns true if the Option is a Some', () => {
        const option = Option.some(10);

        expect(option.isSome()).toBeTrue();
        expect(option.isNone()).toBeFalse();
      });

      it('returns false if the Option is a None', () => {
        const option = Option.none<number>();

        expect(option.isSome()).toBeFalse();
        expect(option.isNone()).toBeTrue();
      });
    });

    describe('isNone', () => {
      it('returns true if the Option is a None', () => {
        const option = Option.none<number>();

        expect(option.isNone()).toBeTrue();
        expect(option.isSome()).toBeFalse();
      });

      it('returns false if the Option is a Some', () => {
        const option = Option.some(10);

        expect(option.isNone()).toBeFalse();
        expect(option.isSome()).toBeTrue();
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
