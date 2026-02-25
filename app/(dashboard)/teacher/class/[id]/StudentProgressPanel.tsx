"use client"

import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, Pencil } from "lucide-react"
import {
    getStudentClassroomProgress,
    getStudentAssignmentSubmissionForTeacher,
    submitTeacherManualPointsAnswer
} from "../../actions"
import { CircularGradeDisplay } from "@/components/student/CircularGradeDisplay"
import MathDisplay from "@/components/MathDisplay"
import { DiagramDisplay } from "@/components/DiagramDisplay"
import { TestInterface } from "./assignment/[assignmentId]/TestInterface"
import { toast } from "sonner"

interface StudentProgressPanelProps {
    classroomId: string
    student: { id: string, name: string }
}

type ExerciseStatus = 'correct' | 'incorrect' | 'unsubmitted'

interface ExerciseSelection {
    collectionId: string
    assignmentId: string
    assignmentNumber: number
    collectionTitle: string
    status: ExerciseStatus
}

interface ExerciseReviewData {
    assignment: {
        id: string
        title: string
        points_enabled: boolean
        required_variations_count: number | null
        questions: ExerciseQuestion[]
    }
    submittedAnswers: Record<string, string>
    earnedPoints: number
    isCompleted: boolean
}

interface ExerciseQuestion {
    id: string
    question_type: 'numerical' | 'multiple_choice'
    latex_text: string | null
    options: string[] | null
    correct_value: number | null
    tolerance_percent: number | null
    correct_answer: string | null
    diagram_type: 'graph' | 'scheme' | null
    diagram_svg: string | null
    diagram_image_url: string | null
    points: number | null
}

interface ManualSubmissionUpdate {
    submittedAnswers: Record<string, string>
    earnedPoints: number
    isCompleted: boolean
}

interface AssignmentStatus {
    id: string
    status: ExerciseStatus
    points: number
    earned: number
    pointsEnabled: boolean
}

interface ProgressCollection {
    id: string
    title: string
    category?: 'homework' | 'classwork' | null
    progress: number
    completedAssignments: number
    totalAssignments: number
    assignmentStatuses?: AssignmentStatus[]
}

interface StudentProgressResponse {
    collections: ProgressCollection[]
    totalPoints: number
    earnedPoints: number
}

