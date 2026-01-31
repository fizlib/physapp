import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock, Activity, Layers, CheckCircle2, Lock, ShieldAlert } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { getClientIp } from "@/lib/ip"

export default async function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params
    const { data: { user } } = await supabase.auth.getUser()

    const studentIp = await getClientIp()

    if (!user) return <div>Please log in</div>

    // 1. Fetch Classroom, Published Standalone Assignments, and Collections
    const [classroomResult, assignmentsResult, collectionsResult] = await Promise.all([
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
            .is('collection_id', null) // Only show standalone assignments here
            .order('created_at', { ascending: false }),
        supabase
            .from('collections')
            .select('*, assignments(*)')
            .eq('classroom_id', id)
            .or(`scheduled_date.is.null,scheduled_date.lte.${new Date().toISOString()}`)
            .order('created_at', { ascending: false })
    ])

    const { data: classroom } = classroomResult
    const { data: assignments } = assignmentsResult
    const { data: collections } = collectionsResult

    // Fetch progress for all assignments in collections
    const allCollectionAssignmentIds = collections?.flatMap((c: any) => c.assignments.map((a: any) => a.id)) || []

    let completedAssignmentIds = new Set<string>()
    if (allCollectionAssignmentIds.length > 0) {
        const { data: progressData } = await supabase
            .from('assignment_progress')
            .select('assignment_id, is_completed')
            .in('assignment_id', allCollectionAssignmentIds)
            .eq('student_id', user.id)
            .eq('is_completed', true)

        if (progressData) {
            progressData.forEach((p: any) => completedAssignmentIds.add(p.assignment_id))
        }
    }

    const getCollectionProgress = (collection: any) => {
        if (!collection.assignments || collection.assignments.length === 0) return 0
        const completedCount = collection.assignments.filter((a: any) => completedAssignmentIds.has(a.id)).length
        return (completedCount / collection.assignments.length) * 100
    }

    if (!classroom) notFound()

    const isClassworkRestricted = classroom.ip_check_enabled && classroom.allowed_ip && studentIp !== classroom.allowed_ip

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

                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Main Content (Assignments) */}
                    <div className="space-y-6">


                        {/* Collections grouped by Category */}
                        {collections && collections.length > 0 ? (
                            <div className="space-y-8 mb-8">
                                {/* Classwork Section */}
                                {collections.some((c: any) => c.category === 'classwork') && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-foreground/80 flex items-center gap-2 text-primary">
                                            <Layers className="h-4 w-4" />
                                            Classwork
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {collections.filter((c: any) => c.category === 'classwork').map((collection: any) => {
                                                const progress = getCollectionProgress(collection)
                                                const cardContent = (
                                                    <Card className={`transition-colors bg-secondary/10 ${isClassworkRestricted ? 'opacity-75' : 'cursor-pointer hover:border-primary/50'}`}>
                                                        <CardContent className="p-6 space-y-4">
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-1.5 flex-1 pr-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-semibold leading-none">{collection.title}</h3>
                                                                        {isClassworkRestricted && <Lock className="h-3 w-3 text-red-500" />}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                        <span>{collection.assignments?.length || 0} Exercises</span>
                                                                        <span>•</span>
                                                                        <span>Posted {new Date(collection.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">Classwork</span>
                                                            </div>

                                                            {/* Progress Section */}
                                                            {isClassworkRestricted ? (
                                                                <div className="flex items-center gap-2 text-red-600 bg-red-50/50 px-3 py-2 rounded-md border border-red-100/50">
                                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                                    <span className="text-[10px] font-medium leading-tight">Access restricted to classroom network only</span>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {progress > 0 && progress < 100 && (
                                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                                            <span>{Math.round(progress)}% Complete</span>
                                                                        </div>
                                                                    )}

                                                                    {progress === 100 ? (
                                                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md">
                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                            <span className="text-xs font-medium">Completed</span>
                                                                        </div>
                                                                    ) : (
                                                                        <Progress value={progress} className="h-1.5" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                )

                                                if (isClassworkRestricted) {
                                                    return <div key={collection.id}>{cardContent}</div>
                                                }

                                                return (
                                                    <Link key={collection.id} href={`/student/class/${id}/collection/${collection.id}`}>
                                                        {cardContent}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Homework Section */}
                                {collections.some((c: any) => c.category === 'homework' || !c.category) && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-foreground/80 flex items-center gap-2 text-indigo-500">
                                            <Layers className="h-4 w-4" />
                                            Homework
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {collections.filter((c: any) => c.category === 'homework' || !c.category).map((collection: any) => {
                                                const progress = getCollectionProgress(collection)
                                                return (
                                                    <Link key={collection.id} href={`/student/class/${id}/collection/${collection.id}`}>
                                                        <Card className="cursor-pointer hover:border-primary/50 transition-colors bg-secondary/10">
                                                            <CardContent className="p-6 space-y-4">
                                                                <div className="flex justify-between items-start">
                                                                    <div className="space-y-1.5 flex-1 pr-4">
                                                                        <h3 className="font-semibold leading-none">{collection.title}</h3>
                                                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                            <span>{collection.assignments?.length || 0} Exercises</span>
                                                                            <span>•</span>
                                                                            <span>Posted {new Date(collection.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full shrink-0">Homework</span>
                                                                </div>

                                                                {/* Progress Section */}
                                                                <div className="space-y-2">
                                                                    {progress > 0 && progress < 100 && (
                                                                        <div className="flex justify-between text-xs text-muted-foreground">
                                                                            <span>{Math.round(progress)}% Complete</span>
                                                                        </div>
                                                                    )}

                                                                    {progress === 100 ? (
                                                                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md">
                                                                            <CheckCircle2 className="h-4 w-4" />
                                                                            <span className="text-xs font-medium">Completed</span>
                                                                        </div>
                                                                    ) : (
                                                                        <Progress value={progress} className="h-1.5" />
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mb-8">
                                <p className="text-sm text-muted-foreground italic">No collections assigned yet.</p>
                            </div>
                        )}

                        {/* 
                        Hide Individual Exercises
                        <h3 className="text-lg font-medium text-foreground/80">Individual Exercises</h3>

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
                        */}
                    </div>

                    {/* Sidebar (Stats/Info) removed */}
                </div>
            </div>
        </div>
    )
}
