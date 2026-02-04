import { Result } from './result';
import { SafeURL } from './url';

describe('SafeURL', () => {
  describe('of', () => {
    it('returns Ok with URL for valid URL string', () => {
      const result = SafeURL.of('https://example.com');

      expectTypeOf(result).toEqualTypeOf<Result<URL, TypeError>>();

      expect(result.isOk()).toBeTrue();
      const url = result.unwrap();
      expect(url).toBeInstanceOf(URL);
      expect(url.href).toBe('https://example.com/');
    });

    it('returns Error with TypeError for invalid URL string', () => {
      const result = SafeURL.of('not a valid url');

      expectTypeOf(result).toEqualTypeOf<Result<URL, TypeError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(TypeError);
    });

    it('creates URL with base URL parameter', () => {
      const result = SafeURL.of('/path', 'https://example.com');

      expectTypeOf(result).toEqualTypeOf<Result<URL, TypeError>>();

      expect(result.isOk()).toBeTrue();
      const url = result.unwrap();
      expect(url.href).toBe('https://example.com/path');
    });

    it('returns Error when base URL is invalid', () => {
      const result = SafeURL.of('/path', 'not a valid base url');

      expectTypeOf(result).toEqualTypeOf<Result<URL, TypeError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(TypeError);
    });
  });
});
