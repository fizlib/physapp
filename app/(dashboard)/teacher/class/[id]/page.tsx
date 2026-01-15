import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AddStudentForm } from "./AddStudentForm"
import { RemoveStudentButton } from "./RemoveStudentButton"
import Link from "next/link"
import { ArrowLeft, BookOpen, User, Plus, Users, Settings } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

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
        .select('*, profiles:student_id(id, role, email, created_at)')
        .eq('classroom_id', id)

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
                                    {enrollments?.length || 0} cadets enrolled
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" disabled>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Main Content (Assignments) */}
                    <div className="space-y-6 lg:col-span-2">
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

                    {/* Sidebar (Students) */}
                    <div className="space-y-6">
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-medium flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    Review Enlistment
                                </CardTitle>
                                <CardDescription>Manage cadet access.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Manual Add</Label>
                                    <AddStudentForm classroomId={classroom.id} />
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Roster ({enrollments?.length})</Label>
                                    <div className="h-[300px] overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-border">
                                        {enrollments?.map((enrollment: any) => (
                                            <div key={enrollment.id} className="flex items-center justify-between rounded-md border border-border/40 bg-background p-3 shadow-xs">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        {enrollment.profiles?.email?.charAt(0).toUpperCase() || "?"}
                                                    </div>
                                                    <div className="flex flex-col truncate">
                                                        <span className="truncate text-sm font-medium text-foreground">
                                                            {enrollment.profiles?.email || "Unknown"}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-muted-foreground opacity-70">
                                                            ID: {enrollment.student_id.substring(0, 6)}
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
                                            <div className="text-center py-8 text-xs text-muted-foreground italic">
                                                No cadets enrolled yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
