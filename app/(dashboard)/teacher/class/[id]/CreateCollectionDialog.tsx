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
import { Loader2, Plus } from "lucide-react"
import { createCollection } from "../../actions"
import { toast } from "sonner"
import { LessonCalendar } from "@/components/teacher/LessonCalendar"

interface LessonSlot {
    day: number
    time: string
}

interface CreateCollectionDialogProps {
    classroomId: string
    classroomType?: string
    lessonSchedule?: LessonSlot[] | null
}

export function CreateCollectionDialog({ classroomId, classroomType = 'school_class', lessonSchedule }: CreateCollectionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [category, setCategory] = useState<'homework' | 'classwork'>('homework')

    // Calendar state
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<string>("")

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

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

            const result = await createCollection(classroomId, title, category, scheduledDate)
            if (result.success) {
                toast.success("Collection created successfully!")
                setOpen(false)
                resetForm()
            } else {
                toast.error(result.error || "Failed to create collection")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setTitle("")
        setCategory('homework')
        setSelectedDate(null)
        setSelectedTime("")
    }

    const showCalendar = category === 'classwork'

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    New Collection
                </Button>
            </DialogTrigger>
            <DialogContent className={`${showCalendar ? 'sm:max-w-xl' : 'sm:max-w-md'} max-h-[90vh] overflow-y-auto`}>
                <DialogHeader>
                    <DialogTitle>Create Exercise Collection</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="collection-title">Collection Title</Label>
                        <Input
                            id="collection-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Kinematics Chapter 1"
                            disabled={loading}
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
                                        checked={category === 'classwork'}
                                        onChange={() => setCategory('classwork')}
                                        className="accent-primary"
                                    />
                                    Classwork
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="category"
                                        value="homework"
                                        checked={category === 'homework'}
                                        onChange={() => setCategory('homework')}
                                        className="accent-primary"
                                    />
                                    Homework
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Calendar for Classwork scheduling */}
                    {showCalendar && (
                        <div className="space-y-3 pt-2 border-t">
                            <LessonCalendar
                                lessonSchedule={lessonSchedule}
                                onSelect={(date, time) => {
                                    setSelectedDate(date)
                                    setSelectedTime(time)
                                }}
                            />
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={loading || !title.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Collection
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
