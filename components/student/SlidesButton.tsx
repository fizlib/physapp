"use client"

import { useState } from "react"
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
                    setIsOpen(true)
                }}
            >
                <FileText className="w-4 h-4 mr-2" />
                Skaidrės
            </Button>
            <SlidesModal
                url={url}
                title={title}
                isOpen={isOpen}
                onOpenChange={setIsOpen}
            />
        </>
    )
}
