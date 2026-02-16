"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { SlidesModal } from "./SlidesModal"

interface SlidesButtonProps {
    url: string | null
    title: string
    variant?: "outline" | "ghost" | "secondary" | "default"
    className?: string
}

export function SlidesButton({ url, title, variant = "outline", className }: SlidesButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const isIOS = useMemo(() => {
        if (typeof navigator === "undefined") return false

        const ua = navigator.userAgent || ""
        const isLegacyIOS = /iPad|iPhone|iPod/.test(ua)
        const isIPadOSDesktopUA = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1

        return isLegacyIOS || isIPadOSDesktopUA
    }, [])

    if (!url) return null

    return (
        <>
            <Button
                variant={variant}
                size="sm"
                className={className}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()

                    if (isIOS) {
                        const popup = window.open(url, "_blank", "noopener,noreferrer")
                        // If popups are blocked, fall back to modal.
                        if (!popup) setIsOpen(true)
                        return
                    }

                    setIsOpen(true)
                }}
            >
                <FileText className="w-4 h-4 mr-2" />
                Skaidrės
            </Button>
            {!isIOS && (
                <SlidesModal
                    url={url}
                    title={title}
                    isOpen={isOpen}
                    onOpenChange={setIsOpen}
                />
            )}
        </>
    )
}
