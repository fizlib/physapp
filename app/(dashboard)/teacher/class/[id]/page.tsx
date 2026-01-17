import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Plus, Users, Settings } from "lucide-react"
import { StudentManager } from "./StudentManager"
import { EditableClassroomTitle } from "./EditableClassroomTitle"

export default async function ClassroomPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string }> }) {
    const supabase = await createClient()
    const { id } = await params
    const { view } = await searchParams
    const currentView = view || 'assignments'

    // 1. Fetch Classroom and Students in parallel
    const [classroomResult, enrollmentsResult] = await Promise.all([
        supabase
            .from('classrooms')
            .select('*')
            .eq('id', id)
            .single(),
        supabase
            .from('enrollments')
            .select('*, profiles:student_id(id, role, first_name, last_name, email, created_at)')
            .eq('classroom_id', id)
            .order('created_at', { ascending: false })
    ])

    const { data: classroom } = classroomResult
    const { data: enrollments } = enrollmentsResult

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
                            <Button variant="outline" size="sm" disabled>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Button>
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
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Exercise
                                </Button>
                            </div>

                            <Card className="border-dashed border-border/60 bg-muted/5 shadow-none">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                    <div className="rounded-full bg-muted/30 p-4 mb-4">
                                        <BookOpen className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">No active exercises detected.</p>
                                    <p className="text-xs opacity-70">Initialize a new assignment to challenge your students.</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Students View */}
                    {currentView === 'students' && (
                        <StudentManager
                            classroomId={id}
                            initialEnrollments={enrollments || []}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
