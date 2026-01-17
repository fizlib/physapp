import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import MathDisplay from "@/components/MathDisplay"
import { TestInterface } from "../../../../../teacher/class/[id]/assignment/[assignmentId]/TestInterface"

export default async function StudentAssignmentPage({ params }: { params: Promise<{ id: string, assignmentId: string }> }) {
    const supabase = await createClient()
    const { id, assignmentId } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    const { data: assignment } = await supabase
        .from('assignments')
        .select('*, questions(*)')
        .eq('id', assignmentId)
        .eq('published', true) // Verify it's published
        .single()

    if (!assignment) notFound()

    const question = assignment.questions?.[0]

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href={`/student/class/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Class
                        </Link>
                    </Button>
                    <div className="border-b pb-6">
                        <h1 className="text-3xl font-serif font-bold tracking-tight">{assignment.title}</h1>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            <span>Practice Exercise</span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-8">
                    {/* Question Display */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Question</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-lg leading-relaxed">
                                <MathDisplay content={question.latex_text || "No question text"} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Interaction Area */}
                    <Card className="border-2 border-primary/10">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-primary">Your Answer</CardTitle>
                            <CardDescription>
                                Solve the problem above and check your answer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TestInterface question={question} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
