# Routes

## Rules
- Use Express Router
- One route file per feature, camelCase with `Route` suffix (e.g., `authRoute.ts`)
- Register all routes centrally in `routes/declare_routes/index.ts`
- Route files only wire URLs to controllers — no logic
- For every route addition, update the corresponding controller and service files, and add tests
- For every route addition, add a swagger jsdoc comment block for API documentation
- For every route addition, update the API documentation in `docs/API.md`
