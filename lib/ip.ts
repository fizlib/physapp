import { headers } from 'next/headers'

export async function getClientIp() {
    const headerList = await headers()
    let ip = headerList.get('x-forwarded-for')?.split(',')[0] ||
        headerList.get('x-real-ip') ||
        '127.0.0.1'

    // If it's a loopback or common local IP, the server is likely running locally.
    // In this case, we fetch the public IP of the server itself.
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        try {
            // Use a short timeout to prevent hanging the request
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 2000)

            const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal })
            clearTimeout(id)

            if (res.ok) {
                const data = await res.json()
                if (data.ip) ip = data.ip
            }
        } catch (e) {
            console.warn('Failed to fetch public IP fallback:', e)
        }
    }
    return ip
}
