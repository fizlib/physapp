"use client"

import { CopyButton } from "@/components/ui/copy-button"

export function JoinCodeCopy({ code }: { code: string }) {
    return (
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 pl-3 pr-1 py-1 text-xs">
            <span className="font-medium text-muted-foreground mr-1">Coordinates:</span>
            <span className="font-mono font-bold text-primary">{code}</span>
            <CopyButton
                value={code}
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary"
                successMessage="Join code copied!"
            />
        </div>
    )
}
