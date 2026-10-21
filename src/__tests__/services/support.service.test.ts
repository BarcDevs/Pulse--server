import { emailConfig } from '../../../config'
import { recordTicketReply } from '../../services/supportService'
import { sendEmail } from '../../utils/emailSender'
import { prismaMock } from '../setup/jestSetup'

const ticketId = 'ticket-1'
const adminId = 'admin-1'
const body = 'Thanks for reaching out, we fixed it'

const mockTicket = (status: string) =>
    prismaMock.supportTicket.findUnique.mockResolvedValue({
        topic: 'technical',
        senderEmail: 'visitor@test.com',
        status
    } as never)

describe('recordTicketReply', () => {
    it('emails the sender, stores the reply and marks the ticket ANSWERED', async () => {
        mockTicket('NEW')

        await recordTicketReply({ ticketId, adminId, body })

        expect(sendEmail).toHaveBeenCalledWith(
            'visitor@test.com',
            'Re: [Pulse support] technical',
            body,
            undefined,
            emailConfig.supportEmail
        )
        expect(prismaMock.supportTicketReply.create).toHaveBeenCalledWith({
            data: {
                ticketId,
                body,
                sentByUserId: adminId
            }
        })
        expect(prismaMock.supportTicket.update).toHaveBeenCalledWith({
            where: { id: ticketId },
            data: { status: 'ANSWERED' }
        })
    })

    it('stores the reply only after the email was sent', async () => {
        mockTicket('NEW')

        await recordTicketReply({ ticketId, adminId, body })

        expect(
            (sendEmail as jest.Mock).mock.invocationCallOrder[0]
        ).toBeLessThan(
            prismaMock.supportTicketReply.create.mock.invocationCallOrder[0]
        )
    })

    it('can answer an already ANSWERED ticket again', async () => {
        mockTicket('ANSWERED')

        await recordTicketReply({ ticketId, adminId, body })

        expect(prismaMock.supportTicketReply.create).toHaveBeenCalledTimes(1)
    })

    it('stores nothing and leaves the status when the email fails', async () => {
        mockTicket('NEW')
        ;(sendEmail as jest.Mock)
            .mockRejectedValueOnce(new Error('smtp down'))

        await expect(
            recordTicketReply({ ticketId, adminId, body })
        ).rejects.toThrow('smtp down')

        expect(prismaMock.supportTicketReply.create).not.toHaveBeenCalled()
        expect(prismaMock.supportTicket.update).not.toHaveBeenCalled()
    })

    it('throws not found for an unknown ticket and sends nothing', async () => {
        prismaMock.supportTicket.findUnique.mockResolvedValue(null)

        await expect(
            recordTicketReply({ ticketId, adminId, body })
        ).rejects.toThrow(/Ticket not found/)

        expect(sendEmail).not.toHaveBeenCalled()
    })

    it('refuses to reply to a CLOSED ticket and sends nothing', async () => {
        mockTicket('CLOSED')

        await expect(
            recordTicketReply({ ticketId, adminId, body })
        ).rejects.toThrow('Ticket is closed')

        expect(sendEmail).not.toHaveBeenCalled()
        expect(prismaMock.supportTicketReply.create).not.toHaveBeenCalled()
    })
})
