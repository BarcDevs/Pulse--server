# Controllers

Controllers handle HTTP requests/responses only — no business logic.

## Responsibilities
- Parse request data (body, params, query)
- Call the corresponding service
- Return HTTP response

## Pattern
```typescript
import { Request, Response } from 'express'

import { authService } from '../services/authService'
import { HTTP_STATUS_CODES } from '../constants/httpStatusCodes'

const login = async (req: Request, res: Response) => {
    const { email, password } = req.body

    const result = await authService.login(email, password)

    res.status(HTTP_STATUS_CODES.OK).json(result)
}

export { login }
```

## Rules
- No database queries — delegate to services
- No business logic — that belongs in services
- camelCase filename with `Controller` suffix (e.g., `authController.ts`)
