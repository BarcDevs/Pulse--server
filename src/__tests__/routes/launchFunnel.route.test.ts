import supertest from 'supertest'

import { launchFunnelConfig, serverConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { launchFunnelCookieName } from '../../constants/launchFunnel'
import { prismaMock } from '../setup/jestSetup'

const baseUrl = `/api/${serverConfig.apiVersion}/launch-funnel`
const secret = 'a-shared-secret-of-20-chars'
const token = 'tok_AAAAAAAAAAAAAAAAAAAA'
const otherToken = 'tok_BBBBBBBBBBBBBBBBBBBB'

describe(`GET ${baseUrl}`, () => {
    const originalSecret = launchFunnelConfig.secret

    beforeEach(() => {
        launchFunnelConfig.secret = secret
    })

    afterAll(() => {
        launchFunnelConfig.secret = originalSecret
    })

    it.each([
        ['no Authorization header', undefined],
        ['a wrong secret', 'Bearer not-the-right-secret-at-all'],
        ['a non-Bearer scheme', `Basic ${secret}`],
        ['an empty Bearer value', 'Bearer ']
    ])('returns 401 and no data for %s', async (_name, header) => {
        const request = supertest(App).get(baseUrl)
        const response = await (header
            ? request.set('Authorization', header)
            : request)

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        expect(response.body.opened).toBeUndefined()
        expect(response.body.registered).toBeUndefined()
        expect(prismaMock.launchFunnelToken.findMany).not.toHaveBeenCalled()
    })

    it('returns 401 for every request while the secret is unset', async () => {
        launchFunnelConfig.secret = ''

        const response = await supertest(App)
            .get(baseUrl)
            .set('Authorization', 'Bearer ')

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        expect(prismaMock.launchFunnelToken.findMany).not.toHaveBeenCalled()
    })

    it('returns 401 while the secret is shorter than 16 chars', async () => {
        launchFunnelConfig.secret = 'short'

        const response = await supertest(App)
            .get(baseUrl)
            .set('Authorization', 'Bearer short')

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
    })

    it('returns opened, guest and registered tokens, each inside opened', async () => {
        const directToken = 'tok_CCCCCCCCCCCCCCCCCCCC'

        prismaMock.launchFunnelToken.findMany.mockResolvedValue([
            { token, guestAt: new Date(), registeredAt: new Date() },
            { token: otherToken, guestAt: new Date(), registeredAt: null },
            { token: directToken, guestAt: null, registeredAt: new Date() }
        ] as never)

        const response = await supertest(App)
            .get(baseUrl)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.status).toBe(HttpStatusCodes.OK)
        expect(response.body).toEqual({
            opened: [token, otherToken, directToken],
            guests: [token, otherToken],
            registered: [token, directToken]
        })
    })

    it('returns empty lists when nothing was recorded', async () => {
        prismaMock.launchFunnelToken.findMany.mockResolvedValue([])

        const response = await supertest(App)
            .get(baseUrl)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.body).toEqual({
            opened: [],
            guests: [],
            registered: []
        })
    })
})

describe(`POST ${baseUrl}/open`, () => {
    it.each([
        ['a missing token', {}],
        ['a non-string token', { token: 123 }],
        ['a too-short token', { token: 'abc' }],
        ['an email', { token: 'someone@example.com' }]
    ])('returns 400 for %s', async (_name, body) => {
        const response = await supertest(App)
            .post(`${baseUrl}/open`)
            .send(body)

        expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
        expect(prismaMock.launchFunnelToken.upsert).not.toHaveBeenCalled()
    })

    it('records the token and sets the httpOnly cookie, without CSRF', async () => {
        prismaMock.launchFunnelToken.upsert.mockResolvedValue({} as never)

        const response = await supertest(App)
            .post(`${baseUrl}/open`)
            .send({ token })

        expect(response.status).toBe(HttpStatusCodes.NO_CONTENT)
        expect(prismaMock.launchFunnelToken.upsert).toHaveBeenCalledWith({
            where: { token },
            create: { token },
            update: {}
        })

        const cookie = (response.headers['set-cookie'] as unknown as string[])
            .find(value => value.startsWith(`${launchFunnelCookieName}=`))
        expect(cookie).toContain(token)
        expect(cookie).toContain('HttpOnly')
    })
})
