import { errorFactory } from '../errors/factory'
import type {
    MilestoneType,
    RecoveryGoalType
} from '../types/data/RecoveryGoalType'
import Prisma from '../utils/PrismaClient'

const goalInclude = {
    milestones: {
        orderBy: {
            order: 'asc' as const
        }
    }
}

export const createGoal = async (data: {
    userId: string
    title: string
    description?: string | null
}): Promise<RecoveryGoalType> =>
    Prisma.recoveryGoal.create({
        data,
        include: goalInclude
    })

export const getGoalById = async (
    id: string,
    userId: string
): Promise<RecoveryGoalType | null> =>
    Prisma.recoveryGoal.findFirst({
        where: {
            id,
            userId
        },
        include: goalInclude
    })

export const getGoalsByUserId = async (
    userId: string
): Promise<RecoveryGoalType[]> =>
    Prisma.recoveryGoal.findMany({
        where: { userId },
        include: goalInclude,
        orderBy: {
            createdAt: 'desc'
        }
    })

export const updateGoal = async (
    id: string,
    data: {
        title?: string
        description?: string | null
    }
): Promise<RecoveryGoalType | null> =>
    Prisma.recoveryGoal.update({
        where: { id },
        data,
        include: goalInclude
    })

export const deleteGoal = async (
    id: string
): Promise<void> => {
    await Prisma.recoveryGoal.delete({
        where: { id }
    })
}

export const getMilestoneById = async (
    id: string
): Promise<(MilestoneType & {
    goal: RecoveryGoalType
}) | null> =>
    Prisma.milestone.findUnique({
        where: { id },
        include: {
            goal: {
                include: goalInclude
            }
        }
    })

export const getMilestonesByGoalId = async (
    goalId: string
): Promise<MilestoneType[]> =>
    Prisma.milestone.findMany({
        where: { goalId },
        orderBy: {
            order: 'asc'
        }
    })

export const updateMilestone = async (
    id: string,
    data: {
        title?: string
        isCompleted?: boolean
    }
): Promise<MilestoneType | null> =>
    Prisma.milestone.update({
        where: { id },
        data
    })

export const deleteMilestone = async (
    id: string
): Promise<void> => {
    await Prisma.milestone.delete({
        where: { id }
    })
}

export const getMilestoneCountByGoalId = async (
    goalId: string
): Promise<number> =>
    Prisma.milestone.count({
        where: { goalId }
    })

export const createMilestoneWithinTransaction = async (data: {
    goalId: string
    title: string
}): Promise<MilestoneType> =>
    Prisma.$transaction(async (tx) => {
        const goal = await tx.recoveryGoal.findUnique({
            where: { id: data.goalId }
        })
        if (!goal)
            throw errorFactory.generic
                .notFound('Goal not found')

        const count = await tx.milestone.count({
            where: { goalId: data.goalId }
        })

        if (count >= 4) {
            throw errorFactory.generic.conflict(
                'Maximum 4 milestones per goal allowed'
            )
        }

        return tx.milestone.create({
            data: {
                goalId: data.goalId,
                title: data.title,
                order: count
            }
        })
    })
