/* eslint-disable max-classes-per-file */

import { leftEither, rightEither } from './_internals/testing';
import * as E from './either';
import { compose, pipe } from './functions';
import * as N from './number';
import * as O from './option';
import * as S from './string';

describe('Either', () => {
  describe('conversions', () => {
    describe('fromNullable', () => {
      describe('data-first', () => {
        it('creates a Right when value is not nullable', () => {
          expect(
            E.fromNullable('hello world', () => new Error('Nullable value')),
          ).toMatchObject(rightEither('hello world'));
        });

        const eachCase = it.each([undefined, null]);

        eachCase('creates a Left when value is %s', (nullable) => {
          expect(
            E.fromNullable(nullable, () => new Error('Nullable value')),
          ).toMatchObject(leftEither(new Error('Nullable value')));
        });
      });

      describe('data-last', () => {
        it('creates a Right when value is not nullable', () => {
          expect(
            pipe(
              'hello world',
              E.fromNullable(() => new Error('Nullable value')),
            ),
          ).toMatchObject(rightEither('hello world'));
        });

        const eachCase = it.each([undefined, null]);

        eachCase('creates a Left when value is %s', (nullable) => {
          expect(
            pipe(
              nullable,
              E.fromNullable(() => new Error('Nullable value')),
            ),
          ).toMatchObject(leftEither(new Error('Nullable value')));
        });
      });
    });

    describe('fromFalsy', () => {
      describe('data-first', () => {
        it('creates a Right when value is not nullable', () => {
          expect(
            E.fromFalsy('hello world', () => new Error('Nullable value')),
          ).toMatchObject(rightEither('hello world'));
        });

        const eachCase = it.each([null, undefined, 0, 0n, NaN, false, '']);

        eachCase('creates a Left when value is %s', (falsy) => {
          expect(
            E.fromFalsy(falsy, () => new Error('Nullable value')),
          ).toMatchObject(leftEither(new Error('Nullable value')));
        });
      });

      describe('data-last', () => {
        it('creates a Right when value is not nullable', () => {
          expect(
            pipe(
              'hello world',
              E.fromFalsy(() => new Error('Nullable value')),
            ),
          ).toMatchObject(rightEither('hello world'));
        });

        const eachCase = it.each([null, undefined, 0, 0n, NaN, false, '']);

        eachCase('creates a Left when value is %s', (falsy) => {
          expect(
            pipe(
              falsy,
              E.fromFalsy(() => new Error('Nullable value')),
            ),
          ).toMatchObject(leftEither(new Error('Nullable value')));
        });
      });
    });

    describe('fromPredicate', () => {
      type Greeting = string & { greeting: true };

      describe('data-first', () => {
        it('creates a Right when predicate is satisfied', () => {
          expect(
            E.fromPredicate(
              'hello world',
              (value): value is Greeting => value.includes('hello'),
              () => new Error('Empty option'),
            ),
          ).toMatchObject(rightEither('hello world'));
        });

        it('creates a Left when predicate is not satisfied', () => {
          expect(
            E.fromPredicate(
              'the world',
              (value): value is Greeting => value.includes('hello'),
              () => new Error('Empty option'),
            ),
          ).toMatchObject(leftEither(new Error('Empty option')));
        });
      });

      describe('data-last', () => {
        it('creates a Right when predicate is satisfied', () => {
          expect(
            pipe(
              'hello world',
              E.fromPredicate(
                (value): value is Greeting => value.includes('hello'),
                () => new Error('Empty option'),
              ),
            ),
          ).toMatchObject(rightEither('hello world'));
        });

        it('creates a Left when predicate is not satisfied', () => {
          expect(
            pipe(
              'the world',
              E.fromPredicate(
                (value): value is Greeting => value.includes('hello'),
                () => new Error('Empty option'),
              ),
            ),
          ).toMatchObject(leftEither(new Error('Empty option')));
        });
      });
    });

    describe('fromThrowable', () => {
      it('creates a Right when function succeeds', () => {
        expect(
          E.fromThrowable(
            () => JSON.parse('{ "enabled": true }'),
            () => new Error('Failed to parse JSON'),
          ),
        ).toMatchObject(rightEither({ enabled: true }));
      });

      it('creates a Left function throws an exception', () => {
        expect(
          E.fromThrowable(
            () => JSON.parse('{{ }} '),
            () => new Error('Failed to parse JSON'),
          ),
        ).toMatchObject(leftEither(new Error('Failed to parse JSON')));
      });
    });

    describe('fromOption', () => {
      describe('data-first', () => {
        it('creates a Right when Option is Some', () => {
          expect(
            E.fromOption(
              O.some('hello world'),
              () => new Error('Empty option'),
            ),
          ).toMatchObject(rightEither('hello world'));
        });

        it('creates a Left when Option is None', () => {
          expect(
            E.fromOption(O.none(), () => new Error('Empty option')),
          ).toMatchObject(leftEither(new Error('Empty option')));
        });
      });

      describe('data-last', () => {
        it('creates a Right when Option is Some', () => {
          expect(
            pipe(
              O.some('hello world'),
              E.fromOption(() => new Error('Empty option')),
            ),
          ).toMatchObject(rightEither('hello world'));
        });

        it('creates a Left when Option is None', () => {
          expect(
            pipe(
              O.none(),
              E.fromOption(() => new Error('Empty option')),
            ),
          ).toMatchObject(leftEither(new Error('Empty option')));
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

      const safeDivide = E.liftNullable(
        divide,
        () => new InvalidDivisor('Divisor can’t be zero'),
      );

      it('creates a Right when the lifted function returns a non-nullable value', () => {
        expect(safeDivide(10, 2)).toMatchObject(rightEither(5));
      });

      it('creates a Left when the lifted function returns null or undefined', () => {
        expect(safeDivide(2, 0)).toMatchObject(
          leftEither(new InvalidDivisor('Divisor can’t be zero')),
        );
      });
    });

    describe('liftThrowable', () => {
      class ParsingFailure extends Error {}

      const safeJsonParse = E.liftThrowable(
        JSON.parse,
        () => new ParsingFailure('Failed to parse JSON'),
      );

      it('creates a Right when the lifted function succeeds', () => {
        expect(safeJsonParse('{ "enabled": true }')).toMatchObject(
          rightEither({ enabled: true }),
        );
      });

      it('creates a Left when the lifted function throws an exception', () => {
        expect(safeJsonParse('{{ }}')).toMatchObject(
          leftEither(new ParsingFailure('Failed to parse JSON')),
        );
      });
    });
  });

  describe('replacements', () => {
    describe('fallback', () => {
      it('does not replace the original Either when it’s a Right', () => {
        expect(E.right('a').pipe(E.fallback(() => E.right('b')))).toMatchObject(
          rightEither('a'),
        );

        expect(E.right('a').pipe(E.fallback(() => E.left('b')))).toMatchObject(
          rightEither('a'),
        );
      });

      it('replaces the original Either with the provided fallback when it’s a Left', () => {
        expect(E.left('a').pipe(E.fallback(() => E.right('b')))).toMatchObject(
          rightEither('b'),
        );

        expect(E.left('a').pipe(E.fallback(() => E.left('b')))).toMatchObject(
          leftEither('b'),
        );
      });
    });
  });

  describe('transforming', () => {
    describe('map', () => {
      it('maps the value to another value if Either is a Right', () => {
        expect(
          E.right('hello').pipe(E.map((greeting) => `${greeting} world`)),
        ).toMatchObject(rightEither('hello world'));
      });

      it('is a no-op if Either is a Left', () => {
        expect(
          E.left('no one to greet').pipe(
            E.map((greeting: string) => `${greeting} world`),
          ),
        ).toMatchObject(leftEither('no one to greet'));
      });
    });

    describe('mapLeft', () => {
      it('is a no-op if Either is a Right', () => {
        const result = E.fromPredicate(
          'hello',
          (greeting) => greeting.length > 0,
          () => 'invalid input',
        ).pipe(E.mapLeft((message) => new SyntaxError(message)));

        expect(result).toMatchObject(rightEither('hello'));
        expectTypeOf(result).toMatchTypeOf<E.Either<SyntaxError, string>>();
      });

      it('maps the value to another value if Either is a Left', () => {
        const result = E.fromPredicate(
          'hello',
          (greeting) => greeting.length > 5,
          () => 'invalid input',
        ).pipe(E.mapLeft((message) => new SyntaxError(message)));

        expect(result).toMatchObject(
          leftEither(new SyntaxError('invalid input')),
        );
        expectTypeOf(result).toMatchTypeOf<E.Either<SyntaxError, string>>();
      });
    });

    describe('mapBoth', () => {
      it('maps both sides of the Either', () => {
        const rightResult = E.fromPredicate(
          'hello',
          (greeting) => greeting.length > 0,
          () => 'invalid input',
        ).pipe(
          E.mapBoth(
            (message) => new SyntaxError(message),
            (greeting) => `${greeting} world`,
          ),
        );

        expect(rightResult).toMatchObject(rightEither('hello world'));
        expectTypeOf(rightResult).toMatchTypeOf<
          E.Either<SyntaxError, string>
        >();

        const leftResult = E.fromPredicate(
          'hello',
          (greeting) => greeting.length > 5,
          () => 'invalid input',
        ).pipe(E.mapBoth((message) => new SyntaxError(message), S.length));

        expect(leftResult).toMatchObject(
          leftEither(new SyntaxError('invalid input')),
        );
        expectTypeOf(leftResult).toMatchTypeOf<E.Either<SyntaxError, number>>();
      });
    });

    describe('flatMap', () => {
      const transformToAnotherOption = compose(
        S.length,
        E.fromPredicate(
          (length) => length >= 5,
          () => new Error('too small'),
        ),
      );

      it('maps the value if Either is a Right and flattens the result to a single Either', () => {
        expect(
          E.right('hello').pipe(E.flatMap(transformToAnotherOption)),
        ).toMatchObject(rightEither(5));
      });

      it('is a no-op if Either is a Left', () => {
        const result = E.left(new SyntaxError('invalid input')).pipe(
          E.flatMap(transformToAnotherOption),
        );

        expect(result).toMatchObject(
          leftEither(new SyntaxError('invalid input')),
        );
        expectTypeOf(result).toMatchTypeOf<
          E.Either<SyntaxError | Error, number>
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

      it('flat maps into a Right if returning value is not nullable', () => {
        expect(
          E.fromNullable(
            profile.address,
            () => new Error('Missing profile address'),
          ).pipe(
            E.flatMapNullable(
              (address) => address.home,
              () => new Error('Missing home address'),
            ),
          ),
        ).toMatchObject(rightEither('21st street'));
      });

      it('flat maps into a Left if returning value is nullable', () => {
        expect(
          E.fromNullable(
            profile.address,
            () => new Error('Missing profile address'),
          ).pipe(
            E.flatMapNullable(
              (address) => address.work,
              () => new Error('Missing work address'),
            ),
          ),
        ).toMatchObject(leftEither(new Error('Missing work address')));
      });
    });

    describe('flatten', () => {
      const transformToAnotherOption = compose(
        S.length,
        E.fromPredicate(
          (length) => length >= 5,
          () => new Error('too small'),
        ),
      );

      it('flattens an Either of an Either into a single Either', () => {
        expect(
          E.right('hello').pipe(E.map(transformToAnotherOption), E.flatten),
        ).toMatchObject(rightEither(5));
      });
    });
  });

  describe('filtering', () => {
    describe('filter', () => {
      it('keeps the Right value if it matches the predicate', () => {
        expect(
          E.right('hello').pipe(
            E.filter(S.isString, () => new Error('value is not string')),
          ),
        ).toMatchObject(rightEither('hello'));
      });

      it('filters the Right value out if it doesn’t match the predicate returning a Left instead', () => {
        const result = E.right('hello').pipe(
          E.filter(N.isNumber, () => new Error('value is not a number')),
        );

        expect(result).toMatchObject(
          leftEither(new Error('value is not a number')),
        );
        expectTypeOf(result).toMatchTypeOf<E.Either<Error, number>>();
      });

      it('is a no-op if Either is a Left', () => {
        const result = E.left('no input').pipe(
          E.filter(S.isString, () => new Error('value is not a string')),
        );

        expect(result).toMatchObject(leftEither('no input'));
        expectTypeOf(result).toMatchTypeOf<E.Either<string | Error, string>>();
      });
    });
  });

  describe('getters', () => {
    describe('match', () => {
      it('returns the result of the onLeft function if Either is a Left', () => {
        expect(
          E.left('no input').pipe(
            E.match(
              (error) => `missing greeting: ${error}`,
              (greeting: string) => `${greeting} world`,
            ),
          ),
        ).toBe('missing greeting: no input');
      });

      it('passes the Either value if it’s a Right into the onRight function and returns its result', () => {
        expect(
          E.right('hello').pipe(
            E.match(
              (error) => `missing greeting: ${error}`,
              (greeting) => `${greeting} world`,
            ),
          ),
        ).toBe('hello world');
      });
    });

    describe('merge', () => {
      it('consolidates both paths into a single output', () => {
        const result = E.right('hello').pipe(
          E.filter(S.isString, () => new Error('not a string')),
          E.merge,
        );

        expect(result).toBe('hello');
        expectTypeOf(result).toMatchTypeOf<string | Error>();
      });
    });

    describe('getOrElse', () => {
      it('unwraps the Either value if it’s a Right', () => {
        expect(
          E.right('hello').pipe(E.getOrElse(() => 'no one to greet')),
        ).toBe('hello');
      });

      it('returns the result of the onLeft function if Either is a Left', () => {
        expect(
          E.left('no input').pipe(E.getOrElse(() => 'no one to greet')),
        ).toBe('no one to greet');
      });
    });

    describe('unwrap', () => {
      it('unwraps the Either value if it’s a Right', () => {
        expect(E.right('hello').pipe(E.unwrap)).toBe('hello');
      });

      it('throws an exception if Either is a Left', () => {
        expect(() => E.left('no input').pipe(E.unwrap)).toThrow(
          new Error('Failed to unwrap Either value'),
        );
      });
    });

    describe('expect', () => {
      class NotFoundException extends Error {}

      it('unwraps the Either value if it’s a Right', () => {
        expect(
          E.right('hello').pipe(
            E.expect(() => new NotFoundException('Greeting not found')),
          ),
        ).toBe('hello');
      });

      it('throws an exception if Either is a Left', () => {
        expect(() =>
          E.left('no input').pipe(
            E.expect(() => new NotFoundException('Greeting not found')),
          ),
        ).toThrow(new NotFoundException('Greeting not found'));
      });
    });
  });
});
