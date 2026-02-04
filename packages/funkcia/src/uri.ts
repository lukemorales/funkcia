import { coerce } from './functions';
import { Result } from './result';

export interface SafeURI {
  /**
   * Encodes a text string as a valid Uniform Resource Identifier (URI)
   * @param uri A value representing an unencoded URI.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI
   */
  encode: (...args: Parameters<typeof encodeURI>) => Result<string, URIError>;

  /**
   * Gets the unencoded version of an encoded Uniform Resource Identifier (URI).
   * @param encodedURI A value representing an encoded URI.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURI
   */
  decode: (...args: Parameters<typeof decodeURI>) => Result<string, URIError>;

  /**
   * Encodes a text string as a valid component of a Uniform Resource Identifier (URI).
   * @param uriComponent A value representing an unencoded URI component.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
   */
  encodeURIComponent: (
    ...args: Parameters<typeof encodeURIComponent>
  ) => Result<string, URIError>;

  /**
   * Gets the unencoded version of an encoded component of a Uniform Resource Identifier (URI).
   * @param encodedURIComponent A value representing an encoded URI component.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent
   */
  decodeURIComponent: (
    ...args: Parameters<typeof decodeURIComponent>
  ) => Result<string, URIError>;
}

export const SafeURI: SafeURI = {
  encode: Result.lift(encodeURI, coerce<URIError>),
  decode: Result.lift(decodeURI, coerce<URIError>),
  encodeURIComponent: Result.lift(encodeURIComponent, coerce<URIError>),
  decodeURIComponent: Result.lift(decodeURIComponent, coerce<URIError>),
};
