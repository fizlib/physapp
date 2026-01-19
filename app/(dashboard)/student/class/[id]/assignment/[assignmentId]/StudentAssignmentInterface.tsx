"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import MathDisplay from "@/components/MathDisplay"
import { DiagramDisplay } from "@/components/DiagramDisplay"
import { TestInterface } from "../../../../../teacher/class/[id]/assignment/[assignmentId]/TestInterface"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function StudentAssignmentInterface({ assignment, classId, onFinish, compact = false }: { assignment: any, classId: string, onFinish?: () => void, compact?: boolean }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    // track which questions have been answered correctly
    const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set())
    const router = useRouter()

    const questions = assignment.questions || []
    const totalQuestions = questions.length
    const showAll = assignment.show_all_questions

    // Check for persistent diagram from first question
    const firstQuestion = questions[0]
    const hasPersistentDiagram = firstQuestion?.diagram_type && firstQuestion.diagram_type !== 'none'
    // Show persistent diagram if we are NOT on the first question AND the first question has a diagram AND we are NOT showing all questions
    const showPersistentDiagram = !showAll && currentIndex > 0 && hasPersistentDiagram

    const handleCorrect = () => {
        setCompletedIndices(prev => new Set(prev).add(currentIndex))
    }

    const canProceed = completedIndices.has(currentIndex)
    const isLastQuestion = currentIndex === totalQuestions - 1

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    // Progress calculation
    const progress = (completedIndices.size / totalQuestions) * 100

    return (
        <div className="space-y-8">
            {/* Header / Navigation - Only show if NOT compact */}
            {!compact && (
                <>
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                            <Link href={`/student/class/${classId}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Class
                            </Link>
                        </Button>
                        <div className="text-sm font-medium text-muted-foreground">
                            {showAll ? `${totalQuestions} Questions` : `Question ${currentIndex + 1} of ${totalQuestions}`}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </>
            )}

            {/* Persistent Diagram Section (Paginated specific) */}
            {showPersistentDiagram && (
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Scenario Reference</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DiagramDisplay
                            diagramType={firstQuestion.diagram_type}
                            diagramLatex={firstQuestion.diagram_latex}
                            diagramSvg={firstQuestion.diagram_svg}
                        />
                        <div className="mt-4 text-sm text-muted-foreground">
                            <MathDisplay content={firstQuestion.latex_text || ""} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {showAll ? (
                /* One Page View */
                <div className="space-y-12">
                    {questions.map((q: any, index: number) => {
                        const isCorrect = completedIndices.has(index)
                        return (
                            <div key={index} className="space-y-6 pt-6 border-t first:border-0 first:pt-0">
                                <h2 className="text-2xl font-bold tracking-tight">Question {index + 1}</h2>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Question</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="text-lg leading-relaxed">
                                            <MathDisplay content={q.latex_text || "No question text"} />
                                        </div>
                                        <DiagramDisplay
                                            diagramType={q.diagram_type}
                                            diagramLatex={q.diagram_latex}
                                            diagramSvg={q.diagram_svg}
                                        />
                                    </CardContent>
                                </Card>

                                <Card className={`border-2 transition-colors ${isCorrect ? 'border-green-500/20 bg-green-50/30' : 'border-primary/10'}`}>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-primary flex items-center justify-between">
                                            <span>Your Answer</span>
                                            {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <TestInterface
                                            key={q.id || index}
                                            question={q}
                                            onCorrect={() => setCompletedIndices(prev => new Set(prev).add(index))}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        )
                    })}

                    <div className="flex justify-end pt-8 sticky bottom-4">
                        <Button
                            disabled={completedIndices.size !== totalQuestions}
                            variant="default"
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"
                            onClick={() => {
                                if (onFinish) {
                                    onFinish()
                                } else {
                                    router.push(`/student/class/${classId}`)
                                }
                            }}
                        >
                            {onFinish ? "Next Exercise" : "Finish Assignment"}
                            <CheckCircle2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                /* Paginated View (Original) */
                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight mb-4">Question {currentIndex + 1}</h2>

                        <Card>
                            <CardHeader>
                                <CardTitle>Question</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="text-lg leading-relaxed">
                                    <MathDisplay content={questions[currentIndex].latex_text || "No question text"} />
                                </div>
                                <DiagramDisplay
                                    diagramType={questions[currentIndex].diagram_type}
                                    diagramLatex={questions[currentIndex].diagram_latex}
                                    diagramSvg={questions[currentIndex].diagram_svg}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <Card className={`border-2 transition-colors ${canProceed ? 'border-green-500/20 bg-green-50/30' : 'border-primary/10'}`}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-primary flex items-center justify-between">
                                <span>Your Answer</span>
                                {canProceed && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            </CardTitle>
                            <CardDescription>
                                Solve the problem above and check your answer.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TestInterface
                                key={questions[currentIndex].id || currentIndex}
                                question={questions[currentIndex]}
                                onCorrect={handleCorrect}
                            />

                            <div className="mt-6 flex justify-end">
                                {!isLastQuestion ? (
                                    <Button
                                        onClick={handleNext}
                                        disabled={!canProceed}
                                        className="gap-2"
                                    >
                                        Next Question
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={!canProceed}
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                        onClick={() => {
                                            if (onFinish) {
                                                onFinish()
                                            } else {
                                                router.push(`/student/class/${classId}`)
                                            }
                                        }}
                                    >
                                        {onFinish ? "Next Exercise" : "Finish Assignment"}
                                        <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
