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
    DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Settings, Trash2, AlertTriangle, Check, Clock } from "lucide-react"
import { toast } from "sonner"
import { updateClassroomType, deleteClassroom, updateLessonSchedule } from "../../actions"
import { useRouter } from "next/navigation"

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

interface ClassSettingsDialogProps {
    classroomId: string
    currentType: 'private_student' | 'school_class'
    currentLessonSchedule?: LessonSlot[] | null
    trigger?: React.ReactNode
}

export function ClassSettingsDialog({ classroomId, currentType, currentLessonSchedule, trigger }: ClassSettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [type, setType] = useState(currentType)
    const [lessonSchedule, setLessonSchedule] = useState<LessonSlot[]>(currentLessonSchedule || [])
    const router = useRouter()

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setType(currentType)
            setLessonSchedule(currentLessonSchedule || [])
        }
    }, [open, currentType, currentLessonSchedule])

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

    const hasTypeChanged = type !== currentType
    const hasScheduleChanged = JSON.stringify(lessonSchedule.sort((a, b) => a.day - b.day)) !==
        JSON.stringify((currentLessonSchedule || []).sort((a, b) => a.day - b.day))
    const hasChanges = hasTypeChanged || hasScheduleChanged

    const handleSave = async () => {
        setLoading(true)
        try {
            // Update type if changed
            if (hasTypeChanged) {
                const result = await updateClassroomType(classroomId, type)
                if (!result.success) {
                    toast.error(result.error || "Failed to update type")
                    setLoading(false)
                    return
                }
            }

            // Update lesson schedule if changed (only for school_class)
            if (hasScheduleChanged && type === 'school_class') {
                const result = await updateLessonSchedule(classroomId, lessonSchedule)
                if (!result.success) {
                    toast.error(result.error || "Failed to update schedule")
                    setLoading(false)
                    return
                }
            }

            toast.success("Settings updated")
            setOpen(false)
        } catch (err) {
            toast.error("An error occurred")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await deleteClassroom(classroomId)
            if (result.success) {
                toast.success("Classroom deleted")
                router.push('/teacher')
            } else {
                toast.error(result.error || "Failed to delete classroom")
                setLoading(false)
            }
        } catch (err) {
            toast.error("An error occurred")
            setLoading(false)
        }
    }

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
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Classroom Settings</DialogTitle>
                    <DialogDescription>
                        Manage general settings and danger zone actions.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Type Settings */}
                    <div className="space-y-3">
                        <Label>Classroom Type</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <label className={`
                                flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50
                                ${type === 'school_class' ? 'border-primary bg-primary/5' : 'border-border'}
                            `}>
                                <input
                                    type="radio"
                                    name="settings-type"
                                    value="school_class"
                                    className="sr-only"
                                    checked={type === 'school_class'}
                                    onChange={() => setType('school_class')}
                                />
                                <span className="font-semibold text-sm">School Class</span>
                                <span className="text-xs text-muted-foreground mt-1">Classwork & Homework</span>
                                {type === 'school_class' && <Check className="w-4 h-4 text-primary mt-2" />}
                            </label>

                            <label className={`
                                flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-muted/50
                                ${type === 'private_student' ? 'border-primary bg-primary/5' : 'border-border'}
                            `}>
                                <input
                                    type="radio"
                                    name="settings-type"
                                    value="private_student"
                                    className="sr-only"
                                    checked={type === 'private_student'}
                                    onChange={() => setType('private_student')}
                                />
                                <span className="font-semibold text-sm">Private Student</span>
                                <span className="text-xs text-muted-foreground mt-1">Homework Only</span>
                                {type === 'private_student' && <Check className="w-4 h-4 text-primary mt-2" />}
                            </label>
                        </div>
                    </div>

                    {/* Lesson Schedule - Only for School Class */}
                    {type === 'school_class' && (
                        <>
                            <div className="h-px bg-border" />
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <Label>Lesson Schedule</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
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
                        </>
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
                                <p className="text-sm font-medium text-red-900">Delete Classroom</p>
                                <p className="text-xs text-red-700">
                                    Permanently delete this classroom and all its data.
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
                    <Button onClick={handleSave} disabled={loading || !hasChanges}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>

                {/* Nested Delete Confirmation Dialog */}
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="text-red-600">Delete Classroom?</DialogTitle>
                            <DialogDescription>
                                Accompanying assignments, submissions, and student enrollments will be permanently removed. This action cannot be undone.
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
