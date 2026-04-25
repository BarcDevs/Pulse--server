import 'dotenv/config'
import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, isDev } from '../config'

import {
    PrismaClient
} from './generated/prisma/client'

const connectionString = databaseConfig.url

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({
    adapter,
    errorFormat: 'minimal',
    log:
        isDev
            ? ['query', 'info', 'warn', 'error']
            : undefined
})

async function main() {
    const healthInterests = [
        {
            slug: 'mental-health',
            name: 'Mental Health',
            category: 'Wellness',
            sortOrder: 1
        },
        {
            slug: 'physical-therapy',
            name: 'Physical Therapy',
            category: 'Recovery',
            sortOrder: 2
        },
        {
            slug: 'nutrition',
            name: 'Nutrition',
            category: 'Wellness',
            sortOrder: 3
        },
        {
            slug: 'chronic-pain',
            name: 'Chronic Pain Management',
            category: 'Recovery',
            sortOrder: 4
        },
        {
            slug: 'sleep-health',
            name: 'Sleep Health',
            category: 'Wellness',
            sortOrder: 5
        },
        {
            slug: 'stress-management',
            name: 'Stress Management',
            category: 'Wellness',
            sortOrder: 6
        },
        {
            slug: 'diabetes',
            name: 'Diabetes Management',
            category: 'Condition-Specific',
            sortOrder: 7
        },
        {
            slug: 'heart-health',
            name: 'Heart Health',
            category: 'Condition-Specific',
            sortOrder: 8
        },
        {
            slug: 'women-health',
            name: 'Women\'s Health',
            category: 'Condition-Specific',
            sortOrder: 9
        },
        {
            slug: 'joint-health',
            name: 'Joint & Bone Health',
            category: 'Recovery',
            sortOrder: 10
        }
    ]

    const activityPreferences = [
        {
            slug: 'meditation',
            name: 'Meditation',
            category: 'Mindfulness',
            sortOrder: 1
        },
        {
            slug: 'yoga',
            name: 'Yoga',
            category: 'Physical',
            sortOrder: 2
        },
        {
            slug: 'walking',
            name: 'Walking',
            category: 'Physical',
            sortOrder: 3
        },
        {
            slug: 'swimming',
            name: 'Swimming',
            category: 'Physical',
            sortOrder: 4
        },
        {
            slug: 'running',
            name: 'Running',
            category: 'Physical',
            sortOrder: 5
        },
        {
            slug: 'cycling',
            name: 'Cycling',
            category: 'Physical',
            sortOrder: 6
        },
        {
            slug: 'strength-training',
            name: 'Strength Training',
            category: 'Physical',
            sortOrder: 7
        },
        {
            slug: 'journaling',
            name: 'Journaling',
            category: 'Mindfulness',
            sortOrder: 8
        },
        {
            slug: 'breathing-exercises',
            name: 'Breathing Exercises',
            category: 'Mindfulness',
            sortOrder: 9
        },
        {
            slug: 'tai-chi',
            name: 'Tai Chi',
            category: 'Physical',
            sortOrder: 10
        },
        {
            slug: 'pilates',
            name: 'Pilates',
            category: 'Physical',
            sortOrder: 11
        },
        {
            slug: 'dancing',
            name: 'Dancing',
            category: 'Physical',
            sortOrder: 12
        },
        {
            slug: 'reading',
            name: 'Reading',
            category: 'Mental',
            sortOrder: 13
        },
        {
            slug: 'cooking',
            name: 'Cooking',
            category: 'Self-Care',
            sortOrder: 14
        },
        {
            slug: 'gardening',
            name: 'Gardening',
            category: 'Physical',
            sortOrder: 15
        }
    ]

    console.info('Seeding health interests...')
    for (const interest of healthInterests) {
        await prisma.healthInterest.upsert({
            where: { slug: interest.slug },
            update: {},
            create: interest
        })
    }

    console.info('Seeding activity preferences...')
    for (const activity of activityPreferences) {
        await prisma.activityPreference.upsert({
            where: { slug: activity.slug },
            update: {},
            create: activity
        })
    }

    console.info('Seeding goals and milestones...')
    const users = await prisma.user.findMany({ take: 5 })

    if (users.length > 0) {
        for (const user of users) {
            const profile = await prisma.profile.findUnique({
                where: { userId: user.id }
            })

            if (!profile) continue

            const activeGoal = await prisma.recoveryGoal.create({
                data: {
                    profileId: profile.id,
                    title: 'Build consistent exercise habit',
                    description: 'Exercise 3 times per week',
                    category: 'PHYSICAL',
                    status: 'ACTIVE',
                    isPrimary: false,
                    targetDate: new Date(
                        Date.now() + 90 * 24 * 60 * 60 * 1000
                    )
                }
            })

            await prisma.milestone.createMany({
                data: [
                    {
                        goalId: activeGoal.id,
                        title: 'Complete first week of workouts',
                        description: 'Exercise at least 3 times this week',
                        order: 1,
                        status: 'COMPLETED',
                        completedAt: new Date()
                    },
                    {
                        goalId: activeGoal.id,
                        title: 'Reach 2 weeks consistency',
                        description: 'Maintain schedule for another week',
                        order: 2,
                        status: 'ACTIVE'
                    },
                    {
                        goalId: activeGoal.id,
                        title: 'Build to 4 weeks streak',
                        description: 'Keep it going for the full month',
                        order: 3,
                        status: 'LOCKED'
                    }
                ]
            })

            const completedGoal = await prisma.recoveryGoal.create({
                data: {
                    profileId: profile.id,
                    title: 'Improve sleep quality',
                    description: 'Sleep 8 hours per night',
                    category: 'LIFESTYLE',
                    status: 'COMPLETED',
                    isPrimary: false
                }
            })

            await prisma.milestone.createMany({
                data: [
                    {
                        goalId: completedGoal.id,
                        title: 'Establish bedtime routine',
                        description: 'Set consistent sleep and wake times',
                        order: 1,
                        status: 'COMPLETED',
                        completedAt: new Date(
                            Date.now() - 10 * 24 * 60 * 60 * 1000
                        )
                    },
                    {
                        goalId: completedGoal.id,
                        title: 'No screens 1 hour before bed',
                        description: 'Reduce blue light exposure',
                        order: 2,
                        status: 'COMPLETED',
                        completedAt: new Date(
                            Date.now() - 5 * 24 * 60 * 60 * 1000
                        )
                    }
                ]
            })

            const pausedGoal = await prisma.recoveryGoal.create({
                data: {
                    profileId: profile.id,
                    title: 'Stress management practice',
                    description: 'Daily meditation and breathing',
                    category: 'MENTAL',
                    status: 'PAUSED',
                    isPrimary: false
                }
            })

            await prisma.milestone.createMany({
                data: [
                    {
                        goalId: pausedGoal.id,
                        title: 'Learn meditation basics',
                        description: 'Complete a beginner meditation course',
                        order: 1,
                        status: 'COMPLETED',
                        completedAt: new Date(
                            Date.now() - 30 * 24 * 60 * 60 * 1000
                        )
                    },
                    {
                        goalId: pausedGoal.id,
                        title: 'Practice daily for 2 weeks',
                        description: 'Meditate for at least 10 minutes each day',
                        order: 2,
                        status: 'LOCKED'
                    }
                ]
            })

            const abandonedGoal = await prisma.recoveryGoal.create({
                data: {
                    profileId: profile.id,
                    title: 'Learn a new language',
                    description: 'Spanish language learning',
                    category: 'MENTAL',
                    status: 'ABANDONED',
                    isPrimary: false
                }
            })

            await prisma.milestone.createMany({
                data: [
                    {
                        goalId: abandonedGoal.id,
                        title: 'Complete beginner course',
                        description: 'Finish introductory Spanish lessons',
                        order: 1,
                        status: 'LOCKED'
                    },
                    {
                        goalId: abandonedGoal.id,
                        title: 'Practice conversational Spanish',
                        description: 'Have simple conversations with native speakers',
                        order: 2,
                        status: 'LOCKED'
                    }
                ]
            })
        }
    }

    console.info('Seed data created successfully')
}

main()
    .catch((e) => {
        console.error(e)
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })