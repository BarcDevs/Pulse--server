import { z } from 'zod'

export const caseInsensitiveEnum = <T extends readonly string[]>(
    values: T
) => {
    const valueMap = values.reduce((acc, val) => {
        acc[val.toLowerCase()] = val
        return acc
    }, {} as Record<string, T[number]>)

    return z
        .string()
        .refine(
            (val) => val.toLowerCase() in valueMap,
            {
                message: `Invalid enum value. Expected one of: ${values.join(', ')}`
            }
        )
        .transform((val) => 
            valueMap[val.toLowerCase()] as T[number]) as z.ZodType<
        T[number],
        z.ZodTypeDef,
        T[number]
    >
}
