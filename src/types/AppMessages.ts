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
        resetPassword: { subject: string; body: string }
        confirmEmail: { subject: string; body: string }
        changeEmail: { subject: string; body: string }
    }
    insights: {
        titles: Record<InsightType, string>
        fallback: Record<InsightType, string>
    }
    progress: {
        fallback: string
    }
}
