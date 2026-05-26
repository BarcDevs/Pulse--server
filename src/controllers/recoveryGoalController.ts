import type { Request, Response } from 'express'

import { type GoalStatus } from '../../prisma/generated/prisma/enums'
import { HttpStatusCodes } from '../constants/httpStatusCodes'
import { errorFactory } from '../errors/factory/ErrorFactory'
import { ValidationError } from '../errors/ValidationError'
import { successResponse } from '../responses/success'
import { getGoalsQuerySchema } from '../schemas/recoveryGoal/getGoalsQuerySchema'
import { newGoalSchema } from '../schemas/recoveryGoal/newGoalSchema'
import { newMilestoneSchema } from '../schemas/recoveryGoal/newMilestoneSchema'
import { updateGoalSchema } from '../schemas/recoveryGoal/updateGoalSchema'
import { updateMilestoneSchema } from '../schemas/recoveryGoal/updateMilestoneSchema'
import * as recoveryGoalService from '../services/recoveryGoalService'
import type {
    MilestoneType,
    RecoveryGoalWithProgress,
    UpdateRecoveryGoalType
} from '../types/data/RecoveryGoalType'

const validateId = (
    id: string | undefined,
    fieldName: string
): void => {
    const isValid = (
        typeof id === 'string'
        && id.trim()
    )
    if (!isValid)
        throw errorFactory.generic
            .notFound(`Invalid ${fieldName}`)
}

export const createGoal = async (
    req: Request,
    res: Response
) => {
    const validatedData = ValidationError
        .catchValidationErrors(
            newGoalSchema.safeParse(req.body)
        )
    const { userId } = req
    if (!userId)
        throw errorFactory.auth.unauthorized()

    const goal = await (
        recoveryGoalService.createGoal(
            userId,
            validatedData
        )
    )
    successResponse<RecoveryGoalWithProgress>(
        res,
        goal,
        'Goal created successfully',
        HttpStatusCodes.CREATED
    )
}

export const getGoals = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    if (!userId)
        throw errorFactory.auth.unauthorized()

    const { status } = ValidationError.catchValidationErrors(
        getGoalsQuerySchema.safeParse(req.query)
    )

    const statusFilter = status?.toUpperCase() as GoalStatus | undefined

    const goals = await recoveryGoalService.getUserGoals(
        userId,
        statusFilter
    )
    successResponse<RecoveryGoalWithProgress[]>(
        res,
        goals,
        'Goals retrieved successfully',
        HttpStatusCodes.OK
    )
}

export const getGoal = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    const { goalId } = req.params as Record<
        string,
        string
    >
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(goalId, 'goalId')

    const result = await (
        recoveryGoalService.getGoal(
            goalId,
            userId
        )
    )
    successResponse(
        res,
        result,
        'Goal retrieved successfully',
        HttpStatusCodes.OK
    )
}

export const updateGoal = async (
    req: Request,
    res: Response
) => {
    const validatedData = ValidationError
        .catchValidationErrors(
            updateGoalSchema.safeParse(req.body)
        )
    const { userId } = req
    const { goalId } = req.params as Record<
        string,
        string
    >
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(goalId, 'goalId')

    const goal = await (
        recoveryGoalService.updateGoal(
            goalId,
            userId,
            validatedData as UpdateRecoveryGoalType
        )
    )
    successResponse<RecoveryGoalWithProgress>(
        res,
        goal,
        'Goal updated successfully',
        HttpStatusCodes.OK
    )
}

export const deleteGoal = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    const { goalId } = req.params as Record<
        string,
        string
    >
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(goalId, 'goalId')

    await recoveryGoalService.deleteGoal(
        goalId,
        userId
    )
    successResponse(
        res,
        null,
        'Goal deleted successfully',
        HttpStatusCodes.OK
    )
}

export const createMilestones = async (
    req: Request,
    res: Response
) => {
    const validatedData = ValidationError
        .catchValidationErrors(
            newMilestoneSchema.safeParse(req.body)
        )
    const { userId } = req
    const { goalId } = req.params as Record<
        string,
        string
    >
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(goalId, 'goalId')

    const nextOrder = await (
        recoveryGoalService
            .getMaxMilestoneOrder(goalId, userId)
    )
    const milestones = await (
        recoveryGoalService.createMilestones(
            goalId,
            userId,
            {
                milestones: [
                    {
                        title: validatedData.title,
                        description: (
                            validatedData
                                .description
                        ),
                        order: nextOrder
                    }
                ]
            }
        )
    )
    successResponse(
        res,
        milestones,
        'Milestones created successfully',
        HttpStatusCodes.CREATED
    )
}

export const updateMilestone = async (
    req: Request,
    res: Response
) => {
    const validatedData = ValidationError
        .catchValidationErrors(
            updateMilestoneSchema.safeParse(req.body)
        )
    const { userId } = req
    const { milestoneId } = req.params as Record<
        string,
        string
    >
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(milestoneId, 'milestoneId')

    const milestone = await (
        recoveryGoalService.updateMilestone(
            milestoneId,
            userId,
            validatedData
        )
    )
    successResponse<MilestoneType>(
        res,
        milestone,
        'Milestone updated successfully',
        HttpStatusCodes.OK
    )
}

export const deleteMilestone = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    const { milestoneId } = req.params as Record<
        string,
        string
    >
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(milestoneId, 'milestoneId')

    await recoveryGoalService.deleteMilestone(
        milestoneId,
        userId
    )
    successResponse(
        res,
        null,
        'Milestone deleted successfully',
        HttpStatusCodes.OK
    )
}

export const completeMilestone = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    const { goalId, milestoneId } = (
        req.params as {
            goalId: string
            milestoneId: string
        }
    )
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(goalId, 'goalId')
    validateId(milestoneId, 'milestoneId')

    await recoveryGoalService
        .completeMilestone(
            milestoneId,
            goalId,
            userId
        )
    successResponse(
        res,
        null,
        'Milestone completed successfully',
        HttpStatusCodes.OK
    )
}

export const completeGoal = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    const { goalId } = req.params as {
        goalId: string
    }
    if (!userId)
        throw errorFactory.auth.unauthorized()
    validateId(goalId, 'goalId')

    const goal = await (
        recoveryGoalService.completeGoal(
            goalId,
            userId
        )
    )
    successResponse<RecoveryGoalWithProgress>(
        res,
        goal,
        'Goal completed successfully',
        HttpStatusCodes.OK
    )
}

export const getStats = async (
    req: Request,
    res: Response
) => {
    const { userId } = req
    if (!userId)
        throw errorFactory.auth.unauthorized()

    const {
        fromDate,
        toDate,
        category
    } = (
        req.query as Record<
            string,
            string | undefined
        >
    )

    const filters = {
        fromDate: fromDate
            ? new Date(fromDate)
            : undefined,
        toDate: toDate
            ? new Date(toDate)
            : undefined,
        category
    }

    const stats = await (
        recoveryGoalService.getStats(
            userId,
            filters
        )
    )
    successResponse(
        res,
        stats,
        'Stats retrieved successfully',
        HttpStatusCodes.OK
    )
}
