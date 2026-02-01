"use client"

import { useState } from "react"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { GripVertical, BookOpen } from "lucide-react"
import Link from "next/link"
import { TogglePublishButton, RemoveExerciseButton } from "./CollectionManager"
import { updateAssignmentOrder } from "../../../../actions"
import { toast } from "sonner"

interface SortableItemProps {
    assignment: any
    index: number
    classroomId: string
    collectionId: string
}

function SortableItem({ assignment, index, classroomId, collectionId }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: assignment.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`relative group hover:border-primary/50 transition-colors ${isDragging ? 'border-primary shadow-lg' : ''}`}>
                <Link
                    href={`/teacher/class/${classroomId}/assignment/${assignment.id}`}
                    className="absolute inset-0 z-0"
                />
                <CardContent className="p-4 flex items-center justify-between relative z-10 pointer-events-none">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div
                                {...attributes}
                                {...listeners}
                                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded pointer-events-auto"
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                                {index + 1}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{assignment.title}</h3>
                                {assignment.published ? (
                                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>
                                ) : (
                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Draft</span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                                {assignment.questions && (
                                    <span>{assignment.questions.length || 'Unknown'} questions</span>
                                )}
                                <span>{assignment.category}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <TogglePublishButton
                            classroomId={classroomId}
                            assignmentId={assignment.id}
                            initialPublished={assignment.published}
                        />
                        <RemoveExerciseButton
                            classroomId={classroomId}
                            collectionId={collectionId}
                            assignmentId={assignment.id}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

interface SortableExerciseListProps {
    initialAssignments: any[]
    classroomId: string
    collectionId: string
}

export function SortableExerciseList({ initialAssignments, classroomId, collectionId }: SortableExerciseListProps) {
    const [assignments, setAssignments] = useState(initialAssignments)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = assignments.findIndex((item) => item.id === active.id)
            const newIndex = assignments.findIndex((item) => item.id === over.id)

            const newAssignments = arrayMove(assignments, oldIndex, newIndex)
            setAssignments(newAssignments)

            // Prepare items for update
            const updateItems = newAssignments.map((a, idx) => ({
                id: a.id,
                order_index: idx
            }))

            try {
                const result = await updateAssignmentOrder(classroomId, collectionId, updateItems)
                if (!result.success) {
                    toast.error("Failed to save new order")
                    // Revert state if needed, but for simplicity let's just toast
                }
            } catch (err) {
                toast.error("Something went wrong saving order")
            }
        }
    }

    if (assignments.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/5">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">Empty Collection</h3>
                <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto mt-2">
                    Add exercises using the button above to build your collection.
                </p>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={assignments.map(a => a.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-4">
                    {assignments.map((assignment, index) => (
                        <SortableItem
                            key={assignment.id}
                            assignment={assignment}
                            index={index}
                            classroomId={classroomId}
                            collectionId={collectionId}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    )
}
