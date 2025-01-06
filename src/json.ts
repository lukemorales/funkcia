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
  static stringify = Result.wrap<
    Parameters<typeof JSON.stringify>,
    unknown,
    TypeError
  >(JSON.stringify, (e) => e as TypeError);
}
