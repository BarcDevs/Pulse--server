import 'dotenv/config'
import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, env } from '../config'

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
        env === 'development'
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