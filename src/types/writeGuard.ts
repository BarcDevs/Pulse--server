// Resolves false once the caller's job was superseded, so its results must not be stored
export type WriteGuard = () => Promise<boolean>

export const alwaysWrite: WriteGuard = async () => true
