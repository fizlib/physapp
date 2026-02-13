export function sanitizeSvg(svg: string): string {
    // Unescape common HTML entities that might be in the SVG
    let result = svg
    result = result.replace(/&lt;/g, '<')
    result = result.replace(/&gt;/g, '>')
    result = result.replace(/&amp;/g, '&')
    result = result.replace(/&quot;/g, '"')
    result = result.replace(/&#39;/g, "'")
    result = result.replace(/&#x27;/g, "'")
    result = result.replace(/&#x2F;/g, '/')
    // Handle escaped backslashes in newlines
    result = result.replace(/\\n/g, '\n')
    result = result.replace(/\\r/g, '')
    result = result.trim()

    const parseSvgDimension = (value?: string): number | null => {
        if (!value) return null
        const normalized = value.trim().toLowerCase()
        if (normalized.endsWith('%')) return null
        const match = normalized.match(/^([0-9]*\.?[0-9]+)(px)?$/)
        if (!match) return null
        const parsed = Number.parseFloat(match[1])
        return Number.isFinite(parsed) ? parsed : null
    }

    const formatDimension = (value: number): string => (
        Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
    )

    // Normalize only the root <svg> tag so sizing remains predictable.
    const svgTagMatch = result.match(/<svg\b([^>]*)>/i)
    if (!svgTagMatch) return result

    let attrs = (svgTagMatch[1] || '').replace(/\s+/g, ' ').trim()
    const widthValue = attrs.match(/\bwidth\s*=\s*["']([^"']+)["']/i)?.[1]
    const heightValue = attrs.match(/\bheight\s*=\s*["']([^"']+)["']/i)?.[1]
    const numericWidth = parseSvgDimension(widthValue)
    const numericHeight = parseSvgDimension(heightValue)

    if (!/\bviewBox\s*=\s*["'][^"']*["']/i.test(attrs) && numericWidth !== null && numericHeight !== null) {
        attrs = `${attrs} viewBox="0 0 ${formatDimension(numericWidth)} ${formatDimension(numericHeight)}"`.trim()
    }

    const hasViewBox = /\bviewBox\s*=\s*["'][^"']*["']/i.test(attrs)
    if (hasViewBox) {
        // When we have a coordinate system, make SVG responsive.
        attrs = attrs
            .replace(/\s+width\s*=\s*["'][^"']*["']/ig, '')
            .replace(/\s+height\s*=\s*["'][^"']*["']/ig, '')
            .trim()
        if (!/\bwidth\s*=/.test(attrs)) {
            attrs = `${attrs} width="100%"`.trim()
        }
    } else {
        // Without a viewBox, percentage sizing can crop content; fall back to intrinsic sizing.
        attrs = attrs
            .replace(/\s+width\s*=\s*["'][^"']*%["']/ig, '')
            .replace(/\s+height\s*=\s*["'](auto|[^"']*%)["']/ig, '')
            .trim()
    }

    if (!/\bpreserveAspectRatio\s*=/.test(attrs)) {
        attrs = `${attrs} preserveAspectRatio="xMidYMid meet"`.trim()
    }

    // Allow content outside the nominal viewport to remain visible.
    if (!/\boverflow\s*=/.test(attrs)) {
        attrs = `${attrs} overflow="visible"`.trim()
    }

    result = result.replace(/<svg\b[^>]*>/i, `<svg${attrs ? ` ${attrs}` : ''}>`)

    return result
}
