import type {
    LowStateDetectionReason,
    Severity
} from './feedback'
import type { InsightType } from './insight'

type MessageGroup = {
    acknowledge: string[]
    normalize: string[]
    suggest?: string[]
}

export type AppMessages = {
    feedback: Record<
        LowStateDetectionReason,
        Record<Severity, MessageGroup>
    >
    emails: {
        shared: {
            title: string
            otpLabel: string
            heading: string
            expiry: string
            footer: string
        }
        resetPassword: {
            subject: string
            body: string
            html: {
                intro: string
                disclaimer: string
            }
        }
        confirmEmail: {
            subject: string
            body: string
            html: {
                intro: string
                disclaimer: string
            }
        }
        changeEmail: {
            subject: string
            body: string
            html: {
                intro: string
                disclaimer: string
            }
        }
    }
    insights: {
        titles: Record<InsightType, string>
        fallback: Record<InsightType, string>
    }
    observation: {
        title: string
    }
    progress: {
        fallback: string
    }
}
