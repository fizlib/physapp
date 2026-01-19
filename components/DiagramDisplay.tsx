"use client"

interface DiagramDisplayProps {
    diagramType: 'graph' | 'scheme' | null
    diagramLatex?: string | null  // Kept for backwards compatibility
    diagramSvg: string | null
}

function sanitizeSvg(svg: string): string {
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

    // Add width and height to SVG if not present (needed for proper rendering)
    // Check if SVG has width attribute
    if (result.includes('<svg') && !result.match(/<svg[^>]*\swidth\s*=/i)) {
        // Add width="100%" after <svg
        result = result.replace(/<svg/i, '<svg width="100%" height="auto" style="max-height: 400px;"')
    }

    return result
}

export function DiagramDisplay({ diagramType, diagramSvg }: DiagramDisplayProps) {
    if (!diagramType || !diagramSvg) return null

    const sanitizedSvg = sanitizeSvg(diagramSvg)

    return (
        <div className="mt-4 border rounded-lg p-4 bg-muted/10">
            <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <span>📊</span>
                <span>{diagramType === 'graph' ? 'Graph' : 'Diagram'}</span>
            </div>

            {/* Render SVG directly */}
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border min-h-[200px]">
                <div
                    dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
                    className="w-full max-w-[400px]"
                />
            </div>
        </div>
    )
}
