/* eslint-disable max-classes-per-file */

import { flow, pipe } from './functions';
import * as N from './number';
import * as O from './option.bak';
import * as R from './result.bak';
import * as S from './string';

describe('Result', () => {
  describe('conversions', () => {
    describe('fromNullable', () => {
      describe('data-first', () => {
        it('creates an Ok when value is not nullable', () => {
          expect(
            R.fromNullable('hello world', () => new Error('Nullable value')),
          ).toMatchResult(R.ok('hello world'));
        });

        const eachCase = it.each([undefined, null]);

        eachCase('creates an Error when value is %s', (nullable) => {
          expect(
            R.fromNullable(nullable, () => new Error('Nullable value')),
          ).toMatchResult(R.error(new Error('Nullable value')));
        });
      });

      describe('data-last', () => {
        it('creates an Ok when value is not nullable', () => {
          expect(
            pipe(
              'hello world',
              R.fromNullable(() => new Error('Nullable value')),
            ),
          ).toMatchResult(R.ok('hello world'));
        });

        const eachCase = it.each([undefined, null]);

        eachCase('creates an Error when value is %s', (nullable) => {
          expect(
            pipe(
              nullable,
              R.fromNullable(() => new Error('Nullable value')),
            ),
          ).toMatchResult(R.error(new Error('Nullable value')));
        });
      });
    });

    describe('fromFalsy', () => {
      describe('data-first', () => {
        it('creates an Ok when value is not nullable', () => {
          expect(
            R.fromFalsy('hello world', () => new Error('Nullable value')),
          ).toMatchResult(R.ok('hello world'));
        });

        const eachCase = it.each([null, undefined, 0, 0n, NaN, false, '']);

        eachCase('creates an Error when value is %s', (falsy) => {
          expect(
            R.fromFalsy(falsy, () => new Error('Nullable value')),
          ).toMatchResult(R.error(new Error('Nullable value')));
        });
      });

      describe('data-last', () => {
        it('creates an Ok when value is not nullable', () => {
          expect(
            pipe(
              'hello world',
              R.fromFalsy(() => new Error('Nullable value')),
            ),
          ).toMatchResult(R.ok('hello world'));
        });

        const eachCase = it.each([null, undefined, 0, 0n, NaN, false, '']);

        eachCase('creates an Error when value is %s', (falsy) => {
          expect(
            pipe(
              falsy,
              R.fromFalsy(() => new Error('Nullable value')),
            ),
          ).toMatchResult(R.error(new Error('Nullable value')));
        });
      });
    });

    describe('fromPredicate', () => {
      type Greeting = string & { greeting: true };

      describe('data-first', () => {
        it('creates an Ok when predicate is satisfied', () => {
          expect(
            R.fromPredicate(
              'hello world',
              (value): value is Greeting => value.includes('hello'),
              () => new Error('Empty option'),
            ),
          ).toMatchResult(R.ok('hello world'));
        });

        it('creates an Error when predicate is not satisfied', () => {
          expect(
            R.fromPredicate(
              'the world',
              (value): value is Greeting => value.includes('hello'),
              () => new Error('Empty option'),
            ),
          ).toMatchResult(R.error(new Error('Empty option')));
        });
      });

      describe('data-last', () => {
        it('creates an Ok when predicate is satisfied', () => {
          expect(
            pipe(
              'hello world',
              R.fromPredicate(
                (value): value is Greeting => value.includes('hello'),
                () => new Error('Empty option'),
              ),
            ),
          ).toMatchResult(R.ok('hello world'));
        });

        it('creates an Error when predicate is not satisfied', () => {
          expect(
            pipe(
              'the world',
              R.fromPredicate(
                (value): value is Greeting => value.includes('hello'),
                () => new Error('Empty option'),
              ),
            ),
          ).toMatchResult(R.error(new Error('Empty option')));
        });
      });
    });

    describe('fromThrowable', () => {
      it('creates an Ok when function succeeds', () => {
        expect(
          R.fromThrowable(
            () => JSON.parse('{ "enabled": true }'),
            () => new Error('Failed to parse JSON'),
          ),
        ).toMatchResult(R.ok({ enabled: true }));
      });

      it('creates an Error function throws an exception', () => {
        expect(
          R.fromThrowable(
            () => JSON.parse('{{ }} '),
            () => new Error('Failed to parse JSON'),
          ),
        ).toMatchResult(R.error(new Error('Failed to parse JSON')));
      });
    });

    describe('fromOption', () => {
      describe('data-first', () => {
        it('creates an Ok when Option is Some', () => {
          expect(
            R.fromOption(
              O.some('hello world'),
              () => new Error('Empty option'),
            ),
          ).toMatchResult(R.ok('hello world'));
        });

        it('creates an Error when Option is None', () => {
          expect(
            R.fromOption(O.none(), () => new Error('Empty option')),
          ).toMatchResult(R.error(new Error('Empty option')));
        });
      });

      describe('data-last', () => {
        it('creates an Ok when Option is Some', () => {
          expect(
            pipe(
              O.some('hello world'),
              R.fromOption(() => new Error('Empty option')),
            ),
          ).toMatchResult(R.ok('hello world'));
        });

        it('creates an Error when Option is None', () => {
          expect(
            pipe(
              O.none(),
              R.fromOption(() => new Error('Empty option')),
            ),
          ).toMatchResult(R.error(new Error('Empty option')));
        });
      });
    });
  });

  describe('lifting', () => {
    describe('liftNullable', () => {
      class InvalidDivisor extends Error {}

      function divide(dividend: number, divisor: number): number | null {
        return divisor === 0 ? null : dividend / divisor;
      }

      const safeDivide = R.liftNullable(
        divide,
        () => new InvalidDivisor('Divisor can’t be zero'),
      );

      it('creates an Ok when the lifted function returns a non-nullable value', () => {
        expect(safeDivide(10, 2)).toMatchResult(R.ok(5));
      });

      it('creates an Error when the lifted function returns null or undefined', () => {
        expect(safeDivide(2, 0)).toMatchResult(
          R.error(new InvalidDivisor('Divisor can’t be zero')),
        );
      });
    });

    describe('liftThrowable', () => {
      class ParsingFailure extends Error {}

      const safeJsonParse = R.liftThrowable(
        JSON.parse,
        () => new ParsingFailure('Failed to parse JSON'),
      );

      it('creates an Ok when the lifted function succeeds', () => {
        expect(safeJsonParse('{ "enabled": true }')).toMatchResult(
          R.ok({ enabled: true }),
        );
      });

      it('creates an Error when the lifted function throws an exception', () => {
        expect(safeJsonParse('{{ }}')).toMatchResult(
          R.error(new ParsingFailure('Failed to parse JSON')),
        );
      });
    });
  });

  describe('replacements', () => {
    describe('fallback', () => {
      it('does not replace the original Result when it’s an Ok', () => {
        expect(R.ok('a').pipe(R.fallback(() => R.ok('b')))).toMatchResult(
          R.ok('a'),
        );

        expect(R.ok('a').pipe(R.fallback(() => R.error('b')))).toMatchResult(
          R.ok('a'),
        );
      });

      it('replaces the original Result with the provided fallback when it’s an Error', () => {
        expect(R.error('a').pipe(R.fallback(() => R.ok('b')))).toMatchResult(
          R.ok('b'),
        );

        expect(R.error('a').pipe(R.fallback(() => R.error('b')))).toMatchResult(
          R.error('b'),
        );
      });
    });
  });

  describe('transforming', () => {
    describe('map', () => {
      it('maps the value to another value if Result is an Ok', () => {
        expect(
          R.ok('hello').pipe(R.map((greeting) => `${greeting} world`)),
        ).toMatchResult(R.ok('hello world'));
      });

      it('is a no-op if Result is an Error', () => {
        expect(
          R.error('no one to greet').pipe(
            R.map((greeting: string) => `${greeting} world`),
          ),
        ).toMatchResult(R.error('no one to greet'));
      });
    });

    describe('mapError', () => {
      it('is a no-op if Result is an Ok', () => {
        const result = R.fromPredicate(
          'hello',
          (greeting) => greeting.length > 0,
          () => 'invalid input',
        ).pipe(R.mapError((message) => new SyntaxError(message)));

        expect(result).toMatchResult(R.ok('hello'));
        expectTypeOf(result).toMatchTypeOf<R.Result<SyntaxError, string>>();
      });

      it('maps the value to another value if Result is an Error', () => {
        const result = R.fromPredicate(
          'hello',
          (greeting) => greeting.length > 5,
          () => 'invalid input',
        ).pipe(R.mapError((message) => new SyntaxError(message)));

        expect(result).toMatchResult(R.error(new SyntaxError('invalid input')));
        expectTypeOf(result).toMatchTypeOf<R.Result<SyntaxError, string>>();
      });
    });

    describe('flatMap', () => {
      const transformToAnotherOption = flow(
        S.length,
        R.fromPredicate(
          (length) => length >= 5,
          () => new Error('too small'),
        ),
      );

      it('maps the value if Result is an Ok and flattens the result to a single Result', () => {
        expect(
          R.ok('hello').pipe(R.flatMap(transformToAnotherOption)),
        ).toMatchResult(R.ok(5));
      });

      it('is a no-op if Result is an Error', () => {
        const result = R.error(new SyntaxError('invalid input')).pipe(
          R.flatMap(transformToAnotherOption),
        );

        expect(result).toMatchResult(R.error(new SyntaxError('invalid input')));
        expectTypeOf(result).toMatchTypeOf<
          R.Result<SyntaxError | Error, number>
        >();
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

      it('flat maps into an Ok if returning value is not nullable', () => {
        expect(
          R.fromNullable(
            profile.address,
            () => new Error('Missing profile address'),
          ).pipe(
            R.flatMapNullable(
              (address) => address.home,
              () => new Error('Missing home address'),
            ),
          ),
        ).toMatchResult(R.ok('21st street'));
      });

      it('flat maps into an Error if returning value is nullable', () => {
        expect(
          R.fromNullable(
            profile.address,
            () => new Error('Missing profile address'),
          ).pipe(
            R.flatMapNullable(
              (address) => address.work,
              () => new Error('Missing work address'),
            ),
          ),
        ).toMatchResult(R.error(new Error('Missing work address')));
      });
    });

    describe('flatten', () => {
      const transformToAnotherOption = flow(
        S.length,
        R.fromPredicate(
          (length) => length >= 5,
          () => new Error('too small'),
        ),
      );

      it('flattens an Result of an Result into a single Result', () => {
        expect(
          R.ok('hello').pipe(R.map(transformToAnotherOption), R.flatten),
        ).toMatchResult(R.ok(5));
      });
    });
  });

  describe('filtering', () => {
    describe('filter', () => {
      it('keeps the Ok value if it matches the predicate', () => {
        expect(
          R.ok('hello').pipe(
            R.filter(S.isString, () => new Error('value is not string')),
          ),
        ).toMatchResult(R.ok('hello'));
      });

      it('filters the Ok value out if it doesn’t match the predicate returning an Error instead', () => {
        const result = R.ok('hello').pipe(
          R.filter(N.isNumber, () => new Error('value is not a number')),
        );

        expect(result).toMatchResult(
          R.error(new Error('value is not a number')),
        );
        expectTypeOf(result).toMatchTypeOf<R.Result<Error, number>>();
      });

      it('is a no-op if Result is an Error', () => {
        const result = R.error('no input').pipe(
          R.filter(S.isString, () => new Error('value is not a string')),
        );

        expect(result).toMatchResult(R.error('no input'));
        expectTypeOf(result).toMatchTypeOf<R.Result<string | Error, string>>();
      });
    });
  });

  describe('getters', () => {
    describe('match', () => {
      it('returns the result of the onErr function if Result is an Error', () => {
        expect(
          R.error('no input').pipe(
            R.match(
              (error) => `missing greeting: ${error}`,
              (greeting: string) => `${greeting} world`,
            ),
          ),
        ).toBe('missing greeting: no input');
      });

      it('passes the Result value if it’s an Ok into the onOk function and returns its result', () => {
        expect(
          R.ok('hello').pipe(
            R.match(
              (error) => `missing greeting: ${error}`,
              (greeting) => `${greeting} world`,
            ),
          ),
        ).toBe('hello world');
      });
    });

    describe('merge', () => {
      it('consolidates both paths into a single output', () => {
        const result = R.ok('hello').pipe(
          R.filter(S.isString, () => new Error('not a string')),
          R.merge,
        );

        expect(result).toBe('hello');
        expectTypeOf(result).toMatchTypeOf<string | Error>();
      });
    });

    describe('getOrElse', () => {
      it('unwraps the Result value if it’s an Ok', () => {
        expect(R.ok('hello').pipe(R.getOrElse(() => 'no one to greet'))).toBe(
          'hello',
        );
      });

      it('returns the result of the onErr function if Result is an Error', () => {
        expect(
          R.error('no input').pipe(R.getOrElse(() => 'no one to greet')),
        ).toBe('no one to greet');
      });
    });

    describe('unwrap', () => {
      it('unwraps the Result value if it’s an Ok', () => {
        expect(R.ok('hello').pipe(R.unwrap)).toBe('hello');
      });

      it('throws an exception if Result is an Error', () => {
        expect(() => R.error('no input').pipe(R.unwrap)).toThrow(
          new Error('Failed to unwrap Result value'),
        );
      });
    });

    describe('expect', () => {
      class NotFoundException extends Error {}

      it('unwraps the Result value if it’s an Ok', () => {
        expect(
          R.ok('hello').pipe(
            R.expect(() => new NotFoundException('Greeting not found')),
          ),
        ).toBe('hello');
      });

      it('throws an exception if Result is an Error', () => {
        expect(() =>
          R.error('no input').pipe(
            R.expect(() => new NotFoundException('Greeting not found')),
          ),
        ).toThrow(new NotFoundException('Greeting not found'));
      });
    });
  });
});
