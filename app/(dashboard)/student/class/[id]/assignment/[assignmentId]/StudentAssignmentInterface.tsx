"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import MathDisplay from "@/components/MathDisplay"
import { DiagramDisplay } from "@/components/DiagramDisplay"
import { TestInterface } from "../../../../../teacher/class/[id]/assignment/[assignmentId]/TestInterface"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, HelpCircle, Loader2, ExternalLink, Monitor, FileText, Lock } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { logSolutionRevealClick, upsertAssignmentProgress, submitPointsAnswer } from "../../../../actions"
import { toast } from "sonner"
import { Award } from "lucide-react"
import {
    NINTH_GRADE_TESTS_SIMULATION_ID,
    NINTH_GRADE_TESTS_SIMULATION_PATH,
    getSimulationCompletionKey,
} from "@/lib/simulation-completion"

interface AssignmentQuestion {
    id: string
    latex_text?: string | null
    question_type?: string | null
    correct_value?: number | null
    tolerance_percent?: number | null
    options?: string[] | null
    correct_answer?: string | null
    points?: number | null
    solution_text?: string | null
    diagram_type?: 'graph' | 'scheme' | 'none' | null
    diagram_latex?: string | null
    diagram_svg?: string | null
    diagram_image_url?: string | null
}

interface StudentAssignment {
    id: string
    title?: string | null
    questions?: AssignmentQuestion[] | null
    required_variations_count?: number | null
    show_all_questions?: boolean | null
    simulation_url?: string | null
    theory_content?: string | null
    theory_image_url?: string | null
}

