import * as launchFunnelModel from '../../models/launchFunnelModel'
import { prismaMock } from '../setup/jestSetup'

const token = 'tok_AAAAAAAAAAAAAAAAAAAA'

describe('launchFunnelModel', () => {
    describe('markGuest', () => {
        it('upserts the guest stage and never touches registeredAt', async () => {
            prismaMock.launchFunnelToken.upsert.mockResolvedValue({} as never)

            await launchFunnelModel.markGuest(token)

            expect(prismaMock.launchFunnelToken.upsert).toHaveBeenCalledWith({
                where: { token },
                create: {
                    token,
                    guestAt: expect.any(Date)
                },
                update: {
                    guestAt: expect.any(Date)
                }
            })
            const { update } = prismaMock.launchFunnelToken.upsert.mock.calls[0][0]
            expect(update).not.toHaveProperty('registeredAt')
        })

        it('creates the row when the visitor never hit the open call', async () => {
            prismaMock.launchFunnelToken.upsert.mockResolvedValue({} as never)

            await launchFunnelModel.markGuest(token)

            const { create } = prismaMock.launchFunnelToken.upsert.mock.calls[0][0]
            expect(create.token).toBe(token)
        })
    })

    describe('markRegistered', () => {
        it('records the registration without clearing the guest stage', async () => {
            prismaMock.launchFunnelToken.upsert.mockResolvedValue({} as never)

            await launchFunnelModel.markRegistered(token)

            const { update } = prismaMock.launchFunnelToken.upsert.mock.calls[0][0]
            expect(update).toHaveProperty('registeredAt')
            expect(update).not.toHaveProperty('guestAt')
        })
    })

    describe('getAllTokens', () => {
        it('selects the guest stage along with the registration', async () => {
            prismaMock.launchFunnelToken.findMany.mockResolvedValue([])

            await launchFunnelModel.getAllTokens()

            expect(prismaMock.launchFunnelToken.findMany).toHaveBeenCalledWith({
                select: {
                    token: true,
                    guestAt: true,
                    registeredAt: true
                }
            })
        })
    })
})
