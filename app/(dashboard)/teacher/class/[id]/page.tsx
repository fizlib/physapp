import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Users, Layers, Award } from "lucide-react"
import { StudentManager } from "./StudentManager"
import { EditableClassroomTitle } from "./EditableClassroomTitle"
import { CreateExerciseDialog } from "./CreateExerciseDialog"
import { CreateCollectionDialog } from "./CreateCollectionDialog"
import { ImportCollectionDialog } from "./ImportCollectionDialog"
import { ClassSettingsDialog } from "./ClassSettingsDialog"
import { DeleteCollectionButton } from "./DeleteCollectionButton"
import { TabMonitoringToggle } from "./TabMonitoringToggle"
import { TeacherIpSync } from "../../TeacherIpSync"
import { getStudentClassroomProgress } from "../../actions"

interface StudentPointsSummary {
    earned: number
    max: number
}

interface ClassroomEnrollment {
    id: string
    student_id: string
    profiles: {
        first_name: string | null
        last_name: string | null
        email: string | null
    } | null
}



interface ClassroomCollection {
    id: string
    title: string
    category?: 'homework' | 'classwork' | 'information' | null
    assignments?: Array<{ id: string }> | null
    scheduled_date?: string | null
    scheduled_end_at?: string | null
    tab_monitoring_enabled?: boolean | null
    info_content?: string | null
    created_at: string
}

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
            .select('*, bonus_points, profiles:student_id(id, role, first_name, last_name, email, created_at)')
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

    const enrollmentsList = (enrollments || []) as ClassroomEnrollment[]
    const assignmentsList = assignments || []
    const collectionsList = (collections || []) as ClassroomCollection[]
    const classworkCollections = collectionsList.filter((collection) => collection.category === 'classwork')
    const homeworkCollections = collectionsList.filter((collection) => collection.category === 'homework' || !collection.category)
    const informationCollections = collectionsList.filter((collection) => collection.category === 'information')

    // Use the exact same function as the student progress panel to guarantee consistency
    const enrolledStudentIds = enrollmentsList
        .map((enrollment) => enrollment.student_id)
        .filter((studentId: unknown): studentId is string => typeof studentId === 'string' && studentId.length > 0)

    const studentPointsById: Record<string, StudentPointsSummary> = {}

    if (enrolledStudentIds.length > 0) {
        const progressResults = await Promise.all(
            enrolledStudentIds.map((studentId) => getStudentClassroomProgress(id, studentId))
        )

        enrolledStudentIds.forEach((studentId, index) => {
            const result = progressResults[index]
            if (result && typeof result === 'object' && 'totalPoints' in result) {
                studentPointsById[studentId] = {
                    earned: result.earnedPoints || 0,
                    max: result.totalPoints || 0
                }
            } else {
                studentPointsById[studentId] = { earned: 0, max: 0 }
            }
        })
    }

    // Fetch blocked students from tab monitoring violations
    let blockedStudentIds: string[] = []
    if (currentView === 'students') {
        const { data: monitoredCollections } = await supabase
            .from('collections')
            .select('id')
            .eq('classroom_id', id)
            .eq('tab_monitoring_enabled', true)

        if (monitoredCollections && monitoredCollections.length > 0) {
            const collectionIds = monitoredCollections.map(c => c.id)
            const { data: violations } = await supabase
                .from('tab_monitoring_violations')
                .select('student_id, collection_id')
                .in('collection_id', collectionIds)
                .eq('blocked', true)

            blockedStudentIds = [...new Set(violations?.map(v => v.student_id) || [])]
        }
    }

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <TeacherIpSync classroomId={id} />
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
                                            <Card className={`cursor-pointer transition-colors h-full ${assignment.points_enabled ? 'border-amber-500/30 bg-amber-50/5 hover:border-amber-500/50' : 'hover:border-primary/50'}`}>
                                                <CardContent className="p-6 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-semibold flex items-center gap-2">
                                                            {assignment.title}
                                                            {assignment.points_enabled && (
                                                                <Award className="h-3.5 w-3.5 text-amber-500" />
                                                            )}
                                                        </h3>
                                                        <div className="flex flex-col items-end gap-1">
                                                            {assignment.published ? (
                                                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>
                                                            ) : (
                                                                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Draft</span>
                                                            )}
                                                            {assignment.points_enabled && (
                                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                                                    {assignment.points || 0} pts
                                                                </span>
                                                            )}
                                                        </div>
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
                            initialEnrollments={enrollmentsList}
                            isTeacherAdmin={isTeacherAdmin}
                            studentPointsById={studentPointsById}
                            blockedStudentIds={blockedStudentIds}
                        />
                    )}

                    {/* Collections View */}
                    {currentView === 'collections' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <h2 className="font-serif text-xl font-semibold tracking-tight">Exercise Collections</h2>
                                <div className="flex gap-2">
                                    <ImportCollectionDialog classroomId={id} />
                                    <CreateCollectionDialog classroomId={id} classroomType={classroom.type} lessonSchedule={classroom.lesson_schedule} />
                                </div>
                            </div>

                            {classroom.type === 'school_class' ? (
                                <>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-primary">Classwork</h3>
                                        {classworkCollections.length > 0 ? (
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {classworkCollections.map((collection) => (
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
                                                                    📅 {new Date(collection.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                    {" "}{new Date(collection.scheduled_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                    {collection.scheduled_end_at && (
                                                                        <> - {new Date(collection.scheduled_end_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-muted-foreground pt-2 pointer-events-none">
                                                                    Created {new Date(collection.created_at).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                            <div className="relative z-10 pointer-events-auto pt-1">
                                                                <TabMonitoringToggle
                                                                    classroomId={id}
                                                                    collectionId={collection.id}
                                                                    initialEnabled={!!collection.tab_monitoring_enabled}
                                                                />
                                                            </div>
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
                                        {homeworkCollections.length > 0 ? (
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {homeworkCollections.map((collection) => (
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

                                    <div className="space-y-4 pt-4 border-t">
                                        <h3 className="text-lg font-medium text-teal-600">Information</h3>
                                        {informationCollections.length > 0 ? (
                                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                {informationCollections.map((collection) => (
                                                    <Card key={collection.id} className="relative group hover:border-teal-500/50 transition-colors h-full">
                                                        <Link href={`/teacher/class/${id}/collection/${collection.id}`} className="absolute inset-0 z-0" />
                                                        <CardContent className="p-6 space-y-2">
                                                            <div className="flex justify-between items-start pointer-events-none">
                                                                <h3 className="font-semibold">{collection.title}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Information</span>
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
                                                                {collection.info_content
                                                                    ? collection.info_content.substring(0, 100) + (collection.info_content.length > 100 ? '...' : '')
                                                                    : "No content yet"}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground pt-2 pointer-events-none">
                                                                Created {new Date(collection.created_at).toLocaleDateString()}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No information pages yet.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Private Student View (Just List) */
                                collectionsList.length > 0 ? (
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {collectionsList.map((collection) => (
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
        </div >
    )
}
