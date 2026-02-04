"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Maximize2, X } from "lucide-react"
import Image from "next/image"

interface DiagramDisplayProps {
    diagramType: 'graph' | 'scheme' | null
    diagramLatex?: string | null  // Kept for backwards compatibility
    diagramSvg: string | null
    diagramImageUrl?: string | null
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

    // Remove existing width and height attributes to make it responsive
    result = result.replace(/(<svg[^>]*)\s+width=["'][^"']*["']/i, '$1')
    result = result.replace(/(<svg[^>]*)\s+height=["'][^"']*["']/i, '$1')

    // Add responsive attributes and preserve aspect ratio
    if (result.includes('<svg')) {
        result = result.replace(/<svg/i, '<svg width="100%" preserveAspectRatio="xMidYMid meet"')
    }

    return result
}

export function DiagramDisplay({ diagramType, diagramSvg, diagramImageUrl }: DiagramDisplayProps) {
    if (!diagramImageUrl && (!diagramType || !diagramSvg)) return null

    const sanitizedSvg = diagramSvg ? sanitizeSvg(diagramSvg) : null
    const title = diagramImageUrl ? 'Iliustracija' : (diagramType === 'graph' ? 'Grafikas' : 'Schema')

    return (
        <div className="mt-4 border rounded-lg p-4 bg-muted/10">
            <Dialog>
                <DialogTrigger asChild>
                    <div className="group relative flex items-center justify-center p-4 bg-white rounded-lg border min-h-[150px] max-h-[350px] overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
                        {diagramImageUrl ? (
                            <div className="relative w-full h-[200px] sm:h-[300px]">
                                <Image
                                    src={diagramImageUrl}
                                    alt="Illustration"
                                    fill
                                    className="object-contain"
                                    sizes="(max-width: 768px) 100vw, 800px"
                                    priority={false}
                                />
                            </div>
                        ) : (
                            <div
                                dangerouslySetInnerHTML={{ __html: sanitizedSvg! }}
                                className="w-full pointer-events-none"
                            />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white/90 p-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium">
                                <Maximize2 className="w-4 h-4" />
                                Didinti
                            </div>
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent
                    showCloseButton={false}
                    className="max-w-[98vw] w-full sm:max-w-[90vw] max-h-[98vh] flex flex-col p-0 bg-transparent border-none shadow-none"
                >
                    <DialogTitle className="sr-only">{title}</DialogTitle>

                    <div className="relative flex-1 flex items-center justify-center p-4 sm:p-12">
                        <div className="relative w-full max-h-full flex flex-col items-center">
                            <div className="w-full flex justify-end mb-2">
                                <DialogClose className="p-2 text-white hover:text-zinc-300 transition-colors">
                                    <X className="w-9 h-9" />
                                    <span className="sr-only">Uždaryti</span>
                                </DialogClose>
                            </div>

                            <div className="relative w-full flex items-center justify-center">
                                {diagramImageUrl ? (
                                    <div className="relative w-full h-[70vh] min-h-[300px]">
                                        <Image
                                            src={diagramImageUrl}
                                            alt="Illustration"
                                            fill
                                            className="object-contain"
                                            sizes="95vw"
                                            priority
                                        />
                                    </div>
                                ) : (
                                    <div
                                        dangerouslySetInnerHTML={{ __html: sanitizedSvg! }}
                                        className="w-full h-full max-w-[1400px] bg-white rounded-xl p-8 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[80vh]"
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
