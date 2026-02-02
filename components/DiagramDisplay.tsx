"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Maximize2 } from "lucide-react"

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
    if (result.includes('<svg') && !result.match(/<svg[^>]*\swidth\s*=/i)) {
        result = result.replace(/<svg/i, '<svg width="100%" height="auto"')
    }

    return result
}

export function DiagramDisplay({ diagramType, diagramSvg }: DiagramDisplayProps) {
    if (!diagramType || !diagramSvg) return null

    const sanitizedSvg = sanitizeSvg(diagramSvg)
    const title = diagramType === 'graph' ? 'Grafikas' : 'Schema'

    return (
        <div className="mt-4 border rounded-lg p-4 bg-muted/10">
            <div className="text-sm text-muted-foreground mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>📊</span>
                    <span>{title}</span>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <div className="group relative flex items-center justify-center p-4 bg-white rounded-lg border min-h-[150px] max-h-[300px] overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                        <div
                            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
                            className="w-full max-w-[400px] pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white/90 p-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium">
                                <Maximize2 className="w-4 h-4" />
                                Didinti
                            </div>
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] w-fit max-h-[95vh] flex flex-col p-4">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto flex items-center justify-center mt-2">
                        <div
                            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
                            className="min-w-[300px] w-full max-w-[1200px]"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
