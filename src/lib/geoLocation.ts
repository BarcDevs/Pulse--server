import geoip from 'geoip-lite'

export const getTimezoneFromIp = (ip: string): string | null => {
    const lookup = geoip.lookup(ip)

    return lookup?.timezone ?? null
}
