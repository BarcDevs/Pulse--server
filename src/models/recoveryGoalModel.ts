import { MAX_MILESTONES_PER_GOAL } from '../config/recoveryGoals'
import { errorFactory } from '../errors/factory/ErrorFactory'
import type {
    MilestoneType,
    RecoveryGoalType
} from '../types/data/RecoveryGoalType'
import {
    GoalStatus,
    MilestoneStatus
} from '../types/data/RecoveryGoalType'
import Prisma from '../utils/prismaClient'
import {
    convertGoalToDTO,
    convertMilestoneToDTO
} from '../utils/recoveryGoalDTOConverter'

export const getProfileIdForUser = async (
    userId: string
): Promise<string> => {
    const profile = await Prisma.profile
        .findUnique({
            where: { userId }
        })

    if (!profile)
        throw errorFactory.generic.notFound(
            `Profile not found for user ${userId}`
        )

    return profile.id
}

export const createGoal = async (
    data: {
        profileId: string
        title: string
        description?: string | null
        category: string
        isPrimary?: boolean
        targetDate?: Date
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx?: any
): Promise<RecoveryGoalType> => {
    const client = tx || Prisma
    const goal = await client.recoveryGoal.create({
        data: {
            profileId: data.profileId,
            title: data.title,
            description: data.description || null,
            category: data.category.toUpperCase(),
            isPrimary: data.isPrimary || false,
            status: GoalStatus.ACTIVE,
            targetDate: data.targetDate || null
        }
    })
    return convertGoalToDTO(goal)
}

export const getGoalById = async (
    id: string,
    profileId: string
): Promise<RecoveryGoalType | null> => {
    const goal = await Prisma.recoveryGoal.findFirst({
        where: {
            id,
            profileId
        }
    })
    return goal ? convertGoalToDTO(goal) : null
}

export const getGoalsByProfileId = async (
    profileId: string
): Promise<RecoveryGoalType[]> => {
    const goals = await Prisma.recoveryGoal.findMany({
        where: { profileId },
        orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'desc' }
        ]
    })
    return goals.map(convertGoalToDTO)
}

export const updateGoal = async (
    id: string,
    data: {
        title?: string
        description?: string | null
        status?: GoalStatus
        targetDate?: Date | null
        isPrimary?: boolean
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx?: any
): Promise<RecoveryGoalType | null> => {
    const client = tx || Prisma
    const updateData: any = { ...data }
    if (data.status) updateData.status = data.status.toUpperCase()
    const goal = await client.recoveryGoal.update({
        where: { id },
        data: updateData
    })
    return goal ? convertGoalToDTO(goal) : null
}

export const deleteGoal = async (id: string): Promise<void> => {
    await Prisma.recoveryGoal.delete({
        where: { id }
    })
}

export const setPrimaryGoal = async (
    profileId: string,
    goalId: string
): Promise<void> => {
    await Prisma.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT * FROM "RecoveryGoal" WHERE "profileId" = ${profileId} FOR UPDATE`

        await tx.recoveryGoal.updateMany({
            where: { profileId },
            data: { isPrimary: false }
        })

        await tx.recoveryGoal.update({
            where: { id: goalId },
            data: { isPrimary: true }
        })
    })
}

export const countMilestonesByGoalId = async (
    goalId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx?: any
): Promise<number> => {
    const client = tx || Prisma
    return client.milestone.count({
        where: { goalId }
    })
}

export const getMaxMilestoneOrder = async (
    goalId: string
): Promise<number | null> => {
    const result = await Prisma.milestone.aggregate({
        where: { goalId },
        _max: { order: true }
    })
    return result._max.order
}

export const createMilestonesInBatch = async (data: {
    goalId: string
    milestones: Array<{
        title: string
        description?: string | null
        order: number
    }>
    setFirstActive: boolean
}): Promise<MilestoneType[]> => {
    return Prisma.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT * FROM "RecoveryGoal" WHERE id = ${data.goalId} FOR UPDATE`

        const existingCount = await countMilestonesByGoalId(
            data.goalId,
            tx
        )

        if (existingCount + data.milestones.length > MAX_MILESTONES_PER_GOAL)
            throw errorFactory.generic.conflict(
                `Maximum ${MAX_MILESTONES_PER_GOAL} milestones per goal`
            )

        const milestones = []
        for (let i = 0; i < data.milestones.length; i++) {
            const milestone = await tx.milestone.create({
                data: {
                    goalId: data.goalId,
                    title: data.milestones[i].title,
                    description:
                        data.milestones[i].description || null,
                    order: data.milestones[i].order,
                    status:
                        data.setFirstActive && i === 0
                            ? MilestoneStatus.ACTIVE
                            : MilestoneStatus.LOCKED
                }
            })
            milestones.push(convertMilestoneToDTO(milestone))
        }

        return milestones
    })
}

