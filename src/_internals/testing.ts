import { left, right } from './either';
import { some } from './option';

/**
 * @internal only for testing purposes
 */
export function someOption<T>(value: T) {
  const { pipe: _, ...option } = some(value);
  return option;
}

/**
 * @internal only for testing purposes
 */
export function rightEither<T>(success: T) {
  const { pipe: _, ...either } = right(success);
  return either;
}

/**
 * @internal only for testing purposes
 */
export function leftEither<T>(failure: T) {
  const { pipe: _, ...either } = left(failure);
  return either;
}
