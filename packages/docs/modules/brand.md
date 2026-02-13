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

# Brand

The Brand module provides type-safe branding for values, allowing you to create distinct types from primitive values without runtime overhead.

## Brand

Creates a branded type that wraps a value with a unique brand identifier.

```typescript
import { Brand } from 'funkcia/brand';

type UserId = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;

const userId ='user_123' as UserId;
const productId = 'product_456' as ProductId;

declare function getUser(id: UserId): User | null;

getUser(userId); // OK
getUser(productId); // Type error: ProductId is not assignable to UserId
```

### Brand.of

Creates a brand constructor. Can be used with or without validation.

#### Without validation

```typescript
import { Brand } from 'funkcia/brand';

type Email = Brand<string, 'Email'>;

const Email = Brand.of<Email>();

const email: Email = Email('user@example.com');
```

#### With validation

Creates a brand parser with validation and error handling.

```typescript
import { Brand, Result } from 'funkcia/brand';

type Email = Brand<string, 'Email'>;

const Email = Brand.of<Email, InvalidEmailError>(
  (value) => value.includes('@'),
  (value) => new InvalidEmailError(value),
);

// Throws if validation fails
const email: Email = Email.parse('user@example.com');

// Returns Result instead of throwing
const result = Email.safeParse('invalid');
// Result<Email, InvalidEmailError>


const value: string = 'user@example.com';

// Type guard
if (Email.is(value)) {
  // value is Email
}
```

### Brand.unbrand

Removes the brand from a branded value, returning the underlying type.

```typescript
import { Brand } from 'funkcia/brand';

type UserId = Brand<string, 'UserId'>;

const userId = 'user_123' as UserId;

const unbranded: string = Brand.unbrand(userId);
```

### Brand types

#### Brand.Unbrand

Utility type that extracts the underlying type from a branded type.
