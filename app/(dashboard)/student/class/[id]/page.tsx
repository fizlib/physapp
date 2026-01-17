import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock, Activity } from "lucide-react"

export default async function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    // 1. Fetch Classroom and Published Assignments
    const [classroomResult, assignmentsResult] = await Promise.all([
        supabase
            .from('classrooms')
            .select('*')
            .eq('id', id)
            .single(),
        supabase
            .from('assignments')
            .select('*, questions(count)')
            .eq('classroom_id', id)
            .eq('published', true)
            .order('created_at', { ascending: false })
    ])

    const { data: classroom } = classroomResult
    const { data: assignments } = assignmentsResult

    if (!classroom) notFound()

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href="/student">
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
                                    <span className="font-medium text-muted-foreground">Status:</span>
                                    <span className="font-medium text-emerald-500">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Main Content (Assignments) */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <h2 className="font-serif text-xl font-semibold tracking-tight">Active Exercises</h2>
                        </div>

                        {assignments && assignments.length > 0 ? (
                            <div className="grid gap-4">
                                {assignments.map((assignment) => (
                                    <Link key={assignment.id} href={`/student/class/${id}/assignment/${assignment.id}`}>
                                        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold">{assignment.title}</h3>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        <span>Posted {new Date(assignment.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-medium bg-secondary px-2.5 py-1 rounded-full">
                                                    Start
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
                                    <p className="text-sm font-medium">No exercises assigned yet.</p>
                                    <p className="text-xs opacity-70">Check back later for new modules.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar (Stats/Info) */}
                    <div className="space-y-6">
                        <Card className="shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-medium flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Your Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Exercises Completed</span>
                                        <span className="font-mono font-medium">0 / 0</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div className="h-full bg-primary w-0" />
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
