import { coerce } from './functions';
import { Result } from './result';

export interface SafeJSON {
  /**
   * Converts a JavaScript Object Notation (JSON) string into an object.
   * @param text A valid JSON string.
   * @param reviver A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is.
   */
  parse: (
    ...args: Parameters<typeof JSON.parse>
  ) => Result<unknown, SyntaxError>;

  /**
   * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
   * @param value A JavaScript value, usually an object or array, to be converted.
   * @param replacer A function that transforms the results.
   * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
   */
  stringify(
    value: any,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number,
  ): Result<string, TypeError>;

  /**
   * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
   * @param value A JavaScript value, usually an object or array, to be converted.
   * @param replacer An array of strings and numbers that acts as an approved list for selecting the object properties that will be stringified.
   * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
   */
  stringify(
    value: any,
    replacer?: Array<number | string> | null,
    space?: string | number,
  ): Result<string, TypeError>;
}

export const SafeJSON: SafeJSON = Object.freeze({
  parse: Result.lift(JSON.parse, coerce<SyntaxError>),
  stringify: Result.lift(JSON.stringify, coerce<TypeError>) as never,
});
