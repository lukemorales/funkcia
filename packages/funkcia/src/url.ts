import { coerce } from './functions';
import { Result } from './result';

export interface SafeURL {
  /**
   * The URL() constructor returns a newly created URL object representing the URL defined by the parameters.
   *
   * If the given base URL or the resulting URL are not valid URLs, a `Result.Error` with the thrown `TypeError` exception is returned.
   */
  of: (...args: ConstructorParameters<typeof URL>) => Result<URL, TypeError>;
}

export const SafeURL: SafeURL = {
  of: Result.lift(
    (...args: ConstructorParameters<typeof URL>): URL => new URL(...args),
    coerce<TypeError>,
  ),
};
