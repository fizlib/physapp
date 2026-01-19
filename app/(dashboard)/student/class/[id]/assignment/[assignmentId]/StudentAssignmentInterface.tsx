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

export function StudentAssignmentInterface({ assignment, classId, onFinish, onPrevious, canSkip = false, compact = false }: { assignment: any, classId: string, onFinish?: () => void, onPrevious?: () => void, canSkip?: boolean, compact?: boolean }) {
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

    const canProceed = canSkip || completedIndices.has(currentIndex)
    const isLastQuestion = currentIndex === totalQuestions - 1

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1)
        }
    }

    // Progress calculation
    const progress = (completedIndices.size / totalQuestions) * 100

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            {/* Header / Navigation - Only show if NOT compact */}
            {!compact && (
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href={`/student/class/${classId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Class
                        </Link>
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium text-muted-foreground">
                            {Math.round(progress)}%
                        </div>
                        <Progress value={progress} className="w-24 h-2" />
                    </div>
                </div>
            )}

            {/* Persistent Diagram Section (Paginated specific) */}
            {showPersistentDiagram && (
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            Scenario Reference
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
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
                <div className="space-y-8">
                    {questions.map((q: any, index: number) => {
                        const isCorrect = completedIndices.has(index)
                        return (
                            <Card key={index} className={`transition-all ${isCorrect ? 'border-green-500/40 bg-green-50/10' : ''}`}>
                                <CardContent className="p-6">
                                    <div className="flex gap-4">
                                        <div className="flex-none pt-1">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 space-y-6">
                                            <div className="text-lg leading-relaxed">
                                                <MathDisplay content={q.latex_text || "No question text"} />
                                            </div>
                                            <DiagramDisplay
                                                diagramType={q.diagram_type}
                                                diagramLatex={q.diagram_latex}
                                                diagramSvg={q.diagram_svg}
                                            />

                                            <div className="pt-2">
                                                <TestInterface
                                                    key={q.id || index}
                                                    question={q}
                                                    onCorrect={() => setCompletedIndices(prev => new Set(prev).add(index))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}

                    <div className={`flex ${onPrevious ? 'justify-between' : 'justify-end'} pt-4 sticky bottom-4`}>
                        {onPrevious && (
                            <Button
                                variant="outline"
                                size="lg"
                                className="gap-2"
                                onClick={onPrevious}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Previous Exercise
                            </Button>
                        )}
                        <Button
                            disabled={!canSkip && completedIndices.size !== totalQuestions}
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
                /* Paginated View */
                <Card className={`transition-all ${canProceed ? 'border-green-500/40 bg-green-50/10' : ''}`}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">Question {currentIndex + 1}</CardTitle>
                            <CardDescription>
                                {totalQuestions > 1 ? `Step ${currentIndex + 1} of ${totalQuestions}` : 'Solve the problem below'}
                            </CardDescription>
                        </div>
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

                        <div className="pt-6 border-t">
                            <TestInterface
                                key={questions[currentIndex].id || currentIndex}
                                question={questions[currentIndex]}
                                onCorrect={handleCorrect}
                            />

                            <div className={`mt-6 flex ${onPrevious ? 'justify-between' : 'justify-end'}`}>
                                {onPrevious && (
                                    <Button
                                        variant="outline"
                                        className="gap-2"
                                        onClick={onPrevious}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Previous Exercise
                                    </Button>
                                )}
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
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
