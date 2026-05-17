"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Timer, Loader2, Play, CheckCircle2, Award, Users, Square } from "lucide-react"
import { startTestCollection, getStudentsForTestDialog, getCollectionTestEndTime, autoSubmitForAllTestParticipants, endTestCollection } from "../../../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface StudentForTest {
    id: string
    firstName: string | null
    lastName: string | null
    hasCompleted: boolean
    earnedPoints: number
    maxPoints: number
}

interface StartTestButtonProps {
    collectionId: string
    classroomId: string
    hasPointedExercises: boolean
}

function formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

export function StartTestButton({ collectionId, classroomId, hasPointedExercises }: StartTestButtonProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [duration, setDuration] = useState(5) // Default 5 minutes
    const [students, setStudents] = useState<StudentForTest[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const router = useRouter()

    // Active test timer state
    const [testEndTime, setTestEndTime] = useState<Date | null>(null)
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
    const [isEnding, setIsEnding] = useState(false)
    const isEndingRef = useRef(false)

    const handleTimerExpired = useCallback(async () => {
        if (!hasPointedExercises || isEndingRef.current) return
        isEndingRef.current = true
        setIsEnding(true)

        try {
            // 1. Auto-submit empty answers for all participants
            await autoSubmitForAllTestParticipants(collectionId, classroomId)
            // 2. End the test (clear timer)
            await endTestCollection(collectionId, classroomId)

            toast.success("Testas baigtas! Visi atsakymai pateikti.")
            setTestEndTime(null)
            setRemainingSeconds(null)
            router.refresh()
        } catch (err) {
            console.error("Error ending test:", err)
            toast.error("Klaida baigiant testą")
        } finally {
            setIsEnding(false)
            isEndingRef.current = false
        }
    }, [collectionId, classroomId, hasPointedExercises, router])

    // Check for active test on mount
    useEffect(() => {
        if (!hasPointedExercises) {
            setTestEndTime(null)
            setRemainingSeconds(null)
            return
        }

        let cancelled = false
        const checkActiveTest = async () => {
            const result = await getCollectionTestEndTime(collectionId, classroomId)
            if (cancelled) return
            if (result.success && result.testModeEndsAt) {
                const endTime = new Date(result.testModeEndsAt)
                if (endTime > new Date()) {
                    setTestEndTime(endTime)
                }
            }
        }
        checkActiveTest()
        return () => { cancelled = true }
    }, [collectionId, classroomId, hasPointedExercises])

    // Countdown ticker
    useEffect(() => {
        if (!hasPointedExercises || !testEndTime) {
            setRemainingSeconds(null)
            return
        }

        const tick = () => {
            const now = Date.now()
            const remaining = Math.max(0, Math.floor((testEndTime.getTime() - now) / 1000))
            setRemainingSeconds(remaining)

            if (remaining <= 0 && !isEndingRef.current) {
                // Timer expired — trigger server-side auto-submit
                handleTimerExpired()
            }
        }

        tick()
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
    }, [hasPointedExercises, testEndTime, handleTimerExpired])

    const handleEndTestEarly = async () => {
        if (isEndingRef.current) return
        isEndingRef.current = true
        setIsEnding(true)

        try {
            await autoSubmitForAllTestParticipants(collectionId, classroomId)
            await endTestCollection(collectionId, classroomId)

            toast.success("Testas baigtas anksčiau! Visi atsakymai pateikti.")
            setTestEndTime(null)
            setRemainingSeconds(null)
            router.refresh()
        } catch (err) {
            console.error("Error ending test early:", err)
            toast.error("Klaida baigiant testą")
        } finally {
            setIsEnding(false)
            isEndingRef.current = false
        }
    }

    const loadStudents = async () => {
        setLoadingStudents(true)
        try {
            const result = await getStudentsForTestDialog(classroomId, collectionId)
            if (result.success && result.students) {
                setStudents(result.students)
                // Select all by default
                setSelectedIds(new Set(result.students.map(s => s.id)))
            } else {
                toast.error(result.error || "Nepavyko gauti mokinių sąrašo")
            }
        } catch {
            toast.error("Įvyko klaida gaunant mokinių sąrašą")
        } finally {
            setLoadingStudents(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) {
            loadStudents()
        }
    }

    const toggleStudent = (studentId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(studentId)) {
                next.delete(studentId)
            } else {
                next.add(studentId)
            }
            return next
        })
    }

    const toggleAll = () => {
        if (selectedIds.size === students.length && students.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(students.map(s => s.id)))
        }
    }

    const handleStartTest = async () => {
        if (duration < 1) {
            toast.error("Trukmė turi būti bent 1 minutė")
            return
        }

        if (selectedIds.size === 0) {
            toast.error("Pasirinkite bent vieną mokinį")
            return
        }

        setLoading(true)
        try {
            const result = await startTestCollection(collectionId, classroomId, duration, Array.from(selectedIds))
            if (result.success) {
                toast.success(`Testas pradėtas! Trukmė: ${duration} min. Mokiniai: ${selectedIds.size}`)
                setOpen(false)
                // Set the test end time for the countdown
                const endTime = new Date()
                endTime.setMinutes(endTime.getMinutes() + duration)
                setTestEndTime(endTime)
                router.refresh()
            } else {
                toast.error(result.error || "Nepavyko pradėti testo")
            }
        } catch (err) {
            console.error(err)
            toast.error("Įvyko klaida")
        } finally {
            setLoading(false)
        }
    }

    const selectedWithPriorResults = students.filter(s => selectedIds.has(s.id) && s.hasCompleted)

    if (!hasPointedExercises) {
        return null
    }

    // If a test is active, show the countdown timer + end button
    if (testEndTime && remainingSeconds !== null) {
        const isExpired = remainingSeconds <= 0
        const isLowTime = remainingSeconds <= 60 && remainingSeconds > 0

        return (
            <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${isExpired
                    ? 'bg-red-100 text-red-700'
                    : isLowTime
                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                    <Timer className="h-5 w-5" />
                    {isExpired ? (
                        <span>Laikas baigėsi</span>
                    ) : (
                        <span>{formatTime(remainingSeconds)}</span>
                    )}
                </div>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEndTestEarly}
                    disabled={isEnding}
                >
                    {isEnding ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Square className="mr-2 h-4 w-4" />
                    )}
                    {isEnding ? 'Baigiama...' : 'Baigti testą'}
                </Button>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Play className="mr-2 h-4 w-4" />
                    Pradėti testą
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-amber-600" />
                        Pradėti testą
                    </DialogTitle>
                    <DialogDescription>
                        Nustatykite testo trukmę ir pasirinkite mokinius.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
                    {/* Duration */}
                    <div className="space-y-2">
                        <Label htmlFor="test-duration">Trukmė (minutėmis)</Label>
                        <Input
                            id="test-duration"
                            type="number"
                            min={1}
                            max={180}
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
                            disabled={loading}
                        />
                    </div>

                    {/* Student List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                Mokiniai ({selectedIds.size}/{students.length})
                            </Label>
                            <div className="flex items-center gap-2 pr-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Visi</span>
                                <Checkbox
                                    checked={students.length > 0 && selectedIds.size === students.length}
                                    onCheckedChange={toggleAll}
                                    disabled={loading || loadingStudents || students.length === 0}
                                />
                            </div>
                        </div>

                        {loadingStudents ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : students.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic py-4 text-center">
                                Nėra prisijungusių mokinių.
                            </p>
                        ) : (
                            <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                                {students.map((student) => {
                                    const name = [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Unnamed'
                                    const isSelected = selectedIds.has(student.id)
                                    return (
                                        <label
                                            key={student.id}
                                            className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors ${isSelected ? '' : 'opacity-60'}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleStudent(student.id)}
                                                    disabled={loading}
                                                />
                                                <span className="text-sm font-medium">{name}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {student.hasCompleted ? (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {student.earnedPoints}/{student.maxPoints} tšk.
                                                    </span>
                                                ) : student.earnedPoints > 0 ? (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        <Award className="h-3 w-3" />
                                                        {student.earnedPoints}/{student.maxPoints} tšk.
                                                    </span>
                                                ) : null}
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Warning if restarting for students with results */}
                    {selectedWithPriorResults.length > 0 && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                            <strong>⚠️ Dėmesio:</strong> {selectedWithPriorResults.length} mokin{selectedWithPriorResults.length === 1 ? 'io' : 'ių'} ankstesni rezultatai bus ištrinti pradėjus testą.
                        </div>
                    )}

                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Visos užduotys su taškais bus atrakintos (paskelbtos).</p>
                        <p>• Tik pasirinkti mokiniai matys laikmatį ir galės pateikti atsakymus.</p>
                        <p>• Pasibaigus laikui, tušti atsakymai bus automatiškai pateikti.</p>
                        <p>• Po testo užduotys vėl bus užrakintos.</p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        Atšaukti
                    </Button>
                    <Button onClick={handleStartTest} disabled={loading || loadingStudents || selectedIds.size === 0} className="bg-amber-600 hover:bg-amber-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pradėti ({selectedIds.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
