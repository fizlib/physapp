"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, X, AlertCircle } from "lucide-react"

export function TestInterface({ question }: { question: any }) {
    const [numInput, setNumInput] = useState("")
    const [mcqInput, setMcqInput] = useState<string | null>(null)
    const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
    const [feedback, setFeedback] = useState("")

    const checkAnswer = () => {
        if (question.question_type === 'numerical') {
            const val = parseFloat(numInput)
            if (isNaN(val)) {
                setFeedback("Please enter a valid number")
                return
            }

            const correct = question.correct_value
            const tolerance = question.tolerance_percent || 0
            const margin = Math.abs(correct * (tolerance / 100))

            // Check range
            if (Math.abs(val - correct) <= margin) {
                setResult('correct')
                setFeedback(`Correct! ${val} is within ${tolerance}% of the target.`)
            } else {
                setResult('incorrect')
                setFeedback(`Incorrect. Please check your calculations and try again.`)
            }
        } else {
            // MCQ
            if (!mcqInput) {
                setFeedback("Please select an option")
                return
            }

            if (mcqInput === question.correct_answer) {
                setResult('correct')
                setFeedback("Correct option selected!")
            } else {
                setResult('incorrect')
                setFeedback(`Incorrect. Try another option.`)
            }
        }
    }

    return (
        <div className="space-y-6">
            {question.question_type === 'numerical' ? (
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="answer">Your Answer</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            id="answer"
                            placeholder="Enter value..."
                            value={numInput}
                            onChange={(e) => {
                                setNumInput(e.target.value)
                                setResult(null)
                                setFeedback("")
                            }}
                        />
                        <Button onClick={checkAnswer}>Check</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <Label>Select an Option</Label>
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
                                    <span>{opt}</span>
                                </div>
                            )
                        })}
                    </div>
                    <Button className="mt-2" onClick={checkAnswer} disabled={!mcqInput}>
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
