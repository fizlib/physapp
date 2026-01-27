"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Layers, ChevronDown } from "lucide-react"
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

interface CollectionPlayerProps {
    collection: any
    classroomId: string
    progressData?: any[]
}

export function CollectionPlayer({ collection, classroomId, progressData = [] }: CollectionPlayerProps) {
    const assignments = collection.assignments || []

    // Determine initial state based on progress
    // Create a map for easy lookup
    const progressMap = new Map()
    progressData.forEach(p => {
        progressMap.set(p.assignment_id, p)
    })

    // Find the first incomplete assignment
    let firstIncompleteIndex = 0
    let lastCompletedIndex = -1

    for (let i = 0; i < assignments.length; i++) {
        const assign = assignments[i]
        const progress = progressMap.get(assign.id)

        if (progress && progress.is_completed) {
            lastCompletedIndex = i
        } else {
            firstIncompleteIndex = i
            break
        }
    }

    // If all completed, maybe show completion screen or last one?
    // Let's go to max index if all completed, but `isCompleted` state will handle the finish screen.
    // If truly all completed, firstIncompleteIndex loop will finish at assignments.length ?? No, the loop breaks or finishes.
    // If loop finishes without break, firstIncompleteIndex is actually not set to length.
    // Let's fix loop logic.

    if (lastCompletedIndex === assignments.length - 1) {
        // All done
        firstIncompleteIndex = assignments.length - 1 // Show last one? Or show completion?
        // Actually, if I want to show completion screen immediately:
        // setIsCompleted(true)
        // But let's just show the last one effectively, or handle `isCompleted` state initialization.
    }

    // But wait, if lastCompletedIndex is 0, it means 0 is done. We should be at 1.
    // If loop didn't break, it means all were completed. 
    // If I ran loop: 0 completed, 1 completed. 
    // i=0: completed. last=0.
    // i=1: completed. last=1.
    // i=2 (len): loop ends.
    // firstIncompleteIndex remains 0 (initial). This is WRONG.

    // Better logic:
    let initialIndex = 0
    let allDone = false

    for (let i = 0; i < assignments.length; i++) {
        const p = progressMap.get(assignments[i].id)
        if (!p || !p.is_completed) {
            initialIndex = i
            break
        }
        if (i === assignments.length - 1) {
            allDone = true
            initialIndex = i // Stay at last one
        }
    }

    const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(initialIndex)
    const [maxReachedIndex, setMaxReachedIndex] = useState(Math.max(0, allDone ? assignments.length - 1 : initialIndex))
    const [isCompleted, setIsCompleted] = useState(allDone)
    const router = useRouter()
    const { width, height } = useWindowSize()
    const totalAssignments = assignments.length
    const currentAssignment = assignments[currentAssignmentIndex]

    // Get progress for current assignment
    const currentProgress = progressMap.get(currentAssignment?.id)
    const currentCompletedIndices = currentProgress?.completed_question_indices || []
    const currentIsCompleted = currentProgress?.is_completed || false
    const currentActiveIndex = currentProgress?.active_question_index

    const handleAssignmentFinish = () => {
        if (currentAssignmentIndex < totalAssignments - 1) {
            const nextIndex = currentAssignmentIndex + 1
            setCurrentAssignmentIndex(nextIndex)
            setMaxReachedIndex(prev => Math.max(prev, nextIndex))
        } else {
            setIsCompleted(true)
        }
    }

    const handlePrevious = () => {
        if (currentAssignmentIndex > 0) {
            setCurrentAssignmentIndex(prev => prev - 1)
        }
    }

    const handleJumpToExercise = (index: number) => {
        if (index <= maxReachedIndex) {
            setCurrentAssignmentIndex(index)
        }
    }

    if (assignments.length === 0) {
        return (
            <div className="text-center py-12">
                <p>This collection has no exercises.</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href={`/student/class/${classroomId}`}>Back to Class</Link>
                </Button>
            </div>
        )
    }

    // State to toggle between completion screen and review mode
    // If allDone is true initially, it means we are revisiting a completed collection, so start in review mode.
    const [isReviewing, setIsReviewing] = useState(allDone)

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
                            <h2 className="text-2xl font-bold tracking-tight">Collection Completed!</h2>
                            <p className="text-muted-foreground">
                                You have successfully finished all exercises in <span className="font-semibold text-foreground">{collection.title}</span>.
                            </p>
                        </div>
                        <Button onClick={() => router.push(`/student/class/${classroomId}`)} size="lg" className="w-full">
                            Return to Class
                        </Button>
                        <Button onClick={() => setIsReviewing(true)} variant="outline" size="lg" className="w-full">
                            Review Collection
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const progress = isCompleted ? 100 : ((maxReachedIndex) / totalAssignments) * 100

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Collection Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                            <Link href={`/student/class/${classroomId}`}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Exit Collection
                            </Link>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                    Exercise {currentAssignmentIndex + 1} of {totalAssignments}
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {assignments.map((_: any, index: number) => (
                                    <DropdownMenuItem
                                        key={index}
                                        disabled={index > maxReachedIndex}
                                        onClick={() => handleJumpToExercise(index)}
                                        className={index === currentAssignmentIndex ? "bg-accent" : ""}
                                    >
                                        Exercise {index + 1}
                                        {index > maxReachedIndex && " (Locked)"}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <h1 className="text-xl font-bold text-primary">{collection.title}</h1>
                            <span className="text-xs text-muted-foreground">{Math.round(progress)}% Complete</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                </div>

                {/* Current Assignment Interface */}
                {/* We use key to force re-mount when assignment changes */}
                <StudentAssignmentInterface
                    key={currentAssignment.id}
                    assignment={currentAssignment}
                    classId={classroomId}
                    onFinish={handleAssignmentFinish}
                    onPrevious={currentAssignmentIndex > 0 ? handlePrevious : undefined}
                    canSkip={currentAssignmentIndex < maxReachedIndex}
                    compact={true}
                    initialCompletedIndices={currentCompletedIndices}
                    initialIsCompleted={currentIsCompleted}
                    initialActiveQuestionIndex={currentActiveIndex}
                />
            </div>
        </div>
    )
}
