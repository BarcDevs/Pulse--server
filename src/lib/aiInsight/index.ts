export type {
    InsightDecisionMetadata,
    InsightDecisionResult,
    InsightType
} from '../../types/insight'
export {
    decideInsightType,
    InvalidInsightInputError
} from './decision/InsightDecision'
export {
    isMoodDropping
} from './decision/moodTrendDetector'
export {
    calculateCurrentStreak
} from './decision/streakCalculator'
