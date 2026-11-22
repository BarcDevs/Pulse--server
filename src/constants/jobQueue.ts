// Names in scripts/deploy/compose/rabbitmq/definitions.json. Keep the two in step.
export const JOB_EXCHANGE = 'pulse.jobs'
export const JOB_RETRY_EXCHANGE = 'pulse.jobs.retry'
export const JOB_DEAD_EXCHANGE = 'pulse.jobs.dead'

export const CHECK_IN_AI_ROUTING_KEY = 'checkin-ai'
export const CHECK_IN_AI_QUEUE = 'pulse.checkin-ai'

export const JOB_BACKEND_POSTGRES = 'postgres'
export const JOB_BACKEND_RABBITMQ = 'rabbitmq'
