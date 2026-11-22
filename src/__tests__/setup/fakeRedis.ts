// The few Redis commands the cache helper uses, kept in a Map with real expiry
// by Date.now(), so a test can show a hit, a miss and an expiry without Redis.
type Entry = { value: string, expiresAt: number }

export const createFakeRedis = () => {
    const store = new Map<string, Entry>()
    const fake = {
        status: 'ready',
        get: jest.fn(async (key: string) => {
            const entry = store.get(key)
            if (!entry) return null
            if (Date.now() >= entry.expiresAt) {
                store.delete(key)
                return null
            }
            return entry.value
        }),
        set: jest.fn(async (key: string, value: string, _mode: 'EX', seconds: number) => {
            store.set(key, { value, expiresAt: Date.now() + seconds * 1000 })
            return 'OK'
        }),
        del: jest.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
        ttlOf: (key: string) => {
            const entry = store.get(key)
            return entry ? Math.ceil((entry.expiresAt - Date.now()) / 1000) : -2
        },
        clear: () => store.clear()
    }

    return fake
}
