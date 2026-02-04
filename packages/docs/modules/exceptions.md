# Exceptions

The Exceptions module provides a set of custom error types used throughout Funkcia for type-safe error handling.

### Base Error Class

#### TaggedError

{% hint style="success" %}
Create tagged errors using this function to enforce \_tag identifiers, making error handling easier in your application.
{% endhint %}

A function that creates a tagged error constructor. Errors created with this function have a `_tag` property for identification.

```typescript
import { TaggedError } from 'funkcia/exceptions';

class UserNotFoundError extends TaggedError('UserNotFound') {
  constructor(message?: string) {
    super(message);
  }
}
```

#### TaggedError.is

Checks if a value is a tagged error.

```typescript
import { TaggedError } from 'funkcia/exceptions';

if (TaggedError.is(error)) {
  // error is a TaggedError
}
```

### General Exceptions

#### Panic

Thrown when callbacks throw inside `Option` or `Result` operations. Represents a defect in your code – just like Rust’s `panic!()`.

{% hint style="info" %}
If a `Panic` is thrown, a deviation between your software’s actual behavior and it’s expected behavior exists, causing incorrect results. It is a defect to fix, not an error to handle.
{% endhint %}

#### UnhandledException

A wrapper for errors caught in try/catch blocks in a `Result`.

#### NoValueError

Error used when a nullable value is converted to a Result and is `null | undefined`.

#### FailedPredicateError

Error used when a predicate check fails in a Result chain.
