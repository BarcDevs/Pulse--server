export type ObservationType =
    | 'activity_consistency'
    | 'checkin_consistency'
    | 'streak_consistency'
    | 'mood_stability'
    | 'pain_improvement'
    | 'better_days_pattern'

export type TodayObservationResponse = {
    title: string
    type: ObservationType
    observation: string
    supportiveDescription: string
    icon: string
    createdAt: string
}
