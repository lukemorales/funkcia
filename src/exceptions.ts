export abstract class TaggedError extends Error {
  abstract readonly _tag: string;
}

// -----------------------------
// ---MARK: COMMON EXCEPTIONS---
// -----------------------------

export class UnwrapError extends TypeError {
  constructor(type: 'Option' | 'Result' | 'ResultError') {
    let message: string;

    switch (type) {
      case 'Option':
        message = 'called "Option.unwrap()" on a "None" value';
        break;
      case 'Result':
        message = 'called "Result.unwrap()" on an "Error" value';
        break;
      case 'ResultError':
        message = 'called "Result.unwrapError()" on an "Ok" value';
        break;
      default: {
        const _: never = type;
        throw new Error(`invalid value passed to UnwrapError: "${_}"`);
      }
    }

    super(message);
  }
}

// ---MARK: RESULT EXCEPTIONS---

export class UnknownError extends TaggedError {
  readonly _tag = 'UnknownError';

  constructor(override readonly cause: unknown) {
    let message: string | undefined;

    if (cause instanceof Error) {
      message = cause.message;
    } else {
      message = typeof cause === 'string' ? cause : JSON.stringify(cause);
    }

    super(message);
  }
}

export class MissingValueError extends TaggedError {
  readonly _tag = 'MissingValue';
}

export class FailedPredicateError<T> extends TaggedError {
  readonly _tag = 'FailedPredicate';

  constructor(readonly value: T) {
    super('Predicate not fulfilled for Result value');
  }
}

export class UnexpectedResultError extends TypeError {
  constructor(
    override readonly cause: string,
    readonly value: unknown,
  ) {
    super('Expected Result to be "Ok", but it was "Error"');
  }
}
