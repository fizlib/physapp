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
                        src={`${url}#toolbar=0`}
                        className="w-full h-full border-none"
                        title="Theory Slides"
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
