import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Check, CheckCircle2, XCircle, BookOpen, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import MathDisplay from "@/components/MathDisplay"
import { DiagramDisplay } from "@/components/DiagramDisplay"
import { Badge } from "@/components/ui/badge"
import { TestInterface } from "./TestInterface"
import { DeleteAssignmentDialog } from "./DeleteAssignmentDialog"
import { PublishToggle } from "./PublishToggle"
import { EditExerciseDialog } from "./EditExerciseDialog"

export default async function AssignmentPage({ params }: { params: Promise<{ id: string, assignmentId: string }> }) {
    const supabase = await createClient()
    const { id, assignmentId } = await params

    const { data: assignment } = await supabase
        .from('assignments')
        .select('*, questions(*)')
        .eq('id', assignmentId)
        .single()

    if (!assignment) notFound()

    // Fetch collection category if this assignment belongs to a collection
    let collectionCategory: 'homework' | 'classwork' | undefined = undefined
    if (assignment.collection_id) {
        const { data: collection } = await supabase
            .from('collections')
            .select('category')
            .eq('id', assignment.collection_id)
            .single()
        collectionCategory = collection?.category
    }


    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href={assignment.collection_id ? `/teacher/class/${id}/collection/${assignment.collection_id}` : `/teacher/class/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Collection
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
                        <div className="flex items-center gap-2">
                            <PublishToggle
                                assignmentId={assignmentId}
                                classroomId={id}
                                initialPublished={assignment.published}
                            />
                            <EditExerciseDialog
                                classroomId={id}
                                assignmentId={assignmentId}
                                initialData={assignment}
                                collectionCategory={collectionCategory}
                            />
                            <DeleteAssignmentDialog assignmentId={assignmentId} classroomId={id} />
                        </div>
                    </div>
                </div>

                {/* Theory Preview */}
                {assignment.theory_content && (
                    <div className="space-y-6">
                        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-indigo-50/30">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-full">
                                        <FileText className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <div>
                                        <CardTitle>Theory Content Preview</CardTitle>
                                        <CardDescription>This is how the theory appears to students.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {assignment.theory_image_url && (
                                    <div className="rounded-lg overflow-hidden border bg-white flex items-center justify-center p-4">
                                        <img
                                            src={assignment.theory_image_url}
                                            alt="Theory illustration"
                                            className="max-w-full max-h-[400px] object-contain"
                                        />
                                    </div>
                                )}
                                <div className="prose prose-sm max-w-none bg-white/80 rounded-lg p-6 border space-y-3">
                                    {(assignment.theory_content as string)
                                        .replace(/\\n/g, '\n')
                                        .split(/\n\s*\n|\n/)
                                        .filter((p: string) => p.trim())
                                        .map((paragraph: string, idx: number) => (
                                            <div key={idx}>
                                                <MathDisplay content={paragraph.trim()} />
                                            </div>
                                        ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className="grid gap-8">
                    {assignment.questions?.map((question: any, index: number) => (
                        <div key={question.id} className="space-y-8 border-t pt-8 first:border-t-0 first:pt-0">
                            <h2 className="text-2xl font-bold tracking-tight">Question {index + 1}</h2>

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
                                    <DiagramDisplay
                                        diagramType={question.diagram_type || assignment.questions?.[0]?.diagram_type}
                                        diagramLatex={question.diagram_latex || assignment.questions?.[0]?.diagram_latex}
                                        diagramSvg={question.diagram_svg || assignment.questions?.[0]?.diagram_svg}
                                        diagramImageUrl={question.diagram_image_url || assignment.questions?.[0]?.diagram_image_url}
                                    />
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
                                                        <span className="font-bold text-muted-foreground min-w-[1.5rem]">{['A', 'B', 'C', 'D'][i]}.</span>
                                                        <div className="flex-1">
                                                            <MathDisplay content={opt} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Solution Preview */}
                            {question.solution_text && (
                                <Card className="border-blue-200 bg-blue-50/20">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-blue-700 text-lg">
                                            <BookOpen className="h-5 w-5" />
                                            Solution Preview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-zinc-800 leading-relaxed">
                                            <MathDisplay content={question.solution_text} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
