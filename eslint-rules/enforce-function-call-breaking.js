/**
 * ESLint rule: enforce-function-call-breaking
 * Enforces that function calls with 3+ arguments
 * must have each argument on its own line (per CLAUDE.md rules)
 */
export default {
    meta: {
        type: 'layout',
        docs: {
            description:
                'Enforce breaking function calls with 3+ arguments to new lines',
            category: 'Stylistic Issues'
        },
        fixable: 'code'
    },
    create (context) {
        const MAX_LINE_LENGTH = 50
        const sourceCode = context.sourceCode

        return {
            CallExpression (node) {
                if (node.arguments.length < 3) return

                const firstArg = node.arguments[0]
                const lastArg = node.arguments[node.arguments.length - 1]
                const startLine = firstArg.loc.start.line
                const endLine = lastArg.loc.end.line

                if (startLine === endLine) {
                    const line = sourceCode.lines[startLine - 1] ?? ''
                    if (line.length <= MAX_LINE_LENGTH) return
                    context.report({
                        node,
                        message:
                            'Function call with 3+ arguments must have each argument on its own line'
                    })
                }
            }
        }
    }
}
