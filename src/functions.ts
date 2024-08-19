/**
 * Returns the provided value.
 *
 * @example
 * ```ts
 * import { identity } from 'funkcia/functions';
 *
 * // Output: 10
 * const result = identity(10);
 * ```
 */
export function identity<T>(value: T): T {
  return value;
}
