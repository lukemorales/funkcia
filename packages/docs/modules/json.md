# JSON

Funkcia provides a safe `JSON` module to work with value encoding/decoding without breaking your application.

## SafeJSON

SafeJSON provides a safe wrapper around JavaScript's native `JSON` methods, returning `Result` types instead of throwing exceptions, preserving all signature overloads of the original namespace.

#### parse

Converts a JavaScript Object Notation (JSON) string into an object, wrapped in a `Result`.

{% code overflow="wrap" %}
```typescript
import { SafeJSON } from 'funkcia/json';

//       ┌─── Result<unknown, SyntaxError>
//       ▼
const goodJson = SafeJSON.parse('{ "name": "John" }');
// Output: Ok({ name: "John" })

const invalidJson = SafeJSON.parse('{ "name": John }');
// Output: Error(SyntaxError: Unexpected token 'J', "{ "name": John }" is not valid JSON)
```
{% endcode %}

#### stringify

Converts a JavaScript value to a JavaScript Object Notation (JSON) string, wrapped in a `Result`.

```typescript
import { SafeJSON } from 'funkcia/json';

// With function replacer
//      ┌─── Result<string, TypeError>
//      ▼
const result = SafeJSON.stringify(
  { name: "John", age: 30 },
  (key, value) => typeof value === 'number' ? value.toString() : value,
  2
);
// Output: Ok('{\n  "name": "John",\n  "age": "30"\n}')

// With array replacer
//      ┌─── Result<string, TypeError>
//      ▼
const result = SafeJSON.stringify(
  { name: "John", age: 30, email: "john@example.com" },
  ['name', 'age'],
  2
);
// Output: Ok('{\n  "name": "John",\n  "age": 30\n}')
```
