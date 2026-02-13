import { SafeJSON } from './json';
import { Result } from './result';

describe('SafeJSON', () => {
  describe('parse', () => {
    it('returns Ok with parsed value for valid JSON string', () => {
      const result = SafeJSON.parse('{"name":"John","age":30}');

      expectTypeOf(result).toEqualTypeOf<Result<unknown, SyntaxError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toEqual({ name: 'John', age: 30 });
    });

    it('returns Error with SyntaxError for invalid JSON string', () => {
      const result = SafeJSON.parse('{invalid json}');

      expectTypeOf(result).toEqualTypeOf<Result<unknown, SyntaxError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(SyntaxError);
    });

    it('parses JSON with reviver function', () => {
      const result = SafeJSON.parse('{"date":"2023-01-01"}', (key, value) => {
        if (key === 'date') {
          return new Date(value);
        }
        return value;
      });

      expectTypeOf(result).toEqualTypeOf<Result<unknown, SyntaxError>>();

      expect(result.isOk()).toBeTrue();
      const parsed = result.unwrap() as { date: Date };
      expect(parsed.date).toBeInstanceOf(Date);
    });
  });

  describe('stringify', () => {
    it('returns Ok with stringified value for valid object', () => {
      const result = SafeJSON.stringify({ name: 'John', age: 30 });

      expectTypeOf(result).toEqualTypeOf<Result<string, TypeError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toBe('{"name":"John","age":30}');
    });

    it('returns Error with TypeError for invalid value', () => {
      const result = SafeJSON.stringify({
        name: 'John',
        big: BigInt(123),
      });

      expectTypeOf(result).toEqualTypeOf<Result<string, TypeError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(TypeError);
    });

    it('stringifies with replacer function', () => {
      const result = SafeJSON.stringify(
        { name: 'John', age: 30 },
        (key, value) => {
          if (key === 'age') {
            return undefined;
          }
          return value;
        },
      );

      expectTypeOf(result).toEqualTypeOf<Result<string, TypeError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toBe('{"name":"John"}');
    });

    it('stringifies with replacer array', () => {
      const result = SafeJSON.stringify(
        { name: 'John', age: 30, city: 'NYC' },
        ['name', 'age'],
      );

      expectTypeOf(result).toEqualTypeOf<Result<string, TypeError>>();

      expect(result.isOk()).toBeTrue();
      const parsed = JSON.parse(result.unwrap());
      expect(parsed).toEqual({ name: 'John', age: 30 });
      expect(parsed.city).toBeUndefined();
    });

    it('stringifies with space parameter', () => {
      const result = SafeJSON.stringify({ name: 'John', age: 30 }, null, 2);

      expectTypeOf(result).toEqualTypeOf<Result<string, TypeError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toContain('\n');
      expect(result.unwrap()).toContain('  ');
    });
  });
});
