export type TaggedErrorConstructor<Tag extends string> = {
  new (message?: string, options?: { cause?: unknown }): TaggedError<Tag>;
};

export interface TaggedError<Tag extends string> extends TypeError {
  readonly _tag: Tag;
}

export const TaggedError = Object.assign(
  function TaggedError<T extends string>(tag: T): TaggedErrorConstructor<T> {
    class Base extends TypeError {
      readonly _tag = tag;

      constructor(message: string, options?: { cause?: unknown }) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = tag;
        this.cause = options?.cause;

        if (this.cause instanceof Error && this.cause.stack) {
          this.stack = `${this.stack}\nCaused by: ${this.cause.stack.replace(
            /\n/g,
            '\n  ',
          )}`;
        }
      }
    }

    return Base as never;
  },
  {
    is(value: unknown): value is TaggedError<string> {
      return (
        value instanceof TypeError &&
        '_tag' in value &&
        typeof value._tag === 'string'
      );
    },
  },
);

// ---MARK: RESULT EXCEPTIONS---

export class UnhandledException extends TaggedError('UnhandledException') {
  static is(value: unknown): value is UnhandledException {
    return value instanceof UnhandledException;
  }
}

export class NoValueError extends TaggedError('NoValueError') {
  static is(value: unknown): value is NoValueError {
    return value instanceof NoValueError;
  }
}

export class Panic extends TaggedError('Panic') {
  static is(value: unknown): value is Panic {
    return value instanceof Panic;
  }
}

export class FailedPredicateError<T> extends TaggedError(
  'FailedPredicateError',
) {
  static is(value: unknown): value is FailedPredicateError<unknown> {
    return value instanceof FailedPredicateError;
  }

  readonly value: T;

  constructor(value: T) {
    super('Predicate not fulfilled for Result value');
    this.value = value;
  }
}

export function panic(message: string, cause?: unknown): never {
  throw new Panic(message, { cause });
}
