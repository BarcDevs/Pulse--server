import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Pulse API',
            version: '1.0.0',
            description: 'Pulse health and wellness platform API'
        },
        servers: [
            {
                url: '/',
                description: 'API server'
            }
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'accessToken',
                    description: 'JWT access token set as a cookie on login'
                },
                csrfToken: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'x-csrf-token',
                    description: 'CSRF token from the login response or GET /api/v1/auth/csrf'
                }
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        status: { type: 'integer' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        username: { type: 'string' },
                        email: {
                            type: 'string',
                            format: 'email'
                        },
                        image: { type: 'string' },
                        role: {
                            type: 'string',
                            enum: ['USER', 'ADMIN']
                        }
                    }
                },
                Tag: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        slug: { type: 'string' },
                        label: {
                            type: 'object',
                            properties: {
                                en: { type: 'string' },
                                he: { type: 'string', nullable: true }
                            },
                            required: ['en', 'he']
                        },
                        description: {
                            type: 'string',
                            nullable: true
                        },
                        posts: {
                            type: 'integer',
                            nullable: true
                        },
                        followers: {
                            type: 'integer',
                            nullable: true
                        }
                    }
                },
                Post: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        body: { type: 'string' },
                        category: { type: 'string' },
                        views: { type: 'integer' },
                        shareCount: { type: 'integer' },
                        likes: { type: 'integer' },
                        tags: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Tag' }
                        },
                        replies: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Reply' }
                        }
                    }
                },
                Reply: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        body: { type: 'string' },
                        _count: {
                            type: 'object',
                            properties: {
                                likes: { type: 'integer' }
                            }
                        }
                    }
                },
                AIInsight: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        type: {
                            type: 'string',
                            enum: [
                                'DAILY_MOTIVATION',
                                'TREND_ANALYSIS',
                                'ACTIVITY_SUGGESTIONS'
                            ]
                        },
                        content: { type: 'string' }
                    }
                },
                CheckIn: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        userId: { type: 'string' },
                        checkInDate: {
                            type: 'string',
                            format: 'date',
                            description: `User's local calendar date (UTC midnight)`
                        },
                        moodScore: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 10
                        },
                        painLevel: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 10
                        },
                        activities: {

                            type: 'array',
                            items: { type: 'string' }
                        },
                        notes: {
                            type: 'string',
                            nullable: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        updatedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                            description: 'Set when the check-in was edited; null on first create'
                        },
                        insights: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/AIInsight' }
                        }
                    }
                },
                CheckInStats: {
                    type: 'object',
                    properties: {
                        totalCheckIns: { type: 'integer' },
                        averageMoodScore: { type: 'number' },
                        averagePainLevel: { type: 'number' },
                        topActivities: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        currentStreak: { type: 'integer' },
                        longestStreak: { type: 'integer' }
                    }
                },
                ProgressInsightMetadata: {
                    type: 'object',
                    properties: {
                        moodDelta: {
                            type: 'number',
                            description: 'Change in average mood (current vs previous period)'
                        },
                        painDelta: {
                            type: 'number',
                            description: 'Change in average pain (negative = improvement)'
                        },
                        activityConsistency: {
                            type: 'number',
                            description: 'Ratio of active days to total days (0-1)'
                        }
                    }
                },
                ProgressInsightPeriod: {
                    type: 'object',
                    properties: {
                        currentStart: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Start of last 7 days'
                        },
                        currentEnd: {
                            type: 'string',
                            format: 'date-time',
                            description: 'End of last 7 days'
                        },
                        previousStart: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Start of previous 7 days'
                        },
                        previousEnd: {
                            type: 'string',
                            format: 'date-time',
                            description: 'End of previous 7 days'
                        }
                    }
                },
                ProgressInsightHighlights: {
                    type: 'object',
                    properties: {
                        improvements: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Metrics that improved in current period'
                        },
                        regressions: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Metrics that declined in current period'
                        }
                    }
                },
                ProgressInsight: {
                    type: 'object',
                    properties: {
                        summary: {
                            type: 'string',
                            description: 'AI-generated or fallback 2-4 sentence narrative'
                        },
                        trend: {
                            type: 'string',
                            enum: ['improving', 'declining', 'stable', 'mixed'],
                            description: 'Trend classification based on metric changes'
                        },
                        highlights: {
                            $ref: '#/components/schemas/ProgressInsightHighlights'
                        },
                        period: {
                            $ref: '#/components/schemas/ProgressInsightPeriod'
                        },
                        metadata: {
                            $ref: '#/components/schemas/ProgressInsightMetadata'
                        }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)
