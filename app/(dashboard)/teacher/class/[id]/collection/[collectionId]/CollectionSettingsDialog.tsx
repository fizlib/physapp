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
import { LessonCalendar } from "@/components/teacher/LessonCalendar"

interface LessonSlot {
    day: number
    time: string
}

interface CollectionSettingsDialogProps {
    classroomId: string
    collectionId: string
    currentTitle: string
    currentCategory: 'homework' | 'classwork'
    currentScheduledDate?: string | null
    currentScheduledEndAt?: string | null
    currentSlidesUrl?: string | null
    lessonSchedule?: LessonSlot[] | null
    trigger?: React.ReactNode
    currentTabMonitoringEnabled?: boolean
    currentAutoDisableTabMonitoring?: boolean
}

export function CollectionSettingsDialog({
    classroomId,
    collectionId,
    currentTitle,
    currentCategory,
    currentScheduledDate,
    currentScheduledEndAt,
    currentSlidesUrl,
    lessonSchedule,
    trigger,
    currentTabMonitoringEnabled,
    currentAutoDisableTabMonitoring
}: CollectionSettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState(currentTitle)
    const [category, setCategory] = useState<'homework' | 'classwork'>(currentCategory)

    // Calendar state
    const [selectedDate, setSelectedDate] = useState<Date | null>(currentScheduledDate ? new Date(currentScheduledDate) : null)
    const [selectedTime, setSelectedTime] = useState<string>("")
    const [selectedEndTime, setSelectedEndTime] = useState<string>("")
    const [slidesUrl, setSlidesUrl] = useState<string | null>(currentSlidesUrl || null)
    const [uploading, setUploading] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [libraryOpen, setLibraryOpen] = useState(false)
    const [libraryFiles, setLibraryFiles] = useState<{ name: string, url: string }[]>([])
    const [fetchingLibrary, setFetchingLibrary] = useState(false)
    const [deleteExercises, setDeleteExercises] = useState(false)
    const [useScheduling, setUseScheduling] = useState(!!currentScheduledDate)
    const [tabMonitoringEnabled, setTabMonitoringEnabled] = useState(!!currentTabMonitoringEnabled)
    const [autoDisableTabMonitoring, setAutoDisableTabMonitoring] = useState(currentAutoDisableTabMonitoring !== false)

    const router = useRouter()

    useEffect(() => {
        if (open) {
            setTitle(currentTitle)
            setCategory(currentCategory)
            if (currentScheduledDate) {
                const date = new Date(currentScheduledDate)
                setSelectedDate(date)
                const hours = date.getHours().toString().padStart(2, '0')
                const minutes = date.getMinutes().toString().padStart(2, '0')
                setSelectedTime(`${hours}:${minutes}`)

                if (currentScheduledEndAt) {
                    const endDate = new Date(currentScheduledEndAt)
                    const endHours = endDate.getHours().toString().padStart(2, '0')
                    const endMinutes = endDate.getMinutes().toString().padStart(2, '0')
                    setSelectedEndTime(`${endHours}:${endMinutes}`)
                } else {
                    // Default to +45 mins
                    const defaultEnd = new Date(date)
                    defaultEnd.setMinutes(defaultEnd.getMinutes() + 45)
                    const endHours = defaultEnd.getHours().toString().padStart(2, '0')
                    const endMinutes = defaultEnd.getMinutes().toString().padStart(2, '0')
                    setSelectedEndTime(`${endHours}:${endMinutes}`)
                }
            } else {
                setSelectedDate(null)
                setSelectedTime("")
                setSelectedEndTime("")
            }
            setUseScheduling(!!currentScheduledDate)
            setSlidesUrl(currentSlidesUrl || null)
            setTabMonitoringEnabled(!!currentTabMonitoringEnabled)
            setAutoDisableTabMonitoring(currentAutoDisableTabMonitoring !== false)
        }
    }, [open, currentTitle, currentCategory, currentScheduledDate, currentScheduledEndAt, currentSlidesUrl, currentTabMonitoringEnabled, currentAutoDisableTabMonitoring])

    const handleSave = async () => {
        setLoading(true)
        try {
            // Build scheduled date if classwork with schedule selected
            let scheduledDate: string | undefined
            let scheduledEndDate: string | undefined
            if (category === 'classwork' && useScheduling && selectedDate && selectedTime) {
                const [hours, minutes] = selectedTime.split(':').map(Number)
                const dateWithTime = new Date(selectedDate)
                dateWithTime.setHours(hours, minutes, 0, 0)
                scheduledDate = dateWithTime.toISOString()

                if (selectedEndTime) {
                    const [endHours, endMinutes] = selectedEndTime.split(':').map(Number)
                    const endDateWithTime = new Date(selectedDate)
                    endDateWithTime.setHours(endHours, endMinutes, 0, 0)
                    scheduledEndDate = endDateWithTime.toISOString()
                }
            }

            const result = await updateCollection(classroomId, collectionId, title, category, scheduledDate, slidesUrl, scheduledEndDate, tabMonitoringEnabled, autoDisableTabMonitoring)
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

    const showCalendar = category === 'classwork'
    const hasChanges = title !== currentTitle || category !== currentCategory || slidesUrl !== (currentSlidesUrl || null)
        || useScheduling !== (!!currentScheduledDate)
        || (category === 'classwork' && useScheduling &&
            ((selectedDate?.toISOString() !== (currentScheduledDate ? new Date(currentScheduledDate).toISOString() : undefined))
                || (selectedTime !== (currentScheduledDate ? new Date(currentScheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ""))
                || (selectedEndTime !== (currentScheduledEndAt ? new Date(currentScheduledEndAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ""))
            ))
        || tabMonitoringEnabled !== !!currentTabMonitoringEnabled
        || autoDisableTabMonitoring !== (currentAutoDisableTabMonitoring !== false)


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
            <DialogContent className={`${showCalendar ? 'sm:max-w-xl' : 'sm:max-w-md'} max-h-[90vh] overflow-y-auto`}>
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
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                    </div>

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
                    {category === 'classwork' && (
                        <div className="space-y-4 pt-2 border-t text-sm">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="enable-scheduling"
                                    checked={useScheduling}
                                    onCheckedChange={(checked) => setUseScheduling(!!checked)}
                                />
                                <Label htmlFor="enable-scheduling" className="font-medium cursor-pointer">
                                    Nustatyti pamokos laiką
                                </Label>
                            </div>

                            {useScheduling && (
                                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <LessonCalendar
                                        lessonSchedule={lessonSchedule}
                                        initialDate={selectedDate}
                                        initialTime={selectedTime}
                                        onSelect={(date, time) => {
                                            setSelectedDate(date)
                                            setSelectedTime(time)
                                            if (time) {
                                                const [h, m] = time.split(':').map(Number)
                                                const d = new Date()
                                                d.setHours(h, m, 0, 0)
                                                d.setMinutes(d.getMinutes() + 45)
                                                const eh = d.getHours().toString().padStart(2, '0')
                                                const em = d.getMinutes().toString().padStart(2, '0')
                                                setSelectedEndTime(`${eh}:${em}`)
                                            }
                                        }}
                                    />

                                    {selectedDate && selectedTime && (
                                        <div className="space-y-3 pt-4 border-t">
                                            <Label htmlFor="lesson-end-time" className="text-sm font-medium">Lesson Ends At</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    id="lesson-end-time"
                                                    type="time"
                                                    value={selectedEndTime}
                                                    onChange={(e) => setSelectedEndTime(e.target.value)}
                                                    className="w-32"
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    Students will be locked out after this time.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
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
