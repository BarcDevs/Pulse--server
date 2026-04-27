import { z } from 'zod'

export const caseInsensitiveEnum = <const T extends readonly [
    string,
    ...string[]
]>(values: T) => {
    return z.preprocess(
        (input) => {
            if (typeof input !== 'string') return input
            return values.find(
                (v) => v.toLowerCase() === input.toLowerCase()
            )
        },
        z.enum(values)
    )
}
