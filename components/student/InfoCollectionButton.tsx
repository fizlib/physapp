"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

interface InfoCollectionButtonProps {
    collectionId: string
    classroomId: string
    title: string
    isRed: boolean
    infoPdfUrl: string | null
    hasContent: boolean
}

export function InfoCollectionButton({ collectionId, classroomId, title, isRed, infoPdfUrl, hasContent }: InfoCollectionButtonProps) {
    // If there's a PDF but no text content, open PDF directly
    if (infoPdfUrl && !hasContent) {
        return (
            <Button
                variant="outline"
                className={`w-full justify-between h-auto py-3 px-5 transition-all rounded-xl text-sm font-medium group ${
                    isRed
                        ? 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-400 hover:shadow-sm text-red-800'
                        : 'bg-background hover:bg-primary/5 hover:border-primary/50 hover:shadow-sm border-border/60'
                }`}
                onClick={() => window.open(infoPdfUrl, '_blank')}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className="truncate">{title}</span>
                </div>
                <span className={`shrink-0 text-[10px] uppercase tracking-wider font-bold transition-colors ${
                    isRed
                        ? 'text-red-500 group-hover:text-red-700'
                        : 'text-muted-foreground group-hover:text-primary'
                }`}>&rarr;</span>
            </Button>
        )
    }

    // Otherwise, navigate to collection page as usual
    return (
        <Link href={`/student/class/${classroomId}/collection/${collectionId}`}>
            <Button
                variant="outline"
                className={`w-full justify-between h-auto py-3 px-5 transition-all rounded-xl text-sm font-medium group ${
                    isRed
                        ? 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-400 hover:shadow-sm text-red-800'
                        : 'bg-background hover:bg-primary/5 hover:border-primary/50 hover:shadow-sm border-border/60'
                }`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className="truncate">{title}</span>
                </div>
                <span className={`shrink-0 text-[10px] uppercase tracking-wider font-bold transition-colors ${
                    isRed
                        ? 'text-red-500 group-hover:text-red-700'
                        : 'text-muted-foreground group-hover:text-primary'
                }`}>&rarr;</span>
            </Button>
        </Link>
    )
}
