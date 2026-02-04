import {
  always,
  alwaysFalse,
  alwaysNull,
  alwaysTrue,
  alwaysUndefined,
  alwaysVoid,
  coerce,
  compose,
  identity,
  ignore,
  invoke,
  lazyCompute,
  noop,
  pipe,
} from './functions';

describe('invoke', () => {
  it('executes function and returns value', () => {
    const result = invoke(() => 42);

    expectTypeOf(result).toEqualTypeOf<number>();

    expect(result).toBe(42);
  });
});

describe('lazyCompute', () => {
  it('computes value on first access', () => {
    let callCount = 0;
    const computation = lazyCompute(() => {
      callCount++;
      return 'computed';
    });

    expectTypeOf(computation).toEqualTypeOf<{ value: string }>();

    expect(callCount).toBe(0);
    expect(computation.value).toBe('computed');
    expect(callCount).toBe(1);
  });

  it('caches value on subsequent accesses', () => {
    let callCount = 0;
    const computation = lazyCompute(() => {
      callCount++;
      return 42;
    });

    expectTypeOf(computation).toEqualTypeOf<{ value: number }>();

    expect(computation.value).toBe(42);
    expect(computation.value).toBe(42);
    expect(computation.value).toBe(42);
    expect(callCount).toBe(1);
  });
});

describe('noop', () => {
  it('returns void/undefined', () => {
    const result = noop();

    expectTypeOf(result).toEqualTypeOf<void>();

    expect(result).toBeUndefined();
  });

  it('can be called without errors', () => {
    expect(() => noop()).not.toThrow();
  });
});

describe('always', () => {
  it('returns provided value', () => {
    const alwaysTen = always(10);

    expectTypeOf(alwaysTen).toEqualTypeOf<() => number>();

    expect(alwaysTen()).toBe(10);
    expect(alwaysTen()).toBe(10);
  });
});

describe('identity', () => {
  it('returns provided value unchanged', () => {
    const result = identity(42);

    expectTypeOf(result).toEqualTypeOf<number>();

    expect(result).toBe(42);
  });
});

describe('alwaysNull', () => {
  it('returns null', () => {
    const result = alwaysNull();

    expectTypeOf(result).toEqualTypeOf<null>();

    expect(result).toBeNull();
  });
});

describe('alwaysUndefined', () => {
  it('returns undefined', () => {
    const result = alwaysUndefined();

    expectTypeOf(result).toEqualTypeOf<undefined>();

    expect(result).toBeUndefined();
  });
});

describe('alwaysVoid', () => {
  it('returns void', () => {
    const result = alwaysVoid();

    expectTypeOf(result).toEqualTypeOf<void>();

    expect(result).toBeUndefined();
  });
});

describe('ignore', () => {
  it('returns never', () => {
    const result = ignore();

    expectTypeOf(result).toEqualTypeOf<never>();

    expect(result).toBeUndefined();
  });
});

describe('alwaysTrue', () => {
  it('returns true', () => {
    const result = alwaysTrue();

    expectTypeOf(result).toEqualTypeOf<true>();

    expect(result).toBeTrue();
  });
});

describe('alwaysFalse', () => {
  it('returns false', () => {
    const result = alwaysFalse();

    expectTypeOf(result).toEqualTypeOf<false>();

    expect(result).toBeFalse();
  });
});

describe('coerce', () => {
  it('returns value coerced to type', () => {
    const error = new SyntaxError('test');
    const coerced = coerce<{ message: string }>(error);

    expectTypeOf(coerced).toEqualTypeOf<{ message: string }>();

    expect(coerced).toBe(error);
  });
});

describe('compose', () => {
  it('composes functions correctly', () => {
    function increment(x: number) {
      return x + 1;
    }

    function double(x: number) {
      return x * 2;
    }

    function stringify(x: number) {
      return String(x);
    }

    function prefix(x: string) {
      return `value: ${x}`;
    }

    const composed = compose(increment, double, stringify, prefix);

    expectTypeOf(composed).toEqualTypeOf<(x: number) => string>();

    expect(composed(5)).toBe('value: 12');
  });
});

describe('pipe', () => {
  it('pipes value through functions', () => {
    function increment(x: number) {
      return x + 1;
    }

    function double(x: number) {
      return x * 2;
    }

    function stringify(x: number) {
      return String(x);
    }

    function prefix(x: string) {
      return `value: ${x}`;
    }

    const result = pipe(5, increment, double, stringify, prefix);

    expectTypeOf(result).toEqualTypeOf<string>();

    expect(result).toBe('value: 12');
  });
});
