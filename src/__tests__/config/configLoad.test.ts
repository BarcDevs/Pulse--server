import { config as loadDotenv } from 'dotenv'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
    authConfig,
    databaseConfig,
    env,
    isDev,
    isProd,
    serverConfig
} from '../../../config'

describe('config loading', () => {
    it('resolves the test environment file over defaults', () => {
        expect(env).toBe('test')
        expect(isDev).toBe(false)
        expect(isProd).toBe(false)
        expect(serverConfig.port).toBe(8000)
        expect(serverConfig.host).toBe('localhost')
        expect(serverConfig.protocol).toBe('http')
    })

    it('reads values that only exist in default.ts', () => {
        expect(typeof serverConfig.apiVersion).toBe('string')
        expect(typeof databaseConfig.poolMax).toBe('number')
    })

    it('applies the test jwt secret override', () => {
        expect(authConfig.jwtSecret.length).toBeGreaterThanOrEqual(32)
    })
})

describe('dotenv loading', () => {
    const key = 'PULSE_DOTENV_PROBE'
    let dir: string

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'dotenv-probe-'))
    })

    afterEach(() => {
        delete process.env[key]
        rmSync(dir, { recursive: true, force: true })
    })

    it('loads values from a .env file into process.env', () => {
        const path = join(dir, '.env')
        writeFileSync(path, `${key}=loaded\n`)

        const result = loadDotenv({ path, quiet: true })

        expect(existsSync(path)).toBe(true)
        expect(result.error).toBeUndefined()
        expect(process.env[key]).toBe('loaded')
    })
})
