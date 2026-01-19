"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, UserPlus, Search, Loader2, Users, X } from "lucide-react"
import { getUnassignedStudents, enrollStudent } from "../../actions"
import { RemoveStudentButton } from "./RemoveStudentButton"
import { StudentProgressDialog } from "./StudentProgressDialog"

interface Student {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    created_at: string
}

interface StudentManagerProps {
    classroomId: string
    initialEnrollments: any[]
}

export function StudentManager({ classroomId, initialEnrollments }: StudentManagerProps) {
    const router = useRouter()
    const [view, setView] = useState<'list' | 'add'>('list')
    const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [addingId, setAddingId] = useState<string | null>(null)
    const [selectedStudent, setSelectedStudent] = useState<{ id: string, name: string } | null>(null)

    const fetchUnassignedStudents = async () => {
        setIsLoading(true)
        try {
            const data = await getUnassignedStudents()
            setUnassignedStudents(data || [])
        } catch (error) {
            console.error("Failed to fetch unassigned students:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSwitchToAdd = () => {
        setView('add')
        fetchUnassignedStudents()
    }

    const handleAddStudent = async (studentId: string) => {
        setAddingId(studentId)
        try {
            const result = await enrollStudent(studentId, classroomId)
            if (result.success) {
                // Remove from local list
                setUnassignedStudents(prev => prev.filter(s => s.id !== studentId))
                // Refresh server data to update the enrollment list
                router.refresh()
            } else {
                console.error(result.message)
            }
        } catch (error) {
            console.error("Failed to enroll student:", error)
        } finally {
            setAddingId(null)
        }
    }

    const filteredStudents = unassignedStudents.filter(student => {
        const query = searchQuery.toLowerCase()
        const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase()
        const email = (student.email || '').toLowerCase()
        return fullName.includes(query) || email.includes(query)
    })

    if (view === 'add') {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setView('list')} className="-ml-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <h2 className="font-serif text-xl font-semibold tracking-tight">Add Students</h2>
                    </div>
                </div>

                <div className="rounded-md border border-border/40 bg-background shadow-sm p-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by name or email..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {searchQuery ? "No matching students found." : "No unassigned students available."}
                            </div>
                        ) : (
                            <div className="divide-y divide-border/40">
                                {filteredStudents.map((student) => (
                                    <div key={student.id} className="flex items-center justify-between py-3 px-2 group hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                                                {student.first_name ? student.first_name[0] : (student.email?.[0]?.toUpperCase() || '?')}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground">
                                                    {(student.first_name || student.last_name)
                                                        ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
                                                        : "Unnamed Student"}
                                                </span>
                                                <span className="font-mono text-[10px] text-muted-foreground opacity-70">
                                                    {student.email}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddStudent(student.id)}
                                            disabled={addingId === student.id}
                                        >
                                            {addingId === student.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Add
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // LIST VIEW
    return (
        <div className="space-y-6 animate-fade-in-up">
            <StudentProgressDialog
                classroomId={classroomId}
                student={selectedStudent}
                onClose={() => setSelectedStudent(null)}
            />

            <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold tracking-tight">Enrolled Students</h2>
                <Button size="sm" onClick={handleSwitchToAdd}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Student
                </Button>
            </div>

            <div className="rounded-md border border-border/40 bg-background shadow-sm">
                <div className="p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground px-2">
                            <span>Student</span>
                            <span>Actions</span>
                        </div>
                        <div className="divide-y divide-border/40">
                            {initialEnrollments?.map((enrollment: any) => {
                                const name = (enrollment.profiles?.first_name || enrollment.profiles?.last_name)
                                    ? `${enrollment.profiles.first_name || ''} ${enrollment.profiles.last_name || ''}`.trim()
                                    : enrollment.profiles?.email || "Unknown"

                                return (
                                    <div
                                        key={enrollment.id}
                                        className="flex items-center justify-between py-3 px-2 group hover:bg-muted/30 transition-colors cursor-pointer rounded-md"
                                        onClick={() => setSelectedStudent({ id: enrollment.student_id, name })}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                {enrollment.profiles?.first_name
                                                    ? enrollment.profiles.first_name[0]
                                                    : enrollment.profiles?.email?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground">
                                                    {name}
                                                </span>
                                                <span className="font-mono text-[10px] text-muted-foreground opacity-70">
                                                    {enrollment.profiles?.email}
                                                </span>
                                            </div>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <RemoveStudentButton
                                                studentId={enrollment.student_id}
                                                classroomId={classroomId}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            {initialEnrollments?.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                    <div className="rounded-full bg-muted/30 p-3 mb-3">
                                        <Users className="h-6 w-6 opacity-40" />
                                    </div>
                                    <p className="text-sm italic">No students enrolled yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

