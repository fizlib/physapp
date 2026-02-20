import { headers } from 'next/headers'

let cachedDevPublicIp: string | null = null
let cachedDevPublicIpFetchedAt = 0
const DEV_PUBLIC_IP_CACHE_TTL_MS = 5 * 60 * 1000

export async function getClientIp() {
    const headerList = await headers()

    // Priority 1: x-forwarded-for (set by proxies/load balancers)
    // This is the standard header for client IP when behind a reverse proxy
    const forwardedFor = headerList.get('x-forwarded-for')

    // Priority 2: x-real-ip (alternative header used by some proxies like nginx)
    const realIp = headerList.get('x-real-ip')

    // Get the first IP from x-forwarded-for (leftmost is original client)
    let ip = forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1'

    // Strip IPv6-mapped IPv4 prefix if present (e.g., ::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7)
    }

    // Optional fallback for local development only.
    // Keep disabled by default to avoid network latency in server rendering.
    const shouldUsePublicFallback =
        process.env.NODE_ENV === 'development' &&
        process.env.ENABLE_PUBLIC_IP_FALLBACK === 'true' &&
        !forwardedFor &&
        !realIp &&
        isLocalIp(ip)

    if (shouldUsePublicFallback) {
        const now = Date.now()
        if (cachedDevPublicIp && now - cachedDevPublicIpFetchedAt < DEV_PUBLIC_IP_CACHE_TTL_MS) {
            return cachedDevPublicIp
        }

        let timeoutId: ReturnType<typeof setTimeout> | null = null
        try {
            const controller = new AbortController()
            timeoutId = setTimeout(() => controller.abort(), 800)

            const res = await fetch('https://api.ipify.org?format=json', {
                signal: controller.signal,
                cache: 'no-store',
            })

            if (res.ok) {
                const data = await res.json()
                if (data.ip) {
                    ip = data.ip
                    cachedDevPublicIp = data.ip
                    cachedDevPublicIpFetchedAt = now
                }
            }
        } catch (e) {
            console.warn('Failed to fetch public IP fallback:', e)
        } finally {
            if (timeoutId) clearTimeout(timeoutId)
        }
    }

    return ip
}

function isLocalIp(ip: string): boolean {
    return ip === '::1' ||
        ip === '127.0.0.1' ||
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        ip.startsWith('172.16.') ||
        ip.startsWith('172.17.') ||
        ip.startsWith('172.18.') ||
        ip.startsWith('172.19.') ||
        ip.startsWith('172.20.') ||
        ip.startsWith('172.21.') ||
        ip.startsWith('172.22.') ||
        ip.startsWith('172.23.') ||
        ip.startsWith('172.24.') ||
        ip.startsWith('172.25.') ||
        ip.startsWith('172.26.') ||
        ip.startsWith('172.27.') ||
        ip.startsWith('172.28.') ||
        ip.startsWith('172.29.') ||
        ip.startsWith('172.30.') ||
        ip.startsWith('172.31.')
}
