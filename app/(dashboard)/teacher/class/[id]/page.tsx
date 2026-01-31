import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Plus, Users, Settings, LayoutList, Layers } from "lucide-react"
import { StudentManager } from "./StudentManager"
import { EditableClassroomTitle } from "./EditableClassroomTitle"
import { CreateExerciseDialog } from "./CreateExerciseDialog"
import { CreateCollectionDialog } from "./CreateCollectionDialog"
import { ClassSettingsDialog } from "./ClassSettingsDialog"
import { DeleteCollectionButton } from "./DeleteCollectionButton"

export default async function ClassroomPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string }> }) {
    const supabase = await createClient()
    const { id } = await params
    const { view } = await searchParams
    const currentView = view || 'collections'

    // 1. Fetch Classroom, Students, Assignments, Collections and current user's admin status in parallel
    const [classroomResult, enrollmentsResult, assignmentsResult, collectionsResult, userResult] = await Promise.all([
        supabase
            .from('classrooms')
            .select('*')
            .eq('id', id)
            .single(),
        supabase
            .from('enrollments')
            .select('*, profiles:student_id(id, role, first_name, last_name, email, created_at)')
            .eq('classroom_id', id)
            .order('created_at', { ascending: false }),
        supabase
            .from('assignments')
            .select('*, questions(*)')
            .eq('classroom_id', id)
            .order('created_at', { ascending: false }),
        supabase
            .from('collections')
            .select('*, assignments(*)')
            .eq('classroom_id', id)
            .order('created_at', { ascending: false }),
        supabase.auth.getUser()
    ])

    const { data: classroom } = classroomResult
    const { data: enrollments } = enrollmentsResult
    const { data: assignments } = assignmentsResult
    const { data: collections } = collectionsResult
    const { data: { user } } = userResult

    // Fetch user profile to check admin status
    let isTeacherAdmin = false
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()
        isTeacherAdmin = !!profile?.is_admin
    }

    if (!classroom) notFound()

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href="/teacher">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-start md:justify-between">
                        <div>
                            <EditableClassroomTitle classroomId={id} initialName={classroom.name} />
                            <div className="mt-2 flex items-center gap-4">

                                <div className="text-xs text-muted-foreground">
                                    {enrollments?.length || 0} students enrolled
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant={currentView === 'collections' ? "secondary" : "ghost"} size="sm" asChild>
                                <Link href={`/teacher/class/${id}?view=collections`}>
                                    <Layers className="mr-2 h-4 w-4" />
                                    Collections
                                </Link>
                            </Button>
                            <Button variant={currentView === 'assignments' ? "secondary" : "ghost"} size="sm" asChild>
                                <Link href={`/teacher/class/${id}?view=assignments`}>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Exercises
                                </Link>
                            </Button>
                            <Button variant={currentView === 'students' ? "secondary" : "ghost"} size="sm" asChild>
                                <Link href={`/teacher/class/${id}?view=students`}>
                                    <Users className="mr-2 h-4 w-4" />
                                    Manage Students
                                </Link>
                            </Button>
                            <ClassSettingsDialog
                                classroomId={id}
                                currentType={classroom.type}
                                currentLessonSchedule={classroom.lesson_schedule}
                                allowedIp={classroom.allowed_ip}
                                ipCheckEnabled={classroom.ip_check_enabled}
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="w-full">
                    {/* Assignments View */}
                    {currentView === 'assignments' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <h2 className="font-serif text-xl font-semibold tracking-tight">Exercise Modules & Assignments</h2>
                                <CreateExerciseDialog classroomId={id} classroomType={classroom.type} />
                            </div>

                            {assignments && assignments.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {assignments.map((assignment) => (
                                        <Link key={assignment.id} href={`/teacher/class/${id}/assignment/${assignment.id}`}>
                                            <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                                                <CardContent className="p-6 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-semibold">{assignment.title}</h3>
                                                        {assignment.published ? (
                                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>
                                                        ) : (
                                                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Draft</span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground line-clamp-2">
                                                        {assignment.questions && assignment.questions.length > 0
                                                            ? `${assignment.questions.length} Question(s)`
                                                            : "No questions"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground pt-2">
                                                        Created {new Date(assignment.created_at).toLocaleDateString()}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <Card className="border-dashed border-border/60 bg-muted/5 shadow-none">
                                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <div className="rounded-full bg-muted/30 p-4 mb-4">
                                            <BookOpen className="h-8 w-8 opacity-40" />
                                        </div>
                                        <p className="text-sm font-medium">No active exercises detected.</p>
                                        <p className="text-xs opacity-70">Initialize a new assignment to challenge your students.</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* Students View */}
                    {currentView === 'students' && (
                        <StudentManager
                            classroomId={id}
                            initialEnrollments={enrollments || []}
                            isTeacherAdmin={isTeacherAdmin}
                        />
                    )}

                    {/* Collections View */}
                    {currentView === 'collections' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <h2 className="font-serif text-xl font-semibold tracking-tight">Exercise Collections</h2>
                                <CreateCollectionDialog classroomId={id} classroomType={classroom.type} lessonSchedule={classroom.lesson_schedule} />
                            </div>

                            {classroom.type === 'school_class' ? (
                                <>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-primary">Classwork</h3>
                                        {collections && collections.filter((c: any) => c.category === 'classwork').length > 0 ? (
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {collections.filter((c: any) => c.category === 'classwork').map((collection: any) => (
                                                    <Card key={collection.id} className="relative group hover:border-primary/50 transition-colors h-full">
                                                        <Link href={`/teacher/class/${id}/collection/${collection.id}`} className="absolute inset-0 z-0" />
                                                        <CardContent className="p-6 space-y-2">
                                                            <div className="flex justify-between items-start pointer-events-none">
                                                                <h3 className="font-semibold">{collection.title}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Classwork</span>
                                                                    <div className="pointer-events-auto">
                                                                        <DeleteCollectionButton
                                                                            collectionId={collection.id}
                                                                            classroomId={id}
                                                                            title={collection.title}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground line-clamp-2 pointer-events-none">
                                                                {collection.assignments && collection.assignments.length > 0
                                                                    ? `${collection.assignments.length} Exercise(s)`
                                                                    : "Empty collection"}
                                                            </div>
                                                            {collection.scheduled_date ? (
                                                                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded pointer-events-none">
                                                                    📅 {new Date(collection.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(collection.scheduled_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-muted-foreground pt-2 pointer-events-none">
                                                                    Created {new Date(collection.created_at).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No classwork collections yet.</p>
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <h3 className="text-lg font-medium text-primary">Homework</h3>
                                        {collections && collections.filter((c: any) => c.category === 'homework' || !c.category).length > 0 ? (
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {collections.filter((c: any) => c.category === 'homework' || !c.category).map((collection: any) => (
                                                    <Card key={collection.id} className="relative group hover:border-primary/50 transition-colors h-full">
                                                        <Link href={`/teacher/class/${id}/collection/${collection.id}`} className="absolute inset-0 z-0" />
                                                        <CardContent className="p-6 space-y-2">
                                                            <div className="flex justify-between items-start pointer-events-none">
                                                                <h3 className="font-semibold">{collection.title}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Homework</span>
                                                                    <div className="pointer-events-auto">
                                                                        <DeleteCollectionButton
                                                                            collectionId={collection.id}
                                                                            classroomId={id}
                                                                            title={collection.title}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground line-clamp-2 pointer-events-none">
                                                                {collection.assignments && collection.assignments.length > 0
                                                                    ? `${collection.assignments.length} Exercise(s)`
                                                                    : "Empty collection"}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground pt-2 pointer-events-none">
                                                                Created {new Date(collection.created_at).toLocaleDateString()}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No homework collections yet.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Private Student View (Just List) */
                                collections && collections.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {collections.map((collection: any) => (
                                            <Card key={collection.id} className="relative group hover:border-primary/50 transition-colors h-full">
                                                <Link href={`/teacher/class/${id}/collection/${collection.id}`} className="absolute inset-0 z-0" />
                                                <CardContent className="p-6 space-y-2">
                                                    <div className="flex justify-between items-start pointer-events-none">
                                                        <h3 className="font-semibold">{collection.title}</h3>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Collection</span>
                                                            <div className="pointer-events-auto">
                                                                <DeleteCollectionButton
                                                                    collectionId={collection.id}
                                                                    classroomId={id}
                                                                    title={collection.title}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground line-clamp-2 pointer-events-none">
                                                        {collection.assignments && collection.assignments.length > 0
                                                            ? `${collection.assignments.length} Exercise(s)`
                                                            : "Empty collection"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground pt-2 pointer-events-none">
                                                        Created {new Date(collection.created_at).toLocaleDateString()}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="border-dashed border-border/60 bg-muted/5 shadow-none">
                                        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                            <div className="rounded-full bg-muted/30 p-4 mb-4">
                                                <Layers className="h-8 w-8 opacity-40" />
                                            </div>
                                            <p className="text-sm font-medium">No collections created.</p>
                                            <p className="text-xs opacity-70">Group exercises into collections for sequential learning.</p>
                                        </CardContent>
                                    </Card>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
