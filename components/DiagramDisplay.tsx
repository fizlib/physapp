"use client"

import { useId } from "react"
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog"
import { Maximize2, X } from "lucide-react"
import Image from "next/image"
import { sanitizeSvg } from "@/lib/svg-utils"

interface DiagramDisplayProps {
    diagramType: 'graph' | 'scheme' | null
    diagramLatex?: string | null  // Kept for backwards compatibility
    diagramSvg: string | null
    diagramImageUrl?: string | null
}

export function DiagramDisplay({ diagramType, diagramSvg, diagramImageUrl }: DiagramDisplayProps) {
    // useId() must be called unconditionally (before any early returns) per React hooks rules.
    // It produces a stable, unique ID per component instance to prevent SVG ID collisions.
    const reactId = useId()
    const svgUid = reactId.replace(/[^a-zA-Z0-9]/g, '')

    if (!diagramImageUrl && !diagramSvg) return null

    const sanitizedSvg = diagramSvg ? sanitizeSvg(diagramSvg, svgUid) : null
    const title = diagramImageUrl ? 'Iliustracija' : (diagramType === 'graph' ? 'Grafikas' : 'Schema')

    return (
        <div className="mt-4 border rounded-lg p-4 bg-muted/10">
            <Dialog>
                <DialogTrigger asChild>
                    <div className="group relative flex items-center justify-center p-4 bg-white rounded-lg border min-h-[150px] max-h-[350px] cursor-pointer hover:border-primary/50 transition-colors">
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
                                className="w-full min-w-0 pointer-events-none flex items-center justify-center [&>svg]:mx-auto [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[300px] [&>svg]:overflow-visible"
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
                                        className="w-full max-w-[1400px] max-h-[85vh] bg-white rounded-xl p-4 sm:p-8 flex items-center justify-center [&>svg]:mx-auto [&>svg]:block [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[80vh] [&>svg]:overflow-visible"
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
