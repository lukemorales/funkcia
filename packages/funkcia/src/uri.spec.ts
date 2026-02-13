import { Result } from './result';
import { SafeURI } from './uri';

describe('SafeURI', () => {
  describe('encode', () => {
    it('returns Ok with encoded URI for valid URI', () => {
      const result = SafeURI.encode('https://example.com/path?query=value');

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toBe('https://example.com/path?query=value');
    });

    it('returns Error with URIError for invalid URI', () => {
      const invalidUri = '\uD800';
      const result = SafeURI.encode(invalidUri);

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(URIError);
    });
  });

  describe('decode', () => {
    it('returns Ok with decoded URI for valid encoded URI', () => {
      const encoded = 'https://example.com/path%20with%20spaces';
      const result = SafeURI.decode(encoded);

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toBe('https://example.com/path with spaces');
    });

    it('returns Error with URIError for invalid encoded URI', () => {
      const invalidEncoded = '%E0%A4%';
      const result = SafeURI.decode(invalidEncoded);

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(URIError);
    });
  });

  describe('encodeURIComponent', () => {
    it('returns Ok with encoded component for valid component', () => {
      const component = 'value with spaces';
      const result = SafeURI.encodeURIComponent(component);

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toBe('value%20with%20spaces');
    });

    it('returns Error with URIError for invalid component', () => {
      const invalidComponent = '\uD800';
      const result = SafeURI.encodeURIComponent(invalidComponent);

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(URIError);
    });
  });

  describe('decodeURIComponent', () => {
    it('returns Ok with decoded component for valid encoded component', () => {
      const encoded = 'value%20with%20spaces';
      const result = SafeURI.decodeURIComponent(encoded);

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isOk()).toBeTrue();
      expect(result.unwrap()).toBe('value with spaces');
    });

    it('returns Error with URIError for invalid encoded component', () => {
      const invalidEncoded = '%E0%A4%';
      const result = SafeURI.decodeURIComponent(invalidEncoded);

      expectTypeOf(result).toEqualTypeOf<Result<string, URIError>>();

      expect(result.isError()).toBeTrue();
      expect(result.unwrapError()).toBeInstanceOf(URIError);
    });
  });
});
