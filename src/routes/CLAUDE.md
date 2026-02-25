# Routes

## Rules
- Use Express Router
- One route file per feature, camelCase with `Route` suffix (e.g., `authRoute.ts`)
- Register all routes centrally in `routes/declare_routes/index.ts`
- Route files only wire URLs to controllers — no logic
