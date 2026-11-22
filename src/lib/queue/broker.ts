import type { ChannelModel, ConfirmChannel } from 'amqplib'
import amqp from 'amqplib'

import { rabbitMqConfig } from '../../../config'
import logger from '../../utils/logger'

// One connection and one confirm channel for the whole process, opened on first
// use. When either closes the next caller opens them again, so a broker restart
// heals without a server restart. Callers must expect a rejection while the
// broker is away and fall back (the job row is the record; the sweeper repairs).

let connection: ChannelModel | null = null
let channelPromise: Promise<ConfirmChannel> | null = null

export const isBrokerConfigured = (): boolean => rabbitMqConfig.host !== ''

const reset = () => {
    connection = null
    channelPromise = null
}

const open = async (): Promise<ConfirmChannel> => {
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

    const channel = await created.createConfirmChannel()
    channel.on('error', (error: Error) => {
        logger.warn(`Job broker channel error: ${error.message}`)
    })
    channel.on('close', reset)

    connection = created

    return channel
}

export const getConfirmChannel = (): Promise<ConfirmChannel> => {
    if (!isBrokerConfigured()) {
        return Promise.reject(new Error('The job broker is not configured'))
    }

    if (!channelPromise) {
        channelPromise = open().catch((error) => {
            reset()
            throw error
        })
    }

    return channelPromise
}

export const closeBroker = async (): Promise<void> => {
    const closing = connection
    reset()
    await closing?.close().catch(() => undefined)
}
