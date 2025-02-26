# Exceptions

The Exceptions module provides a set of custom error types used throughout Funkcia for type-safe error handling.

### Base Error Class

#### TaggedError

{% hint style="success" %}
Extend your errors using this abstract class to enforce \_tag identifiers, making error handling easier in your application.
{% endhint %}

An abstract base class for errors that require a tag for identification.

```typescript
import { TaggedError } from 'funkcia/exceptions';

class UserNotFoundError extends TaggedError {
  readonly _tag: 'UserNotFoundError'
}
```

### General Exceptions

#### UnwrapError

Error thrown when attempting to unwrap a `None` value from an `Option` or an `Error` value from a `Result`.

#### UnknownError

A wrapper for errors caught in try/catch blocks in a `Result`.

#### NoValueError

Error used when a nullable value is converted to a Result and is `null | undefined`.

#### FailedPredicateError

Error used when a predicate check fails in a Result chain.



