export type LabelEvent = {
    event: string
    label?: { name: string }
    actor?: { login: string } | null
    created_at: string
}

export type ClearanceInput = {
    events: LabelEvent[]
    owner: string
    headCommittedAt: string
    prHeadTree: string
    deployTree: string
}

export const NEEDS_REVIEW = 'needs-review'
export const SHIP_OK = 'ship-ok'

// A held release deploys only when the owner (never a bot) removed needs-review or added ship-ok
// after the PR head commit, and nothing re-held it since. Tying the clearance to the tree keeps it
// valid for squash and rebase merges and invalid for any other content.
export const isCleared = ({
    events,
    owner,
    headCommittedAt,
    prHeadTree,
    deployTree
}: ClearanceInput): boolean => {
    if (!prHeadTree || prHeadTree !== deployTree) return false
    const since = Date.parse(headCommittedAt)
    if (Number.isNaN(since)) return false
    const ordered = [...events].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    let cleared = false
    ordered.forEach(({
        event,
        label,
        actor,
        created_at: createdAt
    }) => {
        const byOwner = actor?.login === owner && Date.parse(createdAt) > since
        if (event === 'unlabeled' && label?.name === NEEDS_REVIEW && byOwner) cleared = true
        if (event === 'labeled' && label?.name === SHIP_OK && byOwner) cleared = true
        if (event === 'labeled' && label?.name === NEEDS_REVIEW) cleared = false
        if (event === 'unlabeled' && label?.name === SHIP_OK) cleared = false
    })
    return cleared
}
