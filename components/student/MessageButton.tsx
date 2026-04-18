"use client"

import Link from "next/link"
import { Mail, X } from "lucide-react"
import { hideMessage } from "@/app/(dashboard)/student/actions"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface MessageButtonProps {
    messageId: string
    title: string
    createdAt: string
}

export function MessageButton({ messageId, title, createdAt }: MessageButtonProps) {
    const router = useRouter()
    const [isHiding, setIsHiding] = useState(false)
    const [hidden, setHidden] = useState(false)

    const handleHide = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsHiding(true)
        const result = await hideMessage(messageId)
        if (result.success) {
            setHidden(true)
        }
        setIsHiding(false)
    }

    if (hidden) return null

    return (
        <div className="p-4 bg-violet-50/80 dark:bg-violet-950/30 backdrop-blur-sm rounded-2xl border border-violet-200/60 dark:border-violet-800/40 shadow-sm transition-all hover:shadow-md animate-fade-in-up">
            <div className="flex items-start justify-between gap-3">
                <Link href={`/student/message/${messageId}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                    <div className="relative shrink-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-200/60 dark:bg-violet-800/40 text-violet-600 dark:text-violet-400">
                            <Mail className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-violet-900 dark:text-violet-200 truncate group-hover:text-violet-700 dark:group-hover:text-violet-100 transition-colors">
                            {title}
                        </span>
                        <span className="text-[10px] text-violet-500/70 dark:text-violet-400/60">
                            {new Date(createdAt).toLocaleDateString('lt-LT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </Link>
                <button
                    onClick={handleHide}
                    disabled={isHiding}
                    className="shrink-0 p-1 rounded-md text-violet-400 hover:text-violet-700 hover:bg-violet-200/50 dark:hover:text-violet-200 dark:hover:bg-violet-800/40 transition-colors disabled:opacity-50"
                    aria-label="Slėpti pranešimą"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
