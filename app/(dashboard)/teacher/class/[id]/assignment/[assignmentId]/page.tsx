import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Check, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import MathDisplay from "@/components/MathDisplay"
import { Badge } from "@/components/ui/badge"
import { TestInterface } from "./TestInterface"
import { PublishToggle } from "./PublishToggle"

export default async function AssignmentPage({ params }: { params: Promise<{ id: string, assignmentId: string }> }) {
    const supabase = await createClient()
    const { id, assignmentId } = await params

    const { data: assignment } = await supabase
        .from('assignments')
        .select('*, questions(*)')
        .eq('id', assignmentId)
        .single()

    if (!assignment) notFound()

    const question = assignment.questions?.[0]

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href={`/teacher/class/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Class
                        </Link>
                    </Button>
                    <div className="flex items-start justify-between border-b pb-6">
                        <div>
                            <h1 className="text-3xl font-serif font-bold tracking-tight">{assignment.title}</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant={assignment.published ? "secondary" : "outline"} className={assignment.published ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"}>
                                    {assignment.published ? "Published" : "Draft"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    Created {new Date(assignment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <PublishToggle
                            assignmentId={assignmentId}
                            classroomId={id}
                            initialPublished={assignment.published}
                        />
                    </div>
                </div>

                <div className="grid gap-8">
                    {/* Question Display */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Preview</CardTitle>
                            <CardDescription>
                                This is how the question appears to students.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-lg leading-relaxed">
                                <MathDisplay content={question.latex_text || "No question text"} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Test Interface */}
                    <Card className="border-2 border-primary/20">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <CheckCircle2 className="h-5 w-5" />
                                Test Mode
                            </CardTitle>
                            <CardDescription>
                                Verify the answer logic before publishing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TestInterface question={question} />
                        </CardContent>
                    </Card>

                    {/* Teacher Metadata */}
                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Answer Key</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 font-mono text-sm">
                            {question.question_type === 'numerical' ? (
                                <>
                                    <div className="flex justify-between border-b pb-2">
                                        <span>Correct Value:</span>
                                        <span className="font-bold">{question.correct_value}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tolerance:</span>
                                        <span>± {question.tolerance_percent}%</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between border-b pb-2">
                                        <span>Correct Answer:</span>
                                        <span className="font-bold">{question.correct_answer}</span>
                                    </div>
                                    <div className="grid gap-1 pt-2">
                                        {question.options?.map((opt: string, i: number) => (
                                            <div key={i} className={`p-2 rounded flex gap-2 ${['A', 'B', 'C', 'D'][i] === question.correct_answer ? "bg-green-100 dark:bg-green-900/20" : ""}`}>
                                                <span className="font-bold text-muted-foreground">{['A', 'B', 'C', 'D'][i]}.</span>
                                                <span>{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
