import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'
import {
    supportTicketClosedRetentionMs,
    supportTicketOpenRetentionMs
} from '../../constants/support/supportTickets'
import {
    dayInMs,
    secondInMs
} from '../../constants/time'
import { createToken } from '../../lib/authCrypto'
import { purgeExpiredAccounts } from '../../services/accountDeletionService'
import { recordTicketReply } from '../../services/supportService'
import { purgeExpiredSupportTickets } from '../../services/supportTicketRetentionService'
import { sendEmail } from '../../utils/emailSender'
import Prisma from '../../utils/prismaClient'

const SIGNUP_URL = `/api/${serverConfig.apiVersion}/auth/signup`
const CONTACT_URL = `/api/${serverConfig.apiVersion}/support/contact`
const TICKETS_URL = `/api/${serverConfig.apiVersion}/support/tickets`

const ago = (ms: number) => new Date(Date.now() - ms)

const createUser = async (name: string) => {
    await supertest(App).post(SIGNUP_URL).send({
        firstName: 'Ticket',
        lastName: 'Tester',
        email: `${name}@test.com`,
        password: 'Password123!'
    })

    return Prisma.user.findUniqueOrThrow({
        where: { email: `${name}@test.com` }
    })
}

const createTicket = (data: {
    status?: 'NEW' | 'ANSWERED' | 'CLOSED'
    createdAt?: Date
    closedAt?: Date | null
    userId?: string | null
}) =>
    Prisma.supportTicket.create({
        data: {
            topic: 'technical',
            message: 'The app will not load',
            senderEmail: 'visitor@test.com',
            ...data
        }
    })

const markPurgeable = (userId: string) =>
    Prisma.user.update({
        where: { id: userId },
        data: {
            active: false,
            deletedAt: ago(40 * dayInMs)
        }
    })

describe('Support tickets - Integration', () => {
    it('POST /support/contact stores the ticket and links the signed-in user', async () => {
        const user = await createUser('ticketowner')

        const response = await supertest(App)
            .post(CONTACT_URL)
            .set('Cookie', [`accessToken=${createToken(user)}`])
            .send({
                topic: 'account',
                message: 'Please help'
            })

        expect(response.status).toBe(HttpStatusCodes.OK)
        const tickets = await Prisma.supportTicket.findMany()
        expect(tickets).toHaveLength(1)
        expect(tickets[0]).toMatchObject({
            topic: 'account',
            message: 'Please help',
            senderEmail: user.email,
            userId: user.id,
            status: 'NEW',
            closedAt: null
        })
    })

    it('keeps the ticket when the support email fails', async () => {
        ;(sendEmail as jest.Mock)
            .mockRejectedValueOnce(new Error('smtp down'))

        const response = await supertest(App)
            .post(CONTACT_URL)
            .send({
                topic: 'technical',
                message: 'Still stored',
                email: 'guest@test.com'
            })

        expect(response.status)
            .toBe(HttpStatusCodes.INTERNAL_SERVER_ERROR)
        const tickets = await Prisma.supportTicket.findMany()
        expect(tickets).toHaveLength(1)
        expect(tickets[0].senderEmail).toBe('guest@test.com')
    })

    it('GET /support/tickets is admin only', async () => {
        const user = await createUser('regular')
        await createTicket({})

        const asUser = await supertest(App)
            .get(TICKETS_URL)
            .set('Cookie', [`accessToken=${createToken(user)}`])
        expect(asUser.status).toBe(HttpStatusCodes.FORBIDDEN)

        await Prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        })
        const asAdmin = await supertest(App)
            .get(TICKETS_URL)
            .set('Cookie', [`accessToken=${createToken(user)}`])
        expect(asAdmin.status).toBe(HttpStatusCodes.OK)
        expect(asAdmin.body.data.items).toHaveLength(1)
    })

    it('pages by cursor without skipping or repeating a ticket', async () => {
        const admin = await createUser('pager')
        await Prisma.user.update({
            where: { id: admin.id },
            data: { role: 'ADMIN' }
        })
        const cookie = [`accessToken=${createToken(admin)}`]
        const created = []
        for (let index = 0; index < 5; index++)
            created.push(await createTicket({
                createdAt: ago((5 - index) * secondInMs)
            }))

        const first = await supertest(App)
            .get(`${TICKETS_URL}?limit=3`)
            .set('Cookie', cookie)
        const second = await supertest(App)
            .get(`${TICKETS_URL}?limit=3&cursor=${first.body.data.nextCursor}`)
            .set('Cookie', cookie)

        const ids = [
            ...first.body.data.items,
            ...second.body.data.items
        ].map((ticket: { id: string }) => ticket.id)
        expect(ids).toEqual(created.map(ticket => ticket.id).reverse())
        expect(first.body.data.nextCursor).not.toBeNull()
        expect(second.body.data.nextCursor).toBeNull()
    })

    it('recordTicketReply stores the reply, sets ANSWERED and cascades on delete', async () => {
        const admin = await createUser('replier')
        const ticket = await createTicket({})

        await recordTicketReply({
            ticketId: ticket.id,
            adminId: admin.id,
            body: 'We fixed it'
        })

        const after = await Prisma.supportTicket.findUniqueOrThrow({
            where: { id: ticket.id },
            include: { replies: true }
        })
        expect(after.status).toBe('ANSWERED')
        expect(after.replies).toHaveLength(1)
        expect(after.replies[0]).toMatchObject({
            body: 'We fixed it',
            sentByUserId: admin.id
        })

        await Prisma.supportTicket.delete({ where: { id: ticket.id } })
        expect(await Prisma.supportTicketReply.count()).toBe(0)
    })

    describe('account purge', () => {
        it('keeps the ticket with userId null and the email kept', async () => {
            const user = await createUser('purged')
            const ticket = await createTicket({
                userId: user.id,
                createdAt: ago(dayInMs)
            })
            await markPurgeable(user.id)

            await purgeExpiredAccounts()

            expect(await Prisma.user.count({ where: { id: user.id } }))
                .toBe(0)
            const kept = await Prisma.supportTicket.findUnique({
                where: { id: ticket.id }
            })
            expect(kept).not.toBeNull()
            expect(kept!.userId).toBeNull()
            expect(kept!.senderEmail).toBe('visitor@test.com')
        })
    })

    describe('retention', () => {
        it('deletes CLOSED tickets 6+ months after closing and keeps younger ones', async () => {
            const expired = await createTicket({
                status: 'CLOSED',
                closedAt: ago(supportTicketClosedRetentionMs + dayInMs)
            })
            const recentlyClosed = await createTicket({
                status: 'CLOSED',
                closedAt: ago(supportTicketClosedRetentionMs - dayInMs)
            })

            const count = await purgeExpiredSupportTickets()

            expect(count).toBe(1)
            expect(await Prisma.supportTicket.findUnique({
                where: { id: expired.id }
            })).toBeNull()
            expect(await Prisma.supportTicket.findUnique({
                where: { id: recentlyClosed.id }
            })).not.toBeNull()
        })

        it('deletes never-closed tickets after 24 months and keeps younger ones', async () => {
            await createTicket({
                createdAt: ago(supportTicketOpenRetentionMs + dayInMs)
            })
            await createTicket({
                status: 'ANSWERED',
                createdAt: ago(supportTicketOpenRetentionMs + dayInMs)
            })
            const young = await createTicket({
                createdAt: ago(supportTicketOpenRetentionMs - dayInMs)
            })

            const count = await purgeExpiredSupportTickets()

            expect(count).toBe(2)
            const left = await Prisma.supportTicket.findMany()
            expect(left.map(ticket => ticket.id)).toEqual([young.id])
        })

        it('keeps an old ticket that was closed recently', async () => {
            const closedRecently = await createTicket({
                status: 'CLOSED',
                createdAt: ago(supportTicketOpenRetentionMs * 2),
                closedAt: ago(dayInMs)
            })

            expect(await purgeExpiredSupportTickets()).toBe(0)
            expect(await Prisma.supportTicket.findUnique({
                where: { id: closedRecently.id }
            })).not.toBeNull()
        })

        it('removes a purged account ticket, its email and replies at retention', async () => {
            const user = await createUser('orphan')
            const ticket = await createTicket({
                userId: user.id,
                status: 'CLOSED',
                closedAt: ago(supportTicketClosedRetentionMs + dayInMs)
            })
            await Prisma.supportTicketReply.create({
                data: {
                    ticketId: ticket.id,
                    body: 'Closing this'
                }
            })
            await markPurgeable(user.id)
            await purgeExpiredAccounts()
            expect(await Prisma.supportTicket.count()).toBe(1)

            await purgeExpiredSupportTickets()

            expect(await Prisma.supportTicket.count()).toBe(0)
            expect(await Prisma.supportTicketReply.count()).toBe(0)
        })
    })
})
