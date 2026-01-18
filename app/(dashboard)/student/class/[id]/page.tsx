import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, Clock, Activity, Layers } from "lucide-react"

export default async function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params
    const { data: { user } } = await supabase.auth.getUser()

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
            .order('created_at', { ascending: false })
    ])

    const { data: classroom } = classroomResult
    const { data: assignments } = assignmentsResult
    const { data: collections } = collectionsResult

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

                <div className="space-y-8">
                    {/* Main Content (Assignments) */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="font-serif text-xl font-semibold tracking-tight">Active Exercises</h2>
                        </div>

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
                                            {collections.filter((c: any) => c.category === 'classwork').map((collection: any) => (
                                                <Link key={collection.id} href={`/student/class/${id}/collection/${collection.id}`}>
                                                    <Card className="cursor-pointer hover:border-primary/50 transition-colors bg-secondary/10">
                                                        <CardContent className="p-6">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h3 className="font-semibold">{collection.title}</h3>
                                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Classwork</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <div className="text-sm text-muted-foreground">
                                                                    {collection.assignments?.length || 0} Exercises
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 border-t border-border/40 pt-2">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>Posted {new Date(collection.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            ))}
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
                                            {collections.filter((c: any) => c.category === 'homework' || !c.category).map((collection: any) => (
                                                <Link key={collection.id} href={`/student/class/${id}/collection/${collection.id}`}>
                                                    <Card className="cursor-pointer hover:border-primary/50 transition-colors bg-secondary/10">
                                                        <CardContent className="p-6">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h3 className="font-semibold">{collection.title}</h3>
                                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Homework</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <div className="text-sm text-muted-foreground">
                                                                    {collection.assignments?.length || 0} Exercises
                                                                </div>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-1.5 border-t border-border/40 pt-2">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>Posted {new Date(collection.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            ))}
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
