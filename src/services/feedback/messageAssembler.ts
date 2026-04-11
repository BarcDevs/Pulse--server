export const assembleMessage = (
    parts: {
        acknowledge: string
        normalize: string
        suggest?: string
    },
    mode: 'FULL' | 'SOFT' | 'SILENT'
): string => {
    if (mode === 'SILENT')
        return ''

    if (mode === 'SOFT')
        return parts.acknowledge

    const message = `${parts.acknowledge} ${parts.normalize}`
    return parts.suggest ? `${message} ${parts.suggest}` : message
}