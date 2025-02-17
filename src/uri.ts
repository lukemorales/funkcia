import { Result } from './result';

export interface SafeURI {
  /**
   * Encodes a text string as a valid Uniform Resource Identifier (URI)
   * @param uri A value representing an unencoded URI.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
   */
  encode: ReturnType<
    typeof Result.liftFun<Parameters<typeof encodeURI>, string, URIError>
  >;
  /**
   * Gets the unencoded version of an encoded Uniform Resource Identifier (URI).
   * @param encodedURI A value representing an encoded URI.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURI
   */
  decode: ReturnType<
    typeof Result.liftFun<Parameters<typeof decodeURI>, string, URIError>
  >;
  /**
   * Encodes a text string as a valid component of a Uniform Resource Identifier (URI).
   * @param uriComponent A value representing an unencoded URI component.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
   */
  encodeURIComponent: ReturnType<
    typeof Result.liftFun<
      Parameters<typeof encodeURIComponent>,
      string,
      URIError
    >
  >;
  /**
   * Gets the unencoded version of an encoded component of a Uniform Resource Identifier (URI).
   * @param encodedURIComponent A value representing an encoded URI component.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent
   */
  decodeURIComponent: ReturnType<
    typeof Result.liftFun<
      Parameters<typeof decodeURIComponent>,
      string,
      URIError
    >
  >;
}

export const SafeURI: SafeURI = Object.freeze({
  encode: Result.liftFun(encodeURI),
  decode: Result.liftFun(decodeURI),
  encodeURIComponent: Result.liftFun(encodeURIComponent),
  decodeURIComponent: Result.liftFun(decodeURIComponent),
});
