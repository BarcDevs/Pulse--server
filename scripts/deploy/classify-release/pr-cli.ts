import { readFileSync } from 'node:fs'

import { classifySafely } from './classify'
import { readRange } from './gitReader'
import guards from './ship-guards.json'
import { renderSummary } from './summary'

// PR phase, run by the fixer routine on a checkout of the LAST DEPLOYED sha's tooling:
//   REPO_DIR=<checkout of development> LAST_DEPLOYED_SHA=<sha> HEAD_SHA=<development sha> PR_TEXT_FILE=<file>
// Prints one JSON line: {"hold": boolean, "comment": "<markdown>"}. The routine adds or removes the
// `needs-review` label from "hold" and posts "comment". Any error holds.
const requireEnv = (name: string): string => {
    const value = process.env[name]
    if (!value) throw new Error(`${name} is not set`)
    return value
}

let captured: Parameters<typeof renderSummary>[1] = {
    changedFiles: [],
    commitMessages: [],
    prTexts: []
}
const result = classifySafely(() => {
    captured = {
        ...readRange(
            process.env.REPO_DIR ?? process.cwd(),
            requireEnv('LAST_DEPLOYED_SHA'),
            requireEnv('HEAD_SHA')
        ),
        prTexts: [readFileSync(requireEnv('PR_TEXT_FILE'), 'utf8')]
    }
    return captured
})

console.info(JSON.stringify({
    hold: result.hold,
    comment: renderSummary(
        result,
        captured,
        guards.categories
    )
}))
