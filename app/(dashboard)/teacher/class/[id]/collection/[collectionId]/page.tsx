import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock, GripVertical, BarChart2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CollectionManager, RemoveExerciseButton, TogglePublishButton } from "./CollectionManager"
import { CreateExerciseDialog } from "../../CreateExerciseDialog"
import { SortableExerciseList } from "./SortableExerciseList"
import { CollectionBatchActions } from "./CollectionBatchActions"
import { CollectionSettingsDialog } from "./CollectionSettingsDialog"


export default async function CollectionPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const { id, collectionId } = await params

    const [collectionResult, availableExercisesResult, classroomResult] = await Promise.all([
        supabase
            .from('collections')
            .select('*, assignments(*), classrooms(type)')
            .eq('id', collectionId)
            .single(),
        supabase
            .from('assignments')
            .select('*')
            .eq('classroom_id', id)
            .is('collection_id', null)
            .order('created_at', { ascending: false }),
        supabase
            .from('classrooms')
            .select('lesson_schedule')
            .eq('id', id)
            .single()
    ])

    const { data: collection } = collectionResult
    const { data: availableExercises } = availableExercisesResult
    const { data: classroom } = classroomResult

    if (!collection) notFound()

    // Sort assignments by order_index (or created_at if index helps)
    const assignments = collection.assignments?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)) || []

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href={`/teacher/class/${id}?view=collections`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Collections
                        </Link>
                    </Button>
                    <div className="flex items-center justify-between border-b pb-6">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-primary">{collection.title}</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage exercises in this collection.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <CreateExerciseDialog
                                classroomId={id}
                                classroomType={collection.classrooms?.type || 'school_class'}
                                collectionId={collectionId}
                                collectionCategory={collection.category}
                            />
                            <CollectionManager
                                classroomId={id}
                                collectionId={collectionId}
                                availableExercises={availableExercises || []}
                            />
                            {collection.category === 'classwork' && (
                                <CollectionBatchActions
                                    assignments={assignments}
                                    classroomId={id}
                                />
                            )}
                            <CollectionSettingsDialog
                                classroomId={id}
                                collectionId={collectionId}
                                currentTitle={collection.title}
                                currentCategory={collection.category}
                                currentScheduledDate={collection.scheduled_date}
                                lessonSchedule={classroom?.lesson_schedule}
                            />
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/teacher/class/${id}/collection/${collectionId}/statistics`}>
                                    <BarChart2 className="mr-2 h-4 w-4" />
                                    Statistics
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Exercises List */}
                <SortableExerciseList
                    initialAssignments={assignments}
                    classroomId={id}
                    collectionId={collectionId}
                />

            </div>
        </div>
    )
}
