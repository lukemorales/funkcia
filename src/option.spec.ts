import { none, some } from './_internals/option';
import * as N from './number';
import * as O from './option';
import * as S from './string';
import { compose } from './utils';

describe('Option', () => {
  function someOption<T>(value: T) {
    const { pipe, ...option } = some(value);
    return option;
  }

  describe('conversions', () => {
    describe('fromNullable', () => {
      it('creates a Some when value is not nullable', () => {
        expect(O.fromNullable('hello world')).toMatchObject(
          someOption('hello world'),
        );
      });

      it('creates a None when value is null or undefined', () => {
        expect(O.fromNullable(null)).toEqual(none());
        expect(O.fromNullable(undefined)).toEqual(none());
      });
    });

    describe('fromFalsy', () => {
      it('creates a Some when value is not falsy', () => {
        expect(O.fromFalsy('hello world')).toMatchObject(
          someOption('hello world'),
        );
        expect(O.fromFalsy(true)).toMatchObject(someOption(true));
        expect(O.fromFalsy(1)).toMatchObject(someOption(1));
      });

      it('creates a None when value is falsy', () => {
        expect(O.fromFalsy(null)).toEqual(none());
        expect(O.fromFalsy(undefined)).toEqual(none());
        expect(O.fromFalsy(0)).toEqual(none());
        expect(O.fromFalsy(0n)).toEqual(none());
        expect(O.fromFalsy(NaN)).toEqual(none());
        expect(O.fromFalsy(false)).toEqual(none());
        expect(O.fromFalsy('')).toEqual(none());
      });
    });

    describe('fromThrowable', () => {
      it('creates a Some when the throwable function succeeds', () => {
        expect(
          O.fromThrowable(() => JSON.parse('{ "enabled": true }')),
        ).toMatchObject(someOption({ enabled: true }));
      });

      it('creates a None when the throwable function fails', () => {
        expect(O.fromThrowable(() => JSON.parse('{{ }}'))).toEqual(none());
      });
    });

    describe('fromPredicate', () => {
      it.todo('creates a Some when the predicate is satisfied');
      it.todo('creates a None when the predicate is not satisfied');
    });
  });

  describe('lifting', () => {
    describe('liftNullable', () => {
      function divide(dividend: number, divisor: number): number | null {
        return divisor === 0 ? null : dividend / divisor;
      }

      const safeDivide = O.liftNullable(divide);

      it('creates a Some when the returned value is not nullable', () => {
        expect(safeDivide(10, 2)).toMatchObject(someOption(5));
      });

      it('creates a None when the returned value is null or undefined', () => {
        expect(safeDivide(2, 0)).toEqual(none());
      });
    });

    describe('liftThrowable', () => {
      const safeJsonParse = O.liftThrowable(JSON.parse);

      it('creates a Some when the original function succeeds', () => {
        expect(safeJsonParse('{ "enabled": true }')).toMatchObject(
          someOption({ enabled: true }),
        );
      });

      it('creates a None when the original function throws an exception', () => {
        expect(safeJsonParse('{{ }}')).toEqual(none());
      });
    });
  });

  describe('transforming', () => {
    describe('map', () => {
      it('maps the value to another value if Option is a Some', () => {
        expect(
          O.some('hello').pipe(O.map((greeting) => `${greeting} world`)),
        ).toMatchObject(someOption('hello world'));
      });

      it('is a no-op if Option is a None', () => {
        expect(
          O.none().pipe(O.map((greeting: string) => `${greeting} world`)),
        ).toMatchObject(none());
      });
    });

    describe('flatMap', () => {
      const transformToAnotherOption = compose(
        S.length,
        O.fromPredicate((length) => length >= 5),
      );

      it('maps the value to another Option if Option is a Some', () => {
        expect(
          O.some('hello').pipe(O.flatMap(transformToAnotherOption)),
        ).toMatchObject(someOption(5));
      });

      it('is a no-op if Option is a None', () => {
        expect(
          O.none().pipe(O.flatMap(transformToAnotherOption)),
        ).toMatchObject(none());
      });
    });

    describe('flatMapNullable', () => {
      interface Profile {
        address?: {
          home: string | null;
          work: string | null;
        };
      }

      const profile: Profile = {
        address: {
          home: '21st street',
          work: null,
        },
      };

      it('flat maps into a Some option if returning value is not nullable', () => {
        expect(
          O.fromNullable(profile.address).pipe(
            O.flatMapNullable((address) => address.home),
          ),
        ).toMatchObject(someOption('21st street'));
      });

      it('flat maps into a None option if returning value is nullable', () => {
        expect(
          O.fromNullable(profile.address).pipe(
            O.flatMapNullable((address) => address.work),
          ),
        ).toMatchObject(none());
      });
    });

    describe('flatten', () => {
      const transformToAnotherOption = compose(
        S.length,
        O.fromPredicate((length) => length >= 5),
      );

      it('flattens an Option of an Option into a single Option', () => {
        expect(
          O.fromNullable('hello').pipe(
            O.map(transformToAnotherOption),
            O.flatten,
          ),
        ).toMatchObject(someOption(5));
      });
    });
  });

  describe('filtering', () => {
    describe('filter', () => {
      it('keeps the Option value if it matches the predicate', () => {
        expect(
          O.fromNullable('hello').pipe(O.filter(S.isString)),
        ).toMatchObject(someOption('hello'));
      });

      it('filters the Option value out if it doesn’t match the predicate', () => {
        expect(O.fromNullable('hello').pipe(O.filter(N.isNumber))).toEqual(
          none(),
        );
      });

      it('is a no-op if Option is a None', () => {
        expect(O.fromNullable(null).pipe(O.filter(S.isString))).toEqual(none());
      });
    });
  });

  describe('getters', () => {
    describe('match', () => {
      it('returns the result of the onNone function if Option is a None', () => {
        expect(
          O.none().pipe(
            O.match(
              () => 'no one to greet',
              (greeting: string) => `${greeting} world`,
            ),
          ),
        ).toBe('no one to greet');
      });

      it('passes the Option value if it is a Some into the onSome function and returns its result', () => {
        expect(
          O.some('hello').pipe(
            O.match(
              () => 'no one to greet',
              (greeting) => `${greeting} world`,
            ),
          ),
        ).toBe('hello world');
      });
    });

    describe('getOrElse', () => {
      it('unwraps the Option value if it is a Some', () => {
        expect(O.some('hello').pipe(O.getOrElse(() => 'no one to greet'))).toBe(
          'hello',
        );
      });

      it('returns the result of the onNone function if Option is a None', () => {
        expect(O.none().pipe(O.getOrElse(() => 'no one to greet'))).toBe(
          'no one to greet',
        );
      });
    });

    describe('unwrap', () => {
      it('unwraps the Option value if it is a Some', () => {
        expect(O.some('hello').pipe(O.unwrap)).toBe('hello');
      });

      it('throws an exception if Option is a None', () => {
        expect(() => O.none().pipe(O.unwrap)).toThrow(
          new Error('Failed to unwrap Option value'),
        );
      });
    });

    describe('expect', () => {
      class NotFoundException extends Error {}

      it('unwraps the Option value if it is a Some', () => {
        expect(
          O.some('hello').pipe(
            O.expect(() => new NotFoundException('Greeting not found')),
          ),
        ).toBe('hello');
      });

      it('throws an exception if Option is a None', () => {
        expect(() =>
          O.none().pipe(
            O.expect(() => new NotFoundException('Greeting not found')),
          ),
        ).toThrow(new NotFoundException('Greeting not found'));
      });
    });

    describe('toNull', () => {
      it('unwraps the Option value if it is a Some', () => {
        expect(O.some('hello').pipe(O.toNull)).toBe('hello');
      });

      it('returns null if Option is a None', () => {
        expect(O.none().pipe(O.toNull)).toBe(null);
      });
    });

    describe('toUndefined', () => {
      it('unwraps the Option value if it is a Some', () => {
        expect(O.some('hello').pipe(O.toUndefined)).toBe('hello');
      });

      it('returns undefined if Option is a None', () => {
        expect(O.none().pipe(O.toUndefined)).toBe(undefined);
      });
    });

    describe('toArray', () => {
      it('returns the Option value wrapped in an array if it is a Some', () => {
        expect(O.some('hello').pipe(O.toArray)).toEqual(['hello']);
      });

      it('returns an empty array if Option is a None', () => {
        expect(O.none().pipe(O.toArray)).toEqual([]);
      });
    });

    describe('satisfies', () => {
      it('returns true if Option is a Some and value satisfies the predicate', () => {
        expect(
          O.some('hello').pipe(
            O.satisfies((greeting) => greeting.length === 5),
          ),
        ).toBe(true);
      });

      it('returns false if Option is a Some and value does’t satisfy the predicate', () => {
        expect(
          O.some('hello').pipe(O.satisfies((greeting) => greeting.length > 5)),
        ).toBe(false);
      });

      it('returns false if Option is a None', () => {
        expect(
          O.none().pipe(
            O.satisfies((greeting: string) => greeting.length === 5),
          ),
        ).toBe(false);
      });
    });
  });
});
