"use client"

import { useState, useMemo } from "react"
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
import { Loader2, Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { createCollection } from "../../actions"
import { toast } from "sonner"

interface LessonSlot {
    day: number
    time: string
}

interface CreateCollectionDialogProps {
    classroomId: string
    classroomType?: string
    lessonSchedule?: LessonSlot[] | null
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

export function CreateCollectionDialog({ classroomId, classroomType = 'school_class', lessonSchedule }: CreateCollectionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [category, setCategory] = useState<'homework' | 'classwork'>('homework')

    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<string>("")

    // Get available times for the selected date based on lesson schedule
    const availableTimesForSelectedDate = useMemo(() => {
        if (!selectedDate || !lessonSchedule || lessonSchedule.length === 0) return []
        const dayOfWeek = selectedDate.getDay()
        return lessonSchedule
            .filter(slot => slot.day === dayOfWeek)
            .map(slot => slot.time)
            .sort()
    }, [selectedDate, lessonSchedule])

    // Get days in current month view
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()

        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startPadding = firstDay.getDay()

        const days: { date: Date; isCurrentMonth: boolean; isLessonDay: boolean }[] = []

        // Previous month padding
        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i)
            const isLessonDay = lessonSchedule?.some(s => s.day === date.getDay()) || false
            days.push({ date, isCurrentMonth: false, isLessonDay })
        }

        // Current month days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(year, month, d)
            const isLessonDay = lessonSchedule?.some(s => s.day === date.getDay()) || false
            days.push({ date, isCurrentMonth: true, isLessonDay })
        }

        // Next month padding to fill grid
        const remaining = 42 - days.length // 6 rows * 7 days
        for (let i = 1; i <= remaining; i++) {
            const date = new Date(year, month + 1, i)
            const isLessonDay = lessonSchedule?.some(s => s.day === date.getDay()) || false
            days.push({ date, isCurrentMonth: false, isLessonDay })
        }

        return days
    }, [currentMonth, lessonSchedule])

    const isDateSelected = (date: Date) => {
        if (!selectedDate) return false
        return date.toDateString() === selectedDate.toDateString()
    }

    const isToday = (date: Date) => {
        return date.toDateString() === new Date().toDateString()
    }

    const isPastDate = (date: Date) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today
    }

    const handleDateSelect = (date: Date, isLessonDay: boolean) => {
        if (isPastDate(date)) return

        setSelectedDate(date)

        // Auto-select time if only one option or reset
        const dayOfWeek = date.getDay()
        const times = lessonSchedule?.filter(s => s.day === dayOfWeek).map(s => s.time) || []
        if (times.length === 1) {
            setSelectedTime(times[0])
        } else {
            setSelectedTime("")
        }
    }

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
        setCurrentMonth(new Date())
    }

    const goToPrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
    }

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
    }

    const showCalendar = category === 'classwork' && lessonSchedule && lessonSchedule.length > 0

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
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Label>Schedule Lesson Date</Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Highlighted dates are your preset lesson days. Select when this classwork should happen.
                            </p>

                            {/* Calendar Header */}
                            <div className="flex items-center justify-between mb-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={goToPrevMonth}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-medium text-sm">
                                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={goToNextMonth}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Day Headers */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                                {DAYS_OF_WEEK.map(day => (
                                    <div key={day} className="text-xs font-medium text-muted-foreground py-1">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((dayInfo, idx) => {
                                    const { date, isCurrentMonth, isLessonDay } = dayInfo
                                    const past = isPastDate(date)
                                    const selected = isDateSelected(date)
                                    const today = isToday(date)

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            disabled={past || !isCurrentMonth}
                                            onClick={() => handleDateSelect(date, isLessonDay)}
                                            className={`
                                                p-2 text-sm rounded-md transition-all relative
                                                ${!isCurrentMonth ? 'text-muted-foreground/30' : ''}
                                                ${past ? 'text-muted-foreground/30 cursor-not-allowed' : 'cursor-pointer hover:bg-muted'}
                                                ${isLessonDay && isCurrentMonth && !past ? 'bg-primary/10 font-medium' : ''}
                                                ${selected ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}
                                                ${today && !selected ? 'ring-1 ring-primary' : ''}
                                            `}
                                        >
                                            {date.getDate()}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Time Selection */}
                            {selectedDate && (
                                <div className="space-y-2 pt-2 border-t">
                                    <Label className="text-sm">
                                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </Label>
                                    {availableTimesForSelectedDate.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {availableTimesForSelectedDate.map(time => (
                                                <button
                                                    key={time}
                                                    type="button"
                                                    onClick={() => setSelectedTime(time)}
                                                    className={`
                                                        px-3 py-1.5 text-sm rounded-md border transition-all
                                                        ${selectedTime === time
                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                            : 'bg-background hover:bg-muted border-border'}
                                                    `}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">
                                            No preset lesson time for this day. Choose a different date or add this day to your classroom schedule.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Summary */}
                            {selectedDate && selectedTime && (
                                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm">
                                    <span className="font-medium">Scheduled:</span>{' '}
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {selectedTime}
                                </div>
                            )}
                        </div>
                    )}

                    {/* No schedule warning for classwork */}
                    {category === 'classwork' && (!lessonSchedule || lessonSchedule.length === 0) && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                            <p className="font-medium">No lesson schedule set</p>
                            <p className="text-xs mt-1">
                                Add lesson days and times in Classroom Settings to enable calendar scheduling.
                            </p>
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
