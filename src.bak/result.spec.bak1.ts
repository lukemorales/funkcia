/* eslint-disable max-classes-per-file */

import { Result } from './result';
import { NullableValueException } from './result.exceptions';

describe('Result', () => {
  describe.only('conversions', () => {
    describe.only('fromNullable', () => {
      it('creates an Ok when value is not nullable', () => {
        const result = Result.fromNullable('hello world');

        expect(result.isOk()).toBeTrue();

        const errorCallback = vi.fn((value) => expect(value).toBeUndefined());

        result.match(errorCallback, (value) =>
          expect(value).toEqual('hello world'),
        );

        expect(errorCallback).not.toHaveBeenCalled();
      });

      const eachCase = it.each([undefined, null]);

      eachCase(
        'creates an Error with a default exception when value is "%s"',
        (nullable) => {
          const okCallback = vi.fn((value) => expect(value).toBeUndefined());

          const result = Result.fromNullable(nullable);

          expect(result.isError()).toBeTrue();

          result.match(
            (error) => expect(error).toBeInstanceOf(NullableValueException),
            okCallback,
          );

          expect(okCallback).not.toHaveBeenCalled();
        },
      );

      eachCase(
        'creates an Error with a custom exception when value is "%s"',
        (nullable) => {
          const okCallback = vi.fn((value) => expect(value).toBeUndefined());

          const result = Result.fromNullable(nullable, () => 'Nullable value');

          expect(result.isError()).toBeTrue();

          result.match(
            (error) => expect(error).toBe('Nullable value'),
            okCallback,
          );

          expect(okCallback).not.toHaveBeenCalled();
        },
      );
    });

    // describe('fromFalsy', () => {
    //   describe('data-first', () => {
    //     it('creates an Ok when value is not nullable', () => {
    //       expect(
    //         Result.fromFalsy('hello world', () => new Error('Nullable value')),
    //       ).toMatchResult(Result.ok('hello world'));
    //     });

    //     const eachCase = it.each([null, undefined, 0, 0n, NaN, false, '']);

    //     eachCase('creates an Error when value is %s', (falsy) => {
    //       expect(
    //         Result.fromFalsy(falsy, () => new Error('Nullable value')),
    //       ).toMatchResult(Result.error(new Error('Nullable value')));
    //     });
    //   });

    //   describe('data-last', () => {
    //     it('creates an Ok when value is not nullable', () => {
    //       expect(
    //         pipe(
    //           'hello world',
    //           Result.fromFalsy(() => new Error('Nullable value')),
    //         ),
    //       ).toMatchResult(Result.ok('hello world'));
    //     });

    //     const eachCase = it.each([null, undefined, 0, 0n, NaN, false, '']);

    //     eachCase('creates an Error when value is %s', (falsy) => {
    //       expect(
    //         pipe(
    //           falsy,
    //           Result.fromFalsy(() => new Error('Nullable value')),
    //         ),
    //       ).toMatchResult(Result.error(new Error('Nullable value')));
    //     });
    //   });
    // });

    // describe('fromPredicate', () => {
    //   type Greeting = string & { greeting: true };

    //   describe('data-first', () => {
    //     it('creates an Ok when predicate is satisfied', () => {
    //       expect(
    //         Result.fromPredicate(
    //           'hello world',
    //           (value): value is Greeting => value.includes('hello'),
    //           () => new Error('Empty option'),
    //         ),
    //       ).toMatchResult(Result.ok('hello world'));
    //     });

    //     it('creates an Error when predicate is not satisfied', () => {
    //       expect(
    //         Result.fromPredicate(
    //           'the world',
    //           (value): value is Greeting => value.includes('hello'),
    //           () => new Error('Empty option'),
    //         ),
    //       ).toMatchResult(Result.error(new Error('Empty option')));
    //     });
    //   });

    //   describe('data-last', () => {
    //     it('creates an Ok when predicate is satisfied', () => {
    //       expect(
    //         pipe(
    //           'hello world',
    //           Result.fromPredicate(
    //             (value): value is Greeting => value.includes('hello'),
    //             () => new Error('Empty option'),
    //           ),
    //         ),
    //       ).toMatchResult(Result.ok('hello world'));
    //     });

    //     it('creates an Error when predicate is not satisfied', () => {
    //       expect(
    //         pipe(
    //           'the world',
    //           Result.fromPredicate(
    //             (value): value is Greeting => value.includes('hello'),
    //             () => new Error('Empty option'),
    //           ),
    //         ),
    //       ).toMatchResult(Result.error(new Error('Empty option')));
    //     });
    //   });
    // });

    // describe('fromThrowable', () => {
    //   it('creates an Ok when function succeeds', () => {
    //     expect(
    //       Result.fromThrowable(
    //         () => JSON.parse('{ "enabled": true }'),
    //         () => new Error('Failed to parse JSON'),
    //       ),
    //     ).toMatchResult(Result.ok({ enabled: true }));
    //   });

    //   it('creates an Error function throws an exception', () => {
    //     expect(
    //       Result.fromThrowable(
    //         () => JSON.parse('{{ }} '),
    //         () => new Error('Failed to parse JSON'),
    //       ),
    //     ).toMatchResult(Result.error(new Error('Failed to parse JSON')));
    //   });
    // });
  });

  // describe('lifting', () => {
  //   describe('liftNullable', () => {
  //     class InvalidDivisor extends Error {}

  //     function divide(dividend: number, divisor: number): number | null {
  //       return divisor === 0 ? null : dividend / divisor;
  //     }

  //     const safeDivide = Result.liftNullable(
  //       divide,
  //       () => new InvalidDivisor('Divisor can’t be zero'),
  //     );

  //     it('creates an Ok when the lifted function returns a non-nullable value', () => {
  //       expect(safeDivide(10, 2)).toMatchResult(Result.ok(5));
  //     });

  //     it('creates an Error when the lifted function returns null or undefined', () => {
  //       expect(safeDivide(2, 0)).toMatchResult(
  //         Result.error(new InvalidDivisor('Divisor can’t be zero')),
  //       );
  //     });
  //   });

  //   describe('liftThrowable', () => {
  //     class ParsingFailure extends Error {}

  //     const safeJsonParse = Result.liftThrowable(
  //       JSON.parse,
  //       () => new ParsingFailure('Failed to parse JSON'),
  //     );

  //     it('creates an Ok when the lifted function succeeds', () => {
  //       expect(safeJsonParse('{ "enabled": true }')).toMatchResult(
  //         Result.ok({ enabled: true }),
  //       );
  //     });

  //     it('creates an Error when the lifted function throws an exception', () => {
  //       expect(safeJsonParse('{{ }}')).toMatchResult(
  //         Result.error(new ParsingFailure('Failed to parse JSON')),
  //       );
  //     });
  //   });
  // });

  // describe('replacements', () => {
  //   describe('fallback', () => {
  //     it('does not replace the original Result when it’s an Ok', () => {
  //       expect(
  //         Result.ok('a').pipe(Result.fallback(() => Result.ok('b'))),
  //       ).toMatchResult(Result.ok('a'));

  //       expect(
  //         Result.ok('a').pipe(Result.fallback(() => Result.error('b'))),
  //       ).toMatchResult(Result.ok('a'));
  //     });

  //     it('replaces the original Result with the provided fallback when it’s an Error', () => {
  //       expect(
  //         Result.error('a').pipe(Result.fallback(() => Result.ok('b'))),
  //       ).toMatchResult(Result.ok('b'));

  //       expect(
  //         Result.error('a').pipe(Result.fallback(() => Result.error('b'))),
  //       ).toMatchResult(Result.error('b'));
  //     });
  //   });
  // });

  // describe('transforming', () => {
  //   describe('map', () => {
  //     it('maps the value to another value if Result is an Ok', () => {
  //       expect(
  //         Result.ok('hello').pipe(
  //           Result.map((greeting) => `${greeting} world`),
  //         ),
  //       ).toMatchResult(Result.ok('hello world'));
  //     });

  //     it('is a no-op if Result is an Error', () => {
  //       expect(
  //         Result.error('no one to greet').pipe(
  //           Result.map((greeting: string) => `${greeting} world`),
  //         ),
  //       ).toMatchResult(Result.error('no one to greet'));
  //     });
  //   });

  //   describe('mapError', () => {
  //     it('is a no-op if Result is an Ok', () => {
  //       const result = Result.fromPredicate(
  //         'hello',
  //         (greeting) => greeting.length > 0,
  //         () => 'invalid input',
  //       ).pipe(Result.mapError((message) => new SyntaxError(message)));

  //       expect(result).toMatchResult(Result.ok('hello'));
  //       expectTypeOf(result).toMatchTypeOf<R.Result<SyntaxError, string>>();
  //     });

  //     it('maps the value to another value if Result is an Error', () => {
  //       const result = Result.fromPredicate(
  //         'hello',
  //         (greeting) => greeting.length > 5,
  //         () => 'invalid input',
  //       ).pipe(Result.mapError((message) => new SyntaxError(message)));

  //       expect(result).toMatchResult(
  //         Result.error(new SyntaxError('invalid input')),
  //       );
  //       expectTypeOf(result).toMatchTypeOf<R.Result<SyntaxError, string>>();
  //     });
  //   });

  //   describe('flatMap', () => {
  //     const transformToAnotherOption = flow(
  //       S.length,
  //       Result.fromPredicate(
  //         (length) => length >= 5,
  //         () => new Error('too small'),
  //       ),
  //     );

  //     it('maps the value if Result is an Ok and flattens the result to a single Result', () => {
  //       expect(
  //         Result.ok('hello').pipe(Result.flatMap(transformToAnotherOption)),
  //       ).toMatchResult(Result.ok(5));
  //     });

  //     it('is a no-op if Result is an Error', () => {
  //       const result = Result.error(new SyntaxError('invalid input')).pipe(
  //         Result.flatMap(transformToAnotherOption),
  //       );

  //       expect(result).toMatchResult(
  //         Result.error(new SyntaxError('invalid input')),
  //       );
  //       expectTypeOf(result).toMatchTypeOf<
  //         R.Result<SyntaxError | Error, number>
  //       >();
  //     });
  //   });

  //   describe('flatMapNullable', () => {
  //     interface Profile {
  //       address?: {
  //         home: string | null;
  //         work: string | null;
  //       };
  //     }

  //     const profile: Profile = {
  //       address: {
  //         home: '21st street',
  //         work: null,
  //       },
  //     };

  //     it('flat maps into an Ok if returning value is not nullable', () => {
  //       expect(
  //         Result.fromNullable(
  //           profile.address,
  //           () => new Error('Missing profile address'),
  //         ).pipe(
  //           Result.flatMapNullable(
  //             (address) => address.home,
  //             () => new Error('Missing home address'),
  //           ),
  //         ),
  //       ).toMatchResult(Result.ok('21st street'));
  //     });

  //     it('flat maps into an Error if returning value is nullable', () => {
  //       expect(
  //         Result.fromNullable(
  //           profile.address,
  //           () => new Error('Missing profile address'),
  //         ).pipe(
  //           Result.flatMapNullable(
  //             (address) => address.work,
  //             () => new Error('Missing work address'),
  //           ),
  //         ),
  //       ).toMatchResult(Result.error(new Error('Missing work address')));
  //     });
  //   });

  //   describe('flatten', () => {
  //     const transformToAnotherOption = flow(
  //       S.length,
  //       Result.fromPredicate(
  //         (length) => length >= 5,
  //         () => new Error('too small'),
  //       ),
  //     );

  //     it('flattens an Result of an Result into a single Result', () => {
  //       expect(
  //         Result.ok('hello').pipe(
  //           Result.map(transformToAnotherOption),
  //           Result.flatten,
  //         ),
  //       ).toMatchResult(Result.ok(5));
  //     });
  //   });
  // });

  // describe('filtering', () => {
  //   describe('filter', () => {
  //     it('keeps the Ok value if it matches the predicate', () => {
  //       expect(
  //         Result.ok('hello').pipe(
  //           Result.filter(S.isString, () => new Error('value is not string')),
  //         ),
  //       ).toMatchResult(Result.ok('hello'));
  //     });

  //     it('filters the Ok value out if it doesn’t match the predicate returning an Error instead', () => {
  //       const result = Result.ok('hello').pipe(
  //         Result.filter(N.isNumber, () => new Error('value is not a number')),
  //       );

  //       expect(result).toMatchResult(
  //         Result.error(new Error('value is not a number')),
  //       );
  //       expectTypeOf(result).toMatchTypeOf<R.Result<Error, number>>();
  //     });

  //     it('is a no-op if Result is an Error', () => {
  //       const result = Result.error('no input').pipe(
  //         Result.filter(S.isString, () => new Error('value is not a string')),
  //       );

  //       expect(result).toMatchResult(Result.error('no input'));
  //       expectTypeOf(result).toMatchTypeOf<R.Result<string | Error, string>>();
  //     });
  //   });
  // });

  // describe('getters', () => {
  //   describe('match', () => {
  //     it('returns the result of the onErr function if Result is an Error', () => {
  //       expect(
  //         Result.error('no input').pipe(
  //           Result.match(
  //             (error) => `missing greeting: ${error}`,
  //             (greeting: string) => `${greeting} world`,
  //           ),
  //         ),
  //       ).toBe('missing greeting: no input');
  //     });

  //     it('passes the Result value if it’s an Ok into the onOk function and returns its result', () => {
  //       expect(
  //         Result.ok('hello').pipe(
  //           Result.match(
  //             (error) => `missing greeting: ${error}`,
  //             (greeting) => `${greeting} world`,
  //           ),
  //         ),
  //       ).toBe('hello world');
  //     });
  //   });

  //   describe('merge', () => {
  //     it('consolidates both paths into a single output', () => {
  //       const result = Result.ok('hello').pipe(
  //         Result.filter(S.isString, () => new Error('not a string')),
  //         Result.merge,
  //       );

  //       expect(result).toBe('hello');
  //       expectTypeOf(result).toMatchTypeOf<string | Error>();
  //     });
  //   });

  //   describe('getOrElse', () => {
  //     it('unwraps the Result value if it’s an Ok', () => {
  //       expect(
  //         Result.ok('hello').pipe(Result.getOrElse(() => 'no one to greet')),
  //       ).toBe('hello');
  //     });

  //     it('returns the result of the onErr function if Result is an Error', () => {
  //       expect(
  //         Result.error('no input').pipe(
  //           Result.getOrElse(() => 'no one to greet'),
  //         ),
  //       ).toBe('no one to greet');
  //     });
  //   });

  //   describe('unwrap', () => {
  //     it('unwraps the Result value if it’s an Ok', () => {
  //       expect(Result.ok('hello').pipe(Result.unwrap)).toBe('hello');
  //     });

  //     it('throws an exception if Result is an Error', () => {
  //       expect(() => Result.error('no input').pipe(Result.unwrap)).toThrow(
  //         new Error('Failed to unwrap Result value'),
  //       );
  //     });
  //   });

  //   describe('expect', () => {
  //     class NotFoundException extends Error {}

  //     it('unwraps the Result value if it’s an Ok', () => {
  //       expect(
  //         Result.ok('hello').pipe(
  //           Result.expect(() => new NotFoundException('Greeting not found')),
  //         ),
  //       ).toBe('hello');
  //     });

  //     it('throws an exception if Result is an Error', () => {
  //       expect(() =>
  //         Result.error('no input').pipe(
  //           Result.expect(() => new NotFoundException('Greeting not found')),
  //         ),
  //       ).toThrow(new NotFoundException('Greeting not found'));
  //     });
  //   });
  // });
});
