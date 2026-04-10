export type {
    InsightDecisionMetadata,
    InsightDecisionResult,
    InsightType
} from '../../types/insight'
export {
    decideInsightType,
    InvalidInsightInputError
} from './decision/insightDecision'
export {
    isMoodDropping
} from './decision/moodTrendDetector'
export {
    calculateCurrentStreak
} from './decision/streakCalculator'
