import {
  FailedPredicateError,
  isTaggedError,
  NoValueError,
  Panic,
  panic,
  TaggedError,
  UnhandledException,
} from './exceptions';

describe('TaggedError', () => {
  it('creates error class with correct tag', () => {
    const CustomError = TaggedError('CustomError');
    const error = new CustomError('test message');

    expect(error._tag).toBe('CustomError');
    expect(error.name).toBe('CustomError');
  });

  it('creates error with message', () => {
    const CustomError = TaggedError('CustomError');
    const error = new CustomError('test message');

    expect(error.message).toBe('test message');
  });

  it('creates error without message', () => {
    const CustomError = TaggedError('CustomError');
    const error = new CustomError();

    expect(error.message).toBe('');
  });

  it('creates error with cause', () => {
    const CustomError = TaggedError('CustomError');
    const cause = new Error('original error');
    const error = new CustomError('wrapped error', { cause });

    expect(error.cause).toBe(cause);
  });

  it('formats stack trace with cause', () => {
    const CustomError = TaggedError('CustomError');
    const cause = new Error('original error');
    const error = new CustomError('wrapped error', { cause });

    expect(error.stack).toContain('wrapped error');
    expect(error.stack).toContain('Caused by:');
    expect(error.stack).toContain('original error');
  });

  it('static is method works as type guard', () => {
    const CustomError = TaggedError('CustomError');
    const error = new CustomError('test message');
    const regularError = new Error('regular error');

    expect(CustomError.is(error)).toBeTrue();
    expect(CustomError.is(regularError)).toBeFalse();
  });

  it('static is method returns false for different TaggedError types', () => {
    const CustomError = TaggedError('CustomError');
    const OtherError = TaggedError('OtherError');
    const error = new OtherError('test message');

    expect(CustomError.is(error)).toBeFalse();
    expect(OtherError.is(error)).toBeTrue();
  });

  it('static is method returns false for null and undefined', () => {
    const CustomError = TaggedError('CustomError');

    expect(CustomError.is(null)).toBeFalse();
    expect(CustomError.is(undefined)).toBeFalse();
  });

  it('is instance of TypeError', () => {
    const CustomError = TaggedError('CustomError');
    const error = new CustomError('test message');

    expect(error).toBeInstanceOf(TypeError);
  });
});

describe('isTaggedError', () => {
  it('returns true for TaggedError instances', () => {
    const CustomError = TaggedError('CustomError');
    const error = new CustomError('test message');

    expect(isTaggedError(error)).toBeTrue();
  });

  it('returns false for regular errors', () => {
    expect(isTaggedError(new Error('regular error'))).toBeFalse();
  });

  it('returns false for null and undefined', () => {
    expect(isTaggedError(null)).toBeFalse();
    expect(isTaggedError(undefined)).toBeFalse();
  });

  it('returns false for non-error values', () => {
    expect(isTaggedError('string')).toBeFalse();
    expect(isTaggedError(123)).toBeFalse();
    expect(isTaggedError({})).toBeFalse();
    expect(isTaggedError([])).toBeFalse();
  });
});

describe('UnhandledException', () => {
  it('creates error with correct tag', () => {
    const error = new UnhandledException('test message');

    expect(error._tag).toBe('UnhandledException');
    expect(error.name).toBe('UnhandledException');
  });

  it('static is method works', () => {
    const error = new UnhandledException('test message');
    const OtherError = TaggedError('OtherError');
    const otherError = new OtherError('test');

    expect(UnhandledException.is(error)).toBeTrue();
    expect(UnhandledException.is(otherError)).toBeFalse();
  });
});

describe('NoValueError', () => {
  it('creates error with correct tag', () => {
    const error = new NoValueError('test message');

    expect(error._tag).toBe('NoValueError');
    expect(error.name).toBe('NoValueError');
  });

  it('static is method works', () => {
    const error = new NoValueError('test message');
    const OtherError = TaggedError('OtherError');
    const otherError = new OtherError('test');

    expect(NoValueError.is(error)).toBeTrue();
    expect(NoValueError.is(otherError)).toBeFalse();
  });
});

describe('Panic', () => {
  it('creates error with correct tag', () => {
    const error = new Panic('test message');

    expect(error._tag).toBe('Panic');
    expect(error.name).toBe('Panic');
  });

  it('static is method works', () => {
    const error = new Panic('test message');
    const OtherError = TaggedError('OtherError');
    const otherError = new OtherError('test');

    expect(Panic.is(error)).toBeTrue();
    expect(Panic.is(otherError)).toBeFalse();
  });
});

describe('FailedPredicateError', () => {
  it('creates error with correct tag and value', () => {
    const value = { id: 1, name: 'test' };
    const error = new FailedPredicateError(value);

    expect(error._tag).toBe('FailedPredicateError');
    expect(error.name).toBe('FailedPredicateError');
    expect(error.value).toBe(value);
    expect(error.message).toBe('Predicate not fulfilled for Result value');
  });

  it('static is method works', () => {
    const value = { id: 1 };
    const error = new FailedPredicateError(value);
    const OtherError = TaggedError('OtherError');
    const otherError = new OtherError('test');

    expect(FailedPredicateError.is(error)).toBeTrue();
    expect(FailedPredicateError.is(otherError)).toBeFalse();
  });
});

describe('panic', () => {
  it('throws a Panic error', () => {
    expect(() => panic('test message')).toThrow(Panic);
  });

  it('throws with correct message', () => {
    expect(() => panic('test message')).toThrow('test message');
  });

  it('throws with cause', () => {
    const cause = new Error('original error');

    try {
      panic('test message', cause);
    } catch (error) {
      expect(error).toBeInstanceOf(Panic);
      expect(error.cause).toBe(cause);
    }
  });

  it('never returns', () => {
    const fn = (): never => panic('test');
    expectTypeOf(fn).toEqualTypeOf<() => never>();
  });
});
