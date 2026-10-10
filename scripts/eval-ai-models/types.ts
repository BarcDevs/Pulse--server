import type { RuleResult } from './rules'
import type { CallResult, Vendor } from './vendors'

export type Candidate = {
    id: string
    vendor: Vendor
    inPerM: number | null
    outPerM: number | null
}

export type JudgeConfig = {
    id: string
    vendor: Vendor
    mode: 'api' | 'subagent'
}

export type AuditConfig = {
    pricingNote: string
    pricingCheckedOn: string
    candidates: Candidate[]
    judges: JudgeConfig[]
    weights: Record<'quality' | 'obedience' | 'reliability' | 'cost' | 'latency', number>
}

export type RunRecord = CallResult & {
    model: string
    vendor: Vendor
    scenario: string
    rep: number
    rules: RuleResult[]
}

export type JudgeScore = {
    score: number
    note: string
}

// scenario -> alias -> score
export type JudgeVerdict = Record<string, Record<string, JudgeScore>>
