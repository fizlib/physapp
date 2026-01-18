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

export function StudentAssignmentInterface({ assignment, classId }: { assignment: any, classId: string }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    // track which questions have been answered correctly
    const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set())
    const router = useRouter()

    const questions = assignment.questions || []
    const totalQuestions = questions.length
    const currentQuestion = questions[currentIndex]

    // Check for persistent diagram from first question
    const firstQuestion = questions[0]
    const hasPersistentDiagram = firstQuestion?.diagram_type && firstQuestion.diagram_type !== 'none'
    // Show persistent diagram if we are NOT on the first question AND the first question has a diagram
    const showPersistentDiagram = currentIndex > 0 && hasPersistentDiagram

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

    // Progress calculation: (completed questions / total questions) * 100
    // Or based on current index? "Also add progress bar" Usually means global progress.
    // If they are on Q3 of 5, progress is mostly about how many they finished.
    const progress = (completedIndices.size / totalQuestions) * 100

    return (
        <div className="space-y-8">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                    <Link href={`/student/class/${classId}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Class
                    </Link>
                </Button>
                <div className="text-sm font-medium text-muted-foreground">
                    Question {currentIndex + 1} of {totalQuestions}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            {/* Persistent Diagram Section */}
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

            {/* Current Question */}
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-4">Question {currentIndex + 1}</h2>

                    <Card>
                        <CardHeader>
                            <CardTitle>Question</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-lg leading-relaxed">
                                <MathDisplay content={currentQuestion.latex_text || "No question text"} />
                            </div>
                            {/* Only show the current diagram if it's NOT the first question (since first question diagram is handled by persistence logic above?) 
                                Wait, if we are on Q1 (index 0), we want to show it here. 
                                If we are on Q2, we showed Q1 above. Does Q2 have its own diagram? Maybe. 
                                So we should always show the current question's diagram. 
                                EXCEPT if it's the SAME diagram? 
                                The requirement says: "if there is a some svg diagram or scheme in first question, then this scheme should be displayed at the top for each of the following questions"
                                It implies the first question sets the scene.
                             */}
                            <DiagramDisplay
                                diagramType={currentQuestion.diagram_type}
                                diagramLatex={currentQuestion.diagram_latex}
                                diagramSvg={currentQuestion.diagram_svg}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Interaction Area */}
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
                        {/* We use a key here to reset state when question changes if needed, 
                            BUT TestInterface manages its own inputs. 
                            We want inputs to clear on new question. 
                            So key={currentQuestion.id} is crucial. */}
                        <TestInterface
                            key={currentQuestion.id}
                            question={currentQuestion}
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
                                    onClick={() => router.push(`/student/class/${classId}`)}
                                >
                                    Finish Assignment
                                    <CheckCircle2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
