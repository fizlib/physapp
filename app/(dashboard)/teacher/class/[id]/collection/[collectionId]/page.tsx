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
import { StartTestButton } from "./StartTestButton"
import { MarkdownContent } from "@/components/ui/markdown-editor"


export default async function CollectionPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const { id, collectionId } = await params

    const [collectionResult, classroomResult] = await Promise.all([
        supabase
            .from('collections')
            .select('*, assignments(*), classrooms(type)')
            .eq('id', collectionId)
            .single(),
        supabase
            .from('classrooms')
            .select('lesson_schedule')
            .eq('id', id)
            .single()
    ])

    const { data: collection } = collectionResult
    const { data: classroom } = classroomResult

    if (!collection) notFound()

    const isInformationPage = collection.category === 'information'

    // Sort assignments by order_index (or created_at if index helps)
    const assignments = collection.assignments?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)) || []

    // Check if any assignment has points enabled
    const hasPointedExercises = assignments.some((a: any) => a.points_enabled)

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
                                {isInformationPage
                                    ? "Manage information page content."
                                    : "Manage exercises in this collection."}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isInformationPage && (
                                <>
                                    <CreateExerciseDialog
                                        classroomId={id}
                                        classroomType={collection.classrooms?.type || 'school_class'}
                                        collectionId={collectionId}
                                        collectionCategory={collection.category}
                                    />
                                    <CollectionManager
                                        classroomId={id}
                                        collectionId={collectionId}
                                    />
                                    {collection.category === 'classwork' && (
                                        <CollectionBatchActions
                                            assignments={assignments}
                                            classroomId={id}
                                        />
                                    )}
                                </>
                            )}
                            <CollectionSettingsDialog
                                classroomId={id}
                                collectionId={collectionId}
                                currentTitle={collection.title}
                                currentCategory={collection.category}
                                currentScheduledDate={collection.scheduled_date}
                                currentScheduledEndAt={collection.scheduled_end_at}
                                currentSlidesUrl={collection.slides_url}
                                currentInfoContent={collection.info_content}
                                lessonSchedule={classroom?.lesson_schedule}
                                currentTabMonitoringEnabled={collection.tab_monitoring_enabled}
                                currentAutoDisableTabMonitoring={collection.auto_disable_tab_monitoring_after_test}
                                currentInfoButtonColor={collection.info_button_color}
                                currentTheoryContent={collection.theory_content}
                            />
                            {!isInformationPage && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/teacher/class/${id}/collection/${collectionId}/statistics`}>
                                        <BarChart2 className="mr-2 h-4 w-4" />
                                        Statistics
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    {collection.category === 'classwork' && (
                        <div className="flex justify-center pt-2">
                            <StartTestButton
                                collectionId={collectionId}
                                classroomId={id}
                                hasPointedExercises={hasPointedExercises}
                            />
                        </div>
                    )}
                </div>

                {/* Content */}
                {isInformationPage ? (
                    <Card>
                        <CardContent className="p-6">
                            {collection.info_content ? (
                                <MarkdownContent content={collection.info_content} />
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p className="text-sm font-medium">No content yet.</p>
                                    <p className="text-xs opacity-70 mt-1">Open Settings to add information content.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <SortableExerciseList
                        initialAssignments={assignments}
                        classroomId={id}
                        collectionId={collectionId}
                    />
                )}

            </div>
        </div>
    )
}
