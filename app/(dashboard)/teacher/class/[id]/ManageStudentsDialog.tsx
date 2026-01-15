"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Users, Loader2, UserPlus } from "lucide-react"
import { getUnassignedStudents, enrollStudent } from "../../actions"

interface Student {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    created_at: string
}

export function ManageStudentsDialog({ classroomId }: { classroomId: string }) {
    const [open, setOpen] = useState(false)
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(false)
    const [adding, setAdding] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            fetchStudents()
        }
    }, [open])

    const fetchStudents = async () => {
        setLoading(true)
        try {
            const data = await getUnassignedStudents()
            setStudents(data || [])
        } catch (err) {
            console.error("Failed to fetch students", err)
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async (studentId: string) => {
        setAdding(studentId)
        try {
            const result = await enrollStudent(studentId, classroomId)
            if (result.success) {
                // Remove from list
                setStudents(prev => prev.filter(s => s.id !== studentId))
            } else {
                console.error(result.error)
            }
        } catch (err) {
            console.error("Failed to add student", err)
        } finally {
            setAdding(null)
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Student
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Unassigned Students</DialogTitle>
                    <DialogDescription>
                        Select students to add to this classroom.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[400px] overflow-y-auto py-4 space-y-2">
                    {loading ? (
                        <div className="flex justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : students.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-4">
                            No unassigned students found.
                        </p>
                    ) : (
                        students.map((student) => (
                            <div key={student.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium text-sm">
                                        {(student.first_name || student.last_name)
                                            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                                            : "Unnamed Student"}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {student.email}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={adding === student.id}
                                    onClick={() => handleAdd(student.id)}
                                >
                                    {adding === student.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="mr-2 h-4 w-4" />
                                            Add Student
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
