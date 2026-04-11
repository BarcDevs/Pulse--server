export const FEEDBACK_DETECTION = {
    MOOD: {
        THRESHOLD: 3,
        WEIGHT_MIN: 0.7,
        WEIGHT_MAX: 1.0,
        WEIGHT_DIVISOR: 3
    },
    PAIN: {
        THRESHOLD: 7,
        WEIGHT_MIN: 0.6,
        WEIGHT_MAX: 1.0,
        WEIGHT_DIVISOR: 3
    },
    TREND: {
        DELTA_THRESHOLD: 2,
        WEIGHT_MIN: 0.5,
        WEIGHT_MAX: 0.9,
        WEIGHT_DIVISOR: 5
    },
    MODE: {
        FULL_THRESHOLD: 1,
        SOFT_THRESHOLD: 2,
        SILENT_THRESHOLD: 3
    },
    MESSAGE: {
        PRIORITY_HIGH_WEIGHT_THRESHOLD: 0.6
    }
}
