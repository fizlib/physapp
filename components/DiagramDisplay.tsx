"use client"

interface DiagramDisplayProps {
    diagramType: 'graph' | 'scheme' | null
    diagramLatex?: string | null  // Kept for backwards compatibility
    diagramSvg: string | null
}

export function DiagramDisplay({ diagramType, diagramSvg }: DiagramDisplayProps) {
    if (!diagramType || !diagramSvg) return null

    return (
        <div className="mt-4 border rounded-lg p-4 bg-muted/10">
            <div className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <span>📊</span>
                <span>{diagramType === 'graph' ? 'Graph' : 'Diagram'}</span>
            </div>

            {/* Render SVG directly */}
            <div className="flex items-center justify-center p-4 bg-white rounded-lg border min-h-[200px]">
                <div
                    dangerouslySetInnerHTML={{ __html: diagramSvg }}
                    className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[400px]"
                />
            </div>
        </div>
    )
}
