import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock, GripVertical } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CollectionManager, RemoveExerciseButton } from "./CollectionManager"
import { CreateExerciseDialog } from "../../CreateExerciseDialog"

export default async function CollectionPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const { id, collectionId } = await params

    const [collectionResult, availableExercisesResult] = await Promise.all([
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
            .order('created_at', { ascending: false })
    ])

    const { data: collection } = collectionResult
    const { data: availableExercises } = availableExercisesResult

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
                            />
                            <CollectionManager
                                classroomId={id}
                                collectionId={collectionId}
                                availableExercises={availableExercises || []}
                            />
                        </div>
                    </div>
                </div>

                {/* Exercises List */}
                <div className="space-y-4">
                    {assignments.length > 0 ? (
                        assignments.map((assignment: any, index: number) => (
                            <Card key={assignment.id} className="relative group hover:border-primary/50 transition-colors">
                                <Link
                                    href={`/teacher/class/${id}/assignment/${assignment.id}`}
                                    className="absolute inset-0 z-0"
                                />
                                <CardContent className="p-4 flex items-center justify-between relative z-10 pointer-events-none">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{assignment.title}</h3>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                                                {assignment.questions && (
                                                    <span>{assignment.questions.length || 'Unknown'} questions</span>
                                                )}
                                                <span>{assignment.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pointer-events-auto">
                                        <RemoveExerciseButton
                                            classroomId={id}
                                            collectionId={collectionId}
                                            assignmentId={assignment.id}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/5">
                            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-muted-foreground">Empty Collection</h3>
                            <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto mt-2">
                                Add exercises using the button above to build your collection.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
