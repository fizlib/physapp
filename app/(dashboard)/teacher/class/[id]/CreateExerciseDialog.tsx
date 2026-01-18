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
    category?: 'homework' | 'classwork'
    title: string
    latex_text: string
    correct_value?: number | null
    tolerance?: number | null
    options?: string[] | null
    correct_answer?: string | null
    diagram_type?: 'graph' | 'scheme' | null
    diagram_svg?: string | null
}

export function CreateExerciseDialog({ classroomId, classroomType }: { classroomId: string, classroomType: string }) {
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
        correct_answer: 'A',
        // @ts-ignore
        category: 'homework',
        diagram_type: null,
        diagram_svg: null
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
                    correct_answer: 'A',
                    // @ts-ignore
                    category: 'homework',
                    diagram_type: null,
                    diagram_svg: null
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
                                <Label htmlFor="type">Exercise Type</Label>
                                <div className="relative">
                                    <select
                                        id="type"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                        value={data.type}
                                        onChange={(e) => {
                                            const newType = e.target.value as 'numerical' | 'multiple_choice';
                                            const updates: Partial<ExerciseData> = { type: newType };
                                            if (newType === 'multiple_choice' && (!data.options || data.options.length === 0)) {
                                                updates.options = ['', '', '', ''];
                                                updates.correct_answer = 'A';
                                            }
                                            setData({ ...data, ...updates });
                                        }}
                                    >
                                        <option value="numerical">Numerical</option>
                                        <option value="multiple_choice">Multiple Choice</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                    </div>
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

                        {classroomType === 'school_class' && (
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="radio"
                                            name="category"
                                            value="classwork"
                                            // @ts-ignore
                                            checked={data.category === 'classwork'}
                                            // @ts-ignore
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
                                            // @ts-ignore
                                            checked={data.category === 'homework'}
                                            // @ts-ignore
                                            onChange={() => setData({ ...data, category: 'homework' })}
                                            className="accent-primary"
                                        />
                                        Homework
                                    </label>
                                </div>
                            </div>
                        )}

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

                        {/* Diagram Section */}
                        {data.diagram_type && data.diagram_svg && (
                            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <span className="text-lg">📊</span>
                                        Detected {data.diagram_type === 'graph' ? 'Graph' : 'Diagram'}
                                    </Label>
                                </div>

                                {/* SVG Preview */}
                                <div className="border rounded-lg p-4 bg-white flex items-center justify-center min-h-[150px]">
                                    <div
                                        dangerouslySetInnerHTML={{ __html: data.diagram_svg }}
                                        className="max-w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[300px]"
                                    />
                                </div>

                                {/* Editable SVG Code */}
                                <div className="space-y-2">
                                    <Label htmlFor="diagram-code" className="text-sm text-muted-foreground">
                                        Edit SVG Code
                                    </Label>
                                    <textarea
                                        id="diagram-code"
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={data.diagram_svg || ''}
                                        onChange={(e) => setData({ ...data, diagram_svg: e.target.value })}
                                    />
                                </div>
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
