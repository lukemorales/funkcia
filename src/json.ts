import { Result } from './result';

export class SafeJSON {
  /**
   * Converts a JavaScript Object Notation (JSON) string into an object.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
   */
  static parse = Result.wrap<
    Parameters<typeof JSON.parse>,
    unknown,
    SyntaxError
  >(JSON.parse, (e) => e as SyntaxError);

  /**
   * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
   */
  static stringify(
    value: any,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number,
  ): Result<string, TypeError>;

  /**
   * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
   */
  static stringify(
    value: any,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    replacer?: Array<number | string> | null,
    space?: string | number,
  ): Result<string, TypeError>;

  static stringify(
    value: any,
    replacer?: any,
    space?: string | number,
  ): Result<string, TypeError> {
    return Result.fromThrowable(() => JSON.stringify(value, replacer, space));
  }
}
