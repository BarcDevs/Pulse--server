import type { Prisma as PrismaTypes } from '../../prisma/generated/prisma/client'
import {
    type GoalCategory,
    GoalStatus,
    MilestoneStatus
} from '../../prisma/generated/prisma/enums'
import { MAX_MILESTONES_PER_GOAL } from '../config/recoveryGoals'
import { errorFactory } from '../errors/factory/ErrorFactory'
import type {
    MilestoneType,
    RecoveryGoalType,
    StatsFilter
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
    tx?: PrismaTypes.TransactionClient
): Promise<RecoveryGoalType> => {
    const client = tx || Prisma
    const goal = await client.recoveryGoal.create({
        data: {
            profileId: data.profileId,
            title: data.title,
            description: data.description || null,
            category: data.category.toUpperCase() as GoalCategory,
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
    tx?: PrismaTypes.TransactionClient
): Promise<RecoveryGoalType | null> => {
    const client = tx || Prisma
    const updateData: {
        title?: string
        description?: string | null
        status?: GoalStatus
        targetDate?: Date | null
        isPrimary?: boolean
    } = { ...data }
    if (data.status) updateData.status =
        data.status.toUpperCase() as GoalStatus
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
    await Prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
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
    tx?: PrismaTypes.TransactionClient
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
    return Prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
        await tx.$executeRaw`SELECT * FROM "RecoveryGoal" WHERE id = ${data.goalId} FOR UPDATE`

        const existingCount = await countMilestonesByGoalId(
            data.goalId,
            tx
        )

        const totalCount = (
        existingCount + data.milestones.length
    )
        if (totalCount > MAX_MILESTONES_PER_GOAL)
            throw errorFactory.generic.conflict(
                `Maximum `
                + `${MAX_MILESTONES_PER_GOAL} `
                + 'milestones per goal'
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
    await Prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
        await tx.$executeRaw`SELECT * FROM "RecoveryGoal" WHERE id = ${goalId} FOR UPDATE`

        const milestone = await tx.milestone.findUnique({
            where: { id: milestoneId }
        })

        if (!milestone)
            throw errorFactory.generic.notFound(
                'Milestone not found'
            )

        const isCompleted = (
            milestone.status
                === MilestoneStatus.COMPLETED
        )
        if (isCompleted) return

        const isActive = (
            milestone.status
                === MilestoneStatus.ACTIVE
        )
        if (!isActive)
            throw errorFactory.generic.conflict(
                'Only ACTIVE milestones can '
                + 'be completed'
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
    const updateData: {
        title?: string
        description?: string | null
        order?: number
    } = {}
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

export const getGoalsStats = async (
    profileId: string,
    filters?: StatsFilter
): Promise<{
    totalCreated: number
    completed: number
    active: number
    paused: number
    byCategory: Record<string, number>
}> => {
    const baseWhere = {
        profileId
    }

    const hasDateFilter = (
        filters?.fromDate || filters?.toDate
    )
    const dateFilter = hasDateFilter
        ? {
            createdAt: {
                ...(
                    filters?.fromDate && {
                        gte: filters.fromDate
                    }
                ),
                ...(
                    filters?.toDate && {
                        lte: filters.toDate
                    }
                )
            }
        }
        : {}

    const categoryFilter = filters?.category
        ? {
            category: filters.category
                .toUpperCase() as GoalCategory
        }
        : {}

    const [
        totalCreated,
        completed,
        active,
        paused
    ] = await Promise.all([
        Prisma.recoveryGoal.count({
            where: {
                ...baseWhere,
                ...dateFilter,
                ...categoryFilter
            }
        }),
        Prisma.recoveryGoal.count({
            where: {
                ...baseWhere,
                status: GoalStatus.COMPLETED,
                ...dateFilter,
                ...categoryFilter
            }
        }),
        Prisma.recoveryGoal.count({
            where: {
                ...baseWhere,
                status: GoalStatus.ACTIVE,
                ...dateFilter,
                ...categoryFilter
            }
        }),
        Prisma.recoveryGoal.count({
            where: {
                ...baseWhere,
                status: GoalStatus.PAUSED,
                ...dateFilter,
                ...categoryFilter
            }
        })
    ])

    const categoryCounts = await Prisma.recoveryGoal.groupBy({
        by: ['category'],
        where: {
            ...baseWhere,
            ...dateFilter,
            ...categoryFilter
        },
        _count: {
            _all: true
        }
    })

    const byCategory: Record<
        string,
        number
    > = {}
    categoryCounts.forEach((item) => {
        byCategory[item.category] = item._count._all
    })

    return {
        totalCreated,
        completed,
        active,
        paused,
        byCategory
    }
}

export const getMilestonesStats = async (
    profileId: string,
    filters?: StatsFilter
): Promise<{
    totalCreated: number
    completed: number
    active: number
    paused: number
}> => {
    const hasDateFilter = (
        filters?.fromDate || filters?.toDate
    )
    const dateFilter = hasDateFilter
        ? {
            createdAt: {
                ...(
                    filters?.fromDate && {
                        gte: filters.fromDate
                    }
                ),
                ...(
                    filters?.toDate && {
                        lte: filters.toDate
                    }
                )
            }
        }
        : {}

    const goalWhereCategory = filters?.category
        ? {
            category: filters.category
                .toUpperCase() as GoalCategory
        }
        : {}

    const [
        totalCreated,
        completed,
        active,
        paused
    ] = await Promise.all([
        Prisma.milestone.count({
            where: {
                goal: {
                    profileId,
                    ...goalWhereCategory
                },
                ...dateFilter
            }
        }),
        Prisma.milestone.count({
            where: {
                goal: {
                    profileId,
                    ...goalWhereCategory
                },
                status: MilestoneStatus.COMPLETED,
                ...dateFilter
            }
        }),
        Prisma.milestone.count({
            where: {
                goal: {
                    profileId,
                    ...goalWhereCategory
                },
                status: MilestoneStatus.ACTIVE,
                ...dateFilter
            }
        }),
        Prisma.milestone.count({
            where: {
                goal: {
                    profileId,
                    ...goalWhereCategory
                },
                status: MilestoneStatus.LOCKED,
                ...dateFilter
            }
        })
    ])

    return {
        totalCreated,
        completed,
        active,
        paused
    }
}

export const getCompletedDatesForStreak = async (
    profileId: string,
    filters?: StatsFilter
): Promise<Date[]> => {
    const hasDateFilter = (
        filters?.fromDate || filters?.toDate
    )
    const dateFilter = hasDateFilter
        ? {
            ...(
                filters?.fromDate && {
                    gte: filters.fromDate
                }
            ),
            ...(
                filters?.toDate && {
                    lte: filters.toDate
                }
            )
        }
        : undefined

    const completedGoals = await (
        Prisma.recoveryGoal.findMany({
            where: {
                profileId,
                status: GoalStatus.COMPLETED,
                updatedAt: dateFilter,
                ...(
                    filters?.category && {
                        category: filters.category
                            .toUpperCase() as GoalCategory
                    }
                )
            },
            select: { updatedAt: true }
        })
    )

    const completedMilestones = await (
        Prisma.milestone.findMany({
            where: {
                goal: {
                    profileId,
                    ...(
                        filters?.category && {
                            category: (
                                filters.category
                                    .toUpperCase() as GoalCategory
                            )
                        }
                    )
                },
                status: (
                    MilestoneStatus.COMPLETED
                ),
                completedAt: dateFilter
            },
            select: { completedAt: true }
        })
    )

    const dates = [
        ...completedGoals.map(
            (g) => g.updatedAt
        ),
        ...completedMilestones
            .map((m) => m.completedAt)
            .filter((d) => d !== null) as Date[]
    ]

    return dates
}
