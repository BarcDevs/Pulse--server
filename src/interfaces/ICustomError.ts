export interface ICustomError {
    statusCode: number
    statusType: string
    code: string

    serializeErrors(): {
        statusType: string
        statusCode?: number
        code: string
        params?: Record<string, string>
        error: string
        field?: string
    }[]
}
