import supertest from 'supertest'

import { serverConfig, supportReaderConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import { supportTicketExcerptMaxLength } from '../../constants/support/supportTickets'
import {
    supportRateLimiter,
    supportReaderRateLimiter } from '../../middlewares/rateLimiting'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthToken,
    createMockUser,
    withBearerAuth
} from '../setup/testSetup'

const baseUrl = `/api/${serverConfig.apiVersion}/support`
const listUrl = `${baseUrl}/tickets`
const readerUrl = `${baseUrl}/claude/tickets`
const secret = 'a-support-reader-secret-20-chars'

const createTicket = (overrides: Record<string, unknown> = {}) => ({
    id: 'ticket-1',
    topic: 'technical',
    message: 'The app will not load',
    senderEmail: 'visitor@test.com',
    userId: 'user-1',
    status: 'NEW',
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    closedAt: null,
    ...overrides
})

const asAdmin = (request: supertest.Test) => {
    prismaMock.user.findUnique
        .mockResolvedValue({ role: 'ADMIN' } as never)

    return withBearerAuth(
        request,
        createAuthToken(createMockUser({ role: 'ADMIN' }))
    )
}

const asRegularUser = (request: supertest.Test) => {
    prismaMock.user.findUnique
        .mockResolvedValue({ role: 'USER' } as never)

    return withBearerAuth(
        request,
        createAuthToken(createMockUser())
    )
}

describe(`GET ${listUrl}`, () => {
    it('returns 401 without a session', async () => {
        const response = await supertest(App).get(listUrl)

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })

    it('returns 403 for a signed-in non-admin', async () => {
        const response = await asRegularUser(supertest(App).get(listUrl))

        expect(response.status).toBe(HttpStatusCodes.FORBIDDEN)
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })

    it('does not accept the reader secret', async () => {
        supportReaderConfig.secret = secret

        const response = await supertest(App)
            .get(listUrl)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })

    it('lists tickets newest first with the full admin fields', async () => {
        prismaMock.supportTicket.findMany
            .mockResolvedValue([createTicket()] as never)

        const response = await asAdmin(supertest(App).get(listUrl))

        expect(response.status).toBe(HttpStatusCodes.OK)
        expect(response.body.data.items).toHaveLength(1)
        expect(response.body.data.items[0]).toMatchObject({
            id: 'ticket-1',
            message: 'The app will not load',
            senderEmail: 'visitor@test.com',
            userId: 'user-1'
        })
        expect(response.body.data.nextCursor).toBeNull()
        expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith({
            where: { status: undefined },
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' }
            ],
            take: 21
        })
    })

    it('filters by status and returns the next cursor when more rows exist', async () => {
        prismaMock.supportTicket.findMany.mockResolvedValue([
            createTicket({ id: 'ticket-3' }),
            createTicket({ id: 'ticket-2' }),
            createTicket({ id: 'ticket-1' })
        ] as never)

        const response = await asAdmin(
            supertest(App).get(`${listUrl}?status=NEW&limit=2`)
        )

        expect(response.status).toBe(HttpStatusCodes.OK)
        expect(response.body.data.items.map(
            (ticket: { id: string }) => ticket.id
        )).toEqual(['ticket-3', 'ticket-2'])
        expect(response.body.data.nextCursor).toBe('ticket-2')
        expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: 'NEW' },
                take: 3
            })
        )
    })

    it('continues after a cursor', async () => {
        prismaMock.supportTicket.findMany
            .mockResolvedValue([createTicket({ id: 'ticket-1' })] as never)

        await asAdmin(supertest(App).get(`${listUrl}?cursor=ticket-2`))

        expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                cursor: { id: 'ticket-2' },
                skip: 1
            })
        )
    })

    it('returns 404 for a cursor that does not exist', async () => {
        prismaMock.supportTicket.findMany.mockResolvedValue([])
        prismaMock.supportTicket.count.mockResolvedValue(0)

        const response = await asAdmin(
            supertest(App).get(`${listUrl}?cursor=missing`)
        )

        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
    })

    it.each([
        ['an unknown status', 'status=DONE'],
        ['a zero limit', 'limit=0'],
        ['a limit over 100', 'limit=101']
    ])('returns 400 for %s', async (_name, query) => {
        const response = await asAdmin(
            supertest(App).get(`${listUrl}?${query}`)
        )

        expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })
})

describe(`GET ${listUrl}/:ticketId`, () => {
    it('returns 401 without a session', async () => {
        const response = await supertest(App).get(`${listUrl}/ticket-1`)

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
    })

    it('returns 403 for a signed-in non-admin', async () => {
        const response = await asRegularUser(
            supertest(App).get(`${listUrl}/ticket-1`)
        )

        expect(response.status).toBe(HttpStatusCodes.FORBIDDEN)
        expect(prismaMock.supportTicket.findUnique).not.toHaveBeenCalled()
    })

    it('returns the ticket with its replies for an admin', async () => {
        prismaMock.supportTicket.findUnique.mockResolvedValue({
            ...createTicket(),
            replies: [{
                id: 'reply-1',
                ticketId: 'ticket-1',
                body: 'We are on it',
                sentByUserId: 'admin-1',
                sentAt: new Date('2026-10-02T10:00:00Z')
            }]
        } as never)

        const response = await asAdmin(
            supertest(App).get(`${listUrl}/ticket-1`)
        )

        expect(response.status).toBe(HttpStatusCodes.OK)
        expect(response.body.data.id).toBe('ticket-1')
        expect(response.body.data.replies).toHaveLength(1)
        expect(response.body.data.replies[0].body).toBe('We are on it')
    })

    it('returns 404 for an unknown ticket', async () => {
        prismaMock.supportTicket.findUnique.mockResolvedValue(null)

        const response = await asAdmin(
            supertest(App).get(`${listUrl}/nope`)
        )

        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
    })
})

describe(`GET ${readerUrl}`, () => {
    const originalSecret = supportReaderConfig.secret

    beforeEach(() => {
        supportReaderConfig.secret = secret
    })

    afterAll(() => {
        supportReaderConfig.secret = originalSecret
    })

    it.each([
        ['no Authorization header', undefined],
        ['a wrong secret', 'Bearer not-the-right-secret-at-all'],
        ['a non-Bearer scheme', `Basic ${secret}`],
        ['an empty Bearer value', 'Bearer ']
    ])('returns 401 and no data for %s', async (_name, header) => {
        const request = supertest(App).get(readerUrl)
        const response = await (header
            ? request.set('Authorization', header)
            : request)

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        expect(response.body.data).toBeUndefined()
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })

    it('returns 401 for every request while the secret is unset', async () => {
        supportReaderConfig.secret = ''

        const response = await supertest(App)
            .get(readerUrl)
            .set('Authorization', 'Bearer ')

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })

    it('returns 401 while the secret is shorter than 16 chars', async () => {
        supportReaderConfig.secret = 'short'

        const response = await supertest(App)
            .get(readerUrl)
            .set('Authorization', 'Bearer short')

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
    })

    it('does not accept the launch funnel secret', async () => {
        const response = await supertest(App)
            .get(readerUrl)
            .set('Authorization', 'Bearer a-shared-secret-of-20-chars')

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
    })

    it('does not accept an admin session cookie', async () => {
        const response = await asAdmin(supertest(App).get(readerUrl))

        expect(response.status).toBe(HttpStatusCodes.UNAUTHORIZED)
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })

    it('returns only the allow-listed fields with a masked email and an excerpt', async () => {
        const longMessage = 'x'.repeat(supportTicketExcerptMaxLength + 50)
        prismaMock.supportTicket.findMany.mockResolvedValue([
            createTicket({ message: longMessage })
        ] as never)

        const response = await supertest(App)
            .get(readerUrl)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.status).toBe(HttpStatusCodes.OK)
        const [ticket] = response.body.data.items
        expect(Object.keys(ticket).sort()).toEqual([
            'createdAt',
            'excerpt',
            'id',
            'senderEmail',
            'status',
            'topic'
        ])
        expect(ticket.senderEmail).toBe('v***@test.com')
        expect(ticket.excerpt).toBe(`${'x'.repeat(supportTicketExcerptMaxLength)}...`)
        expect(JSON.stringify(response.body)).not.toContain('user-1')
        expect(JSON.stringify(response.body)).not.toContain('visitor@test.com')
        expect(JSON.stringify(response.body)).not.toContain(longMessage)
    })

    it('keeps a short message whole in the excerpt', async () => {
        prismaMock.supportTicket.findMany
            .mockResolvedValue([createTicket()] as never)

        const response = await supertest(App)
            .get(readerUrl)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.body.data.items[0].excerpt)
            .toBe('The app will not load')
    })

    it('supports the status filter and cursor paging', async () => {
        prismaMock.supportTicket.findMany.mockResolvedValue([
            createTicket({ id: 'ticket-2' }),
            createTicket({ id: 'ticket-1' })
        ] as never)

        const response = await supertest(App)
            .get(`${readerUrl}?status=NEW&limit=1`)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.status).toBe(HttpStatusCodes.OK)
        expect(response.body.data.nextCursor).toBe('ticket-2')
        expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: 'NEW' },
                take: 2
            })
        )
    })

    it('returns 400 for an invalid query', async () => {
        const response = await supertest(App)
            .get(`${readerUrl}?status=DONE`)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.status).toBe(HttpStatusCodes.BAD_REQUEST)
    })

    it.each([
        ['POST', 'post'],
        ['PUT', 'put'],
        ['PATCH', 'patch'],
        ['DELETE', 'delete']
    ] as const)('does not expose %s', async (_name, method) => {
        const response = await supertest(App)[method](readerUrl)
            .set('Authorization', `Bearer ${secret}`)

        expect(response.status).toBe(HttpStatusCodes.NOT_FOUND)
        expect(prismaMock.supportTicket.findMany).not.toHaveBeenCalled()
    })

    it('runs its own limiter, not the contact form limiter', async () => {
        prismaMock.supportTicket.findMany.mockResolvedValue([])

        await supertest(App)
            .get(readerUrl)
            .set('Authorization', `Bearer ${secret}`)

        expect(supportReaderRateLimiter).toHaveBeenCalled()
        expect(supportRateLimiter).not.toHaveBeenCalled()
    })
})
