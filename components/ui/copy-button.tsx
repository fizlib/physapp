"use client"

import { useState } from "react"
import { Button, ButtonProps } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CopyButtonProps extends ButtonProps {
    value: string
    successMessage?: string
    showText?: boolean
    text?: string
    copiedText?: string
}

export function CopyButton({
    value,
    successMessage = "Copied to clipboard",
    showText = false,
    text = "Copy",
    copiedText = "Copied!",
    className,
    variant = "outline",
    size = "sm",
    ...props
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            toast.success(successMessage)
            setTimeout(() => setCopied(true), 0) // Ensure state update if needed
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            toast.error("Failed to copy")
        }
    }

    return (
        <Button
            variant={variant}
            size={size}
            className={cn("gap-2", className)}
            onClick={handleCopy}
            {...props}
        >
            {copied ? (
                <Check className="h-4 w-4" />
            ) : (
                <Copy className="h-4 w-4" />
            )}
            {showText && (copied ? copiedText : text)}
        </Button>
    )
}
