import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HealEase API',
            version: '1.0.0',
            description: 'HealEase health and wellness platform API'
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
                Votes: {
                    type: 'object',
                    properties: {
                        upvotedBy: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        upvotes: { type: 'integer' }
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
                        name: { type: 'string' },
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
                        votes: { $ref: '#/components/schemas/Votes' },
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
                        votes: { $ref: '#/components/schemas/Votes' }
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
                }
            }
        }
    },
    apis: ['./src/routes/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)
