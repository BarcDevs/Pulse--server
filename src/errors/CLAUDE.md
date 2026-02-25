# Errors

## Custom Error Classes
Extend `CustomError` base class. Available types:
- `AuthError` — authentication/authorization failures
- `ValidationError` — input validation failures
- `NotFoundError` — resource not found

## Error Factories
Always create errors via factory classes in `errors/factory/` — never instantiate error classes directly.

```typescript
import { AuthFactory } from '../errors/factory/AuthFactory'
import { ValidationFactory } from '../errors/factory/ValidationFactory'
import { GenericFactory } from '../errors/factory/GenericFactory'

throw AuthFactory.createUnauthorizedError('Invalid token')
throw ValidationFactory.createValidationError('Invalid email format')
```

## HTTP Status Codes
Use constants from `src/constants/httpStatusCodes.ts` — never hardcode numbers.
