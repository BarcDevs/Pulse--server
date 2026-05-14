import { dayInMs } from '../../src/constants/time'
import Prisma from '../../src/utils/prismaClient'

const seedGoalsData = async () => {
    console.info('Seeding goals and milestones...')

    const users = await Prisma.user.findMany({ take: 5 })

    if (users.length === 0) {
        console.info('No users found, skipping goals seed')
        return
    }

    for (const user of users) {
        const profile = await Prisma.profile.findUnique({
            where: { userId: user.id }
        })

        if (!profile) continue

        const activeGoal = await Prisma.recoveryGoal.create({
            data: {
                profileId: profile.id,
                title: 'Build consistent exercise habit',
                description: 'Exercise 3 times per week',
                category: 'PHYSICAL',
                status: 'ACTIVE',
                isPrimary: true,
                targetDate: new Date(Date.now() + 90 * dayInMs)
            }
        })

        await Prisma.milestone.createMany({
            data: [
                {
                    goalId: activeGoal.id,
                    title: 'Complete first week of workouts',
                    order: 1,
                    status: 'COMPLETED',
                    completedAt: new Date()
                },
                {
                    goalId: activeGoal.id,
                    title: 'Reach 2 weeks consistency',
                    order: 2,
                    status: 'ACTIVE'
                },
                {
                    goalId: activeGoal.id,
                    title: 'Build to 4 weeks streak',
                    order: 3,
                    status: 'LOCKED'
                }
            ]
        })

        const completedGoal = await Prisma.recoveryGoal.create({
            data: {
                profileId: profile.id,
                title: 'Improve sleep quality',
                description: 'Sleep 8 hours per night',
                category: 'LIFESTYLE',
                status: 'COMPLETED',
                isPrimary: false
            }
        })

        await Prisma.milestone.createMany({
            data: [
                {
                    goalId: completedGoal.id,
                    title: 'Establish bedtime routine',
                    order: 1,
                    status: 'COMPLETED',
                    completedAt: new Date(Date.now() - 10 * dayInMs)
                },
                {
                    goalId: completedGoal.id,
                    title: 'No screens 1 hour before bed',
                    order: 2,
                    status: 'COMPLETED',
                    completedAt: new Date(Date.now() - 5 * dayInMs)
                }
            ]
        })

        const pausedGoal = await Prisma.recoveryGoal.create({
            data: {
                profileId: profile.id,
                title: 'Stress management practice',
                description: 'Daily meditation and breathing',
                category: 'MENTAL',
                status: 'PAUSED',
                isPrimary: false
            }
        })

        await Prisma.milestone.createMany({
            data: [
                {
                    goalId: pausedGoal.id,
                    title: 'Learn meditation basics',
                    order: 1,
                    status: 'COMPLETED',
                    completedAt: new Date(Date.now() - 30 * dayInMs)
                },
                {
                    goalId: pausedGoal.id,
                    title: 'Practice daily for 2 weeks',
                    order: 2,
                    status: 'LOCKED'
                }
            ]
        })

        const abandonedGoal = await Prisma.recoveryGoal.create({
            data: {
                profileId: profile.id,
                title: 'Learn a new language',
                description: 'Spanish language learning',
                category: 'MENTAL',
                status: 'ABANDONED',
                isPrimary: false
            }
        })

        await Prisma.milestone.createMany({
            data: [
                {
                    goalId: abandonedGoal.id,
                    title: 'Complete beginner course',
                    order: 1,
                    status: 'LOCKED'
                },
                {
                    goalId: abandonedGoal.id,
                    title: 'Practice conversational Spanish',
                    order: 2,
                    status: 'LOCKED'
                }
            ]
        })
    }

    console.info('Goals and milestones seeded successfully')
}

seedGoalsData()
    .catch(e => {
        console.error('Seed error:', e)
        throw e
    })
    .finally(async () => {
        await Prisma.$disconnect()
    })
