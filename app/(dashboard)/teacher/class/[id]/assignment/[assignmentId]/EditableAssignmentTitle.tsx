"use client"

import { useState } from "react"
import { Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateAssignmentTitle } from "../../../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface EditableAssignmentTitleProps {
    assignmentId: string
    classroomId: string
    initialTitle: string
}

export function EditableAssignmentTitle({ assignmentId, classroomId, initialTitle }: EditableAssignmentTitleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [title, setTitle] = useState(initialTitle)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        if (!title.trim() || title === initialTitle) {
            setIsEditing(false)
            setTitle(initialTitle)
            return
        }

        setIsLoading(true)
        try {
            const result = await updateAssignmentTitle(assignmentId, classroomId, title)
            if (result.success) {
                toast.success("Assignment title updated")
                setIsEditing(false)
                router.refresh()
            } else {
                toast.error(result.error || "Failed to update assignment title")
                setTitle(initialTitle)
            }
        } catch (error) {
            toast.error("An error occurred")
            setTitle(initialTitle)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        setTitle(initialTitle)
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 w-full md:w-[400px] text-3xl font-bold font-serif"
                    autoFocus
                    disabled={isLoading}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave()
                        if (e.key === "Escape") handleCancel()
                    }}
                />
                <Button size="icon" variant="ghost" onClick={handleSave} disabled={isLoading} className="h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-500">
                    <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isLoading} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 group">
            <h1 className="text-3xl font-serif font-bold tracking-tight">
                {title}
            </h1>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setIsEditing(true)}
            >
                <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
        </div>
    )
}
