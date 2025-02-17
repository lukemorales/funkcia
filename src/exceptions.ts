export abstract class TaggedError extends Error {
  abstract readonly _tag: string;
}

// -----------------------------
// ---MARK: COMMON EXCEPTIONS---
// -----------------------------

export class UnwrapError extends TypeError {
  readonly _tag = 'UnwrapError';

  static is(error: unknown): error is UnwrapError {
    return error instanceof UnwrapError;
  }

  constructor(type: 'Option' | 'Result' | 'ResultError') {
    let message: string;

    switch (type) {
      case 'Option':
        message = 'called "Option.unwrap()" on an "Option.None"';
        break;
      case 'Result':
        message = 'called "Result.unwrap()" on a "Result.Error"';
        break;
      case 'ResultError':
        message = 'called "Result.unwrapError()" on a "Result.Ok"';
        break;
      default: {
        const _: never = type;
        throw new TypeError(`Invalid value passed to UnwrapError: "${_}"`);
      }
    }

    super(message);
  }
}

// ---MARK: RESULT EXCEPTIONS---

export class UnknownError extends TaggedError {
  readonly _tag = 'UnknownError';

  static is(error: unknown): error is UnknownError {
    return error instanceof UnknownError;
  }
}

export class NoValueError extends TaggedError {
  readonly _tag = 'NoValueError';

  static is(error: unknown): error is NoValueError {
    return error instanceof NoValueError;
  }
}

export class FailedPredicateError<T> extends TaggedError {
  readonly _tag = 'FailedPredicateError';

  static is(error: unknown): error is FailedPredicateError<unknown> {
    return error instanceof FailedPredicateError;
  }

  constructor(readonly value: T) {
    super('Predicate not fulfilled for Result value');
  }
}
