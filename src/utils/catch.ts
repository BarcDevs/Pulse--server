// export const catchModel = <T>(fn: (...args: any) => any, msgPrefix = '') : Promise<T> => {
//     try {
//         return fn()
//     } catch (error) {
//         const err = error as Error
//         throw new Error(`${msgPrefix}${err.message}`)
//     }
// }
