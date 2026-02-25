import swaggerJsdoc from 'swagger-jsdoc'

import { serverConfig } from '../../config'

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
                url: `/api/${serverConfig.apiVersion}`,
                description: 'API server'
            }
        ]
    },
    apis: ['./src/routes/*.ts']
}

export const swaggerSpec = swaggerJsdoc(options)