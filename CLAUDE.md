# Claude Code Preferences

## Project Overview
HealEase Server - A Node.js/Express TypeScript backend API for a health and wellness forum application with user authentication, CSRF protection, and community features.

## Code Style & Conventions

### Core Principles
- **ALWAYS FOLLOW INDUSTRY STANDARDS**
- **ALWAYS USE SOLID PRINCIPLES** - Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Clean Code**: Write readable, maintainable code that follows best practices

### TypeScript & JavaScript
- **Quotes**: Use single quotes (`'`) for all strings and imports
- **Semicolons**: Not used (except where required)
- **Indentation**: 4 spaces
- **File naming**:
  - **Classes**: PascalCase (e.g., `CustomError.ts`, `AuthFactory.ts`)
  - **Types/Interfaces**: PascalCase (e.g., `UserType.ts`, `ConfigType.ts`, `ICustomError.ts`)
  - **Everything else**: camelCase (e.g., `authController.ts`, `forumService.ts`, `loginSchema.ts`)
- **Folders**: camelCase
- **Functions**: ALWAYS use arrow functions, never regular function declarations
- **Types vs Interfaces**: Prefer `type` over `interface` unless an interface is specifically needed (e.g., for declaration merging, extending Express types)

### Node.js & Express
- **Framework**: Express 4 with TypeScript
- **Runtime**: Node.js with CommonJS modules
- **Architecture**: MVC pattern (Models, Controllers, Services)
- **Async handling**: Use `express-async-errors` for automatic error handling
- **Middleware**: Centralized middleware declaration
- **File structure**:
  - App entry: `src/app.ts`
  - Routes: `src/routes/`
  - Controllers: `src/controllers/`
  - Models: `src/models/`
  - Services: `src/services/`
  - Middleware: `src/middlewares/`
  - Schemas: `src/schemas/`
  - Types: `src/types/`
  - Utils: `src/utils/`
  - Constants: `src/constants/`
  - Errors: `src/errors/`
  - Config: `config/` (root level)

### Environment Variables
- **CRITICAL RULE**: NEVER use `process.env` directly outside of `config/` directory
- **Config package**: Uses the `config` npm package for environment variable management
- **Access pattern**: ONLY access environment variables through exported config objects from `config/index.ts`
- **Config files**:
  - `config/default.ts` - Default configuration
  - `config/development.ts` - Development environment
  - `config/production.ts` - Production environment
  - `config/test.ts` - Test environment
  - `config/custom-environment-variables.ts` - Environment variable mappings
  - `config/index.ts` - ONLY place where `config.get()` is called, exports typed config objects
- **Adding new variables**:
  1. Add to `.env` file
  2. Add mapping to `config/custom-environment-variables.ts`
  3. Add to appropriate environment config file (`config/default.ts`, `config/production.ts`, etc.)
  4. Add to type definition in `src/types/ConfigType.ts`
  5. Export from `config/index.ts`
  6. Use via imported config object throughout the app
- **Environment detection**: Use `NODE_ENV` environment variable (development, production, test)

### Database & ORM
- **ORM**: Prisma 5
- **Database client**: Singleton instance in `src/utils/PrismaClient.ts`
- **Schema**: `prisma/schema.prisma`
- **Migrations**: Use Prisma migrate commands
- **Models**: Prisma models in schema, TypeScript types generated

### Routing
- **Router**: Express Router
- **Route files**: Organized by feature in `src/routes/`
- **Route declaration**: Centralized in `src/routes/declare_routes/index.ts`
- **Pattern**: Each feature has its own route file (e.g., `authRoute.ts`, `forumRoute.ts`)
- **Naming**: Routes use camelCase with `Route` suffix

### Controllers & Services
- **Controllers**: Handle HTTP requests/responses, call services
- **Services**: Contain business logic, interact with models/database
- **Models**: Handle database queries and data access
- **Naming**: All use camelCase with appropriate suffix (e.g., `authController.ts`, `authService.ts`, `authModel.ts`)
- **Pattern**: Controller → Service → Model → Database
- **Error handling**: Use custom error classes and error factories

