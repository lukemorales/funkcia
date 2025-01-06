import { Result } from './result';

export class SafeURI {
  /**
   * Encodes a text string as a valid Uniform Resource Identifier (URI).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
   */
  static encode = Result.wrap<Parameters<typeof encodeURI>, string, URIError>(
    encodeURI,
    (e) => e as URIError,
  );

  /**
   * Gets the unencoded version of an encoded Uniform Resource Identifier (URI).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURI
   */
  static decode = Result.wrap<Parameters<typeof decodeURI>, string, URIError>(
    decodeURI,
    (e) => e as URIError,
  );

  /**
   * Encodes a text string as a valid component of a Uniform Resource Identifier (URI).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
   */
  static encodeURIComponent = Result.wrap<
    Parameters<typeof encodeURIComponent>,
    string,
    URIError
  >(encodeURIComponent, (e) => e as URIError);

  /**
   * Gets the unencoded version of an encoded component of a Uniform Resource Identifier (URI).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent
   */
  static decodeURIComponent = Result.wrap<
    Parameters<typeof decodeURIComponent>,
    string,
    URIError
  >(decodeURIComponent, (e) => e as URIError);
}
