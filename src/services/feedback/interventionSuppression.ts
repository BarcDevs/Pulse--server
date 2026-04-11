import { FEEDBACK_DETECTION } from '../../constants/feedback/detection'
import type { AIInsightType } from '../../types/data/CheckInType'
import type {
    InterventionMetadata,
    InterventionMode,
    LowStateResult
} from '../../types/feedback'

export const calculateInterventionMode = (
    lowState: LowStateResult,
    previousIntervention?: AIInsightType
): InterventionMode => {
    if (!previousIntervention) return 'FULL'

    if (!previousIntervention.metadata) return 'FULL'

    const prevMetadata = (
        previousIntervention.metadata as InterventionMetadata
    )

    if (!prevMetadata.primaryReason) return 'FULL'

    const currentPrimary = lowState.reasons[0]
    const prevPrimary = prevMetadata.primaryReason

    if (currentPrimary !== prevPrimary)
        return 'FULL'

    const consecutiveCount = (
        (prevMetadata.consecutiveOccurrences || 0) + 1
    )

    switch (consecutiveCount) {
        case FEEDBACK_DETECTION.MODE.FULL_THRESHOLD:
            return 'FULL'
        case FEEDBACK_DETECTION.MODE.SOFT_THRESHOLD:
            return 'SOFT'
        default:
            return consecutiveCount
            >= FEEDBACK_DETECTION.MODE.SILENT_THRESHOLD
                ? 'SILENT'
                : 'FULL'
    }
}
