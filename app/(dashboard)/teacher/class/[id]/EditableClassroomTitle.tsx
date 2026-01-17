"use client"

import { useState } from "react"
import { Pencil, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateClassroomName } from "./../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface EditableClassroomTitleProps {
    classroomId: string
    initialName: string
}

export function EditableClassroomTitle({ classroomId, initialName }: EditableClassroomTitleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(initialName)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSave = async () => {
        if (!name.trim() || name === initialName) {
            setIsEditing(false)
            setName(initialName)
            return
        }

        setIsLoading(true)
        try {
            const result = await updateClassroomName(classroomId, name)
            if (result.success) {
                toast.success("Classroom name updated")
                setIsEditing(false)
                router.refresh()
            } else {
                toast.error(result.error || "Failed to update classroom name")
                setName(initialName)
            }
        } catch (error) {
            toast.error("An error occurred")
            setName(initialName)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        setIsEditing(false)
        setName(initialName)
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 w-[300px] text-lg font-bold"
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
            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {name}
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
