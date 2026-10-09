import type { CheckInType } from '../../../types/data/CheckInType'

const GOOD_MOOD_MIN = 7
const GOOD_PAIN_MAX = 4

// Same thresholds as the daily observation's better_days_pattern
export const isGoodCheckIn = (checkIn: CheckInType): boolean =>
    checkIn.moodScore >= GOOD_MOOD_MIN
    && checkIn.painLevel <= GOOD_PAIN_MAX
