import { Result } from './result';

export interface SafeURL {
  /**
   * The URL() constructor returns a newly created URL object representing the URL defined by the parameters.
   *
   * If the given base URL or the resulting URL are not valid URLs, an Error Result with the JavaScript TypeError exception is returned.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
   */
  of: (...args: ConstructorParameters<typeof URL>) => Result<URL, TypeError>;
}

export const SafeURL: SafeURL = Object.freeze({
  of: Result.enhance(
    (...args: ConstructorParameters<typeof URL>): URL => new URL(...args),
  ) as never,
});
