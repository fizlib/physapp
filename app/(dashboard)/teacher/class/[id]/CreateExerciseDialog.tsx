"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, Sparkles, Upload, FileImage, Check, Trash2 } from "lucide-react"
import { generateExerciseFromImage, createAssignmentWithQuestion } from "../../actions"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface QuestionData {
    type: 'numerical' | 'multiple_choice'
    latex_text: string
    correct_value?: number | null
    tolerance?: number | null
    options?: string[] | null
    correct_answer?: string | null
    diagram_type?: 'graph' | 'scheme' | null
    diagram_svg?: string | null
}

interface ExerciseData {
    title: string
    category: 'homework' | 'classwork'
    questions: QuestionData[]
}

const DEFAULT_QUESTION: QuestionData = {
    type: 'numerical',
    latex_text: '',
    correct_value: 0,
    tolerance: 5,
    options: ['', '', '', ''],
    correct_answer: 'A',
    diagram_type: null,
    diagram_svg: null
}

export function CreateExerciseDialog({ classroomId, classroomType }: { classroomId: string, classroomType: string }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'edit'>('upload')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ExerciseData>({
        title: '',
        category: 'homework',
        questions: [{ ...DEFAULT_QUESTION }]
    })
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        const fileInput = document.getElementById('exercise-image') as HTMLInputElement
        const file = fileInput?.files?.[0]
        if (!file) {
            toast.error("Please upload an image first")
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('image', file)
            const result = await generateExerciseFromImage(formData)

            if (result.success && result.data) {
                // Ensure questions is an array
                const questions = Array.isArray(result.data.questions)
                    ? result.data.questions
                    : [{ ...DEFAULT_QUESTION }] // Fallback

                setData(prev => ({
                    ...prev,
                    title: result.data.title || prev.title,
                    questions: questions
                }))
                setStep('edit')
                toast.success("Exercise generated successfully!")
            } else {
                toast.error(result.error || "Failed to generate exercise")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
        const newQuestions = [...data.questions]
        newQuestions[index] = { ...newQuestions[index], [field]: value }

        // Special handling for type switch
        if (field === 'type' && value === 'multiple_choice') {
            if (!newQuestions[index].options || newQuestions[index].options?.length === 0) {
                newQuestions[index].options = ['', '', '', '']
                newQuestions[index].correct_answer = 'A'
            }
        }

        setData({ ...data, questions: newQuestions })
    }

    const updateOption = (qIndex: number, optIndex: number, value: string) => {
        const newQuestions = [...data.questions]
        const newOptions = [...(newQuestions[qIndex].options || [])]
        newOptions[optIndex] = value
        newQuestions[qIndex].options = newOptions
        setData({ ...data, questions: newQuestions })
    }

    const addQuestion = () => {
        setData(prev => ({
            ...prev,
            questions: [...prev.questions, { ...DEFAULT_QUESTION }]
        }))
    }

    const removeQuestion = (index: number) => {
        if (data.questions.length <= 1) {
            toast.error("At least one question is required")
            return
        }
        const newQuestions = data.questions.filter((_, i) => i !== index)
        setData({ ...data, questions: newQuestions })
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await createAssignmentWithQuestion(classroomId, data)
            if (result.success) {
                toast.success("Exercise created successfully!")
                setOpen(false)
                // Reset state
                setStep('upload')
                setImagePreview(null)
                setData({
                    title: '',
                    category: 'homework',
                    questions: [{ ...DEFAULT_QUESTION }]
                })
            } else {
                toast.error(result.error || "Failed to save exercise")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Exercise
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Exercise</DialogTitle>
                </DialogHeader>

                {step === 'upload' ? (
                    <div className="flex flex-col items-center justify-center space-y-6 py-8">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="font-semibold text-lg">Generate with AI</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Upload an image of a physics problem (numerical or multiple choice).
                                Gemini will automatically detect the type and extract the content.
                            </p>
                        </div>

                        <form onSubmit={handleGenerate} className="w-full max-w-sm space-y-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="exercise-image">Problem Image</Label>
                                <Input
                                    id="exercise-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="cursor-pointer"
                                />
                            </div>

                            {imagePreview && (
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                                    <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={!imagePreview || loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Analyzing Image...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Generate Exercise
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Common Settings */}
                        <div className="space-y-4 border-b pb-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData({ ...data, title: e.target.value })}
                                />
                            </div>

                            {classroomType === 'school_class' && (
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="category"
                                                value="classwork"
                                                checked={data.category === 'classwork'}
                                                onChange={() => setData({ ...data, category: 'classwork' })}
                                                className="accent-primary"
                                            />
                                            Classwork
                                        </label>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="category"
                                                value="homework"
                                                checked={data.category === 'homework'}
                                                onChange={() => setData({ ...data, category: 'homework' })}
                                                className="accent-primary"
                                            />
                                            Homework
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Questions List */}
                        <div className="space-y-6">
                            {data.questions.map((q, index) => (
                                <Card key={index} className="relative">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base font-medium">Question {index + 1}</CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive/90"
                                                onClick={() => removeQuestion(index)}
                                                disabled={data.questions.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <div className="relative">
                                                <select
                                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"
                                                    value={q.type}
                                                    onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                                                >
                                                    <option value="numerical">Numerical</option>
                                                    <option value="multiple_choice">Multiple Choice</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Question Text (LaTeX)</Label>
                                            <textarea
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                value={q.latex_text}
                                                onChange={(e) => updateQuestion(index, 'latex_text', e.target.value)}
                                            />
                                        </div>

                                        {q.type === 'numerical' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Correct Value</Label>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        value={q.correct_value || 0}
                                                        onChange={(e) => updateQuestion(index, 'correct_value', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Tolerance (%)</Label>
                                                    <Input
                                                        type="number"
                                                        value={q.tolerance || 0}
                                                        onChange={(e) => updateQuestion(index, 'tolerance', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {q.type === 'multiple_choice' && q.options && (
                                            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                                <Label>Options</Label>
                                                {['A', 'B', 'C', 'D'].map((opt, i) => (
                                                    <div key={opt} className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full border text-xs font-bold ${q.correct_answer === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}>
                                                            {opt}
                                                        </div>
                                                        <Input
                                                            value={q.options?.[i] || ''}
                                                            onChange={(e) => updateOption(index, i, e.target.value)}
                                                            placeholder={`Option ${opt}`}
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant={q.correct_answer === opt ? "default" : "ghost"}
                                                            onClick={() => updateQuestion(index, 'correct_answer', opt)}
                                                            title="Mark as correct"
                                                        >
                                                            <Check className={`h-4 w-4 ${q.correct_answer === opt ? 'text-white' : 'text-muted-foreground'}`} />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Diagram Section */}
                                        {q.diagram_type && q.diagram_svg && (
                                            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                                                <div className="flex items-center justify-between">
                                                    <Label className="flex items-center gap-2">
                                                        <span className="text-lg">📊</span>
                                                        Detected {q.diagram_type === 'graph' ? 'Graph' : 'Diagram'}
                                                    </Label>
                                                </div>

                                                <div className="border rounded-lg p-4 bg-white flex items-center justify-center min-h-[150px]">
                                                    <div
                                                        dangerouslySetInnerHTML={{ __html: q.diagram_svg }}
                                                        className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[300px]"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm text-muted-foreground">
                                                        Edit SVG Code
                                                    </Label>
                                                    <textarea
                                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                        value={q.diagram_svg || ''}
                                                        onChange={(e) => updateQuestion(index, 'diagram_svg', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={addQuestion}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Question
                            </Button>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" type="button" onClick={() => setStep('upload')}>
                                Back
                            </Button>
                            <Button type="button" onClick={handleSave} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Exercise
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
