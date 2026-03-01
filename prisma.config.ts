import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

import { env as appEnv } from './config'

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations'
    },
    datasource: {
        url: appEnv === 'production'
            ? env('DATABASE_URL')
            : env('DEV_DATABASE_URL')
    }
})
