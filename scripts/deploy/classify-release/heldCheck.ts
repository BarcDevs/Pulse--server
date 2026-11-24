import {
    isCleared,
    type LabelEvent,
    NEEDS_REVIEW
} from './clearance'

export type HeldCheckInput = {
    labels: string[]
    events: LabelEvent[]
    owner: string
    headCommittedAt: string
}

export type HeldCheckResult = {
    pass: boolean
    reason: string
}

// A release PR to main may merge only when it is not held, or the owner cleared it after the head
// commit. Same clearance rule as the deploy gate; there is no deploy tree to compare yet.
export const heldCheck = ({
    labels,
    events,
    owner,
    headCommittedAt
}: HeldCheckInput): HeldCheckResult => {
    if (!labels.includes(NEEDS_REVIEW)) return {
        pass: true,
        reason: 'not held'
    }
    const cleared = isCleared({
        events,
        owner,
        headCommittedAt,
        prHeadTree: 'pr',
        deployTree: 'pr'
    })
    return cleared ? {
        pass: true,
        reason: 'held, cleared by the owner'
    } : {
        pass: false,
        reason: `held with ${NEEDS_REVIEW}: ${owner} must remove the label or add ship-ok after the latest commit before this can merge`
    }
}