function normalizeDiagramType(diagramType?: AssignmentQuestion['diagram_type']) {
    return diagramType === 'graph' || diagramType === 'scheme' ? diagramType : null
}

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
    initialSubmittedAnswers = {},
    initialEarnedPointsPerPart = {},
    isLastExercise = false,
    showVirtualKeyboardToggle = true,
    hideCorrectness = false,
    onProgressUpdate
}: {
    assignment: StudentAssignment,
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
    initialEarnedPointsPerPart?: Record<string, number>,
    isLastExercise?: boolean,
    showVirtualKeyboardToggle?: boolean,
    hideCorrectness?: boolean,
    onProgressUpdate?: () => void
}) {
    const questions = useMemo(() => assignment.questions || [], [assignment.questions])
    const totalQuestions = questions.length
    const requiredVariations = assignment.required_variations_count ?? 0;
    const isVariationMode = requiredVariations > 0;

    // Initialize currentIndex deterministically to avoid hydration mismatch
    const [currentIndex, setCurrentIndex] = useState(initialActiveQuestionIndex ?? 0)
    const [hasCheckedVariationSwitch, setHasCheckedVariationSwitch] = useState(false)

    // track which questions have been answered correctly
    const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set(initialCompletedIndices))
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set(initialRevealedIndices))
    const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<string>>(
        new Set(pointsEnabled ? Object.keys(initialSubmittedAnswers || {}) : [])
    )
    const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>(initialSubmittedAnswers || {})
    const [pointsCorrectnessByQuestionId, setPointsCorrectnessByQuestionId] = useState<Record<string, boolean>>(() => {
        if (!pointsEnabled) return {}
        const correctness: Record<string, boolean> = {}
        Object.entries(initialEarnedPointsPerPart || {}).forEach(([questionId, earnedPoints]) => {
            if (typeof earnedPoints === 'number') {
                correctness[questionId] = earnedPoints > 0
            }
        })
        return correctness
    })
    const [isFinishing, setIsFinishing] = useState(false)
    const [isSavingPoints, setIsSavingPoints] = useState(false)
    const lastSyncedIndexRef = useRef(currentIndex)
    const answerSaveQueueRef = useRef<Promise<void>>(Promise.resolve())
    const completedIndicesRef = useRef<Set<number>>(new Set(initialCompletedIndices))
    const submittedAnswersRef = useRef<Record<string, string>>(initialSubmittedAnswers || {})
    const router = useRouter()

    useEffect(() => {
        completedIndicesRef.current = completedIndices
    }, [completedIndices])

    useEffect(() => {
        submittedAnswersRef.current = submittedAnswers
    }, [submittedAnswers])

    // If variation mode, "showAll" is overridden to false
    const showAll = !isVariationMode && assignment.show_all_questions

    // Client-side effect to switch variation if current is done (avoids hydration mismatch)
    useEffect(() => {
        if (hasCheckedVariationSwitch) return
        setHasCheckedVariationSwitch(true)

        if (isVariationMode) {
            const isDone = initialCompletedIndices.includes(currentIndex) ||
                initialRevealedIndices.includes(currentIndex);

            if (initialActiveQuestionIndex === undefined || isDone) {
                const unsolved = questions.map((_, i: number) => i).filter((i: number) => !initialCompletedIndices.includes(i) && !initialRevealedIndices.includes(i));
                if (unsolved.length > 0) {
                    const newIndex = unsolved[Math.floor(Math.random() * unsolved.length)];
                    if (newIndex !== currentIndex) {
                        setCurrentIndex(newIndex);
                    }
                } else {
                    // All variations have been tried (completed or revealed)
                    // Reset revealed indices to give student a fresh start
                    setRevealedIndices(new Set())
                    // Pick any non-completed variation
                    const notCompleted = questions.map((_, i: number) => i).filter((i: number) => !initialCompletedIndices.includes(i));
                    if (notCompleted.length > 0) {
                        const newIndex = notCompleted[Math.floor(Math.random() * notCompleted.length)];
                        setCurrentIndex(newIndex);
                        // Save the reset to DB
                        upsertAssignmentProgress(
                            assignment.id,
                            initialCompletedIndices,
                            false,
                            newIndex,
                            [], // Empty revealed indices
                            {} // Empty answers on reset
                        )
                    }
                }
            }
        }
    }, [hasCheckedVariationSwitch, isVariationMode, initialActiveQuestionIndex, initialCompletedIndices, initialRevealedIndices, questions, currentIndex, assignment.id])

    // Effect to save active question index when it changes
    useEffect(() => {
        // Skip if we haven't done our initial variation check yet
        if (!hasCheckedVariationSwitch) return

        // Only sync when the active index actually changes.
        // Other dependency changes (e.g. completed/revealed updates) should not trigger extra writes.
        if (lastSyncedIndexRef.current === currentIndex) return
        lastSyncedIndexRef.current = currentIndex

        upsertAssignmentProgress(
            assignment.id,
            Array.from(completedIndices),
            completedIndices.size >= (isVariationMode ? requiredVariations : totalQuestions),
            currentIndex,
            Array.from(revealedIndices),
            submittedAnswers
        ).then(res => {
            if (res.success && onProgressUpdate) onProgressUpdate()
        })
    }, [currentIndex, assignment.id, completedIndices, revealedIndices, isVariationMode, requiredVariations, totalQuestions, onProgressUpdate, hasCheckedVariationSwitch, submittedAnswers])

    // Check for persistent diagram from first question
    const firstQuestion = questions[0]
    const hasPersistentDiagram = (firstQuestion?.diagram_type && firstQuestion.diagram_type !== 'none') || !!firstQuestion?.diagram_image_url
    // Show persistent diagram if we are NOT on the first question AND the first question has a diagram AND we are NOT showing all questions
    // In variation mode, we never want a persistent diagram as each variation is a separate problem.
    const showPersistentDiagram = !isVariationMode && !showAll && currentIndex > 0 && hasPersistentDiagram

    const persistRevealState = async (questionIndex: number, newRevealed: Set<number>, overrideCompleted?: Set<number>, markCompleted: boolean = false) => {
        const questionId = questions[questionIndex]?.id
        if (!questionId) {
            console.warn("Reveal click log skipped: missing question id", { assignmentId: assignment.id, questionIndex })
        }

        const completedToSave = overrideCompleted ?? completedIndices

        try {
            const [progressResult, logResult] = await Promise.all([
                upsertAssignmentProgress(
                    assignment.id,
                    Array.from(completedToSave),
                    markCompleted, // true when single-variation reveal counts as completion
                    currentIndex,
                    Array.from(newRevealed),
                    submittedAnswers
                ),
                questionId
                    ? logSolutionRevealClick(assignment.id, questionId, questionIndex)
                    : Promise.resolve({ success: false, error: "Missing question id" })
            ])

            if (!progressResult.success) {
                console.error("Failed to save reveal progress:", progressResult.error)
            }

            if (questionId && !logResult.success) {
                console.error("Failed to log reveal click:", logResult.error)
            }
        } catch (error) {
            console.error("Failed to persist reveal state:", error)
        }

        if (onProgressUpdate) onProgressUpdate()
    }

    const handleRevealSolution = async () => {
        // Check if revealing this question means there are no other unsolved questions left
        const unsolvedOthers = questions.map((_, i: number) => i).filter((i: number) =>
            i !== currentIndex && !completedIndices.has(i) && !revealedIndices.has(i)
        )
        const isLastUnsolved = unsolvedOthers.length === 0

        const confirmMsg = isLastUnsolved
            ? "Ar tikrai norite pamatyti sprendimą?"
            : "Ar tikrai? Jei parodysite sprendimą, negalėsite pateikti atsakymo šiai užduočiai ir turėsite spręsti kitą."
        if (!confirm(confirmMsg)) {
            return
        }

        const newRevealed = new Set(revealedIndices).add(currentIndex)
        setRevealedIndices(newRevealed)

        // If this is the last unsolved question, treat reveal as completing the exercise
        if (isLastUnsolved) {
            const newCompleted = new Set(completedIndices).add(currentIndex)
            completedIndicesRef.current = newCompleted
            setCompletedIndices(newCompleted)
            await persistRevealState(currentIndex, newRevealed, newCompleted, true)
            toast.info("Sprendimas parodytas.")
        } else {
            await persistRevealState(currentIndex, newRevealed)
            toast.info("Sprendimas parodytas. Prašome spręsti kitą variaciją.")
        }
    }

    const handleAnswerCheck = async (questionId: string, answer: string, isCorrect: boolean, questionIndex: number) => {
        const newAnswers = { ...submittedAnswersRef.current, [questionId]: answer }
        const newCompleted = new Set(completedIndicesRef.current)
        if (isCorrect) {
            newCompleted.add(questionIndex)
        }

        submittedAnswersRef.current = newAnswers
        completedIndicesRef.current = newCompleted
        setSubmittedAnswers(newAnswers)
        if (isCorrect) {
            setCompletedIndices(newCompleted)
        }

        const queuedSave = answerSaveQueueRef.current.then(async () => {
            const saveResult = await upsertAssignmentProgress(
                assignment.id,
                Array.from(newCompleted),
                newCompleted.size >= (isVariationMode ? requiredVariations : totalQuestions),
                currentIndex,
                Array.from(revealedIndices),
                newAnswers,
                {
                    questionId,
                    questionIndex,
                    submittedAnswer: answer,
                    isCorrect
                }
            )
            if (saveResult.success && onProgressUpdate) onProgressUpdate()
        })

        answerSaveQueueRef.current = queuedSave.then(() => undefined, () => undefined)
        await queuedSave
    }

    // Points mode submission handler - one try per question
    const handlePointsSubmit = async (questionId: string, questionPoints: number, answer: string, isCorrect: boolean, questionIndex: number) => {
        // Lock this specific question
        setLockedQuestionIds(prev => new Set(prev).add(questionId))
        setIsSavingPoints(true)

        try {
            const result = await submitPointsAnswer(
                assignment.id,
                questionId,
                answer,
                isCorrect,
                questionPoints,
                totalQuestions,
                isVariationMode ? requiredVariations : undefined,
                questionIndex
            )

            if (result.success) {
                if (onProgressUpdate) onProgressUpdate()
                toast.success("Atsakymas pateiktas!")
                setSubmittedAnswers(prev => ({ ...prev, [questionId]: answer }))
                setPointsCorrectnessByQuestionId(prev => ({ ...prev, [questionId]: isCorrect }))
            } else if (result.alreadySubmitted) {
                toast.error("Šio varianto atsakymas jau buvo pateiktas")
            } else {
                setLockedQuestionIds(prev => {
                    const next = new Set(prev)
                    next.delete(questionId)
                    return next
                })
                toast.error(result.error || "Nepavyko pateikti atsakymo")
            }
        } finally {
            setIsSavingPoints(false)
        }
    }

    // In points mode, a locked question (submitted answer) counts as "completed" for navigation
    const isCurrentQuestionLocked = !!(pointsEnabled && questions[currentIndex]?.id && lockedQuestionIds.has(questions[currentIndex].id))
    const canProceed = canSkip || completedIndices.has(currentIndex) || revealedIndices.has(currentIndex) || isCurrentQuestionLocked
    // For variations, use lockedQuestionIds in points mode, completedIndices otherwise
    const effectiveCompletedCount = pointsEnabled ? lockedQuestionIds.size : completedIndices.size
    const isLastQuestion = isVariationMode
        ? effectiveCompletedCount >= requiredVariations - 1 // Logic: if we are at size == target-1, solving this makes it last
        : currentIndex === totalQuestions - 1

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex((prev: number) => prev + 1)
        }
    }

    // Progress calculation
    const progress = isVariationMode
        ? (effectiveCompletedCount / requiredVariations) * 100
        : (effectiveCompletedCount / totalQuestions) * 100
    const getPointsQuestionStatus = (questionId?: string): 'correct' | 'incorrect' | 'unsubmitted' => {
        if (!pointsEnabled || !questionId || !lockedQuestionIds.has(questionId)) {
            return 'unsubmitted'
        }
        if (!(questionId in pointsCorrectnessByQuestionId)) {
            return 'unsubmitted'
        }
        return pointsCorrectnessByQuestionId[questionId] ? 'correct' : 'incorrect'
    }
    const currentPointsStatus = getPointsQuestionStatus(questions[currentIndex]?.id)
    const simulationUrl = assignment.simulation_url ?? ''
    const normalizedSimulationUrl = simulationUrl
        ? simulationUrl.split('?')[0]
        : ''
    const simulationRequiresLocalCompletion = normalizedSimulationUrl === NINTH_GRADE_TESTS_SIMULATION_PATH
    const simulationCompletionKey = simulationRequiresLocalCompletion && assignment.id
        ? getSimulationCompletionKey(NINTH_GRADE_TESTS_SIMULATION_ID, assignment.id)
        : null
    const [localSimulationCompleted, setLocalSimulationCompleted] = useState(initialIsCompleted)
    const simulationCanFinish = !simulationRequiresLocalCompletion || initialIsCompleted || localSimulationCompleted

    useEffect(() => {
        if (!simulationRequiresLocalCompletion || !simulationCompletionKey) {
            setLocalSimulationCompleted(initialIsCompleted)
            return
        }

        const readCompletionMarker = () => {
            try {
                setLocalSimulationCompleted(initialIsCompleted || window.localStorage.getItem(simulationCompletionKey) === 'completed')
            } catch {
                setLocalSimulationCompleted(initialIsCompleted)
            }
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key === simulationCompletionKey && event.newValue === 'completed') {
                setLocalSimulationCompleted(true)
            }
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return

            const data = event.data as {
                type?: unknown
                simulationId?: unknown
                assignmentId?: unknown
            }

            if (
                data.type === 'simulation-completed' &&
                data.simulationId === NINTH_GRADE_TESTS_SIMULATION_ID &&
                data.assignmentId === assignment.id
            ) {
                setLocalSimulationCompleted(true)
            }
        }

        readCompletionMarker()
        window.addEventListener('storage', handleStorage)
        window.addEventListener('message', handleMessage)
        window.addEventListener('focus', readCompletionMarker)

        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('message', handleMessage)
            window.removeEventListener('focus', readCompletionMarker)
        }
    }, [assignment.id, initialIsCompleted, simulationCompletionKey, simulationRequiresLocalCompletion])

    const getSimulationLaunchUrl = () => {
        if (!simulationRequiresLocalCompletion || !assignment.id || !simulationUrl) {
            return simulationUrl
        }

        const separator = simulationUrl.includes('?') ? '&' : '?'
        return `${simulationUrl}${separator}assignmentId=${encodeURIComponent(assignment.id)}`
    }

    // Simulation exercise — render a simple card with "Open Simulation" button
    if (simulationUrl) {
        return (
            <div className="space-y-8 max-w-3xl mx-auto">
                {!compact && (
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                            <Link href={`/student/class/${classId}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Grįžti į klasę
                            </Link>
                        </Button>
                    </div>
                )}

                <Card className="border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-blue-500/10 rounded-full">
                                <Monitor className="w-10 h-10 text-blue-500" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">{assignment.title}</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Atidarykite simuliaciją ir atlikite užduotį
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4 pt-4 pb-8">
                        <Button
                            size="lg"
                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-8"
                            onClick={() => window.open(getSimulationLaunchUrl(), '_blank')}
                        >
                            <ExternalLink className="h-5 w-5" />
                            Atidaryti simuliaciją
                        </Button>

                        {simulationRequiresLocalCompletion && (
                            <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${simulationCanFinish ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                                {simulationCanFinish ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                    <Lock className="h-4 w-4" />
                                )}
                                {simulationCanFinish ? 'Testas įveiktas' : 'Testas dar nebaigtas'}
                            </div>
                        )}

                        <div className={`mt-4 flex ${onPrevious ? 'justify-between w-full' : 'justify-center'}`}>
                            {onPrevious && (
                                <Button variant="outline" className="gap-2" onClick={onPrevious}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Atgal
                                </Button>
                            )}
                            <Button
                                disabled={isFinishing || !simulationCanFinish}
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                onClick={async () => {
                                    if (isFinishing || !simulationCanFinish) return
                                    setIsFinishing(true)
                                    try {
                                        await upsertAssignmentProgress(
                                            assignment.id,
                                            [],
                                            true,
                                            0,
                                            [],
                                            {}
                                        )
                                        if (onFinish) {
                                            onFinish()
                                        } else {
                                            router.push(`/student/class/${classId}`)
                                        }
                                    } catch (error) {
                                        console.error("Failed to finish simulation exercise:", error)
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
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Theory exercise — render the theory content with optional image
    if (assignment.theory_content) {
        return (
            <div className="space-y-8 max-w-3xl mx-auto">
                {!compact && (
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                            <Link href={`/student/class/${classId}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Grįžti į klasę
                            </Link>
                        </Button>
                    </div>
                )}

                <Card className="border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-indigo-50/30">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/10 rounded-full">
                                <FileText className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                {exerciseNumber !== undefined && (
                                    <p className="text-xs text-muted-foreground font-medium">Užduotis {exerciseNumber}</p>
                                )}
                                <CardTitle className="text-2xl">{assignment.title}</CardTitle>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-8">
                        {/* Theory Image */}
                        {assignment.theory_image_url && (
                            <div className="rounded-lg overflow-hidden border bg-white flex items-center justify-center p-4">
                                <img
                                    src={assignment.theory_image_url}
                                    alt="Theory illustration"
                                    className="max-w-full max-h-[400px] object-contain"
                                />
                            </div>
                        )}

                        {/* Theory Content */}
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

                        <div className={`mt-6 flex ${onPrevious ? 'justify-between w-full' : 'justify-center'}`}>
                            {onPrevious && (
                                <Button variant="outline" className="gap-2" onClick={onPrevious}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Atgal
                                </Button>
                            )}
                            <Button
                                disabled={isFinishing}
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                onClick={async () => {
                                    if (isFinishing) return
                                    setIsFinishing(true)
                                    try {
                                        await upsertAssignmentProgress(
                                            assignment.id,
                                            [],
                                            true,
                                            0,
                                            [],
                                            {}
                                        )
                                        if (onFinish) {
                                            onFinish()
                                        } else {
                                            router.push(`/student/class/${classId}`)
                                        }
                                    } catch (error) {
                                        console.error("Failed to finish theory exercise:", error)
                                        setIsFinishing(false)
                                    }
                                }}
                            >
                                {isFinishing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        {onFinish ? (isLastExercise ? "Baigti" : "Kita užduotis") : "Perskaičiau"}
                                        <CheckCircle2 className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

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
                <div className="mb-8">
                    <DiagramDisplay
                        diagramType={normalizeDiagramType(firstQuestion?.diagram_type)}
                        diagramLatex={firstQuestion.diagram_latex}
                        diagramSvg={firstQuestion.diagram_svg ?? null}
                        diagramImageUrl={firstQuestion.diagram_image_url}
                    />
                </div>
            )}

            {showAll ? (
                /* One Page View */
                <div className="space-y-8">
                    {questions.map((q, index: number) => {
                        const isCorrect = completedIndices.has(index)
                        const pointsStatus = getPointsQuestionStatus(q.id)
                        const cardStateClasses = pointsEnabled
                            ? (hideCorrectness
                                ? (pointsStatus === 'unsubmitted' ? 'border-amber-500/30' : 'border-zinc-300')
                                : (pointsStatus === 'correct'
                                    ? 'border-green-500/40 bg-green-50/10'
                                    : pointsStatus === 'incorrect'
                                        ? 'border-red-500/40 bg-red-50/10'
                                        : 'border-amber-500/30'))
                            : (isCorrect ? 'border-green-500/40 bg-green-50/10' : '')
                        return (
                            <Card key={index} className={`transition-all ${cardStateClasses}`}>
                                <CardContent className="px-6 pt-4 pb-6">
                                    <div className="space-y-6">
                                        <div className="text-lg leading-relaxed">
                                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold mr-2 align-middle ${pointsEnabled ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-muted text-muted-foreground'}`}>
                                                {exerciseNumber ? (questions.length > 1 ? `${exerciseNumber}.${index + 1}` : exerciseNumber) : index + 1}
                                            </span>
                                            <MathDisplay content={q.latex_text || "No question text"} />
                                        </div>
                                        <DiagramDisplay
                                            diagramType={normalizeDiagramType(q.diagram_type)}
                                            diagramLatex={q.diagram_latex}
                                            diagramSvg={q.diagram_svg ?? null}
                                            diagramImageUrl={q.diagram_image_url}
                                        />

                                        {revealedIndices.has(index) && q.solution_text && (
                                            <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                                                    <BookOpen className="h-4 w-4" />
                                                    Išsamus sprendimas
                                                </div>
                                                <div className="text-zinc-800 text-sm leading-relaxed border-t border-blue-100 pt-3">
                                                    <MathDisplay content={q.solution_text} />
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
                                                        // Check if this is the last unsolved question
                                                        const unsolvedOthers = questions.filter((_, i: number) =>
                                                            i !== index && !completedIndices.has(i) && !revealedIndices.has(i)
                                                        )
                                                        if (unsolvedOthers.length === 0) {
                                                            // Last unsolved question - treat reveal as completion
                                                            const newCompleted = new Set(completedIndices).add(index)
                                                            completedIndicesRef.current = newCompleted
                                                            setCompletedIndices(newCompleted)
                                                            await persistRevealState(index, newRevealed, newCompleted, true)
                                                        } else {
                                                            await persistRevealState(index, newRevealed)
                                                        }
                                                    }}
                                                >
                                                    <HelpCircle className="h-3 w-3" />
                                                    Rodyti sprendimą
                                                </Button>
                                            </div>
                                        )}

                                        <div className={`pt-2 ${revealedIndices.has(index) ? "pointer-events-none" : ""}`}>
                                            <TestInterface
                                                key={q.id || index}
                                                question={q}
                                                showVirtualKeyboardToggle={showVirtualKeyboardToggle}
                                                questionId={q.id}
                                                questionPoints={q.points || 1}
                                                pointsMode={pointsEnabled}
                                                disabled={lockedQuestionIds.has(q.id)}
                                                submittedAnswer={submittedAnswers[q.id]}
                                                submittedIsCorrect={pointsEnabled && !hideCorrectness ? pointsCorrectnessByQuestionId[q.id] : undefined}
                                                onPointsSubmit={(questionId, questionPoints, answer, pointsIsCorrect) =>
                                                    handlePointsSubmit(questionId, questionPoints, answer, pointsIsCorrect, index)
                                                }
                                                onCheck={(ans, isCorrect) => handleAnswerCheck(q.id, ans, isCorrect, index)}
                                                isRevealed={revealedIndices.has(index)}
                                            />
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
                                Atgal
                            </Button>
                        )}
                        <Button
                            disabled={isFinishing || isSavingPoints || (!canSkip && !pointsEnabled && completedIndices.size !== totalQuestions)}
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
                                                    totalQuestions,
                                                    isVariationMode ? requiredVariations : undefined
                                                )
                                            }
                                        }
                                    }

                                    // Save completion status
                                    await upsertAssignmentProgress(
                                        assignment.id,
                                        Array.from(completedIndices),
                                        true,
                                        currentIndex,
                                        Array.from(revealedIndices),
                                        submittedAnswers
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
                <Card className={`transition-all ${pointsEnabled
                    ? (hideCorrectness
                        ? (currentPointsStatus === 'unsubmitted' ? 'border-amber-500/30' : 'border-zinc-300')
                        : (currentPointsStatus === 'correct'
                            ? 'border-green-500/40 bg-green-50/10'
                            : currentPointsStatus === 'incorrect'
                                ? 'border-red-500/40 bg-red-50/10'
                                : 'border-amber-500/30'))
                    : (canProceed ? 'border-green-500/40 bg-green-50/10' : '')}`}>
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                {exerciseNumber && (
                                    <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold ${pointsEnabled ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-muted text-muted-foreground'}`}>
                                        {exerciseNumber}
                                    </span>
                                )}
                                {!isVariationMode && (
                                    <CardTitle className="text-xl">
                                        {`Klausimas ${currentIndex + 1}`}
                                    </CardTitle>
                                )}
                                {pointsEnabled && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                                        <Award className="h-3 w-3" />
                                        Taškai
                                    </span>
                                )}
                            </div>
                            <CardDescription>
                                {isVariationMode
                                    ? (!pointsEnabled && `Atlikite ${requiredVariations} užduotis, kad pereitumėte į kitą lygį. (${completedIndices.size} išspręsta)`)
                                    : (totalQuestions > 1 ? `Žingsnis ${currentIndex + 1} iš ${totalQuestions}` : 'Išspręskite žemiau esančią problemą')
                                }
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-lg leading-relaxed">
                            <MathDisplay content={questions[currentIndex].latex_text || "No question text"} />
                        </div>
                        {!showPersistentDiagram && (
                            <DiagramDisplay
                                diagramType={normalizeDiagramType(questions[currentIndex].diagram_type ?? (!isVariationMode ? firstQuestion?.diagram_type : null))}
                                diagramLatex={questions[currentIndex].diagram_latex || (!isVariationMode ? firstQuestion?.diagram_latex : undefined)}
                                diagramSvg={questions[currentIndex].diagram_svg ?? (!isVariationMode ? firstQuestion?.diagram_svg ?? null : null)}
                                diagramImageUrl={questions[currentIndex].diagram_image_url || (!isVariationMode ? firstQuestion?.diagram_image_url : undefined)}
                            />
                        )}

                        <div className="pt-6 border-t space-y-6">
                            {revealedIndices.has(currentIndex) && questions[currentIndex].solution_text && (
                                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                        <BookOpen className="h-5 w-5" />
                                        Išsamus sprendimas
                                    </div>
                                    <div className="text-zinc-800 leading-relaxed border-t border-blue-100 pt-3">
                                        <MathDisplay content={questions[currentIndex].solution_text} />
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

                            <div className={revealedIndices.has(currentIndex) ? "pointer-events-none" : ""}>
                                <TestInterface
                                    key={questions[currentIndex].id || currentIndex}
                                    question={questions[currentIndex]}
                                    showVirtualKeyboardToggle={showVirtualKeyboardToggle}
                                    questionId={questions[currentIndex].id}
                                    questionPoints={questions[currentIndex].points || 1}
                                    pointsMode={pointsEnabled}
                                    disabled={lockedQuestionIds.has(questions[currentIndex].id)}
                                    submittedAnswer={submittedAnswers[questions[currentIndex].id]}
                                    submittedIsCorrect={pointsEnabled && !hideCorrectness ? pointsCorrectnessByQuestionId[questions[currentIndex].id] : undefined}
                                    onPointsSubmit={(questionId, questionPoints, answer, pointsIsCorrect) =>
                                        handlePointsSubmit(questionId, questionPoints, answer, pointsIsCorrect, currentIndex)
                                    }
                                    onCheck={(ans, isCorrect) => handleAnswerCheck(questions[currentIndex].id, ans, isCorrect, currentIndex)}
                                    isRevealed={revealedIndices.has(currentIndex)}
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
                                        <span className="text-xs text-amber-600/80">Turite vieną bandymą.</span>
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
                                        Atgal
                                    </Button>
                                )}
                                {!isLastQuestion || (isVariationMode && effectiveCompletedCount < requiredVariations) ? (
                                    <Button
                                        onClick={() => {
                                            if (isVariationMode) {
                                                // Pick next random unsolved (not solved/locked and not revealed)
                                                const unsolved = questions.map((_, i: number) => i).filter((i: number) => {
                                                    const qId = questions[i]?.id
                                                    const isCompleted = completedIndices.has(i)
                                                    const isLocked = pointsEnabled && qId && lockedQuestionIds.has(qId)
                                                    const isRevealed = revealedIndices.has(i)
                                                    return !isCompleted && !isLocked && !isRevealed
                                                });
                                                if (unsolved.length > 0) {
                                                    const randIndex = unsolved[Math.floor(Math.random() * unsolved.length)];
                                                    setCurrentIndex(randIndex);
                                                } else if (effectiveCompletedCount >= requiredVariations && onFinish) {
                                                    // No more unsolved but we've met the requirement - finish
                                                    onFinish()
                                                }
                                            } else {
                                                handleNext();
                                            }
                                        }}

                                        disabled={!canProceed || isSavingPoints || (pointsEnabled && isVariationMode && !isCurrentQuestionLocked)}
                                        className="gap-2"
                                    >
                                        {isVariationMode ? "Kita užduotis" : "Kitas klausimas"}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        disabled={isFinishing || isSavingPoints || (!canProceed && !pointsEnabled)}
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
                                                                totalQuestions,
                                                                isVariationMode ? requiredVariations : undefined
                                                            )
                                                        }
                                                    }
                                                }

                                                // Save completion status
                                                await upsertAssignmentProgress(
                                                    assignment.id,
                                                    Array.from(completedIndices),
                                                    true,
                                                    currentIndex,
                                                    Array.from(revealedIndices),
                                                    submittedAnswers
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