### Validation & Schemas
- **Library**: Joi for validation
- **Location**: `src/schemas/` organized by feature
- **Pattern**: Create schemas for request validation (body, query, params)
- **Naming**: camelCase with `Schema` suffix (e.g., `loginSchema.ts`, `newPostSchema.ts`)

### Middleware
- **Location**: `src/middlewares/`
- **Common middleware**:
  - `isAuthenticated.ts` - Authentication guard
  - `csrf.ts` - CSRF protection
  - `errorHandler.ts` - Global error handling
  - `sanitization.ts` - Input sanitization
  - `rate-limiting.ts` - Rate limiting
  - `cache.ts` - Caching
- **Declaration**: Centralized in `src/middlewares/index.ts`

### Error Handling
- **Custom errors**: Extend base `CustomError` class in `src/errors/`
- **Error types**:
  - `AuthError` - Authentication/authorization errors
  - `ValidationError` - Validation errors
  - `NotFoundError` - Resource not found errors
- **Error factories**: Create errors using factory pattern in `src/errors/factory/`
- **Global handler**: Centralized error handling middleware
- **HTTP status codes**: Constants in `src/constants/httpStatusCodes.ts`

### Authentication & Security
- **Authentication**: JWT-based with session management
- **CSRF protection**: Custom CSRF middleware for state-changing operations
- **Password hashing**: bcrypt
- **Rate limiting**: express-rate-limit
- **Input sanitization**: DOMPurify
- **Security headers**: Helmet
- **HPP protection**: hpp (HTTP Parameter Pollution)

### TypeScript Types
- **Location**: `src/types/` directory
- **Organization**: Organized by domain
  - `AccountType.ts` - Account-related types
  - `ResponseType.ts` - API response types
  - `ConfigType.ts` - Configuration types
  - `data/` - Data model types (User, Post, Reply, Tag, etc.)
- **Naming**: PascalCase for both type/interface names and their files
- **Exports**: Named exports preferred

## Code Formatting Rules

### Line Breaking & Formatting
- **Long lines**: Break long lines into multiple lines for readability
- **Function parameters**: Break long function parameters onto new lines
- **Curly braces**: Add space around variables in curly-braces
  ```typescript
  import { Request, Response } from 'express'
  const { var1, var2 } = variable
  ```
- **Conditional statements**: If 2+ conditions in an if statement, split them one per line
  ```typescript
  // ❌ Wrong
  if (condition1 && condition2 && condition3) {

  // ✅ Correct
  if (
      condition1 &&
      condition2 &&
      condition3
  ) {
  ```

### Import Organization
Follow the import organization pattern:
1. Node.js built-in modules (e.g., `path`, `fs`)
2. Third-party packages (e.g., `express`, `bcrypt`)
3. Third-party @-scoped packages (e.g., `@prisma/client`)
4. Local modules (organized by type):
   - Types
   - Config
   - Controllers
   - Services
   - Models
   - Middleware
   - Utils
   - Constants
   - Errors
   - Schemas
5. Relative imports (parent directories)
6. Relative imports (same directory)

```typescript
// Example
import { Request, Response } from 'express'

import bcrypt from 'bcrypt'

import { PrismaClient } from '@prisma/client'

import { UserType } from '../types/data/UserType'

import { authConfig } from '../../config'

import { authService } from '../services/authService'

import prisma from '../utils/PrismaClient'

import { HTTP_STATUS_CODES } from '../constants/httpStatusCodes'
```

### Clean Code Practices
- **Cleaner code output**: Always output clean, readable code
- **Reusability**: Extract reusable logic into separate functions, services, or utils
- **Single responsibility**: One concern per file
- **No code snippets**: Provide complete, production-ready code, not snippets
- **CRITICAL: Delete unused code - NEVER comment it out**:
  - ❌ WRONG: Leaving commented out code like `// const oldFunction = () => {}`
  - ❌ WRONG: Commenting out imports like `// import { oldUtil } from './utils'`
  - ❌ WRONG: Commenting out environment variables like `# OLD_API_KEY=...`
  - ❌ WRONG: Commenting as removed/deprecated/etc., like `// REMOVED: oldFunction()`
  - ✅ CORRECT: **DELETE** unused code completely
  - Why: Commented code creates clutter, confusion, and makes codebase harder to maintain
  - Exception: Only comment code if explicitly documenting WHY something was removed for historical context (very rare)

