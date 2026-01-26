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
import { Settings, Loader2, Trash2, AlertTriangle, Check } from "lucide-react"
import { updateCollection, deleteCollection } from "../../../../actions"
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
    lessonSchedule?: LessonSlot[] | null
    trigger?: React.ReactNode
}

export function CollectionSettingsDialog({
    classroomId,
    collectionId,
    currentTitle,
    currentCategory,
    currentScheduledDate,
    lessonSchedule,
    trigger
}: CollectionSettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState(currentTitle)
    const [category, setCategory] = useState<'homework' | 'classwork'>(currentCategory)

    // Calendar state
    const [selectedDate, setSelectedDate] = useState<Date | null>(currentScheduledDate ? new Date(currentScheduledDate) : null)
    const [selectedTime, setSelectedTime] = useState<string>("")
    const [deleteOpen, setDeleteOpen] = useState(false)

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
            } else {
                setSelectedDate(null)
                setSelectedTime("")
            }
        }
    }, [open, currentTitle, currentCategory, currentScheduledDate])

    const handleSave = async () => {
        setLoading(true)
        try {
            // Build scheduled date if classwork with schedule selected
            let scheduledDate: string | undefined
            if (category === 'classwork' && selectedDate && selectedTime) {
                const [hours, minutes] = selectedTime.split(':').map(Number)
                const dateWithTime = new Date(selectedDate)
                dateWithTime.setHours(hours, minutes, 0, 0)
                scheduledDate = dateWithTime.toISOString()
            }

            const result = await updateCollection(classroomId, collectionId, title, category, scheduledDate)
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
            const result = await deleteCollection(collectionId, classroomId)
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

    const showCalendar = category === 'classwork'
    const hasChanges = title !== currentTitle || category !== currentCategory
        || (category === 'classwork' &&
            ((selectedDate?.toISOString() !== (currentScheduledDate ? new Date(currentScheduledDate).toISOString() : undefined))
                || (selectedTime !== (currentScheduledDate ? new Date(currentScheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ""))
            ))


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

                    {/* Calendar for Classwork scheduling */}
                    {showCalendar && (
                        <div className="space-y-3 pt-2 border-t">
                            <LessonCalendar
                                lessonSchedule={lessonSchedule}
                                initialDate={selectedDate}
                                initialTime={selectedTime}
                                onSelect={(date, time) => {
                                    setSelectedDate(date)
                                    setSelectedTime(time)
                                }}
                            />
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
                                Are you sure you want to delete this collection? The exercises inside will not be deleted, just unlinked from this collection.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                                {loading ? "Deleting..." : "Yes, Delete It"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </DialogContent>
        </Dialog>
    )
}
