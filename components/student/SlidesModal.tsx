"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExternalLink, X } from "lucide-react"

interface SlidesModalProps {
    url: string | null
    title: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export function SlidesModal({ url, title, isOpen, onOpenChange }: SlidesModalProps) {
    if (!url) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-background/95 backdrop-blur-md">
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-bold truncate pr-8">
                        {title} - Teorija
                    </DialogTitle>
                    <div className="flex items-center gap-2 pr-8">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                            className="hidden sm:flex"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Atidaryti naujame lange
                        </Button>
                    </div>
                </DialogHeader>
                <div className="flex-1 w-full bg-muted/20 relative">
                    <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
                        className="w-full h-full border-none"
                        title="Theory Slides"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 bg-muted/50 p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                            Jei skaidrės neatsidaro, paspauskite mygtuką žemiau:
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() => window.open(url, '_blank')}
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Atidaryti skaidres
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
