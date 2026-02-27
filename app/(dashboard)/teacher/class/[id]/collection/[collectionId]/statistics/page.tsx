import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Users, BarChart2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatisticsExerciseList } from "./StatisticsExerciseList"

export default async function CollectionStatisticsPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const { id, collectionId } = await params

    const { data: collection } = await supabase
        .from('collections')
        .select('*, assignments(id, title, order_index, required_variations_count)')
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
            submittedCount: count || 0,
            hasVariations: (a.required_variations_count || 0) > 0
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
                            Overview of student submissions for this collection. Click an exercise to see individual results.
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
                        {stats.length > 0 ? (
                            <StatisticsExerciseList
                                classroomId={id}
                                stats={stats}
                                studentCount={studentCount || 0}
                            />
                        ) : (
                            <div className="text-center py-12 space-y-3">
                                <div className="inline-flex p-3 rounded-full bg-muted/50">
                                    <BarChart2 className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground">No exercises found in this collection.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
