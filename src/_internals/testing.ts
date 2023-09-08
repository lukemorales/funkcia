import { some } from './option';

/**
 * @internal only for testing purposes
 */
export function someOption<T>(value: T) {
  const { pipe: _, ...option } = some(value);
  return option;
}
