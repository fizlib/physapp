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
import { upsertAssignmentProgress, submitPointsAnswer } from "../../../../actions"
import { toast } from "sonner"
import { Award } from "lucide-react"

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
    hideRevealSolution = false,
    exerciseNumber,
    // Points mode props
    pointsEnabled = false,
    exercisePoints = 1,
    initialSubmittedAnswers = {}
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
    hideRevealSolution?: boolean,
    exerciseNumber?: number,
    // Points mode props
    pointsEnabled?: boolean,
    exercisePoints?: number,
    initialSubmittedAnswers?: Record<string, string>
}) {
    // Priority: initialActiveQuestionIndex > previous logic
    const [currentIndex, setCurrentIndex] = useState(initialActiveQuestionIndex ?? 0)
    // track which questions have been answered correctly
    const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set(initialCompletedIndices))
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set(initialRevealedIndices))
    // Points mode state - track which question IDs have been submitted
    const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<string>>(
        new Set(Object.keys(initialSubmittedAnswers || {}))
    )
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

    // Points mode submission handler - one try per question
    const handlePointsSubmit = async (questionId: string, questionPoints: number, answer: string, isCorrect: boolean) => {
        // Lock this specific question
        setLockedQuestionIds(prev => new Set(prev).add(questionId))

        const result = await submitPointsAnswer(
            assignment.id,
            questionId,
            answer,
            isCorrect,
            questionPoints,
            totalQuestions
        )

        if (result.success) {
            toast.success("Answer submitted!")
            // Check if all questions are now submitted
            const updatedLockedCount = lockedQuestionIds.size + 1
            if (updatedLockedCount >= totalQuestions && onFinish) {
                onFinish()
            }
        } else if (result.alreadySubmitted) {
            toast.error("Answer was already submitted for this part")
        } else {
            toast.error(result.error || "Failed to submit answer")
        }
    }

    // In points mode, a locked question (submitted answer) counts as "completed" for navigation
    const isCurrentQuestionLocked = pointsEnabled && questions[currentIndex]?.id && lockedQuestionIds.has(questions[currentIndex].id)
    const canProceed = canSkip || completedIndices.has(currentIndex) || revealedIndices.has(currentIndex) || isCurrentQuestionLocked
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
                            <Card key={index} className={`transition-all ${pointsEnabled ? 'border-amber-500/30' : ''} ${isCorrect ? 'border-green-500/40 bg-green-50/10' : ''}`}>
                                <CardContent className="p-6">
                                    <div className="flex gap-4">
                                        <div className="flex-none pt-1">
                                            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${pointsEnabled ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-muted text-muted-foreground'}`}>
                                                {exerciseNumber ? (questions.length > 1 ? `${exerciseNumber}.${index + 1}` : exerciseNumber) : index + 1}
                                            </span>
                                            {pointsEnabled && (
                                                <div className="flex justify-center mt-1">
                                                    <Award className="h-3 w-3 text-amber-500" />
                                                </div>
                                            )}
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
                                                    questionId={q.id}
                                                    questionPoints={q.points || 1}
                                                    onCorrect={() => setCompletedIndices(prev => new Set(prev).add(index))}
                                                    pointsMode={pointsEnabled}
                                                    disabled={lockedQuestionIds.has(q.id)}
                                                    onPointsSubmit={handlePointsSubmit}
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
                            disabled={!canSkip && (pointsEnabled ? lockedQuestionIds.size !== totalQuestions : completedIndices.size !== totalQuestions)}
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
                <Card className={`transition-all ${pointsEnabled ? 'border-amber-500/30' : ''} ${canProceed ? 'border-green-500/40 bg-green-50/10' : ''}`}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-xl">
                                    {isVariationMode ? `Variation ${completedIndices.size + 1} of ${requiredVariations}` : `Question ${currentIndex + 1}`}
                                </CardTitle>
                                {pointsEnabled && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                                        <Award className="h-3 w-3" />
                                        Points
                                    </span>
                                )}
                            </div>
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
                                    questionId={questions[currentIndex].id}
                                    questionPoints={questions[currentIndex].points || 1}
                                    onCorrect={handleCorrect}
                                    pointsMode={pointsEnabled}
                                    disabled={lockedQuestionIds.has(questions[currentIndex].id)}
                                    onPointsSubmit={handlePointsSubmit}
                                />
                            </div>

                            {/* Points mode indicator */}
                            {pointsEnabled && !lockedQuestionIds.has(questions[currentIndex].id) && (
                                <div className="flex items-center gap-3 text-amber-700 bg-amber-50/50 p-4 rounded-xl border border-amber-200/50 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-amber-100 p-2 rounded-full">
                                        <Award className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <span className="text-sm font-bold block">Points exercise</span>
                                        <span className="text-xs text-amber-600/80">You have one attempt for {exercisePoints} {exercisePoints === 1 ? 'point' : 'points'}. Solve carefully!</span>
                                    </div>
                                </div>
                            )}

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
