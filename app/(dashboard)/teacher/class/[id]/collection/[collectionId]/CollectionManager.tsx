"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, GripVertical, BookOpen, Eye, EyeOff, ChevronLeft, Loader2, Check } from "lucide-react"
import { addExerciseToCollection, removeExerciseFromCollection, toggleAssignmentPublish, getTeacherClassrooms, getClassroomCollections, getCollectionExercises } from "../../../../actions"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

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
}

export function CollectionManager({
    classroomId,
    collectionId,
}: CollectionManagerProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState<1 | 2 | 3>(1)

    const [fetching, setFetching] = useState(false)
    const [classrooms, setClassrooms] = useState<{ id: string, name: string }[]>([])
    const [selectedSourceClassId, setSelectedSourceClassId] = useState<string>("")

    const [collections, setCollections] = useState<{ id: string, title: string, category: string }[]>([])
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")

    const [exercises, setExercises] = useState<{ id: string, title: string }[]>([])
    const [selectedExerciseIds, setSelectedExerciseIds] = useState<Set<string>>(new Set())

    const loadClassrooms = async () => {
        setFetching(true)
        try {
            const data = await getTeacherClassrooms()
            setClassrooms(data)
        } catch (err) {
            toast.error("Failed to load classes")
        } finally {
            setFetching(false)
        }
    }

    const loadCollections = async (sourceClassId: string) => {
        setFetching(true)
        try {
            const data = await getClassroomCollections(sourceClassId)
            setCollections(data)
        } catch (err) {
            toast.error("Failed to load collections")
        } finally {
            setFetching(false)
        }
    }

    const loadExercises = async (sourceColId: string) => {
        setFetching(true)
        try {
            const data = await getCollectionExercises(sourceColId)
            setExercises(data)
        } catch (err) {
            toast.error("Failed to load exercises")
        } finally {
            setFetching(false)
        }
    }

    const handleClassroomSelect = (id: string) => {
        setSelectedSourceClassId(id)
        setStep(2)
        loadCollections(id)
    }

    const handleCollectionSelect = (id: string) => {
        setSelectedCollectionId(id)
        setSelectedExerciseIds(new Set())
        setStep(3)
        loadExercises(id)
    }

    const toggleExerciseSelection = (exerciseId: string) => {
        setSelectedExerciseIds(prev => {
            const next = new Set(prev)
            if (next.has(exerciseId)) {
                next.delete(exerciseId)
            } else {
                next.add(exerciseId)
            }
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedExerciseIds.size === exercises.length) {
            setSelectedExerciseIds(new Set())
        } else {
            setSelectedExerciseIds(new Set(exercises.map(ex => ex.id)))
        }
    }

    const handleAdd = async (assignmentId: string) => {
        setLoading(true)
        try {
            const result = await addExerciseToCollection(classroomId, collectionId, assignmentId)
            if (result.success) {
                toast.success("Exercise added to collection")
                setOpen(false)
                resetForm()
            } else {
                toast.error(result.error || "Failed to add exercise")
            }
        } catch (err) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const handleAddSelected = async () => {
        if (selectedExerciseIds.size === 0) return

        setLoading(true)
        const ids = Array.from(selectedExerciseIds)
        let successCount = 0
        let failCount = 0

        try {
            for (const assignmentId of ids) {
                const result = await addExerciseToCollection(classroomId, collectionId, assignmentId)
                if (result.success) {
                    successCount++
                } else {
                    failCount++
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} exercise${successCount > 1 ? 's' : ''} added to collection`)
            }
            if (failCount > 0) {
                toast.error(`${failCount} exercise${failCount > 1 ? 's' : ''} failed to import`)
            }

            setOpen(false)
            resetForm()
        } catch (err) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setStep(1)
        setSelectedSourceClassId("")
        setSelectedCollectionId("")
        setClassrooms([])
        setCollections([])
        setExercises([])
        setSelectedExerciseIds(new Set())
    }

    const allSelected = exercises.length > 0 && selectedExerciseIds.size === exercises.length

    return (
        <Dialog open={open} onOpenChange={(o) => {
            setOpen(o)
            if (o) loadClassrooms()
            else resetForm()
        }}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Import exercises
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                    setSelectedExerciseIds(new Set())
                                    setStep(step === 3 ? 2 : 1)
                                }}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <DialogTitle>
                            {step === 1 && "Select Classroom"}
                            {step === 2 && "Select Collection"}
                            {step === 3 && "Select Exercises"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Import exercises from another collection into this collection.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {fetching ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p className="text-sm">Loading...</p>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div className="grid gap-2">
                                    {classrooms.length > 0 ? (
                                        [...classrooms]
                                            .sort((a, b) => (a.id === classroomId ? -1 : b.id === classroomId ? 1 : 0))
                                            .map((c) => (
                                                <Button
                                                    key={c.id}
                                                    variant={c.id === classroomId ? "secondary" : "outline"}
                                                    className={`justify-start h-auto py-3 px-4 ${c.id === classroomId ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : ""}`}
                                                    onClick={() => handleClassroomSelect(c.id)}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <span>{c.name}</span>
                                                        {c.id === classroomId && (
                                                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase font-bold">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                </Button>
                                            ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-8 italic">
                                            No other classrooms found.
                                        </p>
                                    )}
                                </div>
                            )}

                            {step === 2 && (
                                <div className="grid gap-2">
                                    {collections.length > 0 ? (
                                        collections.map((col) => (
                                            <Button
                                                key={col.id}
                                                variant="outline"
                                                className="justify-start h-auto py-3 px-4"
                                                onClick={() => handleCollectionSelect(col.id)}
                                            >
                                                <div className="flex flex-col items-start gap-1">
                                                    <span>{col.title}</span>
                                                    <span className="text-xs text-muted-foreground uppercase">{col.category}</span>
                                                </div>
                                            </Button>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-8 italic">
                                            No collections found in this classroom.
                                        </p>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-3">
                                    {exercises.length > 0 ? (
                                        <>
                                            {/* Select all / Import selected header */}
                                            <div className="flex items-center justify-between pb-2 border-b">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="select-all"
                                                        checked={allSelected}
                                                        onCheckedChange={toggleSelectAll}
                                                    />
                                                    <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                                                        Select all ({exercises.length})
                                                    </Label>
                                                </div>
                                                {selectedExerciseIds.size > 0 && (
                                                    <Button
                                                        size="sm"
                                                        onClick={handleAddSelected}
                                                        disabled={loading}
                                                        className="gap-1.5"
                                                    >
                                                        {loading ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <Plus className="h-3 w-3" />
                                                        )}
                                                        Import {selectedExerciseIds.size} selected
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Exercise list with checkboxes */}
                                            <div className="grid gap-2">
                                                {exercises.map((ex) => (
                                                    <div
                                                        key={ex.id}
                                                        className={`flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors ${
                                                            selectedExerciseIds.has(ex.id) ? "bg-primary/5 border-primary/30" : ""
                                                        }`}
                                                        onClick={() => toggleExerciseSelection(ex.id)}
                                                    >
                                                        <Checkbox
                                                            checked={selectedExerciseIds.has(ex.id)}
                                                            onCheckedChange={() => toggleExerciseSelection(ex.id)}
                                                        />
                                                        <span className="font-medium text-sm truncate flex-1">{ex.title}</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="shrink-0 text-xs h-7"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleAdd(ex.id)
                                                            }}
                                                            disabled={loading}
                                                        >
                                                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-8 italic">
                                            No exercises found in this collection.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
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
