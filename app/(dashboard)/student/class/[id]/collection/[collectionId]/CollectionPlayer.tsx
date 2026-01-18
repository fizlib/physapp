"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Layers } from "lucide-react"
import Link from "next/link"
import { StudentAssignmentInterface } from "../../assignment/[assignmentId]/StudentAssignmentInterface"
import { Card, CardContent } from "@/components/ui/card"
import Confetti from "react-confetti"
import { useWindowSize } from "react-use"

interface CollectionPlayerProps {
    collection: any
    classroomId: string
}

export function CollectionPlayer({ collection, classroomId }: CollectionPlayerProps) {
    const [currentAssignmentIndex, setCurrentAssignmentIndex] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const router = useRouter()
    const { width, height } = useWindowSize()

    const assignments = collection.assignments || []
    const totalAssignments = assignments.length
    const currentAssignment = assignments[currentAssignmentIndex]

    const handleAssignmentFinish = () => {
        if (currentAssignmentIndex < totalAssignments - 1) {
            setCurrentAssignmentIndex(prev => prev + 1)
        } else {
            setIsCompleted(true)
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

    if (isCompleted) {
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
                    </CardContent>
                </Card>
            </div>
        )
    }

    const progress = ((currentAssignmentIndex) / totalAssignments) * 100

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
                        <div className="text-sm font-medium text-muted-foreground">
                            Exercise {currentAssignmentIndex + 1} of {totalAssignments}
                        </div>
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
                    compact={true}
                />
            </div>
        </div>
    )
}
