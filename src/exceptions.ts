export abstract class TaggedError extends TypeError {
  abstract readonly _tag: string;

  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// -----------------------------
// ---MARK: COMMON EXCEPTIONS---
// -----------------------------

export class UnwrapError extends TaggedError {
  readonly _tag = 'UnwrapError';

  constructor(type: 'Option' | 'Result' | 'ResultError') {
    super();

    switch (type) {
      case 'Option':
        this.message = 'called "Option.unwrap()" on a "None" value';
        break;
      case 'Result':
        this.message = 'called "Result.unwrap()" on an "Error" value';
        break;
      case 'ResultError':
        this.message = 'called "Result.unwrapError()" on an "Ok" value';
        break;
      default: {
        const _: never = type;
        throw new Error(`invalid value passed to UnwrapError: "${_}"`);
      }
    }
  }
}

// ---MARK: OPTION EXCEPTIONS---

export class UnexpectedOptionException extends TaggedError {
  readonly _tag = 'UnexpectedOption';
}

// ---MARK: RESULT EXCEPTIONS---

export class UnknownError extends TaggedError {
  readonly _tag = 'UnknownError';

  readonly thrownError: unknown;

  constructor(error: unknown) {
    let message: string | undefined;
    let stack: string | undefined;
    let cause: unknown;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
      cause = error.cause;
    } else {
      message = typeof error === 'string' ? error : JSON.stringify(error);
    }

    super(message);
    this.thrownError = error;

    if (stack != null) {
      this.stack = stack;
    }

    if (cause != null) {
      this.cause = cause;
    }
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

export class UnexpectedResultError extends TaggedError {
  readonly _tag = 'UnexpectedResultError';

  constructor(
    override readonly cause: string,
    readonly value: unknown,
  ) {
    super('Expected Result to be "Ok", but it was "Error"');
  }
}
