import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Users, BarChart2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CollectionStatisticsPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const { id, collectionId } = await params

    const { data: collection } = await supabase
        .from('collections')
        .select('*, assignments(*)')
        .eq('id', collectionId)
        .single()

    if (!collection) notFound()

    const assignments = collection.assignments?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)) || []

    // Fetch counts for each assignment using Admin Client to bypass RLS
    const stats = await Promise.all(assignments.map(async (a: any) => {
        const { count } = await supabaseAdmin
            .from('assignment_progress')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', a.id)
            // We count any student who has at least one answer submitted OR is marked as completed
            // and we use the admin client because the teacher might not have permission to read all progress rows via RLS
            .or('is_completed.eq.true,completed_question_indices.neq.{},submitted_answers.neq.{}')

        return {
            id: a.id,
            title: a.title,
            submittedCount: count || 0
        }
    }))

    // Get total students in class to show "X / Total"
    const { count: studentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('classroom_id', id)

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href={`/teacher/class/${id}/collection/${collectionId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Collection
                        </Link>
                    </Button>
                    <div className="border-b pb-6">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <BarChart2 className="h-6 w-6" />
                            <span className="font-semibold uppercase tracking-wider text-xs">Statistics</span>
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-primary">{collection.title}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Overview of student submissions for this collection.
                        </p>
                    </div>
                </div>

                {/* Stats Table */}
                <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Submission Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="divide-y divide-border/50">
                            {stats.length > 0 ? stats.map((stat) => (
                                <div key={stat.id} className="py-6 flex items-center justify-between group hover:bg-muted/30 transition-colors px-2 rounded-lg">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-lg">{stat.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500"
                                                    style={{ width: `${(stat.submittedCount / (studentCount || 1)) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {Math.round((stat.submittedCount / (studentCount || 1)) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-1">
                                            <span className="text-3xl font-bold text-primary">{stat.submittedCount}</span>
                                            <span className="text-muted-foreground text-sm">/ {studentCount || 0}</span>
                                        </div>
                                        <p className="text-[10px] uppercase tracking-tighter text-muted-foreground font-medium">Students Submitted</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-12 space-y-3">
                                    <div className="inline-flex p-3 rounded-full bg-muted/50">
                                        <BarChart2 className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">No exercises found in this collection.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
