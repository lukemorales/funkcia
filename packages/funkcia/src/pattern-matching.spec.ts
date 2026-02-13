import { TaggedError } from './exceptions';
import { corrupt, exhaustive } from './pattern-matching';

describe('corrupt', () => {
  it('throws for impossible value', () => {
    expect(() =>
      corrupt('corrupt' as never),
    ).toThrowErrorMatchingInlineSnapshot(
      `[TypeError: Internal Error: encountered impossible value "corrupt"]`,
    );
  });
});

describe('exhaustive', () => {
  describe('string unions', () => {
    type State = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

    const exec = (state: State, withFallback = false) =>
      exhaustive(state, {
        IDLE: (value) => {
          expectTypeOf(value).toEqualTypeOf<'IDLE'>();
          return value.toLowerCase();
        },
        LOADING: (value) => {
          expectTypeOf(value).toEqualTypeOf<'LOADING'>();
          return value.toLowerCase();
        },
        SUCCESS: (value) => {
          expectTypeOf(value).toEqualTypeOf<'SUCCESS'>();
          return value.toLowerCase();
        },
        ERROR: (value) => {
          expectTypeOf(value).toEqualTypeOf<'ERROR'>();
          return value.toLowerCase();
        },
        ...(withFallback ? { _: () => 'fallback' } : {}),
      });

    it.each<State>(['IDLE', 'LOADING', 'SUCCESS', 'ERROR'])(
      'returns mapped value for %s',
      (value) => {
        expect(exec(value)).toBe(value.toLowerCase());
      },
    );

    it('throws for unmatched value without fallback', () => {
      expect(() => exec('UNKNOWN' as never)).toThrow(TypeError);
    });

    it('uses fallback for unmatched value', () => {
      expect(exec('UNKNOWN' as never, true)).toBe('fallback');
    });

    it('keeps compile-time exhaustiveness', () => {
      function withMissingCase(state: State) {
        // @ts-expect-error missing required cases
        return exhaustive(state, {
          IDLE: (value) => value.toLowerCase(),
        });
      }

      expectTypeOf(withMissingCase).toEqualTypeOf<(state: State) => unknown>();
    });
  });

  describe('booleans', () => {
    const exec = (value: boolean, withFallback = false) =>
      exhaustive(value, {
        true: (input) => {
          expectTypeOf(input).toEqualTypeOf<true>();
          return input.toString();
        },
        false: (input) => {
          expectTypeOf(input).toEqualTypeOf<false>();
          return input.toString();
        },
        ...(withFallback ? { _: () => 'fallback' } : {}),
      });

    it('matches both boolean branches', () => {
      expect(exec(true)).toBe('true');
      expect(exec(false)).toBe('false');
    });

    it('throws for unmatched value without fallback', () => {
      expect(() => exec('UNKNOWN' as never)).toThrow(TypeError);
    });

    it('uses fallback for unmatched value', () => {
      expect(exec('UNKNOWN' as never, true)).toBe('fallback');
    });
  });

  describe('tagged unions with explicit tag', () => {
    type Union =
      | { state: 'IDLE' }
      | { state: 'LOADING' }
      | { state: 'SUCCESS'; data: string }
      | { state: 'ERROR'; error: string };

    const exec = (value: Union, withFallback = false) =>
      exhaustive(value, 'state', {
        IDLE: (input) => {
          expectTypeOf(input).toEqualTypeOf<{ state: 'IDLE' }>();
          return input.state.toLowerCase();
        },
        LOADING: (input) => {
          expectTypeOf(input).toEqualTypeOf<{ state: 'LOADING' }>();
          return input.state.toLowerCase();
        },
        SUCCESS: (input) => {
          expectTypeOf(input).toEqualTypeOf<{
            state: 'SUCCESS';
            data: string;
          }>();
          return input.state.toLowerCase();
        },
        ERROR: (input) => {
          expectTypeOf(input).toEqualTypeOf<{
            state: 'ERROR';
            error: string;
          }>();
          return input.state.toLowerCase();
        },
        ...(withFallback ? { _: () => 'fallback' } : {}),
      });

    it.each<Union>([
      { state: 'IDLE' },
      { state: 'LOADING' },
      { state: 'SUCCESS', data: 'ok' },
      { state: 'ERROR', error: 'err' },
    ])('matches %s', (value) => {
      expect(exec(value)).toBe(value.state.toLowerCase());
    });

    it('throws for unmatched value without fallback', () => {
      expect(() => exec({ state: 'UNKNOWN' } as never)).toThrow(TypeError);
    });

    it('uses fallback for unmatched value', () => {
      expect(exec({ state: 'UNKNOWN' } as never, true)).toBe('fallback');
    });
  });

  describe('objects with _tag by default', () => {
    class UserNotFoundError extends TaggedError('UserNotFoundError') {
      readonly userId: string;

      constructor(userId: string) {
        super(`User ${userId} was not found`);
        this.userId = userId;
      }
    }

    class InvalidCouponError extends TaggedError('InvalidCouponError') {
      readonly code: string;

      constructor(code: string) {
        super(`Coupon ${code} is invalid`);
        this.code = code;
      }
    }

    class PaymentGatewayError extends TaggedError('PaymentGatewayError') {
      readonly gateway: 'stripe' | 'polar';

      constructor(gateway: 'stripe' | 'polar', cause: unknown) {
        super(`Payment gateway failed for ${gateway}`, { cause });
        this.gateway = gateway;
      }
    }

    type CheckoutError =
      | UserNotFoundError
      | InvalidCouponError
      | PaymentGatewayError;

    const exec = (error: CheckoutError, withFallback = false) =>
      exhaustive(error, {
        UserNotFoundError: (value) => {
          expectTypeOf(value).toEqualTypeOf<UserNotFoundError>();
          return `not-found:${value.userId}`;
        },
        InvalidCouponError: (value) => {
          expectTypeOf(value).toEqualTypeOf<InvalidCouponError>();
          return `invalid-coupon:${value.code}`;
        },
        PaymentGatewayError: (value) => {
          expectTypeOf(value).toEqualTypeOf<PaymentGatewayError>();
          return `gateway:${value.gateway}`;
        },
        ...(withFallback ? { _: () => 'fallback' } : {}),
      });

    it('narrows each error branch by _tag', () => {
      expect(exec(new UserNotFoundError('u_1'))).toBe('not-found:u_1');
      expect(exec(new InvalidCouponError('PROMO10'))).toBe(
        'invalid-coupon:PROMO10',
      );
      expect(exec(new PaymentGatewayError('stripe', new Error('x')))).toBe(
        'gateway:stripe',
      );
    });

    it('enforces exhaustive cases at compile-time', () => {
      function withMissingCase(error: CheckoutError) {
        // @ts-expect-error missing PaymentGatewayError case
        return exhaustive(error, {
          UserNotFoundError: (value) => value.userId,
          InvalidCouponError: (value) => value.code,
        });
      }

      expectTypeOf(withMissingCase).toEqualTypeOf<
        (error: CheckoutError) => unknown
      >();
    });

    it('throws when invalid _tag is provided without fallback', () => {
      expect(() => exec({ _tag: 'UnknownError' } as never)).toThrowError(
        TypeError,
      );
    });

    it('uses fallback when invalid _tag is provided', () => {
      expect(exec({ _tag: 'UnknownError' } as never, true)).toBe('fallback');
    });
  });
});

describe('exhaustive.tag', () => {
  type Union =
    | { kind: 'circle'; radius: number }
    | { kind: 'square'; size: number }
    | { kind: 'rectangle'; width: number; height: number };

  const area = (shape: Union, withFallback = false) =>
    exhaustive.tag(shape, 'kind', {
      circle: (value) => Math.PI * value.radius ** 2,
      square: (value) => value.size ** 2,
      rectangle: (value) => value.width * value.height,
      ...(withFallback ? { _: () => -1 } : {}),
    });

  it('matches each tagged case', () => {
    expect(area({ kind: 'circle', radius: 2 })).toBeCloseTo(12.566370614359172);
    expect(area({ kind: 'square', size: 3 })).toBe(9);
    expect(area({ kind: 'rectangle', width: 4, height: 2 })).toBe(8);
  });

  it('throws for unmatched value without fallback', () => {
    expect(() => area({ kind: 'triangle' } as never)).toThrow(TypeError);
  });

  it('uses fallback for unmatched value', () => {
    expect(area({ kind: 'triangle' } as never, true)).toBe(-1);
  });
});
