import type { Classification, ClassifyInput } from './classify'

const area = (file: string): string => file.split('/').slice(0, 2).join('/')

const bullets = (items: string[]): string => items.map((item) => `- ${item}`).join('\n')

const clientImpactLines = (texts: string[]): string[] => texts
    .flatMap((text) => text.split('\n'))
    .map((line) => /^Client impact:\s*(.+)$/i.exec(line)?.[1].trim())
    .filter((line): line is string => Boolean(line))

const subjects = (commitMessages: string[]): string[] => commitMessages
    .map((message) => message.split('\n')[0])
    .filter((subject) => /^(feat|fix|rfc|perf)(\(|!|:)/.test(subject))

// The comment posted on every release PR: held ones get the full review summary, auto ones list
// what was checked, so a wrong auto result is visible.
export const renderSummary = (
    classification: Classification,
    input: ClassifyInput,
    categories: string[]
): string => {
    const areas = [...new Set(input.changedFiles.map(area))].sort()
    if (!classification.hold) {
        return [
            '**Ship rules: auto-ship.** No hold rule matched.',
            '',
            `Checked: ${categories.join(', ')}, client impact, BREAKING CHANGE.`,
            '',
            `Changed areas:\n${bullets(areas)}`
        ].join('\n')
    }
    const impacts = clientImpactLines(input.prTexts).filter((line) => !/^none\b/i.test(line))
    return [
        '**Ship rules: held (`needs-review`).** Remove the label, or add `ship-ok`, to let it deploy.',
        '',
        `Matched rules:\n${bullets(classification.reasons)}`,
        '',
        `Changed areas:\n${bullets(areas)}`,
        '',
        `New behaviour:\n${bullets(subjects(input.commitMessages).length ? subjects(input.commitMessages) : ['(no feat, fix, rfc or perf commits)'])}`,
        '',
        `Client impact: ${impacts.length ? impacts.join('; ') : 'none stated'}`
    ].join('\n')
}
