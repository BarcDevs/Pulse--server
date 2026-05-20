import 'dotenv/config'
import bcrypt from 'bcrypt'
import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, isDev } from '../config'

import {
    PrismaClient
} from './generated/prisma/client'
import { InsightType } from './generated/prisma/enums'

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

const hashPassword = (password: string): string =>
    bcrypt.hashSync(password, 10)

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

    console.info('Seeding test users...')
    const testUsers = [
        {
            firstName: 'Alice',
            lastName: 'Johnson',
            username: 'alice_j',
            email: 'alice@example.com',
            password: 'password123'
        },
        {
            firstName: 'Bob',
            lastName: 'Smith',
            username: 'bob_smith',
            email: 'bob@example.com',
            password: 'password123'
        },
        {
            firstName: 'Carol',
            lastName: 'Williams',
            username: 'carol_w',
            email: 'carol@example.com',
            password: 'password123'
        },
        {
            firstName: 'David',
            lastName: 'Brown',
            username: 'david_b',
            email: 'david@example.com',
            password: 'password123'
        },
        {
            firstName: 'Emma',
            lastName: 'Davis',
            username: 'emma_d',
            email: 'emma@example.com',
            password: 'password123'
        }
    ]

    const createdUsers = []
    for (const userData of testUsers) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                username: userData.username,
                email: userData.email,
                password: hashPassword(userData.password),
                profile: {
                    create: {
                        timezone: 'America/New_York',
                        bio: `I'm ${userData.firstName}, a member of the HealEase community.`
                    }
                }
            },
            include: { profile: true }
        })
        createdUsers.push(user)
    }

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

    console.info('Seeding check-in data...')
    const today = new Date()
    for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i]
        const profile = user.profile

        // Create 7 days of check-ins
        for (let day = 6; day >= 0; day--) {
            const checkInDate = new Date(today)
            checkInDate.setDate(checkInDate.getDate() - day)
            // eslint-disable-next-line custom-rules/enforce-function-call-breaking
            checkInDate.setHours(0, 0, 0, 0)

            await prisma.dailyCheckIn.upsert({
                where: {
                    profileId_checkInDate: {
                        profileId: profile!.id,
                        checkInDate
                    }
                },
                update: {},
                create: {
                    profileId: profile!.id,
                    checkInDate,
                    moodScore: Math.floor(Math.random() * 10) + 1,
                    painLevel: Math.floor(Math.random() * 10) + 1,
                    activities: ['meditation', 'walking'],
                    notes: `Check-in for ${checkInDate.toISOString().split('T')[0]}`
                }
            })
        }
    }

    console.info('Seeding AI insights...')
    const insightTypes: InsightType[] = [
        InsightType.MOOD_DROP_ALERT,
        InsightType.MOTIVATIONAL,
        InsightType.WEEKLY_SUMMARY,
        InsightType.BAD_DAY_SUPPORT
    ]

    for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i]
        const profile = user.profile!

        // Get check-ins for this user
        const checkIns = await prisma.dailyCheckIn.findMany({
            where: { profileId: profile.id },
            orderBy: { checkInDate: 'desc' }
        })

        // Add insights to some check-ins
        for (let j = 0; j < Math.min(3, checkIns.length); j++) {
            const checkIn = checkIns[j]
            const insightType = insightTypes[j % insightTypes.length]

            const insightContent = {
                MOOD_DROP_ALERT: `Your mood has been declining over the past few days. Consider reaching out to a friend or trying a relaxation technique.`,
                MOTIVATIONAL: `Great job maintaining your wellness routine! Keep up this positive momentum.`,
                WEEKLY_SUMMARY: `This week you had ${checkIns.length} check-ins with an average mood of ${Math.round(checkIns.reduce((sum, c) => sum + c.moodScore, 0) / checkIns.length)}. You are doing great!`,
                BAD_DAY_SUPPORT: `We notice you are having a tough day. Remember that setbacks are part of the journey. Be kind to yourself.`
            }

            const insightTitle = {
                MOOD_DROP_ALERT: 'Mood Decline Alert',
                MOTIVATIONAL: 'Keep Going!',
                WEEKLY_SUMMARY: 'Weekly Summary',
                BAD_DAY_SUPPORT: 'You Got This'
            }

            await prisma.aIInsight.create({
                data: {
                    checkInId: checkIn.id,
                    userId: user.id,
                    type: insightType,
                    content: insightContent[insightType],
                    title: insightTitle[insightType],
                    classification: 'baseline',
                    priority: j === 0 ? 'high' : 'normal',
                    metadata: {
                        checkInCount: checkIns.length,
                        averageMood: Math.round(checkIns.reduce((sum, c) => sum + c.moodScore, 0) / checkIns.length)
                    }
                }
            })
        }
    }

    console.info('Seeding posts...')
    const tags = [
        { name: 'Fracture', slug: 'fracture' },
        { name: 'Surgery', slug: 'surgery' },
        { name: 'Spinal Injury', slug: 'spinal-injury' },
        { name: 'Stroke', slug: 'stroke' },
        { name: 'Chronic Pain', slug: 'chronic-pain' },
        { name: 'Mobility', slug: 'mobility' },
        { name: 'Recovery Journey', slug: 'recovery-journey' },
        { name: 'Physical Therapy', slug: 'physical-therapy' },
        { name: 'Occupational Therapy', slug: 'occupational-therapy' },
        { name: 'Exercise', slug: 'exercise' },
        { name: 'Stretching', slug: 'stretching' },
        { name: 'Walking', slug: 'walking' },
        { name: 'Pain Management', slug: 'pain-management' },
        { name: 'Anxiety', slug: 'anxiety' },
        { name: 'Motivation', slug: 'motivation' },
        { name: 'Burnout', slug: 'burnout' },
        { name: 'Loneliness', slug: 'loneliness' },
        { name: 'Frustration', slug: 'frustration' },
        { name: 'Confidence', slug: 'confidence' },
        { name: 'Sleep', slug: 'sleep' },
        { name: 'Nutrition', slug: 'nutrition' },
        { name: 'Mindfulness', slug: 'mindfulness' },
        { name: 'Family Support', slug: 'family-support' },
        { name: 'Routines', slug: 'routines' },
        { name: 'Work Return', slug: 'work-return' },
        { name: 'Success Story', slug: 'success-story' },
        { name: 'Advice', slug: 'advice' },
        { name: 'Beginner Question', slug: 'beginner-question' }
    ]

    for (const tag of tags) {
        await prisma.tag.upsert({
            where: { slug: tag.slug },
            update: {},
            create: tag
        })
    }

    const postTitles = [
        'Tips for improving daily mood tracking',
        'My recovery journey so far',
        'How meditation has helped my stress levels',
        'Best exercises for pain management',
        'Building a consistent wellness routine'
    ]

    const postBodies = [
        'I have found that tracking my mood daily has been incredibly helpful. Here are my top tips for getting started...',
        'It has been 3 months since I started my recovery journey. I wanted to share what has worked for me...',
        'Meditation has completely transformed how I handle stress. Even just 10 minutes a day makes a difference...',
        'After dealing with chronic pain for years, I finally found exercises that work for me. Let me share them...',
        'Building a consistent wellness routine is challenging but so rewarding. Here is my approach...'
    ]

    for (let i = 0; i < postTitles.length; i++) {
        const author = createdUsers[i % createdUsers.length]
        const post = await prisma.post.create({
            data: {
                title: postTitles[i],
                body: postBodies[i],
                authorId: author.profile!.id,
                category: 'wellness',
                tags: {
                    connect: [
                        { slug: tags[i % tags.length]!.slug }
                    ]
                }
            }
        })

        // Add a reply to each post
        const replier = createdUsers[(i + 1) % createdUsers.length]
        await prisma.reply.create({
            data: {
                body: 'Great post! Thanks for sharing your experience. This resonates with me.',
                authorId: replier.profile!.id,
                postId: post.id
            }
        })
    }

    console.info('Seeding goals and milestones...')
    if (createdUsers.length > 0) {
        for (const user of createdUsers) {
            const profile = user.profile

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