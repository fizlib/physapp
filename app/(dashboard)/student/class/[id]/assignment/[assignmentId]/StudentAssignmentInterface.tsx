"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import MathDisplay from "@/components/MathDisplay"
import { DiagramDisplay } from "@/components/DiagramDisplay"
import { TestInterface } from "../../../../../teacher/class/[id]/assignment/[assignmentId]/TestInterface"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, HelpCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { upsertAssignmentProgress } from "../../../../actions"
import { toast } from "sonner"

export function StudentAssignmentInterface({
    assignment,
    classId,
    onFinish,
    onPrevious,
    canSkip = false,
    compact = false,
    initialCompletedIndices = [],
    initialRevealedIndices = [],
    initialIsCompleted = false,
    initialActiveQuestionIndex,
    hideRevealSolution = false
}: {
    assignment: any,
    classId: string,
    onFinish?: () => void,
    onPrevious?: () => void,
    canSkip?: boolean,
    compact?: boolean,
    initialCompletedIndices?: number[],
    initialRevealedIndices?: number[],
    initialIsCompleted?: boolean,
    initialActiveQuestionIndex?: number,
    hideRevealSolution?: boolean
}) {
    // Priority: initialActiveQuestionIndex > previous logic
    const [currentIndex, setCurrentIndex] = useState(initialActiveQuestionIndex ?? 0)
    // track which questions have been answered correctly
    const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set(initialCompletedIndices))
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set(initialRevealedIndices))
    const router = useRouter()

    const questions = assignment.questions || []
    const totalQuestions = questions.length
    // Variation Mode Logic
    const requiredVariations = assignment.required_variations_count;
    const isVariationMode = requiredVariations && requiredVariations > 0;

    // If variation mode, "showAll" is overridden to false
    const showAll = !isVariationMode && assignment.show_all_questions

    // Initialize currentIndex for variation mode
    useState(() => {
        if (isVariationMode && initialActiveQuestionIndex === undefined) {
            // Pick the first unsolved index
            // If all solved (or enough solved), pick any (won't matter as we show finish screen)
            const solvedCount = initialCompletedIndices.length;
            if (solvedCount < requiredVariations) {
                const unsolved = questions.map((_: any, i: number) => i).filter((i: number) => !initialCompletedIndices.includes(i) && !initialRevealedIndices.includes(i));
                if (unsolved.length > 0) {
                    // Pick random to ensure "different variation" feel
                    const randIndex = unsolved[Math.floor(Math.random() * unsolved.length)];
                    setCurrentIndex(randIndex);
                }
            }
        }
    })

    // Effect to save active question index when it changes
    // We debounce slightly to avoid rapid updates if user clicks fast, or just save immediately?
    // Saving immediately is safer for "reload" resilience.
    // Effect to save active question index when it changes
    useEffect(() => {
        // Skip first render if we just initialized? 
        // Actually, if we initialized with a value, we don't need to save it again immediately unless it changed.
        // But `initialActiveQuestionIndex` is the DB value. 
        // If `currentIndex` differs from `initialActiveQuestionIndex`, we save.
        // Or simpler: whenever `currentIndex` changes, save it.

        // We need to avoid saving on mount if it hasn't changed from DB.
        if (currentIndex === initialActiveQuestionIndex) return

        // Also debounce could be nice, but for now direct save.
        upsertAssignmentProgress(
            assignment.id,
            Array.from(completedIndices),
            completedIndices.size >= (isVariationMode ? requiredVariations : totalQuestions),
            currentIndex,
            Array.from(revealedIndices)
        )
    }, [currentIndex, assignment.id, completedIndices, revealedIndices, isVariationMode, requiredVariations, totalQuestions, initialActiveQuestionIndex])

    // Check for persistent diagram from first question
    const firstQuestion = questions[0]
    const hasPersistentDiagram = firstQuestion?.diagram_type && firstQuestion.diagram_type !== 'none'
    // Show persistent diagram if we are NOT on the first question AND the first question has a diagram AND we are NOT showing all questions
    const showPersistentDiagram = !showAll && currentIndex > 0 && hasPersistentDiagram

    const handleCorrect = async () => {
        const newSet = new Set(completedIndices).add(currentIndex)
        setCompletedIndices(newSet)

        // Save progress
        await upsertAssignmentProgress(
            assignment.id,
            Array.from(newSet),
            // Finish if we met the requirement
            isVariationMode ? newSet.size >= requiredVariations : false,
            currentIndex,
            Array.from(revealedIndices)
        )

        // For variation mode, auto-advance logic is handled in render or effect
        if (isVariationMode && newSet.size < requiredVariations) {
            // ...
        }
    }

    const handleRevealSolution = async () => {
        if (!confirm("Are you sure? If you reveal the solution, you will not be able to submit this variation and will need to solve a different one.")) {
            return
        }

        const newRevealed = new Set(revealedIndices).add(currentIndex)
        setRevealedIndices(newRevealed)

        // Save progress immediately
        await upsertAssignmentProgress(
            assignment.id,
            Array.from(completedIndices),
            false, // Revelation never completes the assignment
            currentIndex,
            Array.from(newRevealed)
        )
        toast.info("Solution revealed. Please solve a different variation.")
    }

    const canProceed = canSkip || completedIndices.has(currentIndex) || revealedIndices.has(currentIndex)
    const isLastQuestion = isVariationMode
        ? completedIndices.size >= requiredVariations - 1 // Logic: if we are at size == target-1, solving this makes it last
        : currentIndex === totalQuestions - 1

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex((prev: number) => prev + 1)
        }
    }

    // Progress calculation
    const progress = isVariationMode
        ? (completedIndices.size / requiredVariations) * 100
        : (completedIndices.size / totalQuestions) * 100

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

                                            {revealedIndices.has(index) && (
                                                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                                                        <BookOpen className="h-4 w-4" />
                                                        Step-by-Step Solution
                                                    </div>
                                                    <div className="text-zinc-800 text-sm leading-relaxed border-t border-blue-100 pt-3">
                                                        <MathDisplay content={q.solution_text || "No solution manual available."} />
                                                    </div>
                                                </div>
                                            )}

                                            {!hideRevealSolution && !isCorrect && !revealedIndices.has(index) && (
                                                <div className="flex justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50 gap-2 h-7 px-2 text-[10px]"
                                                        onClick={async () => {
                                                            if (!confirm("Reveal solution? Submission for this question will be disabled.")) return
                                                            const newRevealed = new Set(revealedIndices).add(index)
                                                            setRevealedIndices(newRevealed)
                                                            await upsertAssignmentProgress(assignment.id, Array.from(completedIndices), false, currentIndex, Array.from(newRevealed))
                                                        }}
                                                    >
                                                        <HelpCircle className="h-3 w-3" />
                                                        Reveal Solution
                                                    </Button>
                                                </div>
                                            )}

                                            <div className={`pt-2 ${revealedIndices.has(index) ? "opacity-50 pointer-events-none grayscale-[0.5]" : ""}`}>
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
                            onClick={async () => {
                                // Save completion status
                                await upsertAssignmentProgress(
                                    assignment.id,
                                    Array.from(completedIndices),
                                    true,
                                    currentIndex
                                )

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
                            <CardTitle className="text-xl">
                                {isVariationMode ? `Variation ${completedIndices.size + 1} of ${requiredVariations}` : `Question ${currentIndex + 1}`}
                            </CardTitle>
                            <CardDescription>
                                {isVariationMode
                                    ? `Complete ${requiredVariations} variations to pass. (${completedIndices.size} solved)`
                                    : (totalQuestions > 1 ? `Step ${currentIndex + 1} of ${totalQuestions}` : 'Solve the problem below')
                                }
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

                        <div className="pt-6 border-t space-y-6">
                            {revealedIndices.has(currentIndex) && (
                                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                        <BookOpen className="h-5 w-5" />
                                        Step-by-Step Solution
                                    </div>
                                    <div className="text-zinc-800 leading-relaxed border-t border-blue-100 pt-3">
                                        <MathDisplay content={questions[currentIndex].solution_text || "No solution manual available for this variation."} />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-100/50 p-2 rounded">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        Manual revealed. Submission disabled for this variation.
                                    </div>
                                </div>
                            )}

                            {!hideRevealSolution && !completedIndices.has(currentIndex) && !revealedIndices.has(currentIndex) && (
                                <div className="flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50 gap-2"
                                        onClick={handleRevealSolution}
                                    >
                                        <HelpCircle className="h-4 w-4" />
                                        Reveal Solution
                                    </Button>
                                </div>
                            )}

                            <div className={revealedIndices.has(currentIndex) ? "opacity-50 pointer-events-none grayscale-[0.5]" : ""}>
                                <TestInterface
                                    key={questions[currentIndex].id || currentIndex}
                                    question={questions[currentIndex]}
                                    onCorrect={handleCorrect}
                                />
                            </div>

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
                                {!isLastQuestion || (isVariationMode && completedIndices.size < requiredVariations) ? (
                                    <Button
                                        onClick={() => {
                                            if (isVariationMode) {
                                                // Pick next random unsolved (not solved and not revealed)
                                                const unsolved = questions.map((_: any, i: number) => i).filter((i: number) => !completedIndices.has(i) && !revealedIndices.has(i));
                                                if (unsolved.length > 0) {
                                                    const randIndex = unsolved[Math.floor(Math.random() * unsolved.length)];
                                                    setCurrentIndex(randIndex);
                                                }
                                            } else {
                                                handleNext();
                                            }
                                        }}
                                        disabled={!canProceed}
                                        className="gap-2"
                                    >
                                        {isVariationMode ? "Next Variation" : "Next Question"}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={!canProceed}
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                        onClick={async () => {
                                            // Save completion status
                                            await upsertAssignmentProgress(
                                                assignment.id,
                                                Array.from(completedIndices),
                                                true,
                                                currentIndex
                                            )

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
