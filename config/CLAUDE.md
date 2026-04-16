# Config Directory Rules

## Environment Variables
- **NEVER** use `process.env` directly — always use exported config objects
- `config/ErrorFactory.ts` is the **only** place where `config.get()` is called
- All config is accessed via typed exports from `config/ErrorFactory.ts`

## Config Files
- `default.ts` — Default values
- `development.ts` — Development overrides
- `production.ts` — Production overrides
- `test.ts` — Test overrides
- `custom-environment-variables.ts` — Maps env var names to config keys

## Adding a New Variable
1. Add to `.env`
2. Add mapping in `custom-environment-variables.ts`
3. Add default/environment value in the appropriate config file
4. Add to the type definition in `src/types/ConfigType.ts`
5. Export from `config/ErrorFactory.ts`

## Pattern
```typescript
// ❌ Wrong
const secret = process.env.JWT_SECRET
import config from 'config'
const secret = config.get<string>('auth.jwtSecret')

// ✅ Correct
import { authConfig } from '../../config'
const secret = authConfig.jwtSecret
```
