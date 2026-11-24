import { HOLD_CATEGORIES } from './rules'

export type ClassifyInput = {
    changedFiles: string[]
    commitMessages: string[]
    prTexts: string[]
}

export type Classification = {
    hold: boolean
    reasons: string[]
}

const CLIENT_IMPACT = /^Client impact:\s*(?!none\b)\S/im
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE\b/m
const BREAKING_BANG = /^[a-z]+(\([^)]*\))?!:/

const pathReasons = (changedFiles: string[]): string[] =>
    HOLD_CATEGORIES.flatMap(({ id, patterns }) =>
        changedFiles
            .filter((file) => patterns.some((pattern) => pattern.test(file)))
            .map((file) => `${id}: ${file}`)
    )

const textReasons = (commitMessages: string[], prTexts: string[]): string[] => {
    const reasons: string[] = []
    const allText = [...commitMessages, ...prTexts]
    if (allText.some((text) => CLIENT_IMPACT.test(text))) reasons.push('client-impact: Client impact is not none')
    const breaking = commitMessages.some(
        (message) => BREAKING_FOOTER.test(message) || BREAKING_BANG.test(message.split('\n')[0])
    ) || prTexts.some((text) => BREAKING_FOOTER.test(text))
    if (breaking) reasons.push('breaking-change: BREAKING CHANGE found')
    return reasons
}

export const classify = ({
    changedFiles,
    commitMessages,
    prTexts
}: ClassifyInput): Classification => {
    if (!changedFiles.length) return {
        hold: true,
        reasons: ['empty diff']
    }
    const reasons = [...pathReasons(changedFiles), ...textReasons(commitMessages, prTexts)]
    return {
        hold: reasons.length > 0,
        reasons
    }
}

// Any failure holds: an unexpected error must never turn into an auto-ship.
export const classifySafely = (read: () => ClassifyInput): Classification => {
    try {
        return classify(read())
    } catch (error) {
        return {
            hold: true,
            reasons: [`classifier error: ${error instanceof Error ? error.message : String(error)}`]
        }
    }
}
