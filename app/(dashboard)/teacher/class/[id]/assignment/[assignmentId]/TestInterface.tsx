"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import MathDisplay from "@/components/MathDisplay"
import MathInput from "@/components/MathInput"
import * as math from "mathjs"

export function TestInterface({
    question,
    questionId,
    questionPoints = 1,
    onCorrect,
    // Points mode props
    pointsMode = false,
    disabled = false,
    submittedAnswer,
    onPointsSubmit
}: {
    question: any,
    questionId?: string,
    questionPoints?: number,
    onCorrect?: () => void,
    // Points mode props
    pointsMode?: boolean,
    disabled?: boolean,
    submittedAnswer?: string,
    onPointsSubmit?: (questionId: string, questionPoints: number, answer: string, isCorrect: boolean) => void
}) {
    const [latexInput, setLatexInput] = useState("")
    const [asciiInput, setAsciiInput] = useState("")
    const [mcqInput, setMcqInput] = useState<string | null>(null)
    const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
    const [feedback, setFeedback] = useState("")

    const checkAnswer = () => {
        if (question.question_type === 'numerical') {
            let val: number;
            try {
                // Use mathjs to evaluate the expression (e.g., "1/2" -> 0.5, "2^3" -> 8)
                // Accept both comma and dot as decimal separators
                const evaluated = math.evaluate((asciiInput || latexInput).replace(/,/g, '.'));
                val = typeof evaluated === 'number' ? evaluated : parseFloat(evaluated?.toString());

                if (isNaN(val)) {
                    setFeedback("Prašome įvesti tinkamą matematinę išraišką")
                    return
                }
            } catch (e) {
                setFeedback("Prašome įvesti tinkamą matematinę išraišką")
                return
            }

            const correct = question.correct_value
            const tolerance = question.tolerance_percent || 0
            const margin = Math.abs(correct * (tolerance / 100))

            const isCorrect = Math.abs(val - correct) <= margin

            // Points mode: don't show feedback, just submit
            if (pointsMode && questionId) {
                onPointsSubmit?.(questionId, questionPoints, String(val), isCorrect)
                return
            }

            // Normal mode: show feedback
            if (isCorrect) {
                setResult('correct')
                setFeedback(`Teisingai! ${val} atitinka tikslą (paklaida ${tolerance}%).`)
                onCorrect?.()
            } else {
                setResult('incorrect')
                setFeedback(`Neteisingai. Jūsų rezultatas buvo ${val}, bet jis yra už leistino diapazono ribų.`)
            }
        } else {
            // MCQ
            if (!mcqInput) {
                setFeedback("Prašome pasirinkti variantą")
                return
            }

            const isCorrect = mcqInput === question.correct_answer?.trim().toUpperCase()

            // Points mode: don't show feedback, just submit
            if (pointsMode && questionId) {
                onPointsSubmit?.(questionId, questionPoints, mcqInput, isCorrect)
                return
            }

            // Normal mode: show feedback
            if (isCorrect) {
                setResult('correct')
                setFeedback("Pasirinktas teisingas variantas!")
                onCorrect?.()
            } else {
                setResult('incorrect')
                setFeedback(`Neteisingai. Bandykite kitą variantą.`)
            }
        }
    }

    if (disabled) {
        const isNumerical = question.question_type === 'numerical'
        const mcqOption = !isNumerical && submittedAnswer ? question.options?.[['A', 'B', 'C', 'D'].indexOf(submittedAnswer)] : null

        return (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700 shadow-sm animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 mb-3">
                    <div className="bg-zinc-200/50 dark:bg-zinc-700 p-1 rounded-full">
                        <Check className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <span className="font-bold text-sm">Atsakymas pateiktas</span>
                </div>

                <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <div className="text-foreground">
                        {isNumerical ? (
                            <div className="text-lg font-semibold">
                                <MathDisplay content={submittedAnswer || "—"} />
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 flex-none flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-sm">
                                    {submittedAnswer || "?"}
                                </div>
                                <div className="pt-0.5 text-sm leading-relaxed">
                                    {mcqOption ? <MathDisplay content={mcqOption} /> : "Pasirinktas variantas"}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {question.question_type === 'numerical' ? (
                <div className="space-y-4">
                    <div className="flex w-full items-center gap-2">
                        <div className="flex-1">
                            <MathInput
                                value={latexInput}
                                onChange={(latex, ascii) => {
                                    setLatexInput(latex)
                                    setAsciiInput(ascii || "")
                                }}
                                onKeyDown={(e: any) => {
                                    if (e.key === 'Enter') {
                                        // Reset results only when checking
                                        setResult(null)
                                        setFeedback("")

                                        e.preventDefault()
                                        e.stopPropagation()
                                        checkAnswer()
                                    } else {
                                        // Clear feedback when typing something else
                                        setResult(null)
                                        setFeedback("")
                                    }
                                }}
                            />
                        </div>
                        <Button type="button" onClick={checkAnswer}>{pointsMode ? 'Pateikti' : 'Tikrinti'}</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="grid gap-2">
                        {question.options?.map((opt: string, i: number) => {
                            const letter = ['A', 'B', 'C', 'D'][i]
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer hover:bg-muted transition-colors ${mcqInput === letter ? 'ring-2 ring-primary border-transparent' : ''}`}
                                    onClick={() => {
                                        setMcqInput(letter)
                                        setResult(null)
                                        setFeedback("")
                                    }}
                                >
                                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${mcqInput === letter ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'}`}>
                                        {letter}
                                    </div>
                                    <div className="flex-1">
                                        <MathDisplay content={opt} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <Button className="mt-1" onClick={checkAnswer} disabled={!mcqInput}>
                        {pointsMode ? 'Pateikti' : 'Tikrinti atsakymą'}
                    </Button>
                </div>
            )}

            {feedback && (
                <div className={`p-4 rounded-lg flex items-start gap-3 ${result === 'correct' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {result === 'correct' ? (
                        <Check className="h-5 w-5 mt-0.5" />
                    ) : (
                        <X className="h-5 w-5 mt-0.5" />
                    )}
                    <div>
                        <p className="font-medium">{result === 'correct' ? "Teisingai!" : "Neteisingai"}</p>
                        <p className="text-sm opacity-90">{feedback}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
