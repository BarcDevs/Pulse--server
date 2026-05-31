/**
 * ESLint rule: enforce-object-breaking
 * Enforces that object literals and type annotations with 3+ properties
 * must have each property on its own line (per CLAUDE.md rules)
 */
export default {
    meta: {
        type: 'layout',
        docs: {
            description:
                'Enforce breaking object literals/types with 3+ properties to new lines',
            category: 'Stylistic Issues'
        },
        fixable: 'code'
    },
    create (context) {
        const MAX_LINE_LENGTH = 50
        const sourceCode = context.sourceCode

        const exceedsLimit = (startLine) => {
            const line = sourceCode.lines[startLine - 1] ?? ''
            return line.length > MAX_LINE_LENGTH
        }

        return {
            ObjectExpression (node) {
                if ( node.properties.length < 3 ) return

                const firstProp = node.properties[ 0 ]
                const lastProp = node.properties[ node.properties.length - 1 ]
                const startLine = firstProp.loc.start.line
                const endLine = lastProp.loc.end.line

                if ( startLine === endLine && exceedsLimit(startLine) ) {
                    context.report({
                        node,
                        message:
                            'Object with 3+ properties must have each property on its own line'
                    })
                }
            },

            TSTypeLiteral (node) {
                if ( node.members.length < 3 ) return

                const firstMember = node.members[ 0 ]
                const lastMember = node.members[ node.members.length - 1 ]
                const startLine = firstMember.loc.start.line
                const endLine = lastMember.loc.end.line

                if ( startLine === endLine && exceedsLimit(startLine) ) {
                    context.report({
                        node,
                        message:
                            'Type literal with 3+ members must have each member on its own line'
                    })
                }
            },

            FunctionDeclaration (node) {
                if ( node.params.length < 3 ) return

                const firstParam = node.params[ 0 ]
                const lastParam = node.params[ node.params.length - 1 ]
                const startLine = firstParam.loc.start.line
                const endLine = lastParam.loc.end.line

                if ( startLine === endLine && exceedsLimit(startLine) ) {
                    const paramSpan =
                        lastParam.loc.end.column
                        - firstParam.loc.start.column
                    if ( paramSpan >= 30 ) {
                        context.report({
                            node,
                            message:
                                'Function with 3+ parameters must have each parameter on its own line'
                        })
                    }
                }
            },

            ArrowFunctionExpression (node) {
                if ( node.params.length < 3 ) return

                const firstParam = node.params[ 0 ]
                const lastParam = node.params[ node.params.length - 1 ]
                const startLine = firstParam.loc.start.line
                const endLine = lastParam.loc.end.line

                if ( startLine === endLine && exceedsLimit(startLine) ) {
                    const paramSpan =
                        lastParam.loc.end.column
                        - firstParam.loc.start.column
                    if ( paramSpan >= 30 ) {
                        context.report({
                            node,
                            message:
                                'Function with 3+ parameters must have each parameter on its own line'
                        })
                    }
                }
            },

            ObjectPattern (node) {
                if ( node.properties.length < 3 ) return

                const props = node.properties
                const firstProp = props[ 0 ]
                const lastProp = props[ props.length - 1 ]
                const startLine = firstProp.loc.start.line
                const endLine = lastProp.loc.end.line

                if ( startLine === endLine && exceedsLimit(startLine) ) {
                    context.report({
                        node,
                        message:
                            'Destructuring with 3+ properties must have each property on its own line'
                    })
                }
            },

            ImportDeclaration (node) {
                const specifiers = node.specifiers.filter(
                    spec => spec.type === 'ImportSpecifier'
                )
                if ( specifiers.length < 3 ) return

                const firstSpec = specifiers[ 0 ]
                const lastSpec = specifiers[ specifiers.length - 1 ]
                const startLine = firstSpec.loc.start.line
                const endLine = lastSpec.loc.end.line

                if ( startLine === endLine && exceedsLimit(startLine) ) {
                    context.report({
                        node,
                        message:
                            'Import with 3+ items must have each item on its own line'
                    })
                }
            }
        }
    }
}