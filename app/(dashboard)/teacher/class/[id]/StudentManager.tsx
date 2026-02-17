"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, UserPlus, Search, Loader2, Users, Shield, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
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

interface EnrollmentProfile {
    first_name: string | null
    last_name: string | null
    email: string | null
}

interface Enrollment {
    id: string
    student_id: string
    profiles: EnrollmentProfile | null
}

type PointsSortDirection = 'desc' | 'asc'

interface StudentManagerProps {
    classroomId: string
    initialEnrollments: Enrollment[]
    isTeacherAdmin: boolean
    studentPointsById: Record<string, { earned: number, max: number }>
}

function formatPoints(value: number): string {
    if (!Number.isFinite(value)) return "0"
    if (Number.isInteger(value)) return value.toString()
    return value.toFixed(2).replace(/\.?0+$/, "")
}

export function StudentManager({ classroomId, initialEnrollments, isTeacherAdmin, studentPointsById }: StudentManagerProps) {
    const router = useRouter()
    const [view, setView] = useState<'list' | 'add'>('list')
    const [pointsSortDirection, setPointsSortDirection] = useState<PointsSortDirection>('desc')
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

    const sortedEnrollments = useMemo(() => {
        const getDisplayName = (enrollment: Enrollment): string => (
            (enrollment.profiles?.first_name || enrollment.profiles?.last_name)
                ? `${enrollment.profiles?.first_name || ''} ${enrollment.profiles?.last_name || ''}`.trim()
                : enrollment.profiles?.email || "Unknown"
        )

        return [...initialEnrollments].sort((a, b) => {
            const aEarned = Number(studentPointsById[a.student_id]?.earned) || 0
            const bEarned = Number(studentPointsById[b.student_id]?.earned) || 0

            if (aEarned !== bEarned) {
                return pointsSortDirection === 'desc' ? bEarned - aEarned : aEarned - bEarned
            }

            return getDisplayName(a).localeCompare(getDisplayName(b))
        })
    }, [initialEnrollments, studentPointsById, pointsSortDirection])

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
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <span>Student</span>
                            <button
                                type="button"
                                className="inline-flex items-center justify-end gap-1 text-right hover:text-foreground transition-colors"
                                onClick={() => setPointsSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                                title={`Sort by earned points (${pointsSortDirection === 'desc' ? 'high to low' : 'low to high'})`}
                            >
                                <span>Points</span>
                                {pointsSortDirection === 'desc' ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                )}
                            </button>
                            <span className="text-right">Actions</span>
                        </div>
                        <div className="divide-y divide-border/40">
                            {sortedEnrollments?.map((enrollment) => {
                                const name = (enrollment.profiles?.first_name || enrollment.profiles?.last_name)
                                    ? `${enrollment.profiles.first_name || ''} ${enrollment.profiles.last_name || ''}`.trim()
                                    : enrollment.profiles?.email || "Unknown"
                                const pointSummary = studentPointsById[enrollment.student_id] || { earned: 0, max: 0 }

                                return (
                                    <div
                                        key={enrollment.id}
                                        className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-3 px-2 group hover:bg-muted/30 transition-colors cursor-pointer rounded-md"
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
                                        <div className="text-right">
                                            <span className="font-mono text-sm tabular-nums text-muted-foreground">
                                                {formatPoints(pointSummary.earned)}/{formatPoints(pointSummary.max)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            {isTeacherAdmin && (
                                                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary">
                                                    <Link href={`/admin/users?id=${enrollment.student_id}`}>
                                                        <Shield className="h-4 w-4" />
                                                        <span className="sr-only">Admin View</span>
                                                    </Link>
                                                </Button>
                                            )}
                                            <RemoveStudentButton
                                                studentId={enrollment.student_id}
                                                classroomId={classroomId}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            {sortedEnrollments?.length === 0 && (
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

