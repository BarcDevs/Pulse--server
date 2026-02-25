# Services

Services contain all business logic. They are called by controllers and call models.

## Responsibilities
- Implement business rules and logic
- Orchestrate model calls
- Throw appropriate custom errors

## Pattern
```typescript
import { AuthFactory } from '../errors/factory/AuthFactory'

import { authModel } from '../models/authModel'

const login = async (email: string, password: string) => {
    const user = await authModel.findUserByEmail(email)

    if (!user) {
        throw AuthFactory.createInvalidCredentialsError()
    }

    return { user, token }
}

export { login }
```

## Rules
- No HTTP logic (req/res) — that belongs in controllers
- No direct database queries — delegate to models
- camelCase filename with `Service` suffix (e.g., `authService.ts`)
