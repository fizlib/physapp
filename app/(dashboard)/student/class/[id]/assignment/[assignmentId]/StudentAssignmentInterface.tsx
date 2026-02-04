"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import MathDisplay from "@/components/MathDisplay"
import { DiagramDisplay } from "@/components/DiagramDisplay"
import { TestInterface } from "../../../../../teacher/class/[id]/assignment/[assignmentId]/TestInterface"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, HelpCircle, AlertCircle, Loader2 } from "lucide-react"
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
    initialSubmittedAnswers = {},
    isLastExercise = false,
    onProgressUpdate
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
    initialSubmittedAnswers?: Record<string, string>,
    isLastExercise?: boolean,
    onProgressUpdate?: () => void
}) {
    // Priority: initialActiveQuestionIndex > previous logic
    const [currentIndex, setCurrentIndex] = useState(initialActiveQuestionIndex ?? 0)
    // track which questions have been answered correctly
    const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set(initialCompletedIndices))
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set(initialRevealedIndices))
    const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<string>>(
        new Set(Object.keys(initialSubmittedAnswers || {}))
    )
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>(initialSubmittedAnswers || {})
    const [isFinishing, setIsFinishing] = useState(false)
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
        ).then(res => {
            if (res.success && onProgressUpdate) onProgressUpdate()
        })
    }, [currentIndex, assignment.id, completedIndices, revealedIndices, isVariationMode, requiredVariations, totalQuestions, initialActiveQuestionIndex, onProgressUpdate])

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
        if (onProgressUpdate) onProgressUpdate()

        // For variation mode, auto-advance logic is handled in render or effect
        if (isVariationMode && newSet.size < requiredVariations) {
            // ...
        }
    }

    const handleRevealSolution = async () => {
        if (!confirm("Ar tikrai? Jei parodysite sprendimą, negalėsite pateikti atsakymo šiai variacijai ir turėsite spręsti kitą.")) {
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
        if (onProgressUpdate) onProgressUpdate()
        toast.info("Sprendimas parodytas. Prašome spręsti kitą variaciją.")
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
            if (onProgressUpdate) onProgressUpdate()
            toast.success("Atsakymas pateiktas!")
            setSubmittedAnswers(prev => ({ ...prev, [questionId]: answer }))
            // Check if all questions are now submitted
            const updatedLockedCount = lockedQuestionIds.size + 1
            if (updatedLockedCount >= totalQuestions && onFinish) {
                onFinish()
            }
        } else if (result.alreadySubmitted) {
            toast.error("Šio varianto atsakymas jau buvo pateiktas")
        } else {
            toast.error(result.error || "Nepavyko pateikti atsakymo")
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
                            Grįžti į klasę
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
                            Scenarijaus nuoroda
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <DiagramDisplay
                            diagramType={firstQuestion.diagram_type}
                            diagramLatex={firstQuestion.diagram_latex}
                            diagramSvg={firstQuestion.diagram_svg}
                            diagramImageUrl={firstQuestion.diagram_image_url}
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
                                                diagramImageUrl={q.diagram_image_url}
                                            />

                                            {revealedIndices.has(index) && (
                                                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                                                        <BookOpen className="h-4 w-4" />
                                                        Išsamus sprendimas
                                                    </div>
                                                    <div className="text-zinc-800 text-sm leading-relaxed border-t border-blue-100 pt-3">
                                                        <MathDisplay content={q.solution_text || "Sprendimo instrukcijos nėra."} />
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
                                                            if (!confirm("Rodyti sprendimą? Atsakymo pateikimas šiam klausimui bus išjungtas.")) return
                                                            const newRevealed = new Set(revealedIndices).add(index)
                                                            setRevealedIndices(newRevealed)
                                                            await upsertAssignmentProgress(assignment.id, Array.from(completedIndices), false, currentIndex, Array.from(newRevealed))
                                                            if (onProgressUpdate) onProgressUpdate()
                                                        }}
                                                    >
                                                        <HelpCircle className="h-3 w-3" />
                                                        Rodyti sprendimą
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
                                                    submittedAnswer={submittedAnswers[q.id]}
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
                                Ankstesnė užduotis
                            </Button>
                        )}
                        <Button
                            disabled={isFinishing || (!canSkip && !pointsEnabled && completedIndices.size !== totalQuestions)}
                            variant="default"
                            size="lg"
                            className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-lg"
                            onClick={async () => {
                                if (isFinishing) return
                                setIsFinishing(true)

                                try {
                                    // Auto-submit unanswered points questions ONLY when finishing the entire collection
                                    if (pointsEnabled && isLastExercise) {
                                        for (const q of questions) {
                                            if (!lockedQuestionIds.has(q.id)) {
                                                await submitPointsAnswer(
                                                    assignment.id,
                                                    q.id,
                                                    '',
                                                    false,
                                                    q.points || 1,
                                                    totalQuestions
                                                )
                                            }
                                        }
                                    }

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
                                } catch (error) {
                                    console.error("Failed to finish exercise:", error)
                                    setIsFinishing(false)
                                }
                            }}
                        >
                            {isFinishing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    {onFinish ? (isLastExercise ? "Baigti" : "Kita užduotis") : "Baigti užduotį"}
                                    <CheckCircle2 className="h-4 w-4" />
                                </>
                            )}
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
                                    {isVariationMode ? `Variacija ${completedIndices.size + 1} iš ${requiredVariations}` : `Klausimas ${currentIndex + 1}`}
                                </CardTitle>
                                {pointsEnabled && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                                        <Award className="h-3 w-3" />
                                        Taškai
                                    </span>
                                )}
                            </div>
                            <CardDescription>
                                {isVariationMode
                                    ? `Atlikite ${requiredVariations} variacijas, kad išlaikytumėte. (${completedIndices.size} išspręsta)`
                                    : (totalQuestions > 1 ? `Žingsnis ${currentIndex + 1} iš ${totalQuestions}` : 'Išspręskite žemiau esančią problemą')
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
                            diagramImageUrl={questions[currentIndex].diagram_image_url}
                        />

                        <div className="pt-6 border-t space-y-6">
                            {revealedIndices.has(currentIndex) && (
                                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                        <BookOpen className="h-5 w-5" />
                                        Išsamus sprendimas
                                    </div>
                                    <div className="text-zinc-800 leading-relaxed border-t border-blue-100 pt-3">
                                        <MathDisplay content={questions[currentIndex].solution_text || "Sprendimo instrukcijos šiai variacijai nėra."} />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-100/50 p-2 rounded">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        Sprendimas parodytas. Atsakymo pateikimas šiai variacijai išjungtas.
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
                                        Rodyti sprendimą
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
                                    submittedAnswer={submittedAnswers[questions[currentIndex].id]}
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
                                        <span className="text-sm font-bold block">Taškais vertinama užduotis</span>
                                        <span className="text-xs text-amber-600/80">Turite vieną bandymą už {exercisePoints} {exercisePoints === 1 ? 'tašką' : 'taškus'}. Spręskite atidžiai!</span>
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
                                        Ankstesnė užduotis
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
                                        {isVariationMode ? "Kita variacija" : "Kitas klausimas"}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={isFinishing || (!canProceed && !pointsEnabled)}
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                        onClick={async () => {
                                            if (isFinishing) return
                                            setIsFinishing(true)

                                            try {
                                                // Auto-submit unanswered points questions ONLY when finishing the entire collection
                                                if (pointsEnabled && isLastExercise) {
                                                    for (const q of questions) {
                                                        if (!lockedQuestionIds.has(q.id)) {
                                                            await submitPointsAnswer(
                                                                assignment.id,
                                                                q.id,
                                                                '',
                                                                false,
                                                                q.points || 1,
                                                                totalQuestions
                                                            )
                                                        }
                                                    }
                                                }

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
                                            } catch (error) {
                                                console.error("Failed to finish exercise:", error)
                                                setIsFinishing(false)
                                            }
                                        }}
                                    >
                                        {isFinishing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                {onFinish ? (isLastExercise ? "Baigti" : "Kita užduotis") : "Baigti užduotį"}
                                                <CheckCircle2 className="h-4 w-4" />
                                            </>
                                        )}
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
