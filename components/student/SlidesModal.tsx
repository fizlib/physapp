"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, ExternalLink, Loader2, RefreshCw } from "lucide-react"

interface SlidesModalProps {
    url: string | null
    title: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

type FrameState = "ready" | "error" | "timeout"

const LOAD_TIMEOUT_MS = 8000

export function SlidesModal({ url, title, isOpen, onOpenChange }: SlidesModalProps) {
    const [reloadKey, setReloadKey] = useState(0)
    const [frameStates, setFrameStates] = useState<Record<string, FrameState>>({})

    const slideUrl = url ?? ""

    const embedUrl = useMemo(() => {
        if (!slideUrl) return ""

        const isPdf = /\.pdf($|[?#])/i.test(slideUrl)
        // PDFs from storage are more reliable when embedded directly.
        if (isPdf) return slideUrl

        return `https://docs.google.com/gview?url=${encodeURIComponent(slideUrl)}&embedded=true`
    }, [slideUrl])

    const frameKey = `${slideUrl}::${reloadKey}::${isOpen ? "open" : "closed"}`
    const frameState = frameStates[frameKey]

    const isLoading = Boolean(slideUrl) && isOpen && !frameState
    const showFallback = frameState === "error" || frameState === "timeout"

    useEffect(() => {
        if (!isOpen || !slideUrl || frameState) return

        const timeoutId = window.setTimeout(() => {
            setFrameStates((prev) => {
                if (prev[frameKey]) return prev
                return { ...prev, [frameKey]: "timeout" }
            })
        }, LOAD_TIMEOUT_MS)

        return () => window.clearTimeout(timeoutId)
    }, [isOpen, slideUrl, frameKey, frameState])

    if (!slideUrl) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-full sm:max-w-4xl h-[100dvh] sm:h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-background/95 backdrop-blur-md">
                <DialogHeader className="p-4 pt-8 sm:pt-4 border-b flex flex-row items-center justify-between space-y-0 relative">
                    <DialogTitle className="text-xl font-bold truncate pr-8">
                        {title} - Teorija
                    </DialogTitle>
                    <div className="flex items-center gap-2 pr-8">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(slideUrl, "_blank", "noopener,noreferrer")}
                            className="hidden sm:flex"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Atidaryti naujame lange
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 w-full bg-muted/20 relative">
                    <iframe
                        key={frameKey}
                        src={embedUrl}
                        className="w-full h-full border-none"
                        title="Theory Slides"
                        onLoad={() => {
                            setFrameStates((prev) => ({ ...prev, [frameKey]: "ready" }))
                        }}
                        onError={() => {
                            setFrameStates((prev) => ({ ...prev, [frameKey]: "error" }))
                        }}
                    />

                    {isLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm p-6 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Kraunamos skaidres...</p>
                        </div>
                    )}

                    {showFallback && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-muted/75 p-6 text-center">
                            <AlertCircle className="w-6 h-6 text-amber-600 mb-3" />
                            <p className="text-sm text-muted-foreground mb-4 max-w-md">
                                Jei skaidres neatsidaro, atidarykite jas naujame lange arba bandykite dar karta.
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => window.open(slideUrl, "_blank", "noopener,noreferrer")}
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Atidaryti skaidres
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setReloadKey((prev) => prev + 1)
                                    }}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Bandyti dar karta
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
