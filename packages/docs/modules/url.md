# URL

Funkcia provides a safe `URL` modue to work with URL parsing without breaking your application.

### SafeURL

SafeURL provides a safe wrapper around JavaScript's native URL constructor, returning a `Result` type instead of throwing exceptions, preserving all signature overloads of the original constructor.

#### of

Creates a new `URL` object representing the `URL` defined by the parameters, wrapped in a `Result`. If the given base `URL` or the resulting `URL` are not valid `URL`s, returns a `Result.Error` with a `TypeError`.

```typescript
import { SafeURL } from 'funkcia/url';

// With absolute URL
//      ┌─── Result<URL, TypeError>
//      ▼
const result = SafeURL.of('https://example.com/path?query=value');
// Output: Ok(URL { href: "https://example.com/path?query=value", ... })

// With relative URL and base
//      ┌─── Result<URL, TypeError>
//      ▼
const result = SafeURL.of('/path?query=value', 'https://example.com');
// Output: Ok(URL { href: "https://example.com/path?query=value", ... })

// With invalid URL
const invalid = SafeURL.of('not-a-url');
// Output: Error(TypeError: Failed to construct 'URL': Invalid URL)
```
