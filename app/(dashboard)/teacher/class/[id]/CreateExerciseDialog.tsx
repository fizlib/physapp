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
import { Textarea } from "@/components/ui/textarea" // Need to check if this exists
import { Plus, Loader2, Sparkles, Upload, FileImage, Check } from "lucide-react"
import { generateExerciseFromImage, createAssignmentWithQuestion } from "../../actions"
import { toast } from "sonner" // Assuming sonner is installed/used

interface ExerciseData {
    type: 'numerical' | 'multiple_choice'
    title: string
    latex_text: string
    correct_value?: number | null
    tolerance?: number | null
    options?: string[] | null
    correct_answer?: string | null
}

export function CreateExerciseDialog({ classroomId }: { classroomId: string }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'edit'>('upload')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ExerciseData>({
        type: 'numerical',
        title: '',
        latex_text: '',
        correct_value: 0,
        tolerance: 5,
        options: ['', '', '', ''],
        correct_answer: 'A'
    })
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Create preview
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
                setData(prev => ({ ...prev, ...result.data }))
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
                    type: 'numerical',
                    title: '',
                    latex_text: '',
                    correct_value: 0,
                    tolerance: 5,
                    options: ['', '', '', ''],
                    correct_answer: 'A'
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Detected Type</Label>
                                <div className="px-3 py-2 rounded-md border bg-muted text-sm font-medium capitalize">
                                    {data.type.replace('_', ' ')}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData({ ...data, title: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="latex">Question (LaTeX)</Label>
                            {/* Assuming Textarea component exists, otherwise use textarea */}
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                id="latex"
                                value={data.latex_text}
                                onChange={(e) => setData({ ...data, latex_text: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Type math formulas using LaTeX syntax, e.g. $E=mc^2$</p>
                        </div>

                        {data.type === 'numerical' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="val">Correct Value</Label>
                                    <Input
                                        id="val"
                                        type="number"
                                        step="any"
                                        value={data.correct_value || 0}
                                        onChange={(e) => setData({ ...data, correct_value: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tol">Tolerance (%)</Label>
                                    <Input
                                        id="tol"
                                        type="number"
                                        value={data.tolerance || 0}
                                        onChange={(e) => setData({ ...data, tolerance: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                        )}

                        {data.type === 'multiple_choice' && data.options && (
                            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                                <Label>Options</Label>
                                {['A', 'B', 'C', 'D'].map((opt, idx) => (
                                    <div key={opt} className="flex items-center gap-3">
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full border text-xs font-bold ${data.correct_answer === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}>
                                            {opt}
                                        </div>
                                        <Input
                                            value={data.options?.[idx] || ''}
                                            onChange={(e) => {
                                                const newOptions = [...(data.options || [])];
                                                newOptions[idx] = e.target.value;
                                                setData({ ...data, options: newOptions });
                                            }}
                                            placeholder={`Option ${opt}`}
                                        />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant={data.correct_answer === opt ? "default" : "ghost"}
                                            onClick={() => setData({ ...data, correct_answer: opt })}
                                            title="Mark as correct"
                                        >
                                            <Check className={`h-4 w-4 ${data.correct_answer === opt ? 'text-white' : 'text-muted-foreground'}`} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

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
