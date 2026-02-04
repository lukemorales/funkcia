import { Brand } from './brand';
import { TaggedError } from './exceptions';
import { Result } from './result';

describe('Brand', () => {
  type UserId = Brand<string, 'UserId'>;
  type PositiveInt = Brand<number, 'PositiveInt'>;

  describe('of', () => {
    describe('constructor variant', () => {
      it('returns a function that accepts unbranded value and outputs a branded value', () => {
        const UserIdBrand = Brand.of<UserId>();

        expectTypeOf(UserIdBrand).toEqualTypeOf<Brand.Constructor<UserId>>();

        const userId = UserIdBrand('user-123');

        expectTypeOf(userId).toEqualTypeOf<UserId>();

        expect(userId).toBe('user-123');
      });

      describe('is', () => {
        it('always returns true', () => {
          const UserIdBrand = Brand.of<UserId>();

          expectTypeOf(UserIdBrand.is).toEqualTypeOf<
            (value: string) => value is UserId
          >();

          expect(UserIdBrand.is('user-123')).toBeTrue();
          expect(UserIdBrand.is('any-string')).toBeTrue();
          expect(UserIdBrand.is('')).toBeTrue();
        });

        it('acts as type guard', () => {
          const UserIdBrand = Brand.of<UserId>();

          const value: string = 'user-123';

          if (UserIdBrand.is(value)) {
            expectTypeOf(value).toEqualTypeOf<UserId>();
          }
        });
      });
    });

    describe('parser variant', () => {
      class InvalidPositiveIntError extends TaggedError(
        'InvalidPositiveIntError',
      ) {
        constructor(public value: number) {
          super(`Invalid positive integer: ${value}`);
        }
      }

      const PositiveIntBrand = Brand.of<PositiveInt, InvalidPositiveIntError>(
        (value: number) => Number.isInteger(value) && value > 0,
        (value) => new InvalidPositiveIntError(value),
      );

      it('returns a function that accepts unbranded value and outputs a branded value', () => {
        expectTypeOf(PositiveIntBrand).toEqualTypeOf<
          Brand.Parser<PositiveInt, InvalidPositiveIntError>
        >();

        const positiveInt = PositiveIntBrand(1);

        expectTypeOf(positiveInt).toEqualTypeOf<PositiveInt>();
        expect(positiveInt).toBe(1);
      });

      describe('parse', () => {
        it('throws error when predicate fails', () => {
          expect(() => PositiveIntBrand.parse(-1)).toThrow(
            InvalidPositiveIntError,
          );
        });

        it('returns branded value when predicate passes', () => {
          const positiveInt = PositiveIntBrand.parse(1);

          expectTypeOf(positiveInt).toEqualTypeOf<PositiveInt>();
          expect(positiveInt).toBe(1);
        });
      });

      describe('safeParse', () => {
        it('returns Result.Ok when predicate passes', () => {
          const result = PositiveIntBrand.safeParse(1);

          expectTypeOf(result).toEqualTypeOf<
            Result<PositiveInt, InvalidPositiveIntError>
          >();
          expect(result.isOk()).toBeTrue();
          expect(result.unwrap()).toBe(1);
        });

        it('returns Result.Error when predicate fails', () => {
          const result = PositiveIntBrand.safeParse(-1);

          expectTypeOf(result).toEqualTypeOf<
            Result<PositiveInt, InvalidPositiveIntError>
          >();
          expect(result.isError()).toBeTrue();
          expect(result.unwrapError()).toBeInstanceOf(InvalidPositiveIntError);
        });
      });

      describe('is', () => {
        it('returns true when predicate passes', () => {
          expect(PositiveIntBrand.is(1)).toBeTrue();
        });

        it('returns false when predicate fails', () => {
          expect(PositiveIntBrand.is(-1)).toBeFalse();
        });

        it('acts as type guard', () => {
          const value: PositiveInt = PositiveIntBrand(1);

          if (PositiveIntBrand.is(value)) {
            expectTypeOf(value).toEqualTypeOf<PositiveInt>();
          }
        });
      });
    });
  });

  describe('unbrand', () => {
    it('removes brand from branded value', () => {
      const UserId = Brand.of<UserId>();
      const userId = UserId('user-123');

      const unbranded = Brand.unbrand(userId);

      expectTypeOf(unbranded).toEqualTypeOf<string>();
      expect(unbranded).toBe('user-123');
    });
  });
});
