"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Layers, ChevronDown, Loader2, Lock, Award, Timer } from "lucide-react"
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
import {
    checkIpAccess,
    getCollectionAssignments,
    getCollectionResults,
    autoSubmitCollectionPointsAnswers,
    getCollectionProgress,
    getCollectionRuntimeStatus,
    getAssignmentPublishStatus
} from "../../../../actions"
import { ShieldAlert, CheckCircle2, XCircle, FileText } from "lucide-react"
import { SlidesButton } from "@/components/student/SlidesButton"

interface AssignmentMeta {
    id: string
    title?: string | null
    order_index?: number | null
    published?: boolean
    points_enabled?: boolean
}

interface CollectionPlayerProps {
    collection: any
    classroomId: string
    progressData?: any[]
    allAssignmentsMeta?: AssignmentMeta[] // All assignments including unpublished (metadata only)
    testModePollingEnabled?: boolean // Admin setting to enable/disable test mode polling
    showVirtualKeyboardToggle?: boolean // Admin setting to show/hide student virtual keyboard toggle button
}

export function CollectionPlayer({
    collection,
    classroomId,
    progressData = [],
    allAssignmentsMeta: initialAllAssignmentsMeta = [],
    testModePollingEnabled = true,
    showVirtualKeyboardToggle = true
}: CollectionPlayerProps) {
    // Determine if this is classwork (all published accessible) or homework (sequential unlock)
    const isClasswork = collection.category === 'classwork'

    // Use state for assignments so we can dynamically add newly published ones
    const [assignments, setAssignments] = useState(collection.assignments || [])
    // Track metadata for all assignments to drive dropdown and waiting logic.
    const [allAssignmentsMetaState, setAllAssignmentsMetaState] = useState(initialAllAssignmentsMeta)
    // Track progress data as state so we can refresh it when assignments update
    const [progressDataState, setProgressDataState] = useState(progressData)

    const sortedAllAssignmentsMeta = useMemo(
        () => [...allAssignmentsMetaState].sort((a: AssignmentMeta, b: AssignmentMeta) => (a.order_index || 0) - (b.order_index || 0)),
        [allAssignmentsMetaState]
    )

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
    const currentAssignmentIndexRef = useRef(currentAssignmentIndex)
    useEffect(() => {
        currentAssignmentIndexRef.current = currentAssignmentIndex
    }, [currentAssignmentIndex])
    const assignmentsRef = useRef(assignments)
    useEffect(() => {
        assignmentsRef.current = assignments
    }, [assignments])

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
    const [isTimeUp, setIsTimeUp] = useState(false)
    const [isWaitingForUnlock, setIsWaitingForUnlock] = useState(false)
    const [waitingForAssignmentId, setWaitingForAssignmentId] = useState<string | null>(null)
    const { width, height } = useWindowSize()

    // Test mode timer state
    const [testModeRemainingSeconds, setTestModeRemainingSeconds] = useState<number | null>(() => {
        if (collection.test_mode_ends_at) {
            const endTime = new Date(collection.test_mode_ends_at).getTime()
            const now = Date.now()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
            return remaining > 0 ? remaining : null
        }
        return null
    })
    const isTestModeActive = testModeRemainingSeconds !== null && testModeRemainingSeconds > 0

    // Track the known test end time (to detect when a new test starts)
    const [knownTestModeEndsAt, setKnownTestModeEndsAt] = useState<string | null>(collection.test_mode_ends_at || null)
    // Use a ref for synchronous tracking (avoids stale closure issues in polling)
    const handledTestEndTimeRef = useRef<string | null>(collection.test_mode_ends_at || null)
    // When test mode starts, redirect to first pointed exercise (only once)
    const [hasRedirectedToPointed, setHasRedirectedToPointed] = useState(false)

    // Track if test mode has expired (time ran out) - shows results overlay but allows browsing
    const [testModeExpired, setTestModeExpired] = useState(() => {
        if (collection.test_mode_ends_at) {
            return new Date() > new Date(collection.test_mode_ends_at)
        }
        return false
    })

    // Function to refresh progress data from server
    const refreshProgress = async () => {
        const result = await getCollectionProgress(collection.id)
        if (result.success && result.progress) {
            setProgressDataState(result.progress)
        }
    }

    const totalAssignments = assignments.length
    const currentAssignment = assignments[currentAssignmentIndex]
    const currentDisplayedAssignmentNumber = useMemo(() => {
        if (!currentAssignment) return currentAssignmentIndex + 1
        if (sortedAllAssignmentsMeta.length === 0) return currentAssignmentIndex + 1
        const index = sortedAllAssignmentsMeta.findIndex((assignment) => assignment.id === currentAssignment.id)
        return index >= 0 ? index + 1 : currentAssignmentIndex + 1
    }, [currentAssignment, currentAssignmentIndex, sortedAllAssignmentsMeta])

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

    // State to control showing test results overlay (dismissable)
    const [showTestResults, setShowTestResults] = useState(false)

    // Loading state for points results
    const [isLoadingResults, setIsLoadingResults] = useState(false)

    // Fetch points results when completed
    useEffect(() => {
        if (isCompleted && isClasswork) {
            setIsLoadingResults(true)
            getCollectionResults(collection.id).then(res => {
                if (res.success && res.results) {
                    setPointsResults(res.results)
                }
            }).finally(() => {
                setIsLoadingResults(false)
            })
        }
    }, [isCompleted, isClasswork, collection.id])

    // Fetch results on mount if test mode has expired (for showing points in locked exercise view)
    useEffect(() => {
        if (testModeExpired && !pointsResults) {
            getCollectionResults(collection.id).then(res => {
                if (res.success && res.results) {
                    setPointsResults(res.results)
                    // Don't auto-show results overlay on page revisit - only show when timer runs out in real-time
                }
            })
        }
    }, [testModeExpired, pointsResults, collection.id])

    // Get progress for current assignment
    const currentProgress = progressMap.get(currentAssignment?.id)
    const currentCompletedIndices = currentProgress?.completed_question_indices || []
    const currentRevealedIndices = currentProgress?.revealed_question_indices || []
    const currentIsCompleted = currentProgress?.is_completed || false
    const currentActiveIndex = currentProgress?.active_question_index
    const currentEarnedPointsPerPart = currentProgress?.earned_points_per_part || {}

    // Find the next assignment (could be unpublished)
    const getNextAssignmentFromAllAssignments = () => {
        if (sortedAllAssignmentsMeta.length === 0) return null
        const currentPos = sortedAllAssignmentsMeta.findIndex((assignment) => assignment.id === currentAssignment?.id)
        if (currentPos >= 0 && currentPos < sortedAllAssignmentsMeta.length - 1) {
            return sortedAllAssignmentsMeta[currentPos + 1]
        }
        return null
    }

    const handleAssignmentFinish = async () => {
        // Double check IP and Time before moving to next assignment
        const result = await checkIpAccess(classroomId, collection.category, collection.id)
        if (result.isRestricted) {
            setRestrictionData(result)
            return
        }

        if (collection.category === 'classwork' && collection.scheduled_end_at) {
            if (new Date() > new Date(collection.scheduled_end_at)) {
                setIsTimeUp(true)
                return
            }
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

    // Periodic check effect (IP, Time, and Test Mode)
    useEffect(() => {
        if (isCompleted || collection.category !== 'classwork') return

        let cancelled = false
        let timeout: ReturnType<typeof setTimeout> | null = null

        const BASE_POLL_MS = 12000
        const JITTER_MS = 3000

        const check = async () => {
            // Time Check (local, no server round-trip needed)
            if (collection.scheduled_end_at) {
                const now = new Date()
                const end = new Date(collection.scheduled_end_at)
                if (now > end) {
                    setIsTimeUp(true)
                    return
                }
            }

            // Single request for IP restriction + test mode status
            const status = await getCollectionRuntimeStatus(
                classroomId,
                collection.category,
                collection.id,
                testModePollingEnabled
            )
            if (cancelled) return

            if (status.success && status.isRestricted) {
                setRestrictionData({ isRestricted: true, studentIp: status.studentIp })
                return
            }

            // Test Mode Check - only when NOT already active and polling is enabled
            if (status.success && !isTestModeActive && testModePollingEnabled && status.testModeEndsAt) {
                const endTime = new Date(status.testModeEndsAt).getTime()
                const now = Date.now()
                const remaining = Math.max(0, Math.floor((endTime - now) / 1000))

                // Check if this is a NEW test (different from what we already handled)
                const alreadyHandled = status.testModeEndsAt === handledTestEndTimeRef.current

                if (remaining > 0 && !alreadyHandled) {
                    // Test mode has started! Update states
                    // Update ref immediately (synchronous) to prevent re-entry
                    handledTestEndTimeRef.current = status.testModeEndsAt
                    setKnownTestModeEndsAt(status.testModeEndsAt)
                    setTestModeRemainingSeconds(remaining)
                    setTestModeExpired(false) // Reset expired state for new test
                    setIsCompleted(false) // Reset completed state - new test means new attempt
                    setIsReviewing(false) // Exit review mode for new test

                    // Find and navigate to first pointed exercise
                    const firstPointedIndex = assignmentsRef.current.findIndex((a: any) => a.points_enabled)
                    if (firstPointedIndex >= 0 && currentAssignmentIndexRef.current !== firstPointedIndex) {
                        setCurrentAssignmentIndex(firstPointedIndex)
                    }
                    setHasRedirectedToPointed(true)
                }
            }

            if (!cancelled) {
                const delayMs = BASE_POLL_MS + Math.floor(Math.random() * JITTER_MS)
                timeout = setTimeout(check, delayMs)
            }
        }

        // Also check immediately
        check()
        return () => {
            cancelled = true
            if (timeout) clearTimeout(timeout)
        }
    }, [classroomId, collection.category, isCompleted, collection.scheduled_end_at, collection.id, isTestModeActive, testModePollingEnabled])

    // Polling effect for waiting for next exercise to be published
    useEffect(() => {
        if (!isWaitingForUnlock || !waitingForAssignmentId) return
        if (!testModePollingEnabled) return

        let cancelled = false
        let timeout: ReturnType<typeof setTimeout> | null = null
        const targetAssignmentId = waitingForAssignmentId

        const INITIAL_POLL_MS = 5000
        const MAX_POLL_MS = 12000
        let currentDelayMs = INITIAL_POLL_MS

        const checkPublished = async () => {
            const status = await getAssignmentPublishStatus(targetAssignmentId)
            if (cancelled) return

            if (status.success && status.isPublished) {
                const [assignmentsResult, progressResult] = await Promise.all([
                    getCollectionAssignments(collection.id),
                    getCollectionProgress(collection.id)
                ])
                if (cancelled) return

                if (assignmentsResult.success && assignmentsResult.assignments) {
                    // The exercise we are waiting for is now published
                    // Update both lists from fresh data
                    setAllAssignmentsMetaState(assignmentsResult.assignments.map((assignment: any) => ({
                        id: assignment.id,
                        title: assignment.title,
                        order_index: assignment.order_index,
                        published: !!assignment.published,
                        points_enabled: !!assignment.points_enabled,
                    })))
                    setAssignments(assignmentsResult.assignments.filter(a => a.published))

                    // Also refresh progress data to ensure we have correct state for all assignments
                    if (progressResult.success && progressResult.progress) {
                        setProgressDataState(progressResult.progress)
                    }

                    // Navigate to the new assignment
                    // Find where it is in the published list
                    const newPublishedList = assignmentsResult.assignments.filter(a => a.published)
                    const newIndex = newPublishedList.findIndex(a => a.id === targetAssignmentId)
                    if (newIndex >= 0) {
                        setCurrentAssignmentIndex(newIndex)
                        setIsWaitingForUnlock(false)
                        setWaitingForAssignmentId(null)
                    }
                }
                return
            }

            if (!cancelled) {
                const delay = currentDelayMs
                currentDelayMs = Math.min(MAX_POLL_MS, Math.floor(currentDelayMs * 1.5))
                timeout = setTimeout(checkPublished, delay)
            }
        }

        // Check immediately
        checkPublished()
        return () => {
            cancelled = true
            if (timeout) clearTimeout(timeout)
        }
    }, [isWaitingForUnlock, waitingForAssignmentId, collection.id, testModePollingEnabled])

    // Test mode countdown effect
    useEffect(() => {
        // Use knownTestModeEndsAt instead of collection.test_mode_ends_at
        // because knownTestModeEndsAt is updated when we detect a new test via polling
        if (!knownTestModeEndsAt || isCompleted || testModeExpired) return

        const endTime = new Date(knownTestModeEndsAt).getTime()
        // Don't start countdown if already expired
        if (endTime <= Date.now()) return

        const tick = async () => {
            const now = Date.now()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))

            if (remaining <= 0) {
                // Time is up - auto-submit all answers and show results
                setTestModeRemainingSeconds(null)
                await autoSubmitCollectionPointsAnswers(collection.id)
                // Set both testModeExpired and isCompleted to redirect to finish screen with points
                setTestModeExpired(true)
                setIsCompleted(true)
                // Fetch results to display on the finish screen
                const res = await getCollectionResults(collection.id)
                if (res.success && res.results) {
                    setPointsResults(res.results)
                }
                return
            }

            setTestModeRemainingSeconds(remaining)
        }

        // Tick immediately
        tick()

        // Then tick every second
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
    }, [knownTestModeEndsAt, collection.id, isCompleted, testModeExpired])

    useEffect(() => {
        if (!isTestModeActive || hasRedirectedToPointed) return

        // Find first assignment with points_enabled
        const firstPointedIndex = assignments.findIndex((a: any) => a.points_enabled)
        if (firstPointedIndex >= 0 && currentAssignmentIndex !== firstPointedIndex) {
            setCurrentAssignmentIndex(firstPointedIndex)
        }
        setHasRedirectedToPointed(true)
    }, [isTestModeActive, assignments, currentAssignmentIndex, hasRedirectedToPointed])


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

    if (isTimeUp) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                        <Lock className="h-10 w-10 text-amber-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Pamokos laikas baigėsi</h1>
                        <p className="text-muted-foreground">
                            Jūsų pateikti atsakymai išsaugoti.
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
        const hasAnyAssignmentsInCollection = sortedAllAssignmentsMeta.length > 0
        return (
            <div className="text-center py-12">
                <p>
                    {hasAnyAssignmentsInCollection
                        ? 'Šiame rinkinyje dar nėra paskelbtų užduočių. Palaukite, kol mokytojas jas paskelbs.'
                        : 'Šiame rinkinyje nėra užduočių.'}
                </p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href={`/student/class/${classroomId}`}>Grįžti į klasę</Link>
                </Button>
            </div>
        )
    }

    if (isCompleted && !isReviewing) {
        // Show loading state while fetching results
        if (isLoadingResults) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-8">
                    <Card className="max-w-md w-full border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                            <div className="rounded-full bg-primary/10 p-6">
                                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold tracking-tight">Skaičiuojami rezultatai...</h2>
                                <p className="text-muted-foreground">
                                    Prašome palaukti
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        }

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



    if (showTestResults && pointsResults) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-8">
                <Card className="max-w-md w-full border-2 border-amber-200 bg-card/50 backdrop-blur-sm">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                        <div className="rounded-full bg-amber-100 p-6">
                            <Timer className="h-12 w-12 text-amber-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold tracking-tight">Testo laikas baigėsi</h2>
                            <p className="text-muted-foreground">
                                Jūsų atsakymai buvo automatiškai pateikti.
                            </p>
                        </div>

                        {/* Points Summary */}
                        {pointsResults.totalPoints > 0 && (
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
                        <Button onClick={() => setShowTestResults(false)} variant="outline" size="lg" className="w-full">
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
                                    Užduotis {currentDisplayedAssignmentNumber} iš {sortedAllAssignmentsMeta.length > 0 ? sortedAllAssignmentsMeta.length : totalAssignments}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {sortedAllAssignmentsMeta.length > 0 ? (
                                    // Show all assignments including unpublished ones
                                    sortedAllAssignmentsMeta.map((assignment: AssignmentMeta, index: number) => {
                                            const isPublished = assignment.published
                                            const publishedIndex = assignments.findIndex((a: any) => a.id === assignment.id)
                                            const isCurrent = assignment.id === currentAssignment?.id
                                            // For classwork: locked if not published OR (pointed exercise when test expired AND no submissions)
                                            // For homework: locked if not published OR beyond maxReachedIndex
                                            // Check if student has submitted answers for this exercise
                                            const assignmentProgress = progressMap.get(assignment.id)
                                            const hasSubmissions = assignmentProgress?.submitted_answers && Object.keys(assignmentProgress.submitted_answers).length > 0
                                            const isPointedAndTestExpiredNoSubmissions = testModeExpired && assignment.points_enabled && !hasSubmissions
                                            const isLocked = isClasswork
                                                ? (!isPublished || isPointedAndTestExpiredNoSubmissions)
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
                        <div className="flex items-center gap-3">
                            {/* Test Mode Timer */}
                            {isTestModeActive && testModeRemainingSeconds !== null && (
                                <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm font-semibold animate-pulse">
                                    <Timer className="h-4 w-4" />
                                    <span suppressHydrationWarning>
                                        {Math.floor(testModeRemainingSeconds / 60).toString().padStart(2, '0')}:
                                        {(testModeRemainingSeconds % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>

                            )}
                            {collection.slides_url && (
                                <SlidesButton
                                    url={collection.slides_url}
                                    title={collection.title}
                                    variant="outline"
                                    className="h-9"
                                />
                            )}
                        </div>
                    </h1>
                </div>

                {/* Current Assignment Interface */}
                {/* We use key to force re-mount when assignment changes */}
                {/* Block access to pointed exercises after test mode expires ONLY if student has no submissions */}
                {(() => {
                    const currentHasSubmissions = currentProgress?.submitted_answers && Object.keys(currentProgress.submitted_answers).length > 0
                    const shouldBlockPointed = testModeExpired && currentAssignment.points_enabled && !currentHasSubmissions
                    return shouldBlockPointed
                })() ? (
                    <Card className="max-w-md mx-auto border-2 border-amber-200 bg-card/50">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                            <div className="rounded-full bg-amber-100 p-6">
                                <Lock className="h-10 w-10 text-amber-600" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold">Užduotis užrakinta</h2>
                                <p className="text-muted-foreground text-sm">
                                    Ši užduotis buvo prieinama testo metu. Testo laikas baigėsi.
                                </p>
                            </div>
                            {/* Show earned points if available */}
                            {pointsResults && currentAssignment && (() => {
                                const exerciseResult = pointsResults.exercises.find(e => e.id === currentAssignment.id)
                                if (exerciseResult) {
                                    return (
                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${exerciseResult.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {exerciseResult.isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                            <span className="font-medium">{exerciseResult.earnedPoints ?? 0} / {exerciseResult.points} taškai</span>
                                        </div>
                                    )
                                }
                                return null
                            })()}
                            <Button onClick={handlePrevious} variant="outline" className="mt-4">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Grįžti atgal
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <StudentAssignmentInterface
                        key={currentAssignment.id}
                        assignment={currentAssignment}
                        classId={classroomId}
                        showVirtualKeyboardToggle={showVirtualKeyboardToggle}
                        onFinish={handleAssignmentFinish}
                        onPrevious={currentAssignmentIndex > 0 ? handlePrevious : undefined}
                        canSkip={isClasswork}
                        compact={true}
                        initialCompletedIndices={currentCompletedIndices}
                        initialRevealedIndices={currentRevealedIndices}
                        initialIsCompleted={currentIsCompleted}
                        initialActiveQuestionIndex={currentActiveIndex}
                        hideRevealSolution={collection.category === 'classwork'}
                        exerciseNumber={currentDisplayedAssignmentNumber}
                        // Points mode props
                        pointsEnabled={currentAssignment.points_enabled || false}
                        exercisePoints={currentAssignment.points || 1}
                        initialSubmittedAnswers={currentProgress?.submitted_answers || {}}
                        initialEarnedPointsPerPart={currentEarnedPointsPerPart}
                        // Last exercise in collection - show "Finish" instead of "Next Exercise"
                        isLastExercise={!getNextAssignmentFromAllAssignments()}
                        onProgressUpdate={refreshProgress}
                    />
                )}
            </div>
        </div>
    )
}
