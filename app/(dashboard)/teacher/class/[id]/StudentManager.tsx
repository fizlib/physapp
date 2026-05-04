"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, UserPlus, Search, Loader2, Users, Shield, ShieldOff, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getUnassignedStudents, enrollStudent, unblockStudentFromClassroom, unblockAllStudentsInClassroom, toggleCheaterMark } from "../../actions"
import { RemoveStudentButton } from "./RemoveStudentButton"
import { StudentEventLogsDialog } from "./StudentEventLogsDialog"
import { StudentProgressPanel } from "./StudentProgressPanel"
import { AddBonusPointsDialog } from "./AddBonusPointsDialog"
import { ImportStudentsDialog } from "./ImportStudentsDialog"

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


interface StudentManagerProps {
    classroomId: string
    initialEnrollments: Enrollment[]
    isTeacherAdmin: boolean
    studentPointsById: Record<string, { earned: number, max: number }>
    blockedStudentIds?: string[]
    cheaterStudentIds?: string[]
}

function formatPoints(value: number): string {
    if (!Number.isFinite(value)) return "0"
    if (Number.isInteger(value)) return value.toString()
    return value.toFixed(2).replace(/\.?0+$/, "")
}

export function StudentManager({ classroomId, initialEnrollments, isTeacherAdmin, studentPointsById, blockedStudentIds: initialBlockedIds = [], cheaterStudentIds: initialCheaterIds = [] }: StudentManagerProps) {
    const router = useRouter()
    const [view, setView] = useState<'list' | 'add' | 'detail'>('list')
    const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [addingId, setAddingId] = useState<string | null>(null)
    const [selectedStudent, setSelectedStudent] = useState<{ id: string, name: string } | null>(null)
    const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set(initialBlockedIds))
    const [unblockingId, setUnblockingId] = useState<string | null>(null)
    const [unblockingAll, setUnblockingAll] = useState(false)
    const [cheaterIds, setCheaterIds] = useState<Set<string>>(new Set(initialCheaterIds))
    const [togglingCheaterId, setTogglingCheaterId] = useState<string | null>(null)

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
        setSelectedStudent(null)
        setView('add')
        fetchUnassignedStudents()
    }

    const handleBackToList = () => {
        setSelectedStudent(null)
        setView('list')
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
        const getLastName = (enrollment: Enrollment): string =>
            (enrollment.profiles?.last_name || '').toLowerCase()
        const getFirstName = (enrollment: Enrollment): string =>
            (enrollment.profiles?.first_name || '').toLowerCase()

        return [...initialEnrollments].sort((a, b) => {
            // Blocked students always at top
            const aBlocked = blockedIds.has(a.student_id) ? 1 : 0
            const bBlocked = blockedIds.has(b.student_id) ? 1 : 0
            if (aBlocked !== bBlocked) return bBlocked - aBlocked

            // Cheater students next
            const aCheater = cheaterIds.has(a.student_id) ? 1 : 0
            const bCheater = cheaterIds.has(b.student_id) ? 1 : 0
            if (aCheater !== bCheater) return bCheater - aCheater

            // Alphabetical by surname, then first name (Lithuanian locale)
            const lastNameCmp = getLastName(a).localeCompare(getLastName(b), 'lt')
            if (lastNameCmp !== 0) return lastNameCmp
            return getFirstName(a).localeCompare(getFirstName(b), 'lt')
        })
    }, [initialEnrollments, blockedIds, cheaterIds])

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

    if (view === 'detail' && selectedStudent) {
        return (
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleBackToList} className="-ml-2 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <h2 className="font-serif text-xl font-semibold tracking-tight">{selectedStudent.name}&apos;s Progress</h2>
                    </div>
                    <StudentEventLogsDialog classroomId={classroomId} student={selectedStudent} />
                </div>

                <div className="rounded-md border border-border/40 bg-background shadow-sm">
                    <div className="p-4">
                        <StudentProgressPanel
                            classroomId={classroomId}
                            student={selectedStudent}
                        />
                    </div>
                </div>
            </div>
        )
    }

    // LIST VIEW
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold tracking-tight">Enrolled Students</h2>
                <div className="flex items-center gap-2">
                    {blockedIds.size > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            disabled={unblockingAll}
                            onClick={async () => {
                                setUnblockingAll(true)
                                try {
                                    const result = await unblockAllStudentsInClassroom(classroomId)
                                    if (result.success) {
                                        setBlockedIds(new Set())
                                        router.refresh()
                                    }
                                } catch (err) {
                                    console.error('Failed to unblock all:', err)
                                } finally {
                                    setUnblockingAll(false)
                                }
                            }}
                        >
                            {unblockingAll ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <ShieldOff className="mr-2 h-4 w-4" />
                            )}
                            Unblock All ({blockedIds.size})
                        </Button>
                    )}
                    <ImportStudentsDialog classroomId={classroomId} />
                    <AddBonusPointsDialog classroomId={classroomId} />
                    <Button size="sm" onClick={handleSwitchToAdd}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Student
                    </Button>
                </div>
            </div>

            <div className="rounded-md border border-border/40 bg-background shadow-sm">
                <div className="p-4">
                    <div className="space-y-3">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <span>Student</span>
                            <span className="text-right">Grade</span>
                            <span className="text-right">Points</span>
                            <span className="text-right">Actions</span>
                        </div>
                        <div className="divide-y divide-border/40">
                            {sortedEnrollments?.map((enrollment) => {
                                const name = (enrollment.profiles?.first_name || enrollment.profiles?.last_name)
                                    ? `${enrollment.profiles.first_name || ''} ${enrollment.profiles.last_name || ''}`.trim()
                                    : enrollment.profiles?.email || "Unknown"
                                const pointSummary = studentPointsById[enrollment.student_id] || { earned: 0, max: 0 }
                                const gradeValue = pointSummary.max > 0 ? Math.round((pointSummary.earned / pointSummary.max) * 10) : 0
                                const getGradeColor = (g: number) => {
                                    if (g >= 9) return 'text-emerald-600 bg-emerald-50'
                                    if (g >= 7) return 'text-blue-600 bg-blue-50'
                                    if (g >= 5) return 'text-amber-600 bg-amber-50'
                                    return 'text-rose-600 bg-rose-50'
                                }

                                return (
                                    <div
                                        key={enrollment.id}
                                        className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 py-3 px-2 group hover:bg-muted/30 transition-colors cursor-pointer rounded-md"
                                        onClick={() => {
                                            setSelectedStudent({ id: enrollment.student_id, name })
                                            setView('detail')
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                {enrollment.profiles?.first_name
                                                    ? enrollment.profiles.first_name[0]
                                                    : enrollment.profiles?.email?.charAt(0).toUpperCase() || "?"}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                                                    {name}
                                                    {blockedIds.has(enrollment.student_id) && (
                                                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">Blocked</span>
                                                    )}
                                                    {cheaterIds.has(enrollment.student_id) && (
                                                        <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">Cheater</span>
                                                    )}
                                                </span>
                                                <span className="font-mono text-[10px] text-muted-foreground opacity-70">
                                                    {enrollment.profiles?.email}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`inline-flex items-center justify-center font-mono text-sm font-bold tabular-nums rounded-md px-2 py-0.5 ${getGradeColor(gradeValue)}`}>
                                                {gradeValue}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-mono text-sm tabular-nums text-muted-foreground">
                                                {formatPoints(pointSummary.earned)}/{formatPoints(pointSummary.max)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            {blockedIds.has(enrollment.student_id) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                    disabled={unblockingId === enrollment.student_id}
                                                    onClick={async () => {
                                                        setUnblockingId(enrollment.student_id)
                                                        try {
                                                            const result = await unblockStudentFromClassroom(classroomId, enrollment.student_id)
                                                            if (result.success) {
                                                                setBlockedIds(prev => {
                                                                    const next = new Set(prev)
                                                                    next.delete(enrollment.student_id)
                                                                    return next
                                                                })
                                                                router.refresh()
                                                            } else {
                                                                console.error('Failed to unblock:', result.error)
                                                            }
                                                        } catch (err) {
                                                            console.error('Failed to unblock student:', err)
                                                        } finally {
                                                            setUnblockingId(null)
                                                        }
                                                    }}
                                                >
                                                    {unblockingId === enrollment.student_id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <ShieldOff className="mr-1 h-3.5 w-3.5" />
                                                            Unblock
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            {isTeacherAdmin && (
                                                <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary">
                                                    <Link href={`/admin/users?id=${enrollment.student_id}`}>
                                                        <Shield className="h-4 w-4" />
                                                        <span className="sr-only">Admin View</span>
                                                    </Link>
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cheaterIds.has(enrollment.student_id)
                                                    ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    : "text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                                                }
                                                disabled={togglingCheaterId === enrollment.student_id}
                                                onClick={async () => {
                                                    setTogglingCheaterId(enrollment.student_id)
                                                    try {
                                                        const result = await toggleCheaterMark(classroomId, enrollment.student_id)
                                                        if (result.success) {
                                                            setCheaterIds(prev => {
                                                                const next = new Set(prev)
                                                                if (result.isCheater) {
                                                                    next.add(enrollment.student_id)
                                                                } else {
                                                                    next.delete(enrollment.student_id)
                                                                }
                                                                return next
                                                            })
                                                            router.refresh()
                                                        } else {
                                                            console.error('Failed to toggle cheater:', result.error)
                                                        }
                                                    } catch (err) {
                                                        console.error('Failed to toggle cheater mark:', err)
                                                    } finally {
                                                        setTogglingCheaterId(null)
                                                    }
                                                }}
                                            >
                                                {togglingCheaterId === enrollment.student_id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <AlertTriangle className={`h-4 w-4 ${cheaterIds.has(enrollment.student_id) ? 'fill-red-600' : ''}`} />
                                                )}
                                                <span className="sr-only">Toggle cheater mark</span>
                                            </Button>
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

