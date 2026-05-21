import { type PrismaClient } from '../../prisma/generated/prisma/client'

// Wraps client with a one-time retry for Neon cold-start errors (P1001/P1002).
// Only used in dev — Neon free tier suspends after 5min idle.
const withNeonRetry = (client: PrismaClient) =>
    client.$extends({
        query: {
            $allModels: {
                async $allOperations({ args, query }) {
                    try {
                        return await query(args)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (err: any) {
                        if (err?.code === 'P1001' || err?.code === 'P1002') {
                            await new Promise(r => setTimeout(r, 2000))
                            return query(args)
                        }
                        throw err
                    }
                }
            }
        }
    })

export default withNeonRetry
