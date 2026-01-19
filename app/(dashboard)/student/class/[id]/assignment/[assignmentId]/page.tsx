import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { BookOpen } from "lucide-react"
import { StudentAssignmentInterface } from "./StudentAssignmentInterface"

export default async function StudentAssignmentPage({ params }: { params: Promise<{ id: string, assignmentId: string }> }) {
    const supabase = await createClient()
    const { id, assignmentId } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    const { data: assignment } = await supabase
        .from('assignments')
        .select('*, questions(*)')
        .eq('id', assignmentId)
        .eq('published', true)
        .order('created_at', { foreignTable: 'questions', ascending: true })
        .single()

    if (!assignment) notFound()

    // Ensure questions are sorted by sequence/order if applicable, or just rely on default order.
    // Assuming questions array is the order.

    // Fetch progress
    const { data: progress } = await supabase
        .from('assignment_progress')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .single()

    const initialCompletedIndices = progress?.completed_question_indices || []
    const initialIsCompleted = progress?.is_completed || false

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <div className="border-b pb-6">
                        <h1 className="text-3xl font-serif font-bold tracking-tight">{assignment.title}</h1>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            <span>Practice Exercise</span>
                        </div>
                    </div>
                </div>

                <StudentAssignmentInterface
                    assignment={assignment}
                    classId={id}
                    initialCompletedIndices={initialCompletedIndices}
                    initialIsCompleted={initialIsCompleted}
                />
            </div>
        </div>
    )
}
