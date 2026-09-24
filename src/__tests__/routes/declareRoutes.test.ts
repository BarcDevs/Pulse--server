import type { Express } from 'express'

jest.mock('../../controllers/serverController', () => ({
    getServerReadiness: jest.fn(),
    getServerStatus: jest.fn()
}))
jest.mock('../../controllers/swaggerController', () => ({
    swagger: jest.fn()
}))
jest.mock('../../middlewares/errorHandler', () => ({
    errorHandler: jest.fn()
}))
jest.mock('../../routes/authRoute', () => 'authRoute')
jest.mock('../../routes/checkInRoute', () => 'checkInRoute')
jest.mock('../../routes/devRoute', () => 'devRoute')
jest.mock('../../routes/forumRoute', () => 'forumRoute')
jest.mock('../../routes/insightRoute', () => 'insightRoute')
jest.mock('../../routes/profileRoute', () => 'profileRoute')
jest.mock('../../routes/recoveryGoalRoute', () => 'recoveryGoalRoute')
jest.mock('../../routes/supportRoute', () => 'supportRoute')
jest.mock('../../routes/userRoute', () => 'userRoute')

describe('/dev route gating', () => {
    afterEach(() => {
        jest.resetModules()
    })

    const mountRoutes = (env: string) => {
        jest.doMock('../../../config', () => ({
            env,
            serverConfig: { apiVersion: 'v1' }
        }))

        const mockApp = {
            get: jest.fn(),
            use: jest.fn()
        } as unknown as Express

        const { declareRoutes } = require('../../routes/declare_routes')
        declareRoutes(mockApp)

        return mockApp
    }

    it('mounts /dev in non-production environments', () => {
        const app = mountRoutes('development')

        expect(app.use).toHaveBeenCalledWith(
            '/dev',
            'devRoute'
        )
    })

    it('does not mount /dev in production', () => {
        const app = mountRoutes('production')

        expect(app.use).not.toHaveBeenCalledWith(
            '/dev',
            expect.anything()
        )
    })
})

describe('/api-docs route gating', () => {
    afterEach(() => {
        jest.resetModules()
    })

    const mountRoutes = (env: string) => {
        jest.doMock('../../../config', () => ({
            env,
            serverConfig: { apiVersion: 'v1' }
        }))

        const mockApp = {
            get: jest.fn(),
            use: jest.fn()
        } as unknown as Express

        const { declareRoutes } = require('../../routes/declare_routes')
        declareRoutes(mockApp)

        return mockApp
    }

    it('mounts /api-docs in development', () => {
        const app = mountRoutes('development')

        expect(app.use).toHaveBeenCalledWith(
            '/api-docs',
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it('mounts /api-docs in staging', () => {
        const app = mountRoutes('staging')

        expect(app.use).toHaveBeenCalledWith(
            '/api-docs',
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })

    it('does not mount /api-docs in production', () => {
        const app = mountRoutes('production')

        expect(app.use).not.toHaveBeenCalledWith(
            '/api-docs',
            expect.anything(),
            expect.anything(),
            expect.anything()
        )
    })
})
