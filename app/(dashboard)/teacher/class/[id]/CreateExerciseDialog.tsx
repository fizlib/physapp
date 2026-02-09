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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Loader2, Sparkles, Upload, FileImage, Check, Trash2, BookOpen, Award, ChevronUp, ChevronDown } from "lucide-react"
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
    diagram_image_url?: string | null
    solution_text?: string | null
    points?: number // Points for this specific question (default 1)
}

interface ExerciseData {
    title: string
    // category: 'homework' | 'classwork' // Removed
    questions: QuestionData[]
    show_all_questions: boolean
    required_variations_count?: number | null
    points_enabled?: boolean
    points?: number
}

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
                    // Fill with white background for JPEGs
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

export function CreateExerciseDialog({ classroomId, classroomType, collectionId, collectionCategory }: { classroomId: string, classroomType: string, collectionId?: string, collectionCategory?: 'homework' | 'classwork' }) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'edit'>('upload')
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ExerciseData>({
        title: '',
        // category: 'homework',
        questions: [{ ...DEFAULT_QUESTION }],
        show_all_questions: true
    })
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [variationMode, setVariationMode] = useState(false)
    const [variationCount, setVariationCount] = useState(6)
    const [variationType, setVariationType] = useState<'numbers' | 'descriptions'>('numbers')
    const [generationType, setGenerationType] = useState<'exact' | 'similar'>('exact')
    const [aiExerciseType, setAiExerciseType] = useState<'auto' | 'numerical' | 'multiple_choice'>('auto')
    const [customInstructions, setCustomInstructions] = useState('')
    const [answersInSvg, setAnswersInSvg] = useState(false)
    const [passRequirement, setPassRequirement] = useState(2)
    const [generateSolution, setGenerateSolution] = useState(true)
    const [useImageAsIllustration, setUseImageAsIllustration] = useState(false)
    const [illustrationFile, setIllustrationFile] = useState<File | null>(null)
    const [illustrationPreview, setIllustrationPreview] = useState<string | null>(null)
    const [pointsEnabled, setPointsEnabled] = useState(false)
    const [points, setPoints] = useState(1)
    const [generationMethod, setGenerationMethod] = useState<'batch' | 'parallel'>('batch')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const illustrationInputRef = useRef<HTMLInputElement>(null)

    const isClasswork = collectionCategory === 'classwork'

    const handleFileSelection = (file: File) => {
        setSelectedFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleIllustrationSelection = (file: File) => {
        setIllustrationFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setIllustrationPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        handleFileSelection(file)
    }

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (step !== 'upload' || !open) return

            const items = e.clipboardData?.items
            if (!items) return

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile()
                    if (file) {
                        e.preventDefault()
                        handleFileSelection(file)
                        if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                        }
                        toast.success("Image pasted from clipboard")
                    }
                    break
                }
            }
        }

        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [step, open])

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedFile) {
            toast.error("Please upload an image first")
            return
        }

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('image', selectedFile)
            if (variationMode) {
                formData.append('variationCount', variationCount.toString())
                formData.append('variationType', variationType)
                formData.append('generationMethod', generationMethod)
            } else {
                formData.append('generationType', generationType)
            }
            formData.append('exerciseType', aiExerciseType)
            formData.append('customInstructions', customInstructions)
            formData.append('answersInSvg', answersInSvg.toString())
            formData.append('generateSolution', generateSolution.toString())
            formData.append('useImageAsIllustration', useImageAsIllustration.toString())
            if (useImageAsIllustration) {
                const targetFile = illustrationFile || selectedFile;
                if (targetFile) {
                    try {
                        const compressedBlob = await compressImage(targetFile);
                        formData.append('illustration', compressedBlob, 'illustration.jpg');
                    } catch (err) {
                        console.error("Compression error:", err);
                        // Fallback to original file
                        formData.append('illustration', targetFile);
                    }
                }
            }
            const result = await generateExerciseFromImage(formData)

            if (result.success && result.data) {
                // Ensure questions is an array
                const questions = Array.isArray(result.data.questions)
                    ? result.data.questions
                    : [{ ...DEFAULT_QUESTION }] // Fallback

                setData(prev => ({
                    ...prev,
                    title: result.data.title || prev.title,
                    questions: questions,
                    required_variations_count: variationMode ? passRequirement : null,
                    show_all_questions: !variationMode // Force paginated for variations
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

    const handleSave = async () => {
        setLoading(true)
        try {
            const exerciseData: ExerciseData = {
                ...data,
                points_enabled: isClasswork ? pointsEnabled : false,
                // Total points is sum of all question points
                points: pointsEnabled ? data.questions.reduce((sum, q) => sum + (q.points || 1), 0) : undefined
            }
            const result = await createAssignmentWithQuestion(classroomId, exerciseData, collectionId)
            if (result.success) {
                toast.success("Exercise created successfully!")
                setOpen(false)
                // Reset state
                setStep('upload')
                setImagePreview(null)
                setSelectedFile(null)
                setData({
                    title: '',
                    // category: 'homework',
                    questions: [{ ...DEFAULT_QUESTION }],
                    show_all_questions: true
                })
                setPointsEnabled(false)
                setPoints(1)
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
                                Upload an image of a problem (numerical or multiple choice).
                                Gemini will automatically detect the type and extract the content.
                            </p>
                        </div>

                        <form onSubmit={handleGenerate} className="w-full max-w-sm space-y-4">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor="exercise-image">Problem Image</Label>
                                <Input
                                    ref={fileInputRef}
                                    id="exercise-image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="cursor-pointer"
                                />
                            </div>

                            <div className="space-y-4 pt-2 border-t">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="variation-mode"
                                        checked={variationMode}
                                        onCheckedChange={(c) => setVariationMode(c as boolean)}
                                    />
                                    <Label htmlFor="variation-mode" className="font-medium">Create Variations</Label>
                                </div>

                                {!variationMode && (
                                    <div className="space-y-4 pt-2 border-t border-dashed">
                                        <Label className="text-sm font-semibold block">Generation Type</Label>
                                        <div className="flex flex-col gap-2 pl-4">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    id="gen-type-exact"
                                                    name="generationType"
                                                    value="exact"
                                                    checked={generationType === 'exact'}
                                                    onChange={() => setGenerationType('exact')}
                                                    className="accent-primary h-4 w-4"
                                                />
                                                <Label htmlFor="gen-type-exact" className="text-sm font-normal cursor-pointer">
                                                    Exact Copy <span className="text-xs text-muted-foreground ml-1">(Same as in image)</span>
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="radio"
                                                    id="gen-type-similar"
                                                    name="generationType"
                                                    value="similar"
                                                    checked={generationType === 'similar'}
                                                    onChange={() => setGenerationType('similar')}
                                                    className="accent-primary h-4 w-4"
                                                />
                                                <Label htmlFor="gen-type-similar" className="text-sm font-normal cursor-pointer">
                                                    Similar Exercise <span className="text-xs text-muted-foreground ml-1">(Different numbers & description)</span>
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {variationMode && (
                                    <div className="grid grid-cols-2 gap-4 pl-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="var-count" className="text-xs">Total Variations</Label>
                                            <Input
                                                id="var-count"
                                                type="number"
                                                min={2}
                                                max={10}
                                                value={isNaN(variationCount) ? '' : variationCount}
                                                onChange={e => setVariationCount(e.target.value === '' ? NaN : parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pass-req" className="text-xs">Pass Requirement</Label>
                                            <Input
                                                id="pass-req"
                                                type="number"
                                                min={1}
                                                max={isNaN(variationCount) ? 10 : variationCount}
                                                value={isNaN(passRequirement) ? '' : passRequirement}
                                                onChange={e => setPassRequirement(e.target.value === '' ? NaN : parseInt(e.target.value))}
                                            />
                                        </div>

                                        <div className="col-span-2 space-y-2 pt-2">
                                            <Label className="text-xs font-semibold block mb-2">Variation Type</Label>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="var-type-numbers"
                                                        name="variationType"
                                                        value="numbers"
                                                        checked={variationType === 'numbers'}
                                                        onChange={() => setVariationType('numbers')}
                                                        className="accent-primary h-4 w-4"
                                                    />
                                                    <Label htmlFor="var-type-numbers" className="text-sm font-normal cursor-pointer">
                                                        Only different numbers <span className="text-xs text-muted-foreground ml-1">(Same context)</span>
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="var-type-descriptions"
                                                        name="variationType"
                                                        value="descriptions"
                                                        checked={variationType === 'descriptions'}
                                                        onChange={() => setVariationType('descriptions')}
                                                        className="accent-primary h-4 w-4"
                                                    />
                                                    <Label htmlFor="var-type-descriptions" className="text-sm font-normal cursor-pointer">
                                                        Different descriptions <span className="text-xs text-muted-foreground ml-1">(New contexts/stories)</span>
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2 space-y-2 pt-2">
                                            <Label className="text-xs font-semibold block mb-2">Generation Method</Label>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="gen-method-batch"
                                                        name="generationMethod"
                                                        value="batch"
                                                        checked={generationMethod === 'batch'}
                                                        onChange={() => setGenerationMethod('batch')}
                                                        className="accent-primary h-4 w-4"
                                                    />
                                                    <Label htmlFor="gen-method-batch" className="text-sm font-normal cursor-pointer">
                                                        Fast (Single Query)
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id="gen-method-parallel"
                                                        name="generationMethod"
                                                        value="parallel"
                                                        checked={generationMethod === 'parallel'}
                                                        onChange={() => setGenerationMethod('parallel')}
                                                        className="accent-primary h-4 w-4"
                                                    />
                                                    <Label htmlFor="gen-method-parallel" className="text-sm font-normal cursor-pointer">
                                                        High Quality (Parallel)
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="col-span-2 text-xs text-muted-foreground pt-1">
                                            Student will need to solve {passRequirement} correct variations out of {variationCount} available.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-4 pt-2 border-t border-dashed">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="use-image-as-illustration"
                                            checked={useImageAsIllustration}
                                            onCheckedChange={(checked) => setUseImageAsIllustration(checked as boolean)}
                                        />
                                        <Label htmlFor="use-image-as-illustration" className="text-sm font-semibold cursor-pointer">
                                            Naudoti atskirą iliustraciją (vietoj SVG)
                                        </Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-6">
                                        Jei įjungta, galite įkelti atskirą paveikslėlį, kuris bus rodomas mokiniams.
                                    </p>

                                    {useImageAsIllustration && (
                                        <div className="pl-6 pt-2 animate-in fade-in slide-in-from-top-2">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                ref={illustrationInputRef}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) handleIllustrationSelection(file)
                                                }}
                                            />
                                            {!illustrationPreview ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full border-dashed"
                                                    onClick={() => illustrationInputRef.current?.click()}
                                                >
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Įkelti iliustraciją
                                                </Button>
                                            ) : (
                                                <div className="relative group rounded-lg overflow-hidden border bg-white aspect-video flex items-center justify-center">
                                                    <img
                                                        src={illustrationPreview}
                                                        alt="Illustration Preview"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => illustrationInputRef.current?.click()}
                                                        >
                                                            Pakeisti
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => {
                                                                setIllustrationFile(null)
                                                                setIllustrationPreview(null)
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-2 border-t border-dashed">
                                    <Label className="text-sm font-semibold block">Exercise Type</Label>
                                    <div className="flex flex-col gap-2 pl-4">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-auto"
                                                name="aiExerciseType"
                                                value="auto"
                                                checked={aiExerciseType === 'auto'}
                                                onChange={() => setAiExerciseType('auto')}
                                                className="accent-primary h-4 w-4"
                                            />
                                            <Label htmlFor="type-auto" className="text-sm font-normal cursor-pointer">
                                                Auto <span className="text-xs text-muted-foreground ml-1">(Infer from image)</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-numerical"
                                                name="aiExerciseType"
                                                value="numerical"
                                                checked={aiExerciseType === 'numerical'}
                                                onChange={() => setAiExerciseType('numerical')}
                                                className="accent-primary h-4 w-4"
                                            />
                                            <Label htmlFor="type-numerical" className="text-sm font-normal cursor-pointer">
                                                Numerical <span className="text-xs text-muted-foreground ml-1">(Calculation)</span>
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="radio"
                                                id="type-mc"
                                                name="aiExerciseType"
                                                value="multiple_choice"
                                                checked={aiExerciseType === 'multiple_choice'}
                                                onChange={() => setAiExerciseType('multiple_choice')}
                                                className="accent-primary h-4 w-4"
                                            />
                                            <Label htmlFor="type-mc" className="text-sm font-normal cursor-pointer">
                                                Multiple Choice <span className="text-xs text-muted-foreground ml-1">(Options A-D)</span>
                                            </Label>
                                        </div>
                                        {aiExerciseType === 'multiple_choice' && (
                                            <div className="flex items-center space-x-2 pl-4 pt-1 animate-in fade-in slide-in-from-top-1">
                                                <Checkbox
                                                    id="answers-in-svg"
                                                    checked={answersInSvg}
                                                    onCheckedChange={(c) => setAnswersInSvg(c as boolean)}
                                                />
                                                <Label htmlFor="answers-in-svg" className="text-xs font-medium cursor-pointer">
                                                    Answers in svg format
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-dashed">
                                    <Label htmlFor="custom-instructions" className="text-sm font-semibold">Custom Instructions (Optional)</Label>
                                    <textarea
                                        id="custom-instructions"
                                        placeholder="e.g. 'Make it harder', 'Focus on kinetic energy', 'Use Lithuanian names'"
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        These instructions will be sent to the AI alongside the image.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-2 border-t">
                                <Checkbox
                                    id="generate-solution"
                                    checked={generateSolution}
                                    onCheckedChange={(c) => setGenerateSolution(c as boolean)}
                                />
                                <Label htmlFor="generate-solution" className="font-medium">Generate step-by-step solution manual</Label>
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

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="show-all"
                                    checked={data.show_all_questions}
                                    onCheckedChange={(checked) => setData({ ...data, show_all_questions: checked as boolean })}
                                />
                                <Label htmlFor="show-all">Show all questions on one page</Label>
                            </div>

                            {/* Category selection removed - Exercises are generic */}

                            {/* Points settings - only for classwork */}
                            {isClasswork && (
                                <div className="space-y-3 pt-3 border-t">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="points-enabled"
                                            checked={pointsEnabled}
                                            onCheckedChange={(checked) => setPointsEnabled(checked as boolean)}
                                        />
                                        <Label htmlFor="points-enabled" className="flex items-center gap-2">
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
                                                        {q.options?.[i]?.trim().startsWith('<svg') && (
                                                            <div
                                                                className="absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-50 bg-white border rounded p-0.5 overflow-hidden flex items-center justify-center scale-150 origin-right"
                                                                dangerouslySetInnerHTML={{ __html: sanitizeSvg(q.options[i]) }}
                                                            />
                                                        )}
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
                                        {(q.diagram_type && q.diagram_svg || q.diagram_image_url) && (
                                            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                                                <div className="flex items-center justify-between">
                                                    <Label className="flex items-center gap-2">
                                                        <span className="text-lg">📊</span>
                                                        {q.diagram_image_url ? 'Iliustracija' : `Detected ${q.diagram_type === 'graph' ? 'Graph' : 'Diagram'}`}
                                                    </Label>
                                                </div>

                                                <div className="border rounded-lg p-4 bg-white flex items-center justify-center min-h-[150px]">
                                                    {q.diagram_image_url ? (
                                                        <img
                                                            src={q.diagram_image_url}
                                                            alt="Illustration"
                                                            className="max-w-full max-h-[300px] object-contain"
                                                        />
                                                    ) : (
                                                        <div
                                                            dangerouslySetInnerHTML={{ __html: sanitizeSvg(q.diagram_svg!) }}
                                                            className="w-full max-w-[300px]"
                                                        />
                                                    )}
                                                </div>

                                                {!q.diagram_image_url && (
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
                                                )}
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
