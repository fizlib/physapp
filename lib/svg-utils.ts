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

    // Remove existing width and height attributes to make it responsive
    result = result.replace(/(<svg[^>]*)\s+width=["'][^"']*["']/i, '$1')
    result = result.replace(/(<svg[^>]*)\s+height=["'][^"']*["']/i, '$1')

    // Add responsive attributes and preserve aspect ratio
    if (result.includes('<svg')) {
        result = result.replace(/<svg/i, '<svg width="100%" preserveAspectRatio="xMidYMid meet"')
    }

    return result
}
