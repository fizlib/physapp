"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, Download, Users } from "lucide-react"
import { getTeacherClassrooms, getClassroomStudents, importStudentsFromClass } from "../../actions"
import { toast } from "sonner"

interface ImportStudentsDialogProps {
    classroomId: string
}

interface StudentPreview {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
}

export function ImportStudentsDialog({ classroomId }: ImportStudentsDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetchingClasses, setFetchingClasses] = useState(false)
    const [fetchingStudents, setFetchingStudents] = useState(false)

    const [classrooms, setClassrooms] = useState<{ id: string, name: string }[]>([])
    const [selectedSourceClassId, setSelectedSourceClassId] = useState<string>("")
    const [setAsActive, setSetAsActive] = useState(false)

    const [students, setStudents] = useState<StudentPreview[]>([])

    useEffect(() => {
        if (open) {
            loadClassrooms()
        }
    }, [open])

    useEffect(() => {
        if (selectedSourceClassId) {
            loadStudents(selectedSourceClassId)
        } else {
            setStudents([])
        }
    }, [selectedSourceClassId])

    const loadClassrooms = async () => {
        setFetchingClasses(true)
        try {
            const data = await getTeacherClassrooms(classroomId)
            setClassrooms(data)
        } catch (err) {
            console.error(err)
            toast.error("Failed to load classes")
        } finally {
            setFetchingClasses(false)
        }
    }

    const loadStudents = async (sourceClassId: string) => {
        setFetchingStudents(true)
        try {
            const data = await getClassroomStudents(sourceClassId)
            setStudents(data)
        } catch (err) {
            console.error(err)
            toast.error("Failed to load students")
        } finally {
            setFetchingStudents(false)
        }
    }

    const handleImport = async () => {
        if (!selectedSourceClassId) return

        setLoading(true)
        try {
            const result = await importStudentsFromClass(classroomId, selectedSourceClassId, setAsActive)
            if (result.success) {
                toast.success(result.message || "Students imported successfully!")
                setOpen(false)
                resetForm()
                router.refresh()
            } else {
                toast.error(result.error || "Failed to import students")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setSelectedSourceClassId("")
        setStudents([])
        setSetAsActive(false)
    }

    const selectedClassName = classrooms.find(c => c.id === selectedSourceClassId)?.name || ""

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Import from Class
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Students from Another Class</DialogTitle>
                    <DialogDescription>
                        Students from the selected class will be copied to this class. They will remain enrolled in the source class as well.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="source-class-students">Source Class</Label>
                        {fetchingClasses ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading classes...
                            </div>
                        ) : classrooms.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No other classes found.</p>
                        ) : (
                            <select
                                id="source-class-students"
                                value={selectedSourceClassId}
                                onChange={(e) => setSelectedSourceClassId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={loading}
                            >
                                <option value="">Select a class...</option>
                                {classrooms.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {selectedSourceClassId && (
                        <div className="space-y-2">
                            <Label>Students to import</Label>
                            {fetchingStudents ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading students...
                                </div>
                            ) : students.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No students enrolled in this class.</p>
                            ) : (
                                <div className="rounded-md border border-border/40 max-h-[250px] overflow-y-auto">
                                    <div className="divide-y divide-border/40">
                                        {students.map((student) => (
                                            <div key={student.id} className="flex items-center gap-3 px-3 py-2">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                    {student.first_name ? student.first_name[0] : (student.email?.[0]?.toUpperCase() || '?')}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-foreground truncate">
                                                        {(student.first_name || student.last_name)
                                                            ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                                                            : "Unnamed Student"}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-muted-foreground opacity-70 truncate">
                                                        {student.email}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-border/40 px-3 py-1.5 bg-muted/30">
                                        <span className="text-xs text-muted-foreground font-medium">{students.length} student(s)</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedSourceClassId && students.length > 0 && (
                        <>
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 flex gap-2">
                                <p className="text-xs text-blue-800">
                                    {students.length} student(s) will be <strong>copied</strong> to this class. They will stay enrolled in &ldquo;{selectedClassName}&rdquo; as well.
                                </p>
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={setAsActive}
                                    onChange={(e) => setSetAsActive(e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm text-foreground">
                                    Set this as the active classroom for imported students
                                </span>
                            </label>
                        </>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleImport}
                            disabled={loading || !selectedSourceClassId || students.length === 0}
                            className="w-full sm:w-auto"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Users className="mr-2 h-4 w-4" />
                            Import {students.length > 0 ? `${students.length} Student(s)` : 'Students'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