## Project Structure

```
config/                                 # Configuration files
├── index.ts                           # Config exports (ONLY place for config.get())
├── default.ts                         # Default configuration
├── development.ts                     # Development environment
├── production.ts                      # Production environment
├── test.ts                           # Test environment
└── custom-environment-variables.ts    # Environment variable mappings

prisma/
└── schema.prisma                      # Prisma schema

src/
├── app.ts                            # Application entry point
├── __tests__/                        # Test files
├── constants/                        # Constants
│   ├── httpStatusCodes.ts
│   ├── errorPrefixes.ts
│   └── excludedUserFields.ts
├── controllers/                      # Request handlers
│   ├── authController.ts
│   ├── forumController.ts
│   ├── serverController.ts
│   └── bulkActionsController.ts
├── errors/                          # Custom error classes
│   ├── CustomError.ts
│   ├── AuthError.ts
│   ├── ValidationError.ts
│   ├── NotFoundError.ts
│   └── factory/                    # Error factories
│       ├── AuthFactory.ts
│       ├── ValidationFactory.ts
│       └── GenericFactory.ts
├── interfaces/                     # TypeScript interfaces
│   └── ICustomError.ts
├── middlewares/                    # Express middleware
│   ├── index.ts                   # Middleware declaration
│   ├── isAuthenticated.ts        # Auth guard
│   ├── csrf.ts                   # CSRF protection
│   ├── errorHandler.ts           # Error handling
│   ├── sanitization.ts           # Input sanitization
│   ├── rate-limiting.ts          # Rate limiting
│   ├── cache.ts                  # Caching
│   └── loggerMiddleWare.ts       # Logging
├── models/                        # Data access layer
│   ├── authModel.ts
│   ├── forumModel.ts
│   └── queries/                  # Query builders
│       └── postQuery.ts
├── responses/                     # Response utilities
│   └── success.ts
├── routes/                        # Route definitions
│   ├── authRoute.ts
│   ├── forumRoute.ts
│   ├── bulkActionsRoute.ts
│   └── declare_routes/
│       └── index.ts              # Route registration
├── schemas/                       # Validation schemas
│   ├── auth/                     # Auth schemas
│   │   ├── loginSchema.ts
│   │   ├── signupSchema.ts
│   │   ├── forgetPasswordSchema.ts
│   │   └── resetPasswordSchema.ts
│   └── forum/                    # Forum schemas
│       ├── newPostSchema.ts
│       ├── updatePostSchema.ts
│       ├── newReplySchema.ts
│       └── postQuerySchema.ts
├── services/                      # Business logic
│   ├── authService.ts
│   └── forumService.ts
├── types/                         # TypeScript types
│   ├── index.ts
│   ├── AccountType.ts
│   ├── ResponseType.ts
│   ├── ConfigType.ts
│   ├── query.ts
│   └── data/                     # Data model types
│       ├── UserType.ts
│       ├── PostType.ts
│       ├── ReplyType.ts
│       ├── TagType.ts
│       └── Votes.ts
└── utils/                         # Utility functions
    ├── PrismaClient.ts           # Database client
    ├── logger.ts                 # Winston logger
    ├── emailSender.ts            # Email utilities
    ├── catch.ts                  # Error catching utilities
    └── capitalizeText.ts         # Text utilities
```

## Key Features

### Forum System
- Post creation, editing, and deletion
- Categories and tags
- Replies and nested comments
- Voting system
- User profiles
- Post queries with filtering

### Authentication
- Email/password registration and login
- Google OAuth support
- JWT-based sessions
- Email verification with OTP
- Password reset flow
- CSRF protection

### Security
- CSRF token validation
- Rate limiting
- Input sanitization
- HTTP parameter pollution prevention
- Security headers (Helmet)
- Password hashing (bcrypt)

