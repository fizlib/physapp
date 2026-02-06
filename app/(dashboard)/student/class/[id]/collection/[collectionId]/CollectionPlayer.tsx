"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Layers, ChevronDown, Loader2, Lock, Award } from "lucide-react"
import Link from "next/link"
import { StudentAssignmentInterface } from "../../assignment/[assignmentId]/StudentAssignmentInterface"
import { Card, CardContent } from "@/components/ui/card"
import Confetti from "react-confetti"
import { useWindowSize } from "react-use"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { checkIpAccess, getCollectionAssignments, getCollectionResults, autoSubmitCollectionPointsAnswers, getCollectionProgress } from "../../../../actions"
import { ShieldAlert, CheckCircle2, XCircle, FileText } from "lucide-react"
import { SlidesButton } from "@/components/student/SlidesButton"

interface CollectionPlayerProps {
    collection: any
    classroomId: string
    progressData?: any[]
    allAssignments?: any[] // All assignments including unpublished, for tracking waiting state
}

export function CollectionPlayer({ collection, classroomId, progressData = [], allAssignments: initialAllAssignments = [] }: CollectionPlayerProps) {
    // Determine if this is classwork (all published accessible) or homework (sequential unlock)
    const isClasswork = collection.category === 'classwork'

    // Use state for assignments so we can dynamically add newly published ones
    const [assignments, setAssignments] = useState(collection.assignments || [])
    // Also track allAssignments as state to update dropdown locked status
    const [allAssignmentsState, setAllAssignmentsState] = useState(initialAllAssignments)
    // Track progress data as state so we can refresh it when assignments update
    const [progressDataState, setProgressDataState] = useState(progressData)

    // Determine initial state based on progress
    // Create a map for easy lookup - use useMemo to recalculate when progressDataState changes
    const progressMap = useMemo(() => {
        const map = new Map()
        progressDataState.forEach(p => {
            map.set(p.assignment_id, p)
        })
        return map
    }, [progressDataState])

    // Better logic for initial index:
    let initialIndex = 0
    let allDone = false
    let initialMaxReached = 0 // For homework: track highest reached exercise

    for (let i = 0; i < assignments.length; i++) {
        const p = progressMap.get(assignments[i].id)
        if (p?.is_completed) {
            initialMaxReached = Math.max(initialMaxReached, i + 1) // Can access next one
        }
        if (!p || !p.is_completed) {
            initialIndex = i
            break
        }
        if (i === assignments.length - 1) {
            allDone = true
            initialIndex = i // Stay at last one
            initialMaxReached = i
        }
    }

    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const urlIndex = searchParams.get('ex')
    const parsedUrlIndex = useMemo(() => {
        if (!urlIndex) return null
        const idx = parseInt(urlIndex) - 1
        return isNaN(idx) ? null : idx
    }, [urlIndex])

    const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(() => {
        if (parsedUrlIndex !== null && parsedUrlIndex >= 0 && parsedUrlIndex < assignments.length) {
            // Respect URL if valid
            return parsedUrlIndex
        }
        return initialIndex
    })

    // Sync URL with currentAssignmentIndex
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        const currentEx = (currentAssignmentIndex + 1).toString()
        if (params.get('ex') !== currentEx) {
            params.set('ex', currentEx)
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }, [currentAssignmentIndex, pathname, router, searchParams])

    const [maxReachedIndex, setMaxReachedIndex] = useState(initialMaxReached) // For homework sequential unlock
    const [isCompleted, setIsCompleted] = useState(allDone)
    const [restrictionData, setRestrictionData] = useState<{ isRestricted: boolean, studentIp?: string }>({ isRestricted: false })
    const [isWaitingForUnlock, setIsWaitingForUnlock] = useState(false)
    const [waitingForAssignmentId, setWaitingForAssignmentId] = useState<string | null>(null)
    const { width, height } = useWindowSize()

    // Function to refresh progress data from server
    const refreshProgress = async () => {
        const result = await getCollectionProgress(collection.id)
        if (result.success && result.progress) {
            setProgressDataState(result.progress)
        }
    }

    const totalAssignments = assignments.length
    const currentAssignment = assignments[currentAssignmentIndex]

    // Points results state
    const [pointsResults, setPointsResults] = useState<{
        totalPoints: number
        earnedPoints: number
        exercises: Array<{
            id: string
            title: string
            pointsEnabled: boolean
            points: number
            earnedPoints: number | null
            isCorrect: boolean | null
        }>
    } | null>(null)

    // Fetch points results when completed
    useEffect(() => {
        if (isCompleted && isClasswork) {
            getCollectionResults(collection.id).then(res => {
                if (res.success && res.results) {
                    setPointsResults(res.results)
                }
            })
        }
    }, [isCompleted, isClasswork, collection.id])

    // Get progress for current assignment
    const currentProgress = progressMap.get(currentAssignment?.id)
    const currentCompletedIndices = currentProgress?.completed_question_indices || []
    const currentIsCompleted = currentProgress?.is_completed || false
    const currentActiveIndex = currentProgress?.active_question_index

    // Find the next assignment (could be unpublished)
    const getNextAssignmentFromAllAssignments = () => {
        if (!allAssignmentsState.length) return null
        // Find current assignment's order_index
        const currentOrderIndex = currentAssignment?.order_index ?? 0
        // Find the next assignment by order_index
        const sorted = [...allAssignmentsState].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        const currentPos = sorted.findIndex((a: any) => a.id === currentAssignment?.id)
        if (currentPos >= 0 && currentPos < sorted.length - 1) {
            return sorted[currentPos + 1]
        }
        return null
    }

    const handleAssignmentFinish = async () => {
        // Double check IP before moving to next assignment
        const result = await checkIpAccess(classroomId, collection.category, collection.id)
        if (result.isRestricted) {
            setRestrictionData(result)
            return
        }

        // For homework: update maxReachedIndex when completing an exercise
        if (!isClasswork) {
            setMaxReachedIndex(prev => Math.max(prev, currentAssignmentIndex + 1))
        }

        const nextAssignment = getNextAssignmentFromAllAssignments()

        if (nextAssignment) {
            if (nextAssignment.published) {
                // Refresh progress before moving to next assignment to ensure current index/state is correct
                await refreshProgress()
                // Next published assignment exists
                setCurrentAssignmentIndex(prev => prev + 1)
            } else if (isClasswork) {
                // Wait for teacher to unlock
                setIsWaitingForUnlock(true)
                setWaitingForAssignmentId(nextAssignment.id)
            } else {
                // Homework: if next is unpublished, treat as finished for now
                setIsCompleted(true)
            }
        } else {
            // Truly no more assignments in the collection
            await autoSubmitCollectionPointsAnswers(collection.id)
            setIsCompleted(true)
        }
    }

    const [isReviewing, setIsReviewing] = useState(allDone)

    // Periodic IP check effect
    useEffect(() => {
        if (isCompleted || collection.category !== 'classwork') return

        const check = async () => {
            const result = await checkIpAccess(classroomId, collection.category, collection.id)
            if (result.isRestricted) {
                setRestrictionData(result)
            }
        }

        const interval = setInterval(check, 30000)
        return () => clearInterval(interval)
    }, [classroomId, collection.category, isCompleted])

    // Polling effect for waiting for next exercise to be published
    useEffect(() => {
        if (!isWaitingForUnlock || !waitingForAssignmentId) return

        const checkPublished = async () => {
            const result = await getCollectionAssignments(collection.id)
            if (result.success && result.assignments) {
                const targetAssignment = result.assignments.find(a => a.id === waitingForAssignmentId)
                if (targetAssignment?.published) {
                    // The exercise we are waiting for is now published
                    // Update both lists from the fresh data
                    setAllAssignmentsState(result.assignments)
                    setAssignments(result.assignments.filter(a => a.published))

                    // Also refresh progress data to ensure we have correct state for all assignments
                    const progressResult = await getCollectionProgress(collection.id)
                    if (progressResult.success && progressResult.progress) {
                        setProgressDataState(progressResult.progress)
                    }

                    // Navigate to the new assignment
                    // Find where it is in the published list
                    const newPublishedList = result.assignments.filter(a => a.published)
                    const newIndex = newPublishedList.findIndex(a => a.id === waitingForAssignmentId)
                    if (newIndex >= 0) {
                        setCurrentAssignmentIndex(newIndex)
                        setIsWaitingForUnlock(false)
                        setWaitingForAssignmentId(null)
                    }
                }
            }
        }

        // Check immediately
        checkPublished()

        // Then poll every 3 seconds
        const interval = setInterval(checkPublished, 3000)
        return () => clearInterval(interval)
    }, [isWaitingForUnlock, waitingForAssignmentId, collection.id])

    if (restrictionData.isRestricted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldAlert className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Prieiga apribota</h1>
                        <p className="text-muted-foreground">
                            Jūsų tinklo ryšys pasikeitė. Šis darbas klasėje yra skirtas tik mokyklos tinklui.
                            Šiuo metu esate prisijungę iš <span className="font-mono text-red-500">{restrictionData.studentIp}</span>.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/student/class/${classroomId}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Grįžti į klasę
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    const handlePrevious = () => {
        if (isWaitingForUnlock) {
            // Go back from waiting screen
            setIsWaitingForUnlock(false)
            setWaitingForAssignmentId(null)
            return
        }
        if (currentAssignmentIndex > 0) {
            setCurrentAssignmentIndex(prev => prev - 1)
        }
    }

    const handleJumpToExercise = (index: number) => {
        // For classwork: all published exercises are accessible
        // For homework: only exercises up to maxReachedIndex are accessible
        if (isClasswork || index <= maxReachedIndex) {
            setCurrentAssignmentIndex(index)
            setIsWaitingForUnlock(false)
            setWaitingForAssignmentId(null)
        }
    }

    if (assignments.length === 0) {
        return (
            <div className="text-center py-12">
                <p>Šiame rinkinyje nėra užduočių.</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href={`/student/class/${classroomId}`}>Grįžti į klasę</Link>
                </Button>
            </div>
        )
    }

    if (isCompleted && !isReviewing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-8">
                <Confetti
                    width={width}
                    height={height}
                    recycle={false}
                    numberOfPieces={500}
                />
                <Card className="max-w-md w-full border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                        <div className="rounded-full bg-primary/10 p-6">
                            <Layers className="h-12 w-12 text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Rinkinys baigtas!</h2>
                            <p className="text-muted-foreground">
                                Jūs atlikote visas užduotis rinkinyje <span className="font-semibold text-foreground">{collection.title}</span>.
                            </p>
                        </div>

                        {/* Points Summary */}
                        {pointsResults && pointsResults.totalPoints > 0 && (
                            <div className="w-full space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-center gap-3">
                                    <Award className="h-6 w-6 text-amber-500" />
                                    <span className="text-xl font-bold">
                                        {pointsResults.earnedPoints} / {pointsResults.totalPoints} taškai
                                    </span>
                                </div>

                                <div className="space-y-2 text-left">
                                    {pointsResults.exercises.filter(e => e.pointsEnabled).map((ex, idx) => (
                                        <div key={ex.id} className={`flex items-center justify-between p-2 rounded-md text-sm ${ex.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            <span className="flex items-center gap-2">
                                                {ex.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                Užduotis {idx + 1}
                                            </span>
                                            <span className="font-medium">
                                                {ex.earnedPoints ?? 0} / {ex.points} taškai
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button onClick={() => router.push(`/student/class/${classroomId}`)} size="lg" className="w-full">
                            Grįžti į klasę
                        </Button>
                        <Button onClick={() => window.location.href = pathname} variant="outline" size="lg" className="w-full">
                            Peržiūrėti rinkinį
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Waiting for teacher to unlock next exercise
    if (isWaitingForUnlock) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-8">
                <Card className="max-w-md w-full border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                        <div className="rounded-full bg-amber-100 p-6">
                            <Loader2 className="h-12 w-12 text-amber-600 animate-spin" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Laukiama mokytojo</h2>
                            <p className="text-muted-foreground">
                                Prašome palaukti, kol mokytojas atrakins kitą užduotį...
                            </p>
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                            {currentAssignmentIndex > 0 && (
                                <Button onClick={handlePrevious} variant="outline" size="lg" className="w-full">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Grįžti į ankstesnę užduotį
                                </Button>
                            )}
                            <Button onClick={() => router.push(`/student/class/${classroomId}`)} variant="ghost" size="lg" className="w-full">
                                Išeiti iš rinkinio
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Collection Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                            <Link href={`/student/class/${classroomId}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Išeiti iš rinkinio
                            </Link>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                    Užduotis {allAssignmentsState.length > 0 ? [...allAssignmentsState].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)).findIndex((a: any) => a.id === currentAssignment?.id) + 1 : currentAssignmentIndex + 1} iš {allAssignmentsState.length > 0 ? allAssignmentsState.length : totalAssignments}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {allAssignmentsState.length > 0 ? (
                                    // Show all assignments including unpublished ones
                                    [...allAssignmentsState]
                                        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                                        .map((assignment: any, index: number) => {
                                            const isPublished = assignment.published
                                            const publishedIndex = assignments.findIndex((a: any) => a.id === assignment.id)
                                            const isCurrent = assignment.id === currentAssignment?.id
                                            // For classwork: locked if not published
                                            // For homework: locked if not published OR beyond maxReachedIndex
                                            const isLocked = isClasswork
                                                ? !isPublished
                                                : (!isPublished || publishedIndex > maxReachedIndex)
                                            return (
                                                <DropdownMenuItem
                                                    key={assignment.id}
                                                    disabled={isLocked}
                                                    onClick={() => !isLocked && publishedIndex >= 0 && handleJumpToExercise(publishedIndex)}
                                                    className={isCurrent ? "bg-accent" : ""}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        Užduotis {index + 1}
                                                        {assignment.points_enabled && (
                                                            <Award className="h-3.5 w-3.5 text-amber-500" />
                                                        )}
                                                        {isLocked && (
                                                            <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                                                                <Lock className="h-3 w-3" />
                                                                (Locked)
                                                            </span>
                                                        )}
                                                    </span>
                                                </DropdownMenuItem>
                                            )
                                        })
                                ) : (
                                    // Fallback to published assignments only (for homework, respect maxReachedIndex)
                                    assignments.map((_: any, index: number) => {
                                        const isLocked = !isClasswork && index > maxReachedIndex
                                        return (
                                            <DropdownMenuItem
                                                key={index}
                                                disabled={isLocked}
                                                onClick={() => !isLocked && handleJumpToExercise(index)}
                                                className={index === currentAssignmentIndex ? "bg-accent" : ""}
                                            >
                                                <span className="flex items-center gap-2">
                                                    Exercise {index + 1}
                                                    {assignments[index]?.points_enabled && (
                                                        <Award className="h-3.5 w-3.5 text-amber-500" />
                                                    )}
                                                    {isLocked && (
                                                        <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                                                            <Lock className="h-3 w-3" />
                                                            (Locked)
                                                        </span>
                                                    )}
                                                </span>
                                            </DropdownMenuItem>
                                        )
                                    })
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <h1 className="text-xl font-bold text-primary border-b pb-4 flex items-center justify-between gap-4">
                        <span>{collection.title}</span>
                        {collection.slides_url && (
                            <SlidesButton
                                url={collection.slides_url}
                                title={collection.title}
                                variant="outline"
                                className="h-9"
                            // Override default "Skaidrės" text if needed, but "Teorija" might be better here
                            />
                        )}
                    </h1>
                </div>

                {/* Current Assignment Interface */}
                {/* We use key to force re-mount when assignment changes */}
                <StudentAssignmentInterface
                    key={currentAssignment.id}
                    assignment={currentAssignment}
                    classId={classroomId}
                    onFinish={handleAssignmentFinish}
                    onPrevious={currentAssignmentIndex > 0 ? handlePrevious : undefined}
                    canSkip={isClasswork}
                    compact={true}
                    initialCompletedIndices={currentCompletedIndices}
                    initialIsCompleted={currentIsCompleted}
                    initialActiveQuestionIndex={currentActiveIndex}
                    hideRevealSolution={collection.category === 'classwork'}
                    exerciseNumber={allAssignmentsState.length > 0 ? (allAssignmentsState.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)).findIndex((a: any) => a.id === currentAssignment?.id) + 1) : (currentAssignmentIndex + 1)}
                    // Points mode props
                    pointsEnabled={currentAssignment.points_enabled || false}
                    exercisePoints={currentAssignment.points || 1}
                    initialSubmittedAnswers={currentProgress?.submitted_answers || {}}
                    // Last exercise in collection - show "Finish" instead of "Next Exercise"
                    isLastExercise={!getNextAssignmentFromAllAssignments()}
                    onProgressUpdate={refreshProgress}
                />
            </div>
        </div>
    )
}
