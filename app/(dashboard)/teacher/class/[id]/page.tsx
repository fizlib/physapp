import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddStudentForm } from "./AddStudentForm"
import { RemoveStudentButton } from "./RemoveStudentButton"
import { ManageStudentsDialog } from "./ManageStudentsDialog"
import Link from "next/link"
import { ArrowLeft, BookOpen, User, Plus, Users, Settings } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default async function ClassroomPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string }> }) {
    const supabase = await createClient()
    const { id } = await params
    const { view } = await searchParams
    const currentView = view || 'assignments'

    // 1. Fetch Classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single()

    if (!classroom) notFound()

    // 2. Fetch Students (joined via enrollments)
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, profiles:student_id(id, role, first_name, last_name, email, created_at)')
        .eq('classroom_id', id)
        .order('created_at', { ascending: false })

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
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                {classroom.name}
                            </h1>
                            <div className="mt-2 flex items-center gap-4">
                                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs">
                                    <span className="font-medium text-muted-foreground">Coordinates:</span>
                                    <span className="font-mono font-bold text-primary">{classroom.join_code}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {enrollments?.length || 0} students enrolled
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant={currentView === 'assignments' ? "secondary" : "ghost"} size="sm" asChild>
                                <Link href={`/teacher/class/${id}?view=assignments`}>
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    Missions
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
                                <h2 className="font-serif text-xl font-semibold tracking-tight">Mission Modules & Assignments</h2>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Mission
                                </Button>
                            </div>

                            <Card className="border-dashed border-border/60 bg-muted/5 shadow-none">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                    <div className="rounded-full bg-muted/30 p-4 mb-4">
                                        <BookOpen className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">No active missions detected.</p>
                                    <p className="text-xs opacity-70">Initialize a new assignment to challenge your students.</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Students View */}
                    {currentView === 'students' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex items-center justify-between">
                                <h2 className="font-serif text-xl font-semibold tracking-tight">Enrolled Students</h2>
                                <ManageStudentsDialog classroomId={id} />
                            </div>

                            <div className="rounded-md border border-border/40 bg-background shadow-sm">
                                <div className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground px-2">
                                            <span>Student</span>
                                            <span>Actions</span>
                                        </div>
                                        <div className="divide-y divide-border/40">
                                            {enrollments?.map((enrollment: any) => (
                                                <div key={enrollment.id} className="flex items-center justify-between py-3 px-2 group hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                            {enrollment.profiles?.first_name
                                                                ? enrollment.profiles.first_name[0]
                                                                : enrollment.profiles?.email?.charAt(0).toUpperCase() || "?"}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-foreground">
                                                                {(enrollment.profiles?.first_name || enrollment.profiles?.last_name)
                                                                    ? `${enrollment.profiles.first_name || ''} ${enrollment.profiles.last_name || ''}`.trim()
                                                                    : enrollment.profiles?.email || "Unknown"}
                                                            </span>
                                                            <span className="font-mono text-[10px] text-muted-foreground opacity-70">
                                                                {enrollment.profiles?.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <RemoveStudentButton
                                                        studentId={enrollment.student_id}
                                                        classroomId={id}
                                                    />
                                                </div>
                                            ))}
                                            {enrollments?.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                                    <div className="rounded-full bg-muted/30 p-3 mb-3">
                                                        <Users className="h-6 w-6 opacity-40" />
                                                    </div>
                                                    <p className="text-sm italic">No students enrolled yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
