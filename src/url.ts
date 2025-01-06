import { Result } from './result';

export class SafeURL {
  /**
   * The URL() constructor returns a newly created URL object representing the URL defined by the parameters.
   *
   * If the given base URL or the resulting URL are not valid URLs, an Error Result with the JavaScript TypeError exception is returned.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
   */
  static of = Result.wrap<ConstructorParameters<typeof URL>, URL, TypeError>(
    (...args: ConstructorParameters<typeof URL>): URL => new URL(...args),
    (e) => e as TypeError,
  );
}