export function StudentProgressPanel({ classroomId, student }: StudentProgressPanelProps) {
    const [collections, setCollections] = useState<ProgressCollection[]>([])
    const [stats, setStats] = useState<{ totalPoints: number, earnedPoints: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedExercise, setSelectedExercise] = useState<ExerciseSelection | null>(null)
    const [selectedExerciseData, setSelectedExerciseData] = useState<ExerciseReviewData | null>(null)
    const [selectedExerciseLoading, setSelectedExerciseLoading] = useState(false)
    const [selectedExerciseError, setSelectedExerciseError] = useState<string | null>(null)
    const exerciseRequestIdRef = useRef(0)

    useEffect(() => {
        exerciseRequestIdRef.current += 1
        setSelectedExercise(null)
        setSelectedExerciseData(null)
        setSelectedExerciseError(null)
    }, [student.id])

    const fetchProgress = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getStudentClassroomProgress(classroomId, student.id)
            if (data && typeof data === 'object' && 'collections' in data) {
                const typedData = data as StudentProgressResponse
                setCollections(typedData.collections || [])
                setStats({
                    totalPoints: typedData.totalPoints || 0,
                    earnedPoints: typedData.earnedPoints || 0
                })
            } else {
                setCollections([])
                setStats(null)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [classroomId, student.id])

    useEffect(() => {
        void fetchProgress()
    }, [fetchProgress])

    const handleExerciseSelect = async (selection: ExerciseSelection) => {
        if (selection.status === 'unsubmitted') return

        const requestId = ++exerciseRequestIdRef.current
        setSelectedExercise(selection)
        setSelectedExerciseData(null)
        setSelectedExerciseError(null)
        setSelectedExerciseLoading(true)

        try {
            const data = await getStudentAssignmentSubmissionForTeacher(
                classroomId,
                student.id,
                selection.assignmentId
            )

            if (!data) {
                if (exerciseRequestIdRef.current !== requestId) return
                setSelectedExerciseError("Failed to load exercise details.")
                return
            }

            if (exerciseRequestIdRef.current !== requestId) return
            setSelectedExerciseData(data as ExerciseReviewData)
        } catch (error) {
            if (exerciseRequestIdRef.current !== requestId) return
            console.error(error)
            setSelectedExerciseError("Failed to load exercise details.")
        } finally {
            if (exerciseRequestIdRef.current !== requestId) return
            setSelectedExerciseLoading(false)
        }
    }

    const handleManualSubmissionApplied = useCallback((update: ManualSubmissionUpdate) => {
        setSelectedExerciseData((prev) => {
            if (!prev) return prev
            return {
                ...prev,
                submittedAnswers: update.submittedAnswers,
                earnedPoints: update.earnedPoints,
                isCompleted: update.isCompleted
            }
        })
        void fetchProgress()
    }, [fetchProgress])

    const homeworkCollections = collections.filter(c => c.category === 'homework' || !c.category)
    const classworkCollections = collections.filter(c => c.category === 'classwork')

    return (
        <div className="space-y-6">
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    {stats && stats.totalPoints > 0 && (
                        <div className="flex justify-center border-b border-border/40 pb-6 mb-6">
                            <CircularGradeDisplay
                                earnedPoints={stats.earnedPoints}
                                maxPoints={stats.totalPoints}
                                size={140}
                            />
                        </div>
                    )}

                    {/* Classwork */}
                    {classworkCollections.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                Classwork
                            </h3>
                            <div className="space-y-3">
                                {classworkCollections.map(collection => (
                                    <CollectionProgressRow
                                        key={collection.id}
                                        classroomId={classroomId}
                                        studentId={student.id}
                                        collection={collection}
                                        selectedAssignmentId={selectedExercise?.assignmentId || null}
                                        selectedExercise={selectedExercise?.collectionId === collection.id ? selectedExercise : null}
                                        selectedExerciseData={selectedExercise?.collectionId === collection.id ? selectedExerciseData : null}
                                        selectedExerciseLoading={selectedExercise?.collectionId === collection.id ? selectedExerciseLoading : false}
                                        selectedExerciseError={selectedExercise?.collectionId === collection.id ? selectedExerciseError : null}
                                        onSelectExercise={handleExerciseSelect}
                                        onManualSubmissionApplied={handleManualSubmissionApplied}
                                        onCloseReview={() => {
                                            exerciseRequestIdRef.current += 1
                                            setSelectedExercise(null)
                                            setSelectedExerciseData(null)
                                            setSelectedExerciseError(null)
                                            setSelectedExerciseLoading(false)
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Homework */}
                    {homeworkCollections.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                Homework
                            </h3>
                            <div className="space-y-3">
                                {homeworkCollections.map(collection => (
                                    <CollectionProgressRow
                                        key={collection.id}
                                        classroomId={classroomId}
                                        studentId={student.id}
                                        collection={collection}
                                        selectedAssignmentId={selectedExercise?.assignmentId || null}
                                        selectedExercise={selectedExercise?.collectionId === collection.id ? selectedExercise : null}
                                        selectedExerciseData={selectedExercise?.collectionId === collection.id ? selectedExerciseData : null}
                                        selectedExerciseLoading={selectedExercise?.collectionId === collection.id ? selectedExerciseLoading : false}
                                        selectedExerciseError={selectedExercise?.collectionId === collection.id ? selectedExerciseError : null}
                                        onSelectExercise={handleExerciseSelect}
                                        onManualSubmissionApplied={handleManualSubmissionApplied}
                                        onCloseReview={() => {
                                            exerciseRequestIdRef.current += 1
                                            setSelectedExercise(null)
                                            setSelectedExerciseData(null)
                                            setSelectedExerciseError(null)
                                            setSelectedExerciseLoading(false)
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {collections.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            No collections found in this class.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

function CollectionProgressRow({
    classroomId,
    studentId,
    collection,
    selectedAssignmentId,
    selectedExercise,
    selectedExerciseData,
    selectedExerciseLoading,
    selectedExerciseError,
    onSelectExercise,
    onManualSubmissionApplied,
    onCloseReview
}: {
    classroomId: string
    studentId: string
    collection: ProgressCollection
    selectedAssignmentId: string | null
    selectedExercise: ExerciseSelection | null
    selectedExerciseData: ExerciseReviewData | null
    selectedExerciseLoading: boolean
    selectedExerciseError: string | null
    onSelectExercise: (selection: ExerciseSelection) => void
    onManualSubmissionApplied: (update: ManualSubmissionUpdate) => void
    onCloseReview: () => void
}) {
    const isComplete = collection.progress === 100

    return (
        <div className="rounded-lg border border-border/40 p-4 space-y-4 bg-background/50 backdrop-blur-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-medium text-sm">{collection.title}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                        {collection.completedAssignments} / {collection.totalAssignments} pratimai užbaigti
                    </p>
                </div>
                {isComplete && (
                    <div className="bg-green-500/10 p-1 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {collection.assignmentStatuses?.map((as, idx: number) => {
                    let bgColor = 'bg-muted'
                    let borderColor = 'border-border/40'
                    let textColor = 'text-muted-foreground'
                    const frameColor = as.pointsEnabled ? 'ring-1 ring-amber-300/80 border-amber-400' : ''
                    let style: CSSProperties = {}

                    if (as.status === 'correct') {
                        bgColor = 'bg-green-500 shadow-sm shadow-green-500/20'
                        borderColor = as.pointsEnabled ? 'border-amber-400' : 'border-green-600'
                        textColor = 'text-white'
                    } else if (as.status === 'incorrect') {
                        if (as.earned > 0 && as.points > 0) {
                            const percent = (as.earned / as.points) * 100
                            // Green for earned, Red for missed
                            style = {
                                background: `linear-gradient(90deg, #22c55e ${percent}%, #f43f5e ${percent}%)`
                            }
                            bgColor = 'shadow-sm shadow-orange-500/20'
                            borderColor = as.pointsEnabled ? 'border-amber-400' : 'border-orange-600/50'
                            textColor = 'text-white'
                        } else {
                            bgColor = 'bg-rose-500 shadow-sm shadow-rose-500/20'
                            borderColor = as.pointsEnabled ? 'border-amber-400' : 'border-rose-600'
                            textColor = 'text-white'
                        }
                    }

                    const isClickable = as.status === 'correct' || as.status === 'incorrect'
                    const isSelected = selectedAssignmentId === as.id
                    const baseClasses = `flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold transition-all ${bgColor} ${borderColor} ${frameColor} ${textColor}`
                    const selectedClasses = isSelected ? 'outline outline-2 outline-primary/80 outline-offset-1' : ''
                    const title = `${as.earned} / ${as.points} tasku${isClickable ? ' - Click to review answer' : ''}`

                    if (isClickable) {
                        return (
                            <button
                                key={as.id}
                                type="button"
                                onClick={() => onSelectExercise({
                                    collectionId: collection.id,
                                    assignmentId: as.id,
                                    assignmentNumber: idx + 1,
                                    collectionTitle: collection.title,
                                    status: as.status
                                })}
                                className={`${baseClasses} ${selectedClasses} hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
                                style={style}
                                title={title}
                            >
                                {idx + 1}
                            </button>
                        )
                    }

                    return (
                        <div
                            key={as.id}
                            className={baseClasses}
                            style={style}
                            title={title}
                        >
                            {idx + 1}
                        </div>
                    )
                })}
            </div>

            {selectedExercise && (
                <ExerciseReviewPanel
                    classroomId={classroomId}
                    studentId={studentId}
                    selection={selectedExercise}
                    data={selectedExerciseData}
                    loading={selectedExerciseLoading}
                    error={selectedExerciseError}
                    onManualSubmissionApplied={onManualSubmissionApplied}
                    onClose={onCloseReview}
                />
            )}
        </div>
    )
}

function ExerciseReviewPanel({
    classroomId,
    studentId,
    selection,
    data,
    loading,
    error,
    onManualSubmissionApplied,
    onClose
}: {
    classroomId: string
    studentId: string
    selection: ExerciseSelection
    data: ExerciseReviewData | null
    loading: boolean
    error: string | null
    onManualSubmissionApplied: (update: ManualSubmissionUpdate) => void
    onClose: () => void
}) {
    const [selectedManualQuestionId, setSelectedManualQuestionId] = useState<string | null>(null)
    const [isSubmittingManualAnswer, setIsSubmittingManualAnswer] = useState(false)
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)

    const statusPill = selection.status === 'correct'
        ? { label: 'Correct', className: 'bg-green-100 text-green-700' }
        : { label: 'Incorrect', className: 'bg-rose-100 text-rose-700' }

    const isVariationExercise = !!data && (data.assignment.required_variations_count || 0) > 0
    const variationWithAnswer = isVariationExercise && data
        ? (data.assignment.questions || []).find((question) => {
            const submitted = data.submittedAnswers?.[question.id]
            return typeof submitted === 'string' && submitted.trim().length > 0
        })
        : null

    const questionsToRender = !data
        ? []
        : isVariationExercise
            ? (variationWithAnswer ? [variationWithAnswer] : [])
            : (data.assignment.questions || [])

    const showNoVariationSubmission = !!data && isVariationExercise && questionsToRender.length === 0

    const unansweredQuestions = useMemo(() => {
        if (!data) return []
        return (data.assignment.questions || []).filter((question) => {
            const submitted = data.submittedAnswers?.[question.id]
            return typeof submitted !== 'string' || submitted.trim().length === 0
        })
    }, [data])

    useEffect(() => {
        if (unansweredQuestions.length === 0) {
            setSelectedManualQuestionId(null)
            return
        }

        const isCurrentSelectionAvailable = !!selectedManualQuestionId
            && unansweredQuestions.some((question) => question.id === selectedManualQuestionId)

        if (!isCurrentSelectionAvailable) {
            setSelectedManualQuestionId(unansweredQuestions[0].id)
        }
    }, [selectedManualQuestionId, unansweredQuestions])

    const selectedManualQuestion = useMemo(() => {
        if (unansweredQuestions.length === 0) return null
        return unansweredQuestions.find((question) => question.id === selectedManualQuestionId) || unansweredQuestions[0]
    }, [selectedManualQuestionId, unansweredQuestions])

    const selectedManualVariationNumber = useMemo(() => {
        if (!data || !selectedManualQuestion) return null
        const questionIndex = (data.assignment.questions || []).findIndex((question) => question.id === selectedManualQuestion.id)
        return questionIndex >= 0 ? questionIndex + 1 : null
    }, [data, selectedManualQuestion])

    const showManualSubmissionPanel = !!data
        && data.assignment.points_enabled
        && showNoVariationSubmission
        && !!selectedManualQuestion

    const handleManualPointsSubmit = async (
        questionId: string,
        _questionPoints: number,
        answer: string,
        isCorrect: boolean
    ) => {
        if (!classroomId || !studentId) {
            toast.error("Missing classroom or student context")
            return
        }

        setIsSubmittingManualAnswer(true)
        try {
            const result = await submitTeacherManualPointsAnswer(
                classroomId,
                studentId,
                selection.assignmentId,
                questionId,
                answer,
                isCorrect
            )

            if (!result.success) {
                toast.error(result.error || "Failed to submit manual answer")
                return
            }

            if (
                !result.submittedAnswers
                || typeof result.earnedPoints !== 'number'
                || typeof result.isCompleted !== 'boolean'
            ) {
                toast.error("Manual answer was saved, but response data was incomplete")
                return
            }

            onManualSubmissionApplied({
                submittedAnswers: result.submittedAnswers,
                earnedPoints: result.earnedPoints,
                isCompleted: result.isCompleted
            })

            setEditingQuestionId(null)
            toast.success("Manual answer submitted")
        } catch (submitError) {
            console.error(submitError)
            toast.error("Failed to submit manual answer")
        } finally {
            setIsSubmittingManualAnswer(false)
        }
    }

    return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Exercise Review</p>
                    <h4 className="font-semibold text-sm mt-0.5">
                        {selection.collectionTitle} - Exercise {selection.assignmentNumber}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPill.className}`}>
                            {statusPill.label}
                        </span>
                        {data?.assignment?.title && (
                            <span className="text-xs text-muted-foreground">
                                {data.assignment.title}
                            </span>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    Close review
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading exercise details...
                </div>
            ) : error ? (
                <p className="text-sm text-rose-600">{error}</p>
            ) : !data ? (
                <p className="text-sm text-muted-foreground">No exercise details found.</p>
            ) : (
                <div className="space-y-4">
                    {showNoVariationSubmission && (
                        <p className="text-sm text-muted-foreground">
                            No answer was submitted to this exercise.
                        </p>
                    )}

                    {showManualSubmissionPanel && selectedManualQuestion && (
                        <div className="rounded-md border border-amber-300/60 bg-amber-50/50 p-4 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                                    Teacher Manual Submission
                                </p>
                                {isSubmittingManualAnswer && (
                                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                                )}
                            </div>

                            {isVariationExercise && unansweredQuestions.length > 1 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Choose variation
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {unansweredQuestions.map((question) => {
                                            const variationIndex = (data.assignment.questions || []).findIndex((q) => q.id === question.id)
                                            const variationNumber = variationIndex >= 0 ? variationIndex + 1 : '?'
                                            const isSelected = selectedManualQuestion.id === question.id

                                            return (
                                                <Button
                                                    key={question.id}
                                                    variant={isSelected ? "default" : "outline"}
                                                    size="sm"
                                                    disabled={isSubmittingManualAnswer}
                                                    onClick={() => setSelectedManualQuestionId(question.id)}
                                                >
                                                    Variation {variationNumber}
                                                </Button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-md border border-border/60 bg-background p-4 space-y-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {isVariationExercise
                                        ? `Variation ${selectedManualVariationNumber ?? '?'} (manual review)`
                                        : "Question (manual review)"}
                                </div>
                                <div className="text-sm leading-relaxed">
                                    <MathDisplay content={selectedManualQuestion.latex_text || "No question text"} />
                                </div>
                                <DiagramDisplay
                                    diagramType={selectedManualQuestion.diagram_type}
                                    diagramSvg={selectedManualQuestion.diagram_svg}
                                    diagramImageUrl={selectedManualQuestion.diagram_image_url}
                                />
                                <div className="border-t pt-3 space-y-2">
                                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Submit answer manually
                                    </p>
                                    <TestInterface
                                        question={selectedManualQuestion}
                                        questionId={selectedManualQuestion.id}
                                        questionPoints={selectedManualQuestion.points || 1}
                                        pointsMode={true}
                                        disabled={isSubmittingManualAnswer}
                                        onPointsSubmit={handleManualPointsSubmit}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {questionsToRender.map((question, index: number) => {
                        const hasSubmittedAnswer = Object.prototype.hasOwnProperty.call(data.submittedAnswers || {}, question.id)
                        const submittedAnswer = hasSubmittedAnswer ? String(data.submittedAnswers[question.id] ?? '') : undefined

                        return (
                            <div key={question.id || index} className="rounded-md border border-border/60 bg-background p-4 space-y-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {isVariationExercise ? "Variation answered by student" : `Question ${index + 1}`}
                                </div>
                                <div className="text-sm leading-relaxed">
                                    <MathDisplay content={question.latex_text || "No question text"} />
                                </div>
                                <DiagramDisplay
                                    diagramType={question.diagram_type}
                                    diagramSvg={question.diagram_svg}
                                    diagramImageUrl={question.diagram_image_url}
                                />
                                <div className="border-t pt-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            Student answer
                                        </p>
                                        {hasSubmittedAnswer && data.assignment.points_enabled && editingQuestionId !== question.id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() => setEditingQuestionId(question.id)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                    {editingQuestionId === question.id ? (
                                        <div className="rounded-md border border-amber-300/60 bg-amber-50/50 p-3 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                                                    Edit Answer
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {isSubmittingManualAnswer && (
                                                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        disabled={isSubmittingManualAnswer}
                                                        onClick={() => setEditingQuestionId(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                            <TestInterface
                                                question={question}
                                                questionId={question.id}
                                                questionPoints={question.points || 1}
                                                pointsMode={true}
                                                disabled={isSubmittingManualAnswer}
                                                onPointsSubmit={handleManualPointsSubmit}
                                            />
                                        </div>
                                    ) : hasSubmittedAnswer ? (
                                        <TestInterface
                                            question={question}
                                            disabled={true}
                                            submittedAnswer={submittedAnswer}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No submitted answer for this question.</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {!showNoVariationSubmission && questionsToRender.length === 0 && (
                        <p className="text-sm text-muted-foreground">This exercise has no questions.</p>
                    )}
                </div>
            )}
        </div>
    )
}

