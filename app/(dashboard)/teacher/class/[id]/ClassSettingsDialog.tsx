"use client"

import { useState } from "react"
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
import { Settings, Trash2, AlertTriangle, Check } from "lucide-react"
import { toast } from "sonner"
import { updateClassroomType, deleteClassroom } from "../../actions"
import { useRouter } from "next/navigation"

interface ClassSettingsDialogProps {
    classroomId: string
    currentType: 'private_student' | 'school_class'
}

export function ClassSettingsDialog({ classroomId, currentType }: ClassSettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [type, setType] = useState(currentType)
    const router = useRouter()

    const handleUpdateType = async () => {
        if (type === currentType) return

        setLoading(true)
        try {
            const result = await updateClassroomType(classroomId, type)
            if (result.success) {
                toast.success("Classroom type updated")
                setOpen(false)
            } else {
                toast.error(result.error || "Failed to update type")
            }
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
                <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
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
                    <Button onClick={handleUpdateType} disabled={loading || type === currentType}>
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
