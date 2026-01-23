'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Clock } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClassroom } from "../actions"

const DAYS_OF_WEEK = [
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
    { value: 0, label: 'Sunday', short: 'Sun' },
]

const TIME_OPTIONS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
] // Kept for reference, but using time input now

interface LessonSlot {
    day: number
    time: string
}

export function CreateClassroomDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [classroomType, setClassroomType] = useState<'school_class' | 'private_student'>('school_class')
    const [lessonSchedule, setLessonSchedule] = useState<LessonSlot[]>([])

    const toggleDay = (day: number) => {
        const existing = lessonSchedule.find(s => s.day === day)
        if (existing) {
            setLessonSchedule(lessonSchedule.filter(s => s.day !== day))
        } else {
            setLessonSchedule([...lessonSchedule, { day, time: '09:00' }])
        }
    }

    const updateTime = (day: number, time: string) => {
        setLessonSchedule(lessonSchedule.map(s =>
            s.day === day ? { ...s, time } : s
        ))
    }

    const isDaySelected = (day: number) => lessonSchedule.some(s => s.day === day)
    const getTimeForDay = (day: number) => lessonSchedule.find(s => s.day === day)?.time || '09:00'

    async function handleSubmit(formData: FormData) {
        setIsPending(true)
        try {
            // Add lesson schedule to form data if school_class
            if (classroomType === 'school_class' && lessonSchedule.length > 0) {
                formData.set('lessonSchedule', JSON.stringify(lessonSchedule))
            }

            const result = await createClassroom(formData)
            if (result.success) {
                setOpen(false)
                // Reset form state
                setLessonSchedule([])
                setClassroomType('school_class')
            } else {
                console.error(result.error)
            }
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" />
                    New Classroom
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Create Classroom</DialogTitle>
                        <DialogDescription>
                            Enter the name for your new class.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Classroom Name</Label>
                            <Input id="name" name="name" placeholder="e.g. Advanced Quantum Mechanics" required className="bg-muted/30" />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Classroom Type</Label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="school_class"
                                        checked={classroomType === 'school_class'}
                                        onChange={() => setClassroomType('school_class')}
                                        className="accent-primary"
                                    />
                                    School Class
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value="private_student"
                                        checked={classroomType === 'private_student'}
                                        onChange={() => setClassroomType('private_student')}
                                        className="accent-primary"
                                    />
                                    Private Student
                                </label>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                School Classes have Classwork/Homework. Private Students only have Homework.
                            </p>
                        </div>

                        {/* Lesson Schedule - Only for School Class */}
                        {classroomType === 'school_class' && (
                            <div className="grid gap-3 pt-2 border-t">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Lesson Schedule (Optional)
                                    </Label>
                                </div>
                                <p className="text-[10px] text-muted-foreground -mt-1">
                                    Select days and times when lessons occur. This helps with scheduling classwork.
                                </p>
                                <div className="space-y-2">
                                    {DAYS_OF_WEEK.slice(0, 5).map((day) => (
                                        <div key={day.value} className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 min-w-[120px] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isDaySelected(day.value)}
                                                    onChange={() => toggleDay(day.value)}
                                                    className="accent-primary h-4 w-4"
                                                />
                                                <span className="text-sm">{day.label}</span>
                                            </label>
                                            {isDaySelected(day.value) && (
                                                <input
                                                    type="time"
                                                    value={getTimeForDay(day.value)}
                                                    onChange={(e) => updateTime(day.value, e.target.value)}
                                                    className="text-sm border rounded px-2 py-1 bg-background w-32"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {lessonSchedule.length > 0 && (
                                    <p className="text-xs text-primary">
                                        {lessonSchedule.length} lesson{lessonSchedule.length > 1 ? 's' : ''} per week
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
