---
layout:
  title:
    visible: true
  description:
    visible: false
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
---

# URI

Funkcia provides a safe `URI` module to work with URI encoding/decoding without breaking your application.

## SafeURI

SafeURI provides safe wrappers around JavaScript's native URI encoding/decoding functions, returning `Result` types instead of throwing exceptions, preserving all signature overloads of the original namespace.

#### encode

Encodes a text string as a valid Uniform Resource Identifier (URI).

```typescript
import { SafeURI } from 'funkcia/uri';

//      ┌─── Result<string, URIError>
//      ▼
const result = SafeURI.encode('https://example.com/path with spaces');
// Output: Ok('https://example.com/path%20with%20spaces')
```

#### decode

Gets the unencoded version of an encoded Uniform Resource Identifier (URI).

```typescript
import { SafeURI } from 'funkcia/uri';

//      ┌─── Result<string, URIError>
//      ▼
const result = SafeURI.decode('https://example.com/path%20with%20spaces');
// Output: Ok('https://example.com/path with spaces')
```

#### encodeURIComponent

Encodes a text string as a valid component of a Uniform Resource Identifier (URI).

```typescript
import { SafeURI } from 'funkcia/uri';

//      ┌─── Result<string, URIError>
//      ▼
const result = SafeURI.encodeURIComponent('path/with/slashes');
// Output: Ok('path%2Fwith%2Fslashes')
```

#### decodeURIComponent

Gets the unencoded version of an encoded component of a Uniform Resource Identifier (URI).

```typescript
import { SafeURI } from 'funkcia/uri';

//      ┌─── Result<string, URIError>
//      ▼
const result = SafeURI.decodeURIComponent('path%2Fwith%2Fslashes');
// Output: Ok('path/with/slashes')
```
