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
                        upvotedBy: { type: 'array', items: { type: 'string' } },
                        downvotedBy: { type: 'array', items: { type: 'string' } },
                        upvotes: { type: 'integer' },
                        downvotes: { type: 'integer' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        image: { type: 'string' },
                        role: { type: 'string', enum: ['USER', 'ADMIN'] }
                    }
                },
                Tag: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                Post: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        body: { type: 'string' },
                        category: { type: 'string' },
                        authorId: { type: 'string' },
                        author: { $ref: '#/components/schemas/User' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        votes: { $ref: '#/components/schemas/Votes' },
                        views: { type: 'integer' },
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
                        authorId: { type: 'string' },
                        author: { $ref: '#/components/schemas/User' },
                        postId: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        votes: { $ref: '#/components/schemas/Votes' }
                    }
                },
                AIInsight: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        checkInId: { type: 'string' },
                        type: {
                            type: 'string',
                            enum: [
                                'DAILY_MOTIVATION',
                                'TREND_ANALYSIS',
                                'ACTIVITY_SUGGESTIONS'
                            ]
                        },
                        content: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                },
                CheckIn: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        userId: { type: 'string' },
                        moodScore: { type: 'integer', minimum: 1, maximum: 10 },
                        painLevel: { type: 'integer', minimum: 1, maximum: 10 },
                        activities: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        notes: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
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
                        }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)
