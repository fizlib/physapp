/**
 * Rewrites all internal IDs and CSS class names in an SVG string with a unique
 * suffix to prevent collisions when multiple SVGs are rendered on the same page.
 * Handles:
 *   - id="...", url(#...), href="#...", xlink:href="#..." (ID references)
 *   - <style> block class selectors and class="..." attributes (CSS classes)
 */
function namespaceSvgIds(svg: string, uid: string): string {
    let result = svg

    // --- Phase 1: Namespace element IDs ---
    const idRegex = /\bid\s*=\s*["']([^"']+)["']/gi
    const ids = new Set<string>()
    let match: RegExpExecArray | null
    while ((match = idRegex.exec(svg)) !== null) {
        ids.add(match[1])
    }

    for (const id of ids) {
        const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const newId = `${id}_${uid}`

        // Replace id="X" with id="X_uid"
        result = result.replace(
            new RegExp(`(\\bid\\s*=\\s*["'])${escapedId}(["'])`, 'g'),
            `$1${newId}$2`
        )

        // Replace url(#X) with url(#X_uid)
        result = result.replace(
            new RegExp(`url\\(\\s*#${escapedId}\\s*\\)`, 'g'),
            `url(#${newId})`
        )

        // Replace url("#X") and url('#X') — quoted form
        result = result.replace(
            new RegExp(`url\\(\\s*["']#${escapedId}["']\\s*\\)`, 'g'),
            `url(#${newId})`
        )

        // Replace href="#X" and xlink:href="#X"
        result = result.replace(
            new RegExp(`((?:xlink:)?href\\s*=\\s*["'])#${escapedId}(["'])`, 'g'),
            `$1#${newId}$2`
        )
    }

    // --- Phase 2: Namespace CSS class names ---
    // Collect class names defined in <style> blocks
    const classNames = new Set<string>()
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
    let styleMatch: RegExpExecArray | null
    while ((styleMatch = styleRegex.exec(result)) !== null) {
        const content = styleMatch[1]
        const classDefRegex = /\.([a-zA-Z_][\w-]*)/g
        let cm: RegExpExecArray | null
        while ((cm = classDefRegex.exec(content)) !== null) {
            classNames.add(cm[1])
        }
    }

    if (classNames.size > 0) {
        // Step 2a: Namespace class selectors inside <style> blocks
        result = result.replace(
            /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
            (_match, openTag: string, content: string, closeTag: string) => {
                let updatedContent = content
                for (const cls of classNames) {
                    const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    updatedContent = updatedContent.replace(
                        new RegExp(`\\.${escaped}\\b`, 'g'),
                        `.${cls}_${uid}`
                    )
                }
                return `${openTag}${updatedContent}${closeTag}`
            }
        )

        // Step 2b: Namespace class names in class="..." attributes
        result = result.replace(
            /\bclass\s*=\s*["']([^"']+)["']/g,
            (fullMatch, classValue: string) => {
                const updated = classValue.split(/\s+/).map((c: string) => {
                    return classNames.has(c) ? `${c}_${uid}` : c
                }).join(' ')
                return fullMatch.replace(classValue, updated)
            }
        )
    }

    return result
}

export function sanitizeSvg(svg: string, uniqueId?: string): string {
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

    // Namespace all internal IDs to prevent collisions between multiple SVGs on the same page
    if (uniqueId) {
        result = namespaceSvgIds(result, uniqueId)
    }

    return result
}
