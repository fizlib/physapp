"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, PenSquare, Check, Trash2, BookOpen, Award, ChevronUp, ChevronDown, Upload, Sparkles } from "lucide-react"
import { updateAssignmentWithQuestion, uploadIllustration, generateVariationsFromExercise } from "../../../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
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
    diagram_image_url?: string | null
    solution_text?: string | null
    points?: number
}

interface ExerciseData {
    title: string
    // category: 'homework' | 'classwork' // Removed
    questions: QuestionData[]
    show_all_questions: boolean
    points_enabled?: boolean
    points?: number
}

const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                }
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob failed'));
                        }
                    },
                    'image/jpeg',
                    0.8
                );
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(file);
    });
};

function sanitizeSvg(svg: string): string {
    let result = svg
    result = result.replace(/&lt;/g, '<')
    result = result.replace(/&gt;/g, '>')
    result = result.replace(/&amp;/g, '&')
    result = result.replace(/&quot;/g, '"')
    result = result.replace(/&#39;/g, "'")
    result = result.replace(/&#x27;/g, "'")
    result = result.replace(/&#x2F;/g, '/')
    result = result.replace(/\\n/g, '\n')
    result = result.replace(/\\r/g, '')
    result = result.trim()

    // Add width and height to SVG if not present (needed for proper rendering)
    if (result.includes('<svg') && !result.match(/<svg[^>]*\swidth\s*=/i)) {
        result = result.replace(/<svg/i, '<svg width="100%" height="auto" style="max-height: 300px;"')
    }

    return result
}

const DEFAULT_QUESTION: QuestionData = {
    type: 'numerical',
    latex_text: '',
    correct_value: 0,
    tolerance: 5,
    options: ['', '', '', ''],
    correct_answer: 'A',
    diagram_type: null,
    diagram_svg: null,
    diagram_image_url: null,
    solution_text: null,
    points: 1
}

interface EditExerciseDialogProps {
    classroomId: string
    assignmentId: string
    initialData: any
    collectionCategory?: 'homework' | 'classwork'
}

export function EditExerciseDialog({ classroomId, assignmentId, initialData, collectionCategory }: EditExerciseDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [data, setData] = useState<ExerciseData>({
        title: '',
        // category: 'homework',
        questions: [{ ...DEFAULT_QUESTION }],
        show_all_questions: false,
        points_enabled: false,
        points: 1
    })

    const [customCount, setCustomCount] = useState<number>(1)

    const [pointsEnabled, setPointsEnabled] = useState(false)
    const [points, setPoints] = useState(1)
    const isClasswork = collectionCategory === 'classwork'

    const [illustrationFiles, setIllustrationFiles] = useState<Record<number, File | null>>({})
    const [illustrationPreviews, setIllustrationPreviews] = useState<Record<number, string | null>>({})
    const illustrationInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

    // Populate data when dialog opens
    useEffect(() => {
        if (initialData && open) {
            const mappedQuestions = initialData.questions?.map((q: any) => ({
                type: q.question_type || 'numerical',
                latex_text: q.latex_text || '',
                correct_value: q.correct_value,
                tolerance: q.tolerance_percent,
                options: q.options || ['', '', '', ''],
                correct_answer: q.correct_answer || 'A',
                diagram_type: q.diagram_type,
                diagram_svg: q.diagram_svg,
                diagram_image_url: q.diagram_image_url,
                solution_text: q.solution_text,
                points: q.points || 1
            })) || [{ ...DEFAULT_QUESTION }]

            setData({
                // category: initialData.category || 'homework',
                title: initialData.title || '',
                questions: mappedQuestions,
                show_all_questions: initialData.show_all_questions || false
            })
            setPointsEnabled(initialData.points_enabled || false)
            setPoints(initialData.points || 1)

            // Set initial illustration previews for all questions
            const previews: Record<number, string | null> = {}
            initialData.questions?.forEach((q: any, i: number) => {
                if (q.diagram_image_url) {
                    previews[i] = q.diagram_image_url
                }
            })
            setIllustrationPreviews(previews)
            setIllustrationFiles({})
        }
    }, [initialData, open])

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

    const moveQuestionUp = (index: number) => {
        if (index === 0) return
        const newQuestions = [...data.questions]
            ;[newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]]
        setData({ ...data, questions: newQuestions })
    }

    const moveQuestionDown = (index: number) => {
        if (index === data.questions.length - 1) return
        const newQuestions = [...data.questions]
            ;[newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]]
        setData({ ...data, questions: newQuestions })
    }

    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null)

    const handleGenerateVariations = async (index: number, count: number, type: 'numbers' | 'similar') => {
        setGeneratingIndex(index)
        const baseQuestion = data.questions[index]

        try {
            const result = await generateVariationsFromExercise(baseQuestion, count, type, true)
            if (result.success && result.data) {
                const newQuestions = [...data.questions]
                newQuestions.splice(index + 1, 0, ...result.data)
                setData({ ...data, questions: newQuestions })
                toast.success(`Generated ${result.data.length} variations!`)
            } else {
                toast.error(result.error || "Failed to generate variations")
            }
        } catch (err) {
            console.error(err)
            toast.error("An error occurred during generation")
        } finally {
            setGeneratingIndex(null)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // 5. Update Questions with new illustrations
            const updatedQuestions = [...data.questions]

            // Handle image uploads for each question
            for (let i = 0; i < updatedQuestions.length; i++) {
                const file = illustrationFiles[i]
                if (file) {
                    const formData = new FormData()
                    try {
                        const compressedBlob = await compressImage(file)
                        formData.append('image', compressedBlob, 'illustration.jpg')
                    } catch (err) {
                        console.error(`Compression error for question ${i}:`, err)
                        formData.append('image', file)
                    }

                    const uploadResult = await uploadIllustration(formData)
                    if (uploadResult.success && uploadResult.url) {
                        updatedQuestions[i].diagram_image_url = uploadResult.url
                        // Clear SVG if we have an image
                        updatedQuestions[i].diagram_svg = null
                    } else {
                        toast.error(uploadResult.error || `Failed to upload illustration for question ${i + 1}`)
                        setLoading(false)
                        return
                    }
                } else if (illustrationPreviews[i] === null) {
                    // Illustration was explicitly removed for this question
                    updatedQuestions[i].diagram_image_url = null
                }
            }

            const saveData = {
                ...data,
                questions: updatedQuestions,
                points_enabled: isClasswork ? pointsEnabled : false,
                // Total points is sum of all question points
                points: pointsEnabled ? updatedQuestions.reduce((sum, q) => sum + (q.points || 1), 0) : undefined
            }
            const result = await updateAssignmentWithQuestion(assignmentId, classroomId, saveData)
            if (result.success) {
                toast.success("Exercise updated successfully!")
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error || "Failed to update exercise")
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
                <Button variant="secondary" size="sm">
                    <PenSquare className="mr-2 h-4 w-4" />
                    Edit Exercise
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Exercise</DialogTitle>
                </DialogHeader>

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

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="edit-show-all"
                                checked={data.show_all_questions}
                                onCheckedChange={(checked) => setData({ ...data, show_all_questions: checked as boolean })}
                            />
                            <Label htmlFor="edit-show-all">Show all questions on one page</Label>
                        </div>

                        {/* Category functionality removed */}

                        {/* Points settings - only for classwork */}
                        {isClasswork && (
                            <div className="space-y-3 pt-3 border-t">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="edit-points-enabled"
                                        checked={pointsEnabled}
                                        onCheckedChange={(checked) => setPointsEnabled(checked as boolean)}
                                    />
                                    <Label htmlFor="edit-points-enabled" className="flex items-center gap-2">
                                        <Award className="h-4 w-4 text-amber-500" />
                                        Enable Points (one try only)
                                    </Label>
                                </div>

                                {pointsEnabled && (
                                    <div className="pl-6 space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <p className="text-xs text-muted-foreground">
                                            Set points for each question below. Total: <span className="font-semibold text-amber-600">{data.questions.reduce((sum, q) => sum + (q.points || 1), 0)} points</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Students get one try per question. Results shown after collection is complete.
                                        </p>
                                    </div>
                                )}
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
                                        <div className="flex items-center gap-2">
                                            {/* Reorder buttons - only show when multiple questions */}
                                            {data.questions.length > 1 && (
                                                <div className="flex items-center gap-0.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => moveQuestionUp(index)}
                                                        disabled={index === 0}
                                                        title="Move up"
                                                    >
                                                        <ChevronUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => moveQuestionDown(index)}
                                                        disabled={index === data.questions.length - 1}
                                                        title="Move down"
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                            {/* Per-question points input - only when points enabled */}
                                            {pointsEnabled && (
                                                <div className="flex items-center gap-1.5">
                                                    <Award className="h-3.5 w-3.5 text-amber-500" />
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={100}
                                                        value={q.points || 1}
                                                        onChange={(e) => updateQuestion(index, 'points', Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-16 h-7 text-xs"
                                                    />
                                                    <span className="text-xs text-muted-foreground">pts</span>
                                                </div>
                                            )}

                                            {/* Variation Generator */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-primary hover:text-primary/90"
                                                        disabled={generatingIndex === index}
                                                        title="Sukurti variacijas"
                                                    >
                                                        {generatingIndex === index ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56" align="end">
                                                    <DropdownMenuLabel>Generate Variations</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <div className="p-2 space-y-2">
                                                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">New variations (numbers only)</Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={10}
                                                                value={customCount}
                                                                onChange={(e) => setCustomCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                                                                className="h-8 w-16"
                                                            />
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="flex-1 h-8"
                                                                onClick={() => handleGenerateVariations(index, customCount, 'numbers')}
                                                            >
                                                                Generate
                                                            </Button>
                                                        </div>
                                                        <div className="flex gap-1.5 overflow-x-auto pb-1">
                                                            {[1, 2, 3, 5].map((num) => (
                                                                <Button
                                                                    key={num}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-[10px] min-w-[28px]"
                                                                    onClick={() => handleGenerateVariations(index, num, 'numbers')}
                                                                >
                                                                    {num}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="flex items-center gap-2 cursor-pointer"
                                                        onClick={() => handleGenerateVariations(index, 1, 'similar')}
                                                    >
                                                        <Sparkles className="h-4 w-4 text-primary" />
                                                        <span>Make similar problem</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>

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
                                                    value={q.correct_value === null || q.correct_value === undefined || isNaN(q.correct_value) ? '' : q.correct_value}
                                                    onChange={(e) => updateQuestion(index, 'correct_value', e.target.value === '' ? null : parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Tolerance (%)</Label>
                                                <Input
                                                    type="number"
                                                    value={q.tolerance === null || q.tolerance === undefined || isNaN(q.tolerance) ? '' : q.tolerance}
                                                    onChange={(e) => updateQuestion(index, 'tolerance', e.target.value === '' ? null : parseFloat(e.target.value))}
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

                                    {/* Solution Section */}
                                    <div className="space-y-2 pt-2 border-t">
                                        <Label className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            Solution Manual
                                        </Label>
                                        <textarea
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            placeholder="Step-by-step solution..."
                                            value={q.solution_text || ''}
                                            onChange={(e) => updateQuestion(index, 'solution_text', e.target.value)}
                                        />
                                    </div>

                                    {/* Diagram Section */}
                                    <div className="space-y-3 border-t pt-4">
                                        <div className="space-y-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={el => { illustrationInputRefs.current[index] = el }}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        setIllustrationFiles(prev => ({ ...prev, [index]: file }))
                                                        const reader = new FileReader()
                                                        reader.onloadend = () => {
                                                            setIllustrationPreviews(prev => ({ ...prev, [index]: reader.result as string }))
                                                        }
                                                        reader.readAsDataURL(file)
                                                    }
                                                }}
                                            />
                                            <div className="flex items-center justify-between">
                                                <Label className="flex items-center gap-2">
                                                    <span className="text-lg">📊</span>
                                                    Iliustracija
                                                </Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => illustrationInputRefs.current[index]?.click()}
                                                >
                                                    {illustrationPreviews[index] ? 'Pakeisti' : 'Pridėti'}
                                                </Button>
                                            </div>

                                            {illustrationPreviews[index] && (
                                                <div className="relative group rounded-lg overflow-hidden border bg-white aspect-video flex items-center justify-center">
                                                    <img
                                                        src={illustrationPreviews[index]!}
                                                        alt="Illustration Preview"
                                                        className="max-w-full max-h-[300px] object-contain"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => {
                                                                setIllustrationFiles(prev => ({ ...prev, [index]: null }))
                                                                setIllustrationPreviews(prev => ({ ...prev, [index]: null }))
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {q.diagram_svg && !illustrationPreviews[index] && (
                                                <div className="space-y-2">
                                                    <div className="border rounded-lg p-4 bg-white flex items-center justify-center min-h-[150px]">
                                                        <div
                                                            dangerouslySetInnerHTML={{ __html: sanitizeSvg(q.diagram_svg!) }}
                                                            className="w-full max-w-[300px]"
                                                        />
                                                    </div>
                                                    <Label className="text-sm text-muted-foreground">
                                                        Edit SVG Code
                                                    </Label>
                                                    <textarea
                                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                        value={q.diagram_svg || ''}
                                                        onChange={(e) => updateQuestion(index, 'diagram_svg', e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {!illustrationPreviews[index] && !q.diagram_svg && (
                                                <p className="text-xs text-muted-foreground italic">
                                                    Ši užduotis neturi iliustracijos.
                                                </p>
                                            )}
                                        </div>
                                    </div>
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

                    <div className="flex justify-end pt-4">
                        <Button type="button" onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
