"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Settings, Loader2, Trash2, AlertTriangle, Check, FileText, Upload, X, Library } from "lucide-react"
import { updateCollection, deleteCollection, uploadCollectionSlides, listCollectionSlides } from "../../../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { MarkdownEditor } from "@/components/ui/markdown-editor"

interface LessonSlot {
    day: number
    time: string
}

interface CollectionSettingsDialogProps {
    classroomId: string
    collectionId: string
    currentTitle: string
    currentCategory: 'homework' | 'classwork' | 'information'
    currentScheduledDate?: string | null
    currentScheduledEndAt?: string | null
    currentSlidesUrl?: string | null
    currentInfoContent?: string | null
    lessonSchedule?: LessonSlot[] | null
    trigger?: React.ReactNode
    currentTabMonitoringEnabled?: boolean
    currentAutoDisableTabMonitoring?: boolean
    currentInfoButtonColor?: string | null
    currentTheoryContent?: string | null
    currentInfoPdfUrl?: string | null
}

export function CollectionSettingsDialog({
    classroomId,
    collectionId,
    currentTitle,
    currentCategory,
    currentScheduledDate,
    currentScheduledEndAt,
    currentSlidesUrl,
    currentInfoContent,
    lessonSchedule,
    trigger,
    currentTabMonitoringEnabled,
    currentAutoDisableTabMonitoring,
    currentInfoButtonColor,
    currentTheoryContent,
    currentInfoPdfUrl
}: CollectionSettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState(currentTitle)
    const [category, setCategory] = useState<'homework' | 'classwork' | 'information'>(currentCategory)
    const [infoContent, setInfoContent] = useState<string>(currentInfoContent || "")
    const [infoButtonColor, setInfoButtonColor] = useState<string>(currentInfoButtonColor || 'neutral')
    const [theoryContent, setTheoryContent] = useState<string>(currentTheoryContent || "")
    const [infoPdfUrl, setInfoPdfUrl] = useState<string | null>(currentInfoPdfUrl || null)
    const [uploadingInfoPdf, setUploadingInfoPdf] = useState(false)

    // Lesson date state (simple date, no time)
    const [lessonDate, setLessonDate] = useState<string>(currentScheduledDate ? new Date(currentScheduledDate).toISOString().split('T')[0] : '')
    const [slidesUrl, setSlidesUrl] = useState<string | null>(currentSlidesUrl || null)
    const [uploading, setUploading] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [libraryOpen, setLibraryOpen] = useState(false)
    const [libraryFiles, setLibraryFiles] = useState<{ name: string, url: string }[]>([])
    const [fetchingLibrary, setFetchingLibrary] = useState(false)
    const [deleteExercises, setDeleteExercises] = useState(false)
    const [tabMonitoringEnabled, setTabMonitoringEnabled] = useState(!!currentTabMonitoringEnabled)
    const [autoDisableTabMonitoring, setAutoDisableTabMonitoring] = useState(currentAutoDisableTabMonitoring !== false)

    const router = useRouter()

    useEffect(() => {
        if (open) {
            setTitle(currentTitle)
            setCategory(currentCategory)
            setLessonDate(currentScheduledDate ? new Date(currentScheduledDate).toISOString().split('T')[0] : '')
            setSlidesUrl(currentSlidesUrl || null)
            setInfoContent(currentInfoContent || "")
            setInfoButtonColor(currentInfoButtonColor || 'neutral')
            setTheoryContent(currentTheoryContent || "")
            setInfoPdfUrl(currentInfoPdfUrl || null)
            setTabMonitoringEnabled(!!currentTabMonitoringEnabled)
            setAutoDisableTabMonitoring(currentAutoDisableTabMonitoring !== false)
        }
    }, [open, currentTitle, currentCategory, currentScheduledDate, currentSlidesUrl, currentTabMonitoringEnabled, currentAutoDisableTabMonitoring])

    const handleSave = async () => {
        setLoading(true)
        try {
            // Build scheduled date from the lesson date (date only, no time)
            let scheduledDate: string | undefined
            if (category !== 'information' && lessonDate) {
                // Store as ISO string at midnight
                scheduledDate = new Date(lessonDate + 'T00:00:00').toISOString()
            }

            const result = await updateCollection(classroomId, collectionId, title, category, scheduledDate, slidesUrl, undefined, tabMonitoringEnabled, autoDisableTabMonitoring, category === 'information' ? infoContent : undefined, category === 'information' ? infoButtonColor : undefined, category !== 'information' ? theoryContent : undefined, category === 'information' ? infoPdfUrl : undefined)
            if (result.success) {
                toast.success("Collection settings updated")
                setOpen(false)
            } else {
                toast.error(result.error || "Failed to update collection")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await deleteCollection(collectionId, classroomId, deleteExercises)
            if (result.success) {
                toast.success("Collection deleted")
                router.push(`/teacher/class/${classroomId}?view=collections`)
            } else {
                toast.error(result.error || "Failed to delete collection")
                setLoading(false)
            }
        } catch (err) {
            toast.error("An error occurred")
            setLoading(false)
        }
    }

    const fetchLibrary = async () => {
        setFetchingLibrary(true)
        const res = await listCollectionSlides()
        if (res.success && res.files) {
            setLibraryFiles(res.files)
        } else {
            toast.error(res.error || "Failed to load slides library")
        }
        setFetchingLibrary(false)
    }

    const hasChanges = title !== currentTitle || category !== currentCategory || slidesUrl !== (currentSlidesUrl || null)
        || lessonDate !== (currentScheduledDate ? new Date(currentScheduledDate).toISOString().split('T')[0] : '')
        || tabMonitoringEnabled !== !!currentTabMonitoringEnabled
        || autoDisableTabMonitoring !== (currentAutoDisableTabMonitoring !== false)
        || infoButtonColor !== (currentInfoButtonColor || 'neutral')


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" size="sm">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className={`sm:max-w-md max-h-[90vh] overflow-y-auto`}>
                <DialogHeader>
                    <DialogTitle>Collection Settings</DialogTitle>
                    <DialogDescription>
                        Manage collection details and preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-3">
                        <Label htmlFor="edit-collection-title">Collection Title</Label>
                        <Input
                            id="edit-collection-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Kinematics Chapter 1"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-3">
                        <Label>Category</Label>
                        <div className="grid grid-cols-3 gap-4">
                            <label className={`
                                flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50
                                ${category === 'homework' ? 'border-primary bg-primary/5' : 'border-border'}
                            `}>
                                <input
                                    type="radio"
                                    name="settings-category"
                                    value="homework"
                                    className="sr-only"
                                    checked={category === 'homework'}
                                    onChange={() => setCategory('homework')}
                                />
                                <span className="font-semibold text-sm">Homework</span>
                                {category === 'homework' && <Check className="w-4 h-4 text-primary mt-2" />}
                            </label>

                            <label className={`
                                flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50
                                ${category === 'classwork' ? 'border-primary bg-primary/5' : 'border-border'}
                            `}>
                                <input
                                    type="radio"
                                    name="settings-category"
                                    value="classwork"
                                    className="sr-only"
                                    checked={category === 'classwork'}
                                    onChange={() => setCategory('classwork')}
                                />
                                <span className="font-semibold text-sm">Classwork</span>
                                {category === 'classwork' && <Check className="w-4 h-4 text-primary mt-2" />}
                            </label>

                            <label className={`
                                flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50
                                ${category === 'information' ? 'border-teal-500 bg-teal-50/50' : 'border-border'}
                            `}>
                                <input
                                    type="radio"
                                    name="settings-category"
                                    value="information"
                                    className="sr-only"
                                    checked={category === 'information'}
                                    onChange={() => setCategory('information')}
                                />
                                <span className="font-semibold text-sm">Information</span>
                                {category === 'information' && <Check className="w-4 h-4 text-teal-500 mt-2" />}
                            </label>
                        </div>
                    </div>

                    {/* Content editor for Information pages */}
                    {category === 'information' && (
                        <div className="space-y-3">
                            <Label>Content</Label>
                            <MarkdownEditor
                                value={infoContent}
                                onChange={setInfoContent}
                                placeholder="Enter the information you want to share with students..."
                                disabled={loading}
                                minHeight="150px"
                            />
                        </div>
                    )}

                    {/* PDF attachment for Information pages */}
                    {category === 'information' && (
                        <div className="space-y-3">
                            <Label>Attached PDF</Label>
                            <div className="space-y-2">
                                {infoPdfUrl ? (
                                    <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-sm truncate">
                                                {infoPdfUrl.split('/').pop()?.split('-').slice(1).join('-') || "Attached PDF"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={() => window.open(infoPdfUrl!, '_blank')}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-red-500"
                                                onClick={() => setInfoPdfUrl(null)}
                                                disabled={loading || uploadingInfoPdf}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            disabled={loading || uploadingInfoPdf}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return

                                                setUploadingInfoPdf(true)
                                                const formData = new FormData()
                                                formData.append('file', file)

                                                const res = await uploadCollectionSlides(formData)
                                                if (res.success && res.url) {
                                                    setInfoPdfUrl(res.url)
                                                    toast.success("PDF uploaded")
                                                } else {
                                                    toast.error(res.error || "Failed to upload PDF")
                                                }
                                                setUploadingInfoPdf(false)
                                            }}
                                        />
                                        {uploadingInfoPdf ? (
                                            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-2" />
                                        ) : (
                                            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        )}
                                        <p className="text-sm font-medium">Click to upload PDF</p>
                                        <p className="text-xs text-muted-foreground">PDF only (max 10MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Button Color for Information pages */}
                    {category === 'information' && (
                        <div className="space-y-3">
                            <Label>Button Color (Student View)</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`
                                    flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50
                                    ${infoButtonColor === 'neutral' ? 'border-primary bg-primary/5' : 'border-border'}
                                `}>
                                    <input
                                        type="radio"
                                        name="info-button-color"
                                        value="neutral"
                                        className="sr-only"
                                        checked={infoButtonColor === 'neutral'}
                                        onChange={() => setInfoButtonColor('neutral')}
                                    />
                                    <div className="w-full h-6 rounded-md border border-border/60 bg-background mb-2" />
                                    <span className="text-xs font-medium">Neutral</span>
                                    {infoButtonColor === 'neutral' && <Check className="w-3.5 h-3.5 text-primary mt-1" />}
                                </label>
                                <label className={`
                                    flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50
                                    ${infoButtonColor === 'red' ? 'border-red-500 bg-red-50/50' : 'border-border'}
                                `}>
                                    <input
                                        type="radio"
                                        name="info-button-color"
                                        value="red"
                                        className="sr-only"
                                        checked={infoButtonColor === 'red'}
                                        onChange={() => setInfoButtonColor('red')}
                                    />
                                    <div className="w-full h-6 rounded-md border border-red-200 bg-red-50 mb-2" />
                                    <span className="text-xs font-medium">Red</span>
                                    {infoButtonColor === 'red' && <Check className="w-3.5 h-3.5 text-red-500 mt-1" />}
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Theory content for non-information categories */}
                    {category !== 'information' && (
                        <div className="space-y-3">
                            <Label>Teorijos tekstas</Label>
                            <MarkdownEditor
                                value={theoryContent}
                                onChange={setTheoryContent}
                                placeholder="Įveskite teorijos tekstą, kurį matys mokiniai..."
                                disabled={loading}
                                minHeight="150px"
                            />
                        </div>
                    )}

                    <div className="space-y-3">
                        <Label>Theory Slides (PDF)</Label>
                        <div className="space-y-2">
                            {slidesUrl ? (
                                <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="w-4 h-4 text-primary shrink-0" />
                                        <span className="text-sm truncate">
                                            {slidesUrl.split('/').pop()?.split('-').slice(1).join('-') || "Theory Slides"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => window.open(slidesUrl, '_blank')}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-red-500"
                                            onClick={() => setSlidesUrl(null)}
                                            disabled={loading || uploading}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={loading || uploading}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return

                                            setUploading(true)
                                            const formData = new FormData()
                                            formData.append('file', file)

                                            const res = await uploadCollectionSlides(formData)
                                            if (res.success && res.url) {
                                                setSlidesUrl(res.url)
                                                toast.success("Slides uploaded")
                                            } else {
                                                toast.error(res.error || "Failed to upload slides")
                                            }
                                            setUploading(false)
                                        }}
                                    />
                                    {uploading ? (
                                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-2" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                    )}
                                    <p className="text-sm font-medium">Click to upload theory slides</p>
                                    <p className="text-xs text-muted-foreground">PDF only (max 10MB)</p>
                                </div>
                            )}

                            {!slidesUrl && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        setLibraryOpen(true)
                                        fetchLibrary()
                                    }}
                                    disabled={loading || uploading}
                                >
                                    <Library className="w-4 h-4 mr-2" />
                                    Choose from Library
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-border" />
                    {category !== 'information' && (
                        <div className="space-y-3 pt-2 border-t text-sm">
                            <Label htmlFor="lesson-date" className="font-medium">Pamokos data</Label>
                            <Input
                                id="lesson-date"
                                type="date"
                                value={lessonDate}
                                onChange={(e) => setLessonDate(e.target.value)}
                                disabled={loading}
                                className="w-44"
                            />
                            <p className="text-xs text-muted-foreground">Ši data bus rodoma mokiniams ir mokytojams.</p>
                        </div>
                    )}

                    {category === 'classwork' && (
                        <div className="space-y-4 pt-2 border-t text-sm">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="enable-tab-monitoring"
                                    checked={tabMonitoringEnabled}
                                    onCheckedChange={(checked) => setTabMonitoringEnabled(!!checked)}
                                />
                                <Label htmlFor="enable-tab-monitoring" className="font-medium cursor-pointer">
                                    Stebėti skirtukų perjungimą
                                </Label>
                            </div>
                            {tabMonitoringEnabled && (
                                <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <p className="text-xs text-muted-foreground">
                                        Mokiniai bus užblokuoti, jei perjungs skirtuką arba sumažins naršyklę.
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="auto-disable-tab-monitoring"
                                            checked={autoDisableTabMonitoring}
                                            onCheckedChange={(checked) => setAutoDisableTabMonitoring(!!checked)}
                                        />
                                        <Label htmlFor="auto-disable-tab-monitoring" className="text-xs font-normal cursor-pointer">
                                            Automatiškai išjungti stebėjimą pasibaigus testui
                                        </Label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="h-px bg-border" />

                    {/* Danger Zone */}
                    <div>
                        <h3 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Danger Zone
                        </h3>
                        <div className="rounded-md border border-red-200 bg-red-50 p-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-red-900">Delete Collection</p>
                                <p className="text-xs text-red-700">
                                    Permanently delete this collection. Exercises will be unlinked (not deleted).
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteOpen(true)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>

                {/* Nested Delete Confirmation Dialog */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="text-red-600">Delete Collection?</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this collection?
                            </DialogDescription>
                            <div className="flex items-center space-x-2 pt-4">
                                <Checkbox
                                    id="dialog-delete-exercises"
                                    checked={deleteExercises}
                                    onCheckedChange={(checked) => setDeleteExercises(!!checked)}
                                />
                                <Label
                                    htmlFor="dialog-delete-exercises"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    Taip pat ištrinti visas šios kolekcijos užduotis
                                </Label>
                            </div>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                                {loading ? "Deleting..." : "Yes, Delete It"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Slides Library Dialog */}
                <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Slides Library</DialogTitle>
                            <DialogDescription>
                                Choose from previously uploaded slides.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 py-4">
                            {fetchingLibrary ? (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                    <p className="text-sm">Loading library...</p>
                                </div>
                            ) : libraryFiles.length > 0 ? (
                                libraryFiles.map((file) => (
                                    <div
                                        key={file.name}
                                        className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSlidesUrl(file.url)
                                            setLibraryOpen(false)
                                            toast.success("Slides selected from library")
                                        }}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-sm truncate">
                                                {file.name.split('-').slice(1).join('-') || file.name}
                                            </span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                                            Select
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">No slides found in library.</p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setLibraryOpen(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </DialogContent>
        </Dialog>
    )
}
