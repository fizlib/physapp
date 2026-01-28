"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import MathDisplay from "@/components/MathDisplay"
import MathInput from "@/components/MathInput"
import * as math from "mathjs"

export function TestInterface({ question, onCorrect }: { question: any, onCorrect?: () => void }) {
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
                    setFeedback("Please enter a valid mathematical expression")
                    return
                }
            } catch (e) {
                setFeedback("Please enter a valid mathematical expression")
                return
            }

            const correct = question.correct_value
            const tolerance = question.tolerance_percent || 0
            const margin = Math.abs(correct * (tolerance / 100))

            // Check range
            if (Math.abs(val - correct) <= margin) {
                setResult('correct')
                setFeedback(`Correct! ${val} matches the target (within ${tolerance}%).`)
                onCorrect?.()
            } else {
                setResult('incorrect')
                setFeedback(`Incorrect. Your result was ${val}, but it outside the allowed range.`)
            }
        } else {
            // MCQ
            if (!mcqInput) {
                setFeedback("Please select an option")
                return
            }

            if (mcqInput === question.correct_answer?.trim().toUpperCase()) {
                setResult('correct')
                setFeedback("Correct option selected!")
                onCorrect?.()
            } else {
                setResult('incorrect')
                setFeedback(`Incorrect. Try another option.`)
            }
        }
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
                                placeholder="Write your answer (e.g. 1/2, 2^3)..."
                            />
                        </div>
                        <Button type="button" onClick={checkAnswer}>Check</Button>
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
                        Check Answer
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
                        <p className="font-medium">{result === 'correct' ? "Correct!" : "Incorrect"}</p>
                        <p className="text-sm opacity-90">{feedback}</p>
                    </div>
                </div>
            )}
        </div>
    )
}