## Development Guidelines

### Before Committing
1. Run TypeScript check: `npm run typecheck`
2. Run lint check: `npm run lint:check`
3. Verify environment variables are accessed via config exports
4. Check that all imports use correct paths
5. Verify arrow functions are used throughout
6. Ensure SOLID principles are followed
7. Run tests: `npm test`

### Config Pattern
```typescript
// ❌ WRONG - NEVER use process.env directly
const jwtSecret = process.env.JWT_SECRET
const port = process.env.PORT

// ❌ WRONG - Don't use config.get() outside config directory
import config from 'config'
const jwtSecret = config.get<string>('auth.jwtSecret')

// ✅ CORRECT - Always use exported config objects
import { authConfig, serverConfig } from '../../config'
const jwtSecret = authConfig.jwtSecret
const port = serverConfig.port
```

### Controller Pattern
```typescript
// ✅ Correct - Controllers handle HTTP, call services
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

### Service Pattern
```typescript
// ✅ Correct - Services contain business logic
import { AuthFactory } from '../errors/factory/AuthFactory'

import { authModel } from '../models/authModel'

const login = async (email: string, password: string) => {
    const user = await authModel.findUserByEmail(email)

    if (!user) {
        throw AuthFactory.createInvalidCredentialsError()
    }

    // Business logic here

    return { user, token }
}

export { login }
```

### Error Handling Pattern
```typescript
// ✅ Correct - Use error factories
import { AuthFactory } from '../errors/factory/AuthFactory'
import { ValidationFactory } from '../errors/factory/ValidationFactory'

// Throw custom errors
throw AuthFactory.createUnauthorizedError('Invalid token')
throw ValidationFactory.createValidationError('Invalid email format')
```

## Dependencies

### Core
- Node.js
- Express 4
- TypeScript 5
- Prisma 5

### Authentication & Security
- jsonwebtoken (JWT)
- bcrypt (password hashing)
- csrf (CSRF protection)
- helmet (security headers)
- express-rate-limit
- hpp (HTTP Parameter Pollution)
- DOMPurify (sanitization)

### Validation
- Joi

### Utilities
- config (environment configuration)
- winston (logging)
- nodemailer (email)
- axios
- node-cache
- compression
- cookie-parser
- cors

### Development & Testing
- Jest (testing)
- supertest (API testing)
- nodemon (development)
- ESLint (linting)
- Prettier (formatting)
- husky (git hooks)
- lint-staged

## Configuration Files

- `.env` - Environment variables (not committed)
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - ESLint configuration (user will update)
- `.prettierrc.json` - Prettier configuration
- `jest.config.ts` - Jest configuration
- `prisma/schema.prisma` - Prisma schema

## Important Notes

1. **Never commit sensitive data** like API keys, secrets, or `.env` file
2. **Always use config exports** for environment variables
3. **Use Prisma migrations** for database changes
4. **Follow MVC architecture** - Controller → Service → Model
5. **Use error factories** for consistent error handling
6. **Validate all inputs** with Joi schemas
7. **Use middleware** for cross-cutting concerns
8. **Test with Jest** before committing
9. **Use arrow functions** consistently

## Quick Reference Checklist

### Must Follow
- ✅ Use arrow functions ALWAYS
- ✅ No semicolons (unless necessary)
- ✅ Single quotes for all strings
- ✅ One concern per file
- ✅ SOLID principles
- ✅ Use config exports for env vars
- ✅ Follow MVC pattern
- ✅ Use error factories
- ✅ Validate all inputs with Joi
- ✅ Use Prisma for database
- ✅ Clean, formatted code
- ✅ Industry standards
- ✅ PascalCase for classes and types, camelCase for everything else

### Must Avoid
- ❌ Regular function declarations
- ❌ Double quotes
- ❌ `process.env` outside config directory
- ❌ `config.get()` outside config directory
- ❌ Direct database queries without Prisma
- ❌ Business logic in controllers
- ❌ HTTP logic in services
- ❌ Long files
- ❌ Commented out code
- ❌ Code snippets (provide full code)
- ❌ Hardcoded values (use constants/config)
