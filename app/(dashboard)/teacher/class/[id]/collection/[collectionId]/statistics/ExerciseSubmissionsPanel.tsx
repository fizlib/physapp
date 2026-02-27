"use client"

import { useState, useEffect } from "react"
import { getExerciseSubmissions } from "../../../../../actions"
import { Loader2, CheckCircle2, XCircle, ChevronDown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExerciseSubmissionsPanelProps {
    classroomId: string
    assignmentId: string
}

interface QuestionInfo {
    id: string
    question_type: 'numerical' | 'multiple_choice'
    latex_text: string | null
    correct_value: number | null
    tolerance_percent: number | null
    correct_answer: string | null
}

interface StudentResult {
    id: string
    firstName: string | null
    lastName: string | null
    submittedAnswers: Record<string, string>
    results: Record<string, boolean>
}

export function ExerciseSubmissionsPanel({ classroomId, assignmentId }: ExerciseSubmissionsPanelProps) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [questions, setQuestions] = useState<QuestionInfo[]>([])
    const [students, setStudents] = useState<StudentResult[]>([])
    const [isVariation, setIsVariation] = useState(false)
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        async function load() {
            setLoading(true)
            setError(null)

            try {
                const result = await getExerciseSubmissions(classroomId, assignmentId)

                if (cancelled) return

                if (!result.success || !result.assignment || !result.students) {
                    setError(result.error || "Failed to load submissions")
                    return
                }

                const qs = result.assignment.questions || []
                const hasVariations = (result.assignment.required_variations_count || 0) > 0 && qs.length > 1
                setQuestions(qs)
                setStudents(result.students)
                setIsVariation(hasVariations)
                setSelectedQuestionId(qs.length > 0 ? qs[0].id : null)
            } catch {
                if (!cancelled) setError("Failed to load submissions")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        void load()
        return () => { cancelled = true }
    }, [classroomId, assignmentId])

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading student submissions...
            </div>
        )
    }

    if (error) {
        return <p className="text-sm text-rose-600 py-2">{error}</p>
    }

    // For non-variation exercises, show all questions combined per student
    // For variation exercises, show one variation at a time
    const displayQuestions = isVariation
        ? questions.filter(q => q.id === selectedQuestionId)
        : questions

    // For variation exercises, filter students who answered the selected variation
    const displayStudents = isVariation && selectedQuestionId
        ? students.filter(s => {
            const answer = s.submittedAnswers[selectedQuestionId]
            return answer !== undefined && answer !== ''
        })
        : students

    // Compute overall correctness for each student on displayed questions
    const getStudentStatus = (student: StudentResult): 'correct' | 'incorrect' | 'partial' => {
        const relevantQuestionIds = displayQuestions.map(q => q.id)
        const answeredIds = relevantQuestionIds.filter(qid => student.results[qid] !== undefined)
        if (answeredIds.length === 0) return 'incorrect'
        const correctCount = answeredIds.filter(qid => student.results[qid] === true).length
        if (correctCount === answeredIds.length) return 'correct'
        if (correctCount > 0) return 'partial'
        return 'incorrect'
    }

    const selectedVariationIndex = selectedQuestionId
        ? questions.findIndex(q => q.id === selectedQuestionId)
        : -1

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Variation Selector */}
            {isVariation && questions.length > 1 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Select Variation
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {questions.map((q, idx) => (
                            <Button
                                key={q.id}
                                variant={selectedQuestionId === q.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedQuestionId(q.id)}
                                className="text-xs"
                            >
                                Variation {idx + 1}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Student List */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider font-medium pb-2 border-b border-border/40">
                    <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Student
                        {isVariation && selectedVariationIndex >= 0 && (
                            <span className="normal-case tracking-normal text-primary font-semibold">
                                &middot; Variation {selectedVariationIndex + 1}
                            </span>
                        )}
                    </span>
                    <span>Result</span>
                </div>

                {displayStudents.length > 0 ? (
                    displayStudents.map((student) => {
                        const status = getStudentStatus(student)
                        const displayAnswer = isVariation && selectedQuestionId
                            ? student.submittedAnswers[selectedQuestionId]
                            : undefined

                        return (
                            <div
                                key={student.id}
                                className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${status === 'correct' ? 'bg-green-500' :
                                        status === 'partial' ? 'bg-amber-500' :
                                            'bg-rose-500'
                                        }`}>
                                        {status === 'correct' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : status === 'partial' ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <XCircle className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {student.firstName} {student.lastName}
                                        </p>
                                        {displayAnswer !== undefined && (
                                            <p className="text-xs text-muted-foreground">
                                                Answer: <span className="font-mono">{displayAnswer || '(empty)'}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isVariation && questions.length > 1 ? (
                                        // Show per-question icons for multi-part exercises
                                        <div className="flex gap-1">
                                            {questions.map((q, idx) => {
                                                const result = student.results[q.id]
                                                if (result === undefined) return (
                                                    <div key={q.id} className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                                                        {idx + 1}
                                                    </div>
                                                )
                                                return (
                                                    <div
                                                        key={q.id}
                                                        className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${result ? 'bg-green-500' : 'bg-rose-500'}`}
                                                    >
                                                        {idx + 1}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${status === 'correct' ? 'bg-green-100 text-green-700' :
                                            status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                            {status === 'correct' ? 'Correct' :
                                                status === 'partial' ? 'Partial' :
                                                    'Incorrect'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                        {isVariation
                            ? "No students answered this variation."
                            : "No students have submitted an answer yet."}
                    </div>
                )}
            </div>

            {/* Summary */}
            {displayStudents.length > 0 && (
                <div className="border-t border-border/40 pt-3 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                        {displayStudents.filter(s => getStudentStatus(s) === 'correct').length} correct
                    </span>
                    {displayStudents.some(s => getStudentStatus(s) === 'partial') && (
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                            {displayStudents.filter(s => getStudentStatus(s) === 'partial').length} partial
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                        {displayStudents.filter(s => getStudentStatus(s) === 'incorrect').length} incorrect
                    </span>
                </div>
            )}
        </div>
    )
}
