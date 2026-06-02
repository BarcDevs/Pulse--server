import 'dotenv/config'
import bcrypt from 'bcrypt'
import { Pool } from 'pg'

import { PrismaPg } from '@prisma/adapter-pg'

import { databaseConfig, isDev } from '../config'
import { FORUM_TAGS } from '../src/constants/forum/tags'

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
    const healthInterestSlugs = [
        'rehabilitation', 'physical-therapy', 'occupational-therapy', 'mobility',
        'injury-recovery', 'surgery-recovery', 'chronic-pain', 'pain-management',
        'neurological-recovery', 'strength-building', 'nutrition', 'sleep',
        'healthy-habits', 'fitness', 'self-care', 'mental-health',
        'emotional-wellbeing', 'stress-management', 'mindfulness', 'meditation',
        'motivation', 'peer-support', 'disability-support', 'goal-progress'
    ]

    const activitySlugs = [
        'meditation',
        'yoga',
        'walking',
        'swimming',
        'running',
        'cycling',
        'strength-training',
        'journaling',
        'breathing-exercises',
        'tai-chi',
        'pilates',
        'dancing',
        'reading',
        'cooking',
        'gardening'
    ]

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

    const timezones = [
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney'
    ]
    const themes = ['light', 'dark']
    const languages = ['en-US', 'he-IL']

    console.info('Seeding test users...')
    for (let i = 0; i < testUsers.length; i++) {
        const userData = testUsers[i]!
        const userHealthInterests = healthInterestSlugs.slice(i * 2, i * 2 + 3)
        const userActivityPreferences = activitySlugs.slice(i * 2, i * 2 + 3)

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
                        timezone: timezones[i % timezones.length],
                        bio: `I'm ${userData.firstName}, a member of the HealEase community focused on recovery and wellness.`,
                        theme: themes[i % themes.length],
                        language: languages[i % languages.length],
                        dailyReminder: i % 2 === 0,
                        communityAlerts: true,
                        profileVisibility: i === 0 ? 'public' : 'friends',
                        healthInterests: userHealthInterests,
                        activityPreferences: userActivityPreferences
                    }
                }
            },
            include: { profile: true }
        })
        createdUsers.push(user)
    }

    console.info('Seeding check-in data...')
    const today = new Date()
    const activityOptions = [
        ['meditation', 'walking'],
        ['yoga', 'journaling'],
        ['swimming', 'breathing-exercises'],
        ['running', 'strength-training'],
        ['tai-chi', 'gardening'],
        ['cycling', 'pilates'],
        ['reading', 'meditation']
    ]

    for (let i = 0; i < createdUsers.length; i++) {
        const user = createdUsers[i]
        const profile = user.profile

        // Create 14 days of check-ins with varied data
        for (let day = 13; day >= 0; day--) {
            const checkInDate = new Date(today)
            checkInDate.setDate(checkInDate.getDate() - day)
            checkInDate.setHours(0, 0, 0, 0)

            // Simulate a trend: day 0-4 lower mood, 5-9 improving, 10-13 high mood
            const baseMood = day <= 4
                ? 3 + Math.floor(Math.random() * 3)
                : day <= 9
                    ? 5 + Math.floor(Math.random() * 3)
                    : 7 + Math.floor(Math.random() * 3)

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
                    moodScore: Math.max(1, Math.min(10, baseMood)),
                    painLevel: Math.floor(Math.random() * 10) + 1,
                    activities: activityOptions[i % activityOptions.length]!,
                    notes: day % 3 === 0 ? `Had a good day, felt energetic on ${checkInDate.toISOString().split('T')[0]}` : undefined
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

            await prisma.aIInsight.upsert({
                where: {
                    checkInId_type: {
                        checkInId: checkIn.id,
                        type: insightType
                    }
                },
                update: {},
                create: {
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

    console.info('Seeding tags...')
    for (const tag of FORUM_TAGS) {
        await prisma.tag.upsert({
            where: { slug: tag.slug },
            update: { nameHe: tag.nameHe },
            create: tag
        })
    }

    console.info('Seeding posts...')
    console.info(`Found ${createdUsers.length} users to use as post authors`)
    if (createdUsers.length === 0) {
        console.warn('No users created, skipping posts')
    } else {
        const firstUser = createdUsers[0]
        console.info(`First user: ${firstUser.email}, profile ID: ${firstUser.profile?.id}`)
    }

    await prisma.reply.deleteMany({})
    await prisma.post.deleteMany({})

    const seedPosts = [
        {
            title: '6 months post hip replacement — what actually helped',
            category: 'recovery',
            tags: ['recovery-journey', 'physical-therapy', 'exercise'],
            body: '<h2>Six months in</h2><p>I had my hip replacement last November and I want to share what genuinely moved the needle for me — not the generic advice, the real stuff.</p><ul><li><strong>Consistency over intensity</strong> — my PT told me to walk 10 minutes twice a day, every day, no excuses. That baseline mattered more than any single hard session.</li><li><strong>Ice after every session</strong> — 20 minutes, no shortcuts. Reduced swelling dramatically in weeks 3–6.</li><li><strong>Telling people</strong> — I was embarrassed at first but letting my family know what I needed changed everything.</li></ul><p>The hardest part was trusting the process when progress felt invisible. Week 8 felt identical to week 6. Then week 10 felt totally different. Hang in there.</p><blockquote>Progress is not always linear — sometimes it hides for weeks before it shows up all at once.</blockquote>'
        },
        {
            title: 'My PT gave me 3 exercises that finally reduced my lower back pain',
            category: 'therapy',
            tags: ['physical-therapy', 'pain-management', 'exercise'],
            body: '<p>After two years of chronic lower back pain, my physical therapist introduced three exercises that have made a measurable difference. Sharing them here — but please check with your own PT before starting anything new.</p><ol><li><strong>Bird-dog</strong> — On hands and knees, extend opposite arm and leg. Hold 5 seconds, 10 reps each side. Targets deep spinal stabilizers.</li><li><strong>Dead bug</strong> — Lying on back, extend opposite arm and leg while keeping lower back flat. 8 reps each side.</li><li><strong>Glute bridge</strong> — Feet flat, push hips up, hold 3 seconds. 3 sets of 12. Weak glutes contribute to back pain more than people realize.</li></ol><p>I do this routine every morning. The key is doing them <em>slowly and controlled</em> — not rushing through reps. It took about 3 weeks to notice a difference.</p>'
        },
        {
            title: 'Anxiety after my stroke — you are not alone',
            category: 'mental',
            tags: ['anxiety', 'stroke', 'mental-health'],
            body: '<h2>Nobody warned me about the anxiety</h2><p>When I had my stroke 14 months ago, I expected the physical challenges. What blindsided me was the anxiety — the hypervigilance, the constant scanning of my body for warning signs, the fear of it happening again.</p><p>I want to say this clearly: <strong>what you are feeling is normal and it has a name</strong>. Post-stroke anxiety affects up to 25% of survivors. It is not weakness. It is your nervous system processing a terrifying event.</p><p>What has helped me:</p><ul><li>Therapy with someone who specializes in chronic illness and trauma</li><li>Grounding exercises — the 5-4-3-2-1 sensory technique during panic moments</li><li>Limiting health-anxiety spirals online (I set a 15-minute daily limit)</li><li>Being honest with my neurologist about symptoms</li></ul><p>If anyone here is navigating this, my DMs are open. You do not have to explain it to people who have not been through it.</p>'
        },
        {
            title: 'I hit 100 days of daily walking — here is what changed',
            category: 'milestones',
            tags: ['motivation', 'walking', 'routines'],
            body: '<p>Day 100 of my walking streak. I am going to keep this simple because simple is what got me here.</p><h2>What I did</h2><p>Walk at least 20 minutes every single day. Rain, tired, bad mood — it did not matter. The rule was non-negotiable.</p><h2>What changed</h2><ul><li><strong>Sleep</strong> — noticeably better by week 3</li><li><strong>Mood</strong> — less reactive, calmer baseline</li><li><strong>Pain levels</strong> — my knee inflammation is down (doctor confirmed this)</li><li><strong>Sense of control</strong> — this was the biggest one. After my surgery I felt like my body was betraying me. A daily win, however small, helped me reclaim that feeling.</li></ul><p>I am not going to pretend every day was easy. Day 34 I walked 20 minutes in a hospital corridor while waiting for test results. That day counts too.</p>'
        },
        {
            title: 'How I restructured my mornings after burnout',
            category: 'lifestyle',
            tags: ['burnout', 'routines', 'mindfulness'],
            body: '<p>Burnout hit me during my recovery. Trying to heal <em>and</em> keep everything else running broke me. I want to share the morning structure that finally gave me some stability.</p><h2>My current morning (45 min total)</h2><ol><li><strong>No phone for the first 20 minutes</strong> — this alone was transformative</li><li><strong>5 minutes of stretching</strong> — in bed, before I get up. Gentle neck rolls, shoulder circles, ankle pumps.</li><li><strong>Breakfast with intention</strong> — I sit down, no screens, eat slowly. 10 minutes.</li><li><strong>Write 3 things</strong> — one intention for the day, one thing I am grateful for, one thing I am anxious about (naming it reduces its power)</li></ol><p>This is not productivity optimization. It is survival scaffolding. The goal is to face the day from a stable foundation, not already behind.</p><blockquote>You cannot pour from an empty vessel. Recovery requires protecting your energy before spending it.</blockquote>'
        },
        {
            title: 'Talking to my kids about my recovery — what worked',
            category: 'support',
            tags: ['family-support', 'recovery'],
            body: '<p>My kids are 9 and 12. When I came home from the hospital after my spinal surgery, I did not know how to explain what was happening. I was scared. They were scared. And nobody was talking about it.</p><p>We eventually found a rhythm. Here is what helped us:</p><ul><li><strong>Age-appropriate honesty</strong> — I told my 9-year-old "Dad\'s back needs to heal, like when you broke your arm, but bigger and slower." That clicked.</li><li><strong>Giving them a job</strong> — my 12-year-old became my "medication reminder." It gave her agency instead of helplessness.</li><li><strong>Normal dinners</strong> — even when I could not cook, we sat together. Routine was stabilizing for everyone.</li><li><strong>Letting them see me struggle sometimes</strong> — I do not want them thinking strength means never showing pain. That lesson is too important to hide.</li></ul><p>Has anyone else navigated this with children? I would love to hear your approaches.</p>'
        },
        {
            title: 'Complete beginner — what should I actually track in my check-ins?',
            category: 'questions',
            tags: ['beginner-question', 'advice', 'routines'],
            body: '<p>Hi everyone — just joined HealEase after my occupational therapist recommended it. I am 3 weeks post-surgery and trying to figure out what actually matters to track.</p><p>I have been logging mood and pain but I feel like I am missing something. Questions I have:</p><ul><li>Do you track <strong>energy levels</strong> separately from mood? They feel different to me.</li><li>How detailed should my notes be? I have been writing paragraphs but it feels unsustainable.</li><li>Is it useful to track which activities made things better or worse, or is that too granular?</li></ul><p>I do not want to spend more time tracking than recovering, but I also do not want to miss patterns that could help my care team. Any advice from people further along would be really appreciated.</p>'
        },
        {
            title: 'Two years after my accident — a story about getting my life back',
            category: 'stories',
            tags: ['success-story', 'recovery-journey', 'motivation'],
            body: '<h2>Where I started</h2><p>Two years ago I was in a car accident that fractured three vertebrae and left me unable to walk without assistance. The first six months I genuinely did not believe I would get back to anything resembling my previous life.</p><h2>The middle</h2><p>Recovery is not a straight line. I had setbacks that felt like erasure. Month four I re-injured my shoulder in a fall. Month eight my mental health collapsed and I stopped doing my PT exercises for three weeks. Month eleven I had a breakthrough session where I walked unaided across a gym for the first time.</p><h2>Where I am now</h2><p>I hiked 5km last weekend. I cried at the trailhead. I am sharing this not to inspire — I know how hollow that can feel when you are in the hard part — but to say: <strong>the hard part ends</strong>. Not fully. But enough.</p><p>If you are in month two or month eight and you can not see the trail from where you are: it is there. Keep going.</p>'
        },
        {
            title: 'What does "pacing" actually mean in practice? Let\'s discuss',
            category: 'discussion',
            tags: ['chronic-pain', 'advice', 'recovery'],
            body: '<p>Every resource about chronic pain management mentions "pacing" but almost none of them explain what it actually looks like in daily life. I want to start a real conversation about this.</p><p>My understanding: pacing means doing less than you think you can on good days, so you have something left for bad days. But the execution is genuinely hard.</p><p><strong>Problems I run into:</strong></p><ul><li>On good days I always think "this time will be different" and then overdo it</li><li>Saying no to things because of pacing feels like letting my condition win</li><li>The variability makes planning almost impossible — I can not commit to things reliably</li></ul><p>How do others actually implement this? Do you use a time limit per activity? A symptom threshold? I would genuinely love to hear concrete approaches, not just the concept.</p>'
        },
        {
            title: '5 nutrition changes that helped my inflammation (with sources)',
            category: 'wellness',
            tags: ['nutrition', 'wellness-tips', 'physical-health'],
            body: '<p>I am not a nutritionist — I am someone who spent a lot of time reading research after my diagnosis. These are changes I made based on evidence, not just wellness trends. My inflammatory markers improved enough that my rheumatologist asked what I had changed.</p><ol><li><strong>Omega-3s daily</strong> — 2g EPA/DHA from fish oil. The evidence for reducing inflammation is solid.</li><li><strong>Removed ultra-processed foods</strong> — not "clean eating," just nothing with an ingredient list longer than 5 items.</li><li><strong>Turmeric + black pepper</strong> — curcumin absorption needs piperine. I add both to everything I cook.</li><li><strong>More fermented foods</strong> — gut microbiome connection to systemic inflammation is real. Kimchi, kefir, plain yogurt.</li><li><strong>Less alcohol</strong> — I went from 3–4 drinks a week to 1. Sleep improved immediately, inflammation markers down within 6 weeks.</li></ol><p><em>These worked for me. Everyone is different. Track your own response rather than assuming any of this will translate directly.</em></p>'
        },
        {
            title: 'Managing fatigue during PT — techniques from my therapist',
            category: 'therapy',
            tags: ['physical-therapy', 'pain-management', 'burnout'],
            body: '<p>Fatigue during physical therapy is real and it derailed my recovery for months before my therapist helped me understand it. Sharing her framework here.</p><h2>The three types of fatigue in recovery</h2><ul><li><strong>Peripheral fatigue</strong> — muscle level. Addressed with proper rest intervals between sets (my PT uses 90 seconds minimum).</li><li><strong>Central fatigue</strong> — nervous system level. This is why mental effort during sessions matters. We shortened sessions but improved focus.</li><li><strong>Emotional fatigue</strong> — the weight of the process itself. Often ignored but the most depleting.</li></ul><h2>What changed for me</h2><p>We moved from 3 long sessions to 5 short ones per week. Same total time, dramatically less post-session exhaustion. The concept is "staying below the fatigue threshold" every session rather than pushing through it.</p><p>Also: hydration before sessions matters more than I thought. I was chronically under-hydrated and did not realize how much it was affecting performance.</p>'
        },
        {
            title: 'Rebuilding confidence after losing function — honest reflections',
            category: 'mental',
            tags: ['confidence', 'mental-health', 'recovery-journey'],
            body: '<p>I lost significant function in my dominant hand after my surgery. For someone who used to build furniture on weekends, that loss hit my identity hard. This is an honest account of rebuilding confidence.</p><p>The first thing I had to accept: the goal was not returning to what I was. It was finding what I could become. That sounds like a greeting card but it took me six months of therapy to actually believe it.</p><h2>Practical steps that helped</h2><ul><li><strong>Tiny wins, deliberately sought</strong> — I made a list of 20 small things I wanted to be able to do again. I started with the easiest ones. Each check felt disproportionately good.</li><li><strong>Comparing against myself only</strong> — I had to completely stop reading recovery stories where people "came back better than before." Not because they are not real, but because they were not helpful for me.</li><li><strong>Naming the grief</strong> — I was grieving my former self. Acknowledging that explicitly with my therapist removed a lot of shame around the struggle.</li></ul><blockquote>Confidence does not come back all at once. It comes back in small acts of showing up.</blockquote>'
        }
    ]

    const replyBodies = [
        'This is exactly what I needed to read today. Thank you for sharing.',
        'I had a similar experience — the consistency really does matter more than intensity.',
        'Really appreciate the specific details here, not just vague advice.',
        'Sharing this with my care team. This is really helpful.',
        'Week 8 was my hardest too. You described it perfectly.',
        'Thank you for being so honest about the hard parts.',
        'This community is why I keep coming back. Great post.',
        'I tried this approach and it genuinely helped me too.',
        'How long did it take before you saw improvements?',
        'This resonates with my own journey. Keep sharing.'
    ]

    for (let i = 0; i < seedPosts.length; i++) {
        const postData = seedPosts[i]!
        const author = createdUsers[i % createdUsers.length]!

        if (!author || !author.profile) {
            console.warn(`Skipping post ${i}: No author or profile found`)
            continue
        }

        const post = await prisma.post.create({
            data: {
                title: postData.title,
                body: postData.body,
                authorId: author.profile.id,
                category: postData.category
            }
        })

        // Add tags after post creation
        for (const slug of postData.tags) {
            try {
                const tag = await prisma.tag.findUnique({ where: { slug } })
                if (tag) {
                    await prisma.post.update({
                        where: { id: post.id },
                        data: {
                            tags: {
                                connect: { slug }
                            }
                        }
                    })
                }
            } catch {
                // Skip tag if it fails
            }
        }

        // Add 1-2 replies to each post
        const replyCount = (i % 2) + 1
        for (let r = 0; r < replyCount; r++) {
            const replier = createdUsers[(i + r + 1) % createdUsers.length]!
            if (!replier || !replier.profile) continue

            await prisma.reply.create({
                data: {
                    body: replyBodies[(i + r) % replyBodies.length]!,
                    authorId: replier.profile.id,
                    postId: post.id
                }
            })
        }
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