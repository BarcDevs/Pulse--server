import logger from './logger'

export const t = (
    str: string,
    vars?: Record<string, string | number>
): string => {
    if (!vars) return str
    return str.replace(/\{\{(\w+)}}/g, (match, key) => {
        if (vars[key] === undefined) {
            logger.warn(`i18n: missing interpolation key "${key}"`)
            return match
        }
        return String(vars[key])
    })
}
