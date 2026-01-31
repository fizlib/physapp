"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, GripVertical, BookOpen, Eye, EyeOff } from "lucide-react"
import { addExerciseToCollection, removeExerciseFromCollection, toggleAssignmentPublish } from "../../../../actions"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"

import { CollectionSettingsDialog } from "./CollectionSettingsDialog"

export function TogglePublishButton({
    assignmentId,
    classroomId,
    initialPublished
}: {
    assignmentId: string
    classroomId: string
    initialPublished: boolean
}) {
    const [published, setPublished] = useState(initialPublished)
    const [loading, setLoading] = useState(false)

    const handleToggle = async () => {
        setLoading(true)
        const newStatus = !published
        try {
            const result = await toggleAssignmentPublish(assignmentId, classroomId, newStatus)
            if (result.success) {
                setPublished(newStatus)
                toast.success(newStatus ? "Exercise published" : "Exercise unpublished")
            } else {
                toast.error(result.error || "Failed to update status")
            }
        } catch (err) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            disabled={loading}
            className={published ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-muted-foreground hover:text-foreground"}
            title={published ? "Unpublish exercise" : "Publish exercise"}
        >
            {published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
    )
}

interface CollectionManagerProps {
    classroomId: string
    collectionId: string
    availableExercises: any[]
    currentTitle: string
    currentCategory: 'homework' | 'classwork'
    currentScheduledDate?: string | null
    lessonSchedule?: any[] | null
}

export function CollectionManager({
    classroomId,
    collectionId,
    availableExercises,
    currentTitle,
    currentCategory,
    currentScheduledDate,
    lessonSchedule
}: CollectionManagerProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleAdd = async (assignmentId: string) => {
        setLoading(true)
        try {
            const result = await addExerciseToCollection(classroomId, collectionId, assignmentId)
            if (result.success) {
                toast.success("Exercise added to collection")
                setOpen(false)
            } else {
                toast.error(result.error || "Failed to add exercise")
            }
        } catch (err) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button size="sm">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Import exercises
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Exercise to Collection</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {availableExercises.length > 0 ? (
                            <div className="grid gap-2">
                                {availableExercises.map((ex) => (
                                    <div key={ex.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                                        <span className="font-medium text-sm truncate max-w-[200px]">{ex.title}</span>
                                        <Button size="sm" variant="secondary" onClick={() => handleAdd(ex.id)} disabled={loading}>
                                            Add
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No available exercises found in this class.
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            <CollectionSettingsDialog
                classroomId={classroomId}
                collectionId={collectionId}
                currentTitle={currentTitle}
                currentCategory={currentCategory}
                currentScheduledDate={currentScheduledDate}
                lessonSchedule={lessonSchedule}
            />
        </div>
    )
}

export function RemoveExerciseButton({ classroomId, collectionId, assignmentId }: { classroomId: string, collectionId: string, assignmentId: string }) {
    const [loading, setLoading] = useState(false)

    const handleRemove = async () => {
        if (!confirm("Remove this exercise from the collection?")) return
        setLoading(true)
        try {
            const result = await removeExerciseFromCollection(classroomId, collectionId, assignmentId)
            if (result.success) {
                toast.success("Exercise removed")
            } else {
                toast.error(result.error || "Failed to remove exercise")
            }
        } catch (err) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant="ghost" size="icon" onClick={handleRemove} disabled={loading} className="text-destructive hover:text-destructive/90">
            <Trash2 className="h-4 w-4" />
        </Button>
    )
}
