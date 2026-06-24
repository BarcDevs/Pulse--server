// @ts-nocheck
import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import {
    createAuthToken,
    createMockUser
} from '../setup/testSetup'

jest.mock('../../services/progressInsightsService')

describe('Progress Insights Routes', () => {
    const baseUrl = `/api/${serverConfig.apiVersion}/check-in`
    const endpoint = `${baseUrl}/progress-insights`
    const mockUser = createMockUser()
    const token = createAuthToken(mockUser)

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe(`GET /api/${serverConfig.apiVersion}/check-in/progress-insights`, () => {
        it('should return 200 with progress insights when authenticated', async () => {
            const mockInsights = {
                summary:
                    'Your mood improved this week, averaging 8.0 compared to 6.0. '
                    + 'Activity consistency increased to 80%.',
                trend: 'improving',
                highlights: {
                    improvements: ['mood improvement', 'pain reduction'],
                    regressions: []
                },
                period: {
                    currentStart: new Date('2026-04-06'),
                    currentEnd: new Date('2026-04-12'),
                    previousStart: new Date('2026-03-30'),
                    previousEnd: new Date('2026-04-05')
                },
                metadata: {
                    moodDelta: 2,
                    painDelta: -1.5,
                    activityConsistency: 0.8
                }
            }

            const progressInsightsService = require(
                '../../services/progressInsightsService'
            )
            progressInsightsService.generateProgressInsight
                .mockResolvedValue(mockInsights)

            const response = await supertest(App)
                .get(endpoint)
                .set('Cookie', [
                    `accessToken=${token}`
                ])

            expect(response.status).toBe(200)
            expect(response.body.message).toBe(
                'Progress insights generated'
            )
            expect(response.body.data).toMatchObject({
                summary: expect.any(String),
                trend: expect.stringMatching(
                    /improving|declining|stable|mixed/
                ),
                highlights: {
                    improvements: expect.any(Array),
                    regressions: expect.any(Array)
                },
                period: {
                    currentStart: expect.any(String),
                    currentEnd: expect.any(String),
                    previousStart: expect.any(String),
                    previousEnd: expect.any(String)
                },
                metadata: {
                    moodDelta: expect.any(Number),
                    painDelta: expect.any(Number),
                    activityConsistency: expect.any(Number)
                }
            })
        })

        it(
            'should have non-empty summary string',
            async () => {
                const mockInsights = {
                    summary: 'Your recovery remains stable this week.',
                    trend: 'stable',
                    highlights: {
                        improvements: [],
                        regressions: []
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 0.1,
                        painDelta: 0,
                        activityConsistency: 0.6
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data.summary).toBeTruthy()
                expect(response.body.data.summary.length).toBeGreaterThan(0)
            }
        )

        it('should return valid trend value', async () => {
            const validTrends = [
                'improving',
                'declining',
                'stable',
                'mixed'
            ]

            for (const trend of validTrends) {
                const mockInsights = {
                    summary: 'Test summary.',
                    trend,
                    highlights: {
                        improvements: [],
                        regressions: []
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 0,
                        painDelta: 0,
                        activityConsistency: 0.5
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data.trend).toBe(trend)
            }
        })

        it(
            'should have valid period dates in order',
            async () => {
                const currentStart = new Date('2026-04-06')
                const currentEnd = new Date('2026-04-12')
                const previousStart = new Date('2026-03-30')
                const previousEnd = new Date('2026-04-05')

                const mockInsights = {
                    summary: 'Test summary.',
                    trend: 'stable',
                    highlights: {
                        improvements: [],
                        regressions: []
                    },
                    period: {
                        currentStart,
                        currentEnd,
                        previousStart,
                        previousEnd
                    },
                    metadata: {
                        moodDelta: 0,
                        painDelta: 0,
                        activityConsistency: 0.5
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(new Date(response.body.data.period.currentStart))
                    .toEqual(currentStart)
                expect(new Date(response.body.data.period.currentEnd))
                    .toEqual(currentEnd)
                expect(new Date(response.body.data.period.previousStart))
                    .toEqual(previousStart)
                expect(new Date(response.body.data.period.previousEnd))
                    .toEqual(previousEnd)
                expect(
                    new Date(response.body.data.period.currentStart)
                    < new Date(response.body.data.period.currentEnd)
                ).toBe(true)
                expect(
                    new Date(response.body.data.period.previousEnd)
                    < new Date(response.body.data.period.currentStart)
                ).toBe(true)
            }
        )

        it(
            'should have highlights with empty arrays for stable trend',
            async () => {
                const mockInsights = {
                    summary: 'Your recovery remains stable.',
                    trend: 'stable',
                    highlights: {
                        improvements: [],
                        regressions: []
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 0,
                        painDelta: 0,
                        activityConsistency: 0.5
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data.highlights.improvements).toEqual([])
                expect(response.body.data.highlights.regressions).toEqual([])
            }
        )

        it(
            'should have highlights with items for improving trend',
            async () => {
                const mockInsights = {
                    summary:
                        'Your mood improved this week. '
                        + 'Activity consistency increased.',
                    trend: 'improving',
                    highlights: {
                        improvements: [
                            'mood improvement',
                            'pain reduction'
                        ],
                        regressions: []
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 2,
                        painDelta: -1,
                        activityConsistency: 0.8
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data.highlights.improvements.length)
                    .toBeGreaterThan(0)
            }
        )

        it(
            'should have valid metadata values',
            async () => {
                const mockInsights = {
                    summary: 'Test summary.',
                    trend: 'improving',
                    highlights: {
                        improvements: ['mood improvement'],
                        regressions: []
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 2.5,
                        painDelta: -1.5,
                        activityConsistency: 0.75
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(typeof response.body.data.metadata.moodDelta)
                    .toBe('number')
                expect(typeof response.body.data.metadata.painDelta)
                    .toBe('number')
                expect(typeof response.body.data.metadata.activityConsistency)
                    .toBe('number')
                expect(response.body.data.metadata.activityConsistency)
                    .toBeGreaterThanOrEqual(0)
                expect(response.body.data.metadata.activityConsistency)
                    .toBeLessThanOrEqual(1)
            }
        )

        it('should return 401 when not authenticated', async () => {
            const response = await supertest(App)
                .get(endpoint)

            expect(response.status).toBe(401)
            expect(response.body.error).toBeDefined()
        })

        it(
            'should return 401 when token is invalid',
            async () => {
                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        'accessToken=invalid-token'
                    ])

                expect(response.status).toBe(401)
            }
        )

        it(
            'should return fallback insight for insufficient data',
            async () => {
                const mockInsights = {
                    summary:
                        'Not enough data yet to detect trends. '
                        + 'Keep checking in to unlock insights.',
                    trend: 'stable',
                    highlights: {
                        improvements: [],
                        regressions: []
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 0,
                        painDelta: 0,
                        activityConsistency: 0
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data.trend).toBe('stable')
                expect(response.body.data.summary).toContain(
                    'Not enough data'
                )
            }
        )

        it(
            'should handle declining trend correctly',
            async () => {
                const mockInsights = {
                    summary:
                        'Your mood declined this week to 4.0 from 8.0. '
                        + 'Pain increased to 7.0.',
                    trend: 'declining',
                    highlights: {
                        improvements: [],
                        regressions: [
                            'mood decline',
                            'pain increase'
                        ]
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: -4,
                        painDelta: 3,
                        activityConsistency: 0.2
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data.trend).toBe('declining')
                expect(response.body.data.highlights.regressions.length)
                    .toBeGreaterThan(0)
            }
        )

        it(
            'should handle mixed trend with improvements and regressions',
            async () => {
                const mockInsights = {
                    summary:
                        'Your recovery shows mixed signals this week. '
                        + 'Mood improved while pain increased.',
                    trend: 'mixed',
                    highlights: {
                        improvements: ['mood improvement'],
                        regressions: ['pain increase']
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 1.5,
                        painDelta: 1.5,
                        activityConsistency: 0.5
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body.data.trend).toBe('mixed')
                expect(response.body.data.highlights.improvements.length)
                    .toBeGreaterThan(0)
                expect(response.body.data.highlights.regressions.length)
                    .toBeGreaterThan(0)
            }
        )

        it(
            'should verify response structure matches expected type',
            async () => {
                const mockInsights = {
                    summary: 'Test summary.',
                    trend: 'improving',
                    highlights: {
                        improvements: ['mood improvement'],
                        regressions: []
                    },
                    period: {
                        currentStart: new Date('2026-04-06'),
                        currentEnd: new Date('2026-04-12'),
                        previousStart: new Date('2026-03-30'),
                        previousEnd: new Date('2026-04-05')
                    },
                    metadata: {
                        moodDelta: 1,
                        painDelta: -1,
                        activityConsistency: 0.6
                    }
                }

                const progressInsightsService = require(
                    '../../services/progressInsightsService'
                )
                progressInsightsService.generateProgressInsight
                    .mockResolvedValue(mockInsights)

                const response = await supertest(App)
                    .get(endpoint)
                    .set('Cookie', [
                        `accessToken=${token}`
                    ])

                expect(response.status).toBe(200)
                expect(response.body).toHaveProperty('message')
                expect(response.body).toHaveProperty('data')
                expect(response.body.data).toHaveProperty('summary')
                expect(response.body.data).toHaveProperty('trend')
                expect(response.body.data).toHaveProperty('highlights')
                expect(response.body.data).toHaveProperty('period')
                expect(response.body.data).toHaveProperty('metadata')
                expect(response.body.data.highlights).toHaveProperty(
                    'improvements'
                )
                expect(response.body.data.highlights).toHaveProperty(
                    'regressions'
                )
                expect(response.body.data.period).toHaveProperty(
                    'currentStart'
                )
                expect(response.body.data.period).toHaveProperty(
                    'currentEnd'
                )
                expect(response.body.data.period).toHaveProperty(
                    'previousStart'
                )
                expect(response.body.data.period).toHaveProperty(
                    'previousEnd'
                )
            }
        )
    })
})
