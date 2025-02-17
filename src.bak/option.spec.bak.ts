import { flow, pipe } from './functions';
import * as N from './number';
import * as O from './option.bak';
import * as R from './result.bak';
import * as S from './string';

describe('Option', () => {
  describe('conversions', () => {
    describe('fromNullable', () => {
      it('creates a Some when value is not nullable', () => {
        expect(O.fromNullable('hello world')).toMatchOption(
          O.some('hello world'),
        );
      });

      const eachCase = it.each([undefined, null]);

      eachCase('creates a None when value is %s', (nullable) => {
        expect(O.fromNullable(nullable)).toBeNone();
      });
    });

    describe('fromFalsy', () => {
      it('creates a Some when value is not falsy', () => {
        expect(O.fromFalsy('hello world')).toMatchOption(O.some('hello world'));
        expect(O.fromFalsy(true)).toMatchOption(O.some(true));
        expect(O.fromFalsy(1)).toMatchOption(O.some(1));
      });

      const eachCase = it.each([null, undefined, 0, 0n, NaN, false, '']);

      eachCase('creates a None when value is %s', (falsy) => {
        expect(O.fromFalsy(falsy)).toBeNone();
      });
    });

    describe('fromThrowable', () => {
      it('creates a Some when the throwable function succeeds', () => {
        expect(
          O.fromThrowable(() => JSON.parse('{ "enabled": true }')),
        ).toMatchOption(O.some({ enabled: true }));
      });

      it('creates a None when the throwable function fails', () => {
        expect(O.fromThrowable(() => JSON.parse('{{ }}'))).toBeNone();
      });
    });

    describe('fromPredicate', () => {
      interface Square {
        kind: 'square';
        size: number;
      }

      interface Circle {
        kind: 'circle';
        radius: number;
      }

      type Shape = Square | Circle;

      const shape = { kind: 'square', size: 2 } as Shape;

      describe('data-first', () => {
        it('creates a Some when the predicate is satisfied', () => {
          expect(
            O.fromPredicate(
              shape,
              (body): body is Square => body.kind === 'square',
            ),
          ).toMatchOption(O.some({ kind: 'square', size: 2 }));
        });

        it('creates a None when the predicate is not satisfied', () => {
          expect(
            O.fromPredicate(
              shape,
              (body): body is Circle => body.kind === 'circle',
            ),
          ).toBeNone();
        });
      });

      describe('data-last', () => {
        it('creates a Some when the predicate is satisfied', () => {
          expect(
            pipe(
              shape,
              O.fromPredicate((body): body is Square => body.kind === 'square'),
            ),
          ).toMatchOption(O.some({ kind: 'square', size: 2 }));
        });

        it('creates a None when the predicate is not satisfied', () => {
          expect(
            pipe(
              shape,
              O.fromPredicate((body): body is Circle => body.kind === 'circle'),
            ),
          ).toBeNone();
        });
      });
    });

    describe('fromResult', () => {
      it('creates a Some when Result is a Right', () => {
        expect(O.fromResult(R.ok('hello world'))).toMatchOption(
          O.some('hello world'),
        );
      });

      it('creates a None when Result is a Left', () => {
        expect(O.fromResult(R.error('computation failure'))).toBeNone();
      });
    });
  });

  describe('lifting', () => {
    describe('liftNullable', () => {
      function divide(dividend: number, divisor: number): number | null {
        return divisor === 0 ? null : dividend / divisor;
      }

      const safeDivide = O.liftNullable(divide);

      it('creates a Some when the lifted function returns a non-nullable value', () => {
        expect(safeDivide(10, 2)).toMatchOption(O.some(5));
      });

      it('creates a None when the lifted function returns null or undefined', () => {
        expect(safeDivide(2, 0)).toBeNone();
      });
    });

    describe('liftThrowable', () => {
      const safeJsonParse = O.liftThrowable(JSON.parse);

      it('creates a Some when the lifted function succeeds', () => {
        expect(safeJsonParse('{ "enabled": true }')).toMatchOption(
          O.some({ enabled: true }),
        );
      });

      it('creates a None when the lifted function throws an exception', () => {
        expect(safeJsonParse('{{ }}')).toBeNone();
      });
    });
  });

  describe('replacements', () => {
    describe('fallback', () => {
      it('does not replace the original Option when it’s a Some', () => {
        expect(O.some('a').pipe(O.fallback(() => O.some('b')))).toMatchOption(
          O.some('a'),
        );
      });

      it('replaces the original Option with the provided fallback when it’s a None', () => {
        expect(O.none().pipe(O.fallback(() => O.some('b')))).toMatchOption(
          O.some('b'),
        );
      });
    });
  });

  describe('transforming', () => {
    describe('map', () => {
      it('maps the value to another value if Option is a Some', () => {
        expect(
          O.some('hello').pipe(O.map((greeting) => `${greeting} world`)),
        ).toMatchOption(O.some('hello world'));
      });

      it('is a no-op if Option is a None', () => {
        expect(
          O.none().pipe(O.map((greeting: string) => `${greeting} world`)),
        ).toBeNone();
      });
    });

    describe('flatMap', () => {
      const transformToAnotherOption = flow(
        S.length,
        O.fromPredicate((length) => length >= 5),
      );

      it('maps the value if Option is a Some and flattens the result to a single Option', () => {
        expect(
          O.some('hello').pipe(O.flatMap(transformToAnotherOption)),
        ).toMatchOption(O.some(5));
      });

      it('is a no-op if Option is a None', () => {
        expect(O.none().pipe(O.flatMap(transformToAnotherOption))).toBeNone();
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

      it('flat maps into a Some if returning value is not nullable', () => {
        expect(
          O.fromNullable(profile.address).pipe(
            O.flatMapNullable((address) => address.home),
          ),
        ).toMatchOption(O.some('21st street'));
      });

      it('flat maps into a None if returning value is nullable', () => {
        expect(
          O.fromNullable(profile.address).pipe(
            O.flatMapNullable((address) => address.work),
          ),
        ).toBeNone();
      });
    });

    describe('flatten', () => {
      const transformToAnotherOption = flow(
        S.length,
        O.fromPredicate((length) => length >= 5),
      );

      it('flattens an Option of an Option into a single Option', () => {
        expect(
          O.some('hello').pipe(O.map(transformToAnotherOption), O.flatten),
        ).toMatchOption(O.some(5));
      });
    });
  });

  describe('filtering', () => {
    describe('filter', () => {
      it('keeps the Option value if it matches the predicate', () => {
        expect(O.some('hello').pipe(O.filter(S.isString))).toMatchOption(
          O.some('hello'),
        );
      });

      it('filters the Option value out if it doesn’t match the predicate', () => {
        expect(O.some('hello').pipe(O.filter(N.isNumber))).toBeNone();
      });

      it('is a no-op if Option is a None', () => {
        expect(O.none().pipe(O.filter(S.isString))).toBeNone();
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

      it('passes the Option value if it’s a Some into the onSome function and returns its result', () => {
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
      it('unwraps the Option value if it’s a Some', () => {
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
      it('unwraps the Option value if it’s a Some', () => {
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

      it('unwraps the Option value if it’s a Some', () => {
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

    describe('toNullable', () => {
      it('unwraps the Option value if it’s a Some', () => {
        expect(O.some('hello').pipe(O.toNullable)).toBe('hello');
      });

      it('returns null if Option is a None', () => {
        expect(O.none().pipe(O.toNullable)).toBe(null);
      });
    });

    describe('toUndefined', () => {
      it('unwraps the Option value if it’s a Some', () => {
        expect(O.some('hello').pipe(O.toUndefined)).toBe('hello');
      });

      it('returns undefined if Option is a None', () => {
        expect(O.none().pipe(O.toUndefined)).toBe(undefined);
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
