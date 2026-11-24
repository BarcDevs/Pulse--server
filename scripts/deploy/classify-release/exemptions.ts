const USES_LINE = /^[+-]\s*(-\s*)?uses:\s/

// True when every changed line in a unified diff is a `uses:` line, i.e. a pinned action bump
// and nothing else. An empty diff is not exempt.
export const usesOnlyDiff = (diff: string): boolean => {
    const changed = diff.split('\n').filter(
        (line) => /^[+-]/.test(line) && !line.startsWith('+++') && !line.startsWith('---')
    )
    return changed.length > 0 && changed.every((line) => USES_LINE.test(line))
}

export const isDependabot = (author: string): boolean => /dependabot(\[bot\])?/i.test(author)

// A workflow file is exempt from the path rules only when every commit that touched it in the
// range is Dependabot's and the whole diff of that file is `uses:` lines.
export const isExemptWorkflowChange = (
    file: string,
    commitAuthors: string[],
    diff: string
): boolean => file.startsWith('.github/workflows/')
    && commitAuthors.length > 0
    && commitAuthors.every(isDependabot)
    && usesOnlyDiff(diff)
