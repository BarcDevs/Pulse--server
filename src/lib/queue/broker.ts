import type {
    Channel,
    ChannelModel,
    ConfirmChannel
} from 'amqplib'
import amqp from 'amqplib'

import { rabbitMqConfig } from '../../../config'
import logger from '../../utils/logger'

// One connection for the whole process, opened on first use. When it closes the
// next caller opens it again, so a broker restart heals without a server
// restart. Callers must expect a rejection while the broker is away and fall
// back (the job row is the record; the sweeper repairs).

let connection: ChannelModel | null = null
let connectionPromise: Promise<ChannelModel> | null = null
let confirmChannelPromise: Promise<ConfirmChannel> | null = null

export const isBrokerConfigured = (): boolean => rabbitMqConfig.host !== ''

const reset = () => {
    connection = null
    connectionPromise = null
    confirmChannelPromise = null
}

const connect = async (): Promise<ChannelModel> => {
    const created = await amqp.connect({
        protocol: 'amqp',
        hostname: rabbitMqConfig.host,
        port: rabbitMqConfig.port,
        username: rabbitMqConfig.user,
        password: rabbitMqConfig.password,
        vhost: rabbitMqConfig.vhost,
        heartbeat: 15
    })

    created.on('error', (error: Error) => {
        logger.warn(`Job broker connection error: ${error.message}`)
    })
    created.on('close', () => {
        logger.warn('Job broker connection closed')
        reset()
    })

    connection = created

    return created
}

const getConnection = (): Promise<ChannelModel> => {
    if (!isBrokerConfigured()) {
        return Promise.reject(new Error('The job broker is not configured'))
    }

    if (!connectionPromise) {
        connectionPromise = connect().catch((error) => {
            reset()
            throw error
        })
    }

    return connectionPromise
}

const logChannelError = (channel: Channel, name: string) => {
    channel.on('error', (error: Error) => {
        logger.warn(`Job broker ${name} channel error: ${error.message}`)
    })
}

// Publishing: one shared confirm channel, opened again when it closes.
export const getConfirmChannel = (): Promise<ConfirmChannel> => {
    if (!confirmChannelPromise) {
        confirmChannelPromise = getConnection()
            .then(async (model) => {
                const channel = await model.createConfirmChannel()
                logChannelError(channel, 'publish')
                channel.on('close', () => {
                    confirmChannelPromise = null
                })

                return channel
            })
            .catch((error) => {
                confirmChannelPromise = null
                throw error
            })
    }

    return confirmChannelPromise
}

// Consuming: a channel of its own for each consumer, because prefetch is per channel.
export const createConsumerChannel = async (): Promise<Channel> => {
    const channel = await (await getConnection()).createChannel()
    logChannelError(channel, 'consume')

    return channel
}

export const closeBroker = async (): Promise<void> => {
    const closing = connection
    reset()
    await closing?.close().catch(() => undefined)
}
