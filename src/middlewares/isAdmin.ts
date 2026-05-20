import type {
    NextFunction,
    Request,
    Response
} from 'express'

import { errorFactory } from '../errors/factory/ErrorFactory'
import Prisma from '../utils/prismaClient'

export const isAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const { userId } = req

    if (!userId) {
        throw errorFactory.auth.unauthorized()
    }

    const user = await Prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    })

    if (!user || user.role !== 'ADMIN') {
        throw errorFactory.auth.forbidden()
    }

    next()
}