export const getMilestoneById = async (
    id: string
): Promise<
    MilestoneType & {
        goal: RecoveryGoalType
    } | null
> => {
    const milestone = await Prisma.milestone.findUnique({
        where: { id },
        include: {
            goal: true
        }
    })

    if (!milestone) return null

    return {
        ...convertMilestoneToDTO(milestone),
        goal: convertGoalToDTO(milestone.goal)
    }
}

export const getMilestonesByGoalId = async (
    goalId: string
): Promise<MilestoneType[]> => {
    const milestones = await Prisma.milestone.findMany({
        where: { goalId },
        orderBy: {
            order: 'asc'
        }
    })

    return milestones.map(convertMilestoneToDTO)
}

export const completeMilestoneAndAdvance = async (
    milestoneId: string,
    goalId: string
): Promise<void> => {
    await Prisma.$transaction(async (tx: any) => {
        await tx.$executeRaw`SELECT * FROM "RecoveryGoal" WHERE id = ${goalId} FOR UPDATE`

        const milestone = await tx.milestone.findUnique({
            where: { id: milestoneId }
        })

        if (!milestone)
            throw errorFactory.generic.notFound('Milestone not found')

        if (milestone.status === MilestoneStatus.COMPLETED)
            return

        if (milestone.status !== MilestoneStatus.ACTIVE)
            throw errorFactory.generic.conflict(
                'Only ACTIVE milestones can be completed'
            )

        await tx.milestone.update({
            where: { id: milestoneId },
            data: {
                status: MilestoneStatus.COMPLETED,
                completedAt: new Date()
            }
        })

        const nextMilestone = await tx.milestone.findFirst({
            where: {
                goalId,
                status: { not: MilestoneStatus.COMPLETED }
            },
            orderBy: { order: 'asc' }
        })

        if (nextMilestone) {
            await tx.milestone.update({
                where: { id: nextMilestone.id },
                data: { status: MilestoneStatus.ACTIVE }
            })
        } else {
            await tx.recoveryGoal.update({
                where: { id: goalId },
                data: { status: GoalStatus.COMPLETED }
            })
        }
    })
}

export const lockNonCompletedMilestones = async (
    goalId: string
): Promise<void> => {
    await Prisma.milestone.updateMany({
        where: {
            goalId,
            status: { not: MilestoneStatus.COMPLETED }
        },
        data: { status: MilestoneStatus.LOCKED }
    })
}

export const updateMilestone = async (
    id: string,
    data: {
        title?: string
        description?: string | null
        order?: number
    }
): Promise<MilestoneType | null> => {
    const updateData: any = {}
    if (data.title !== undefined)
        updateData.title = data.title
    if (data.description !== undefined)
        updateData.description = data.description
    if (data.order !== undefined)
        updateData.order = data.order

    const milestone = await Prisma.milestone.update({
        where: { id },
        data: updateData
    })

    return milestone ? convertMilestoneToDTO(milestone) : null
}

export const deleteMilestone = async (id: string): Promise<void> => {
    await Prisma.milestone.delete({
        where: { id }
    })
}
