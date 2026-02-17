"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { getStudentClassroomEventLogs } from "../../actions"

interface StudentEventLogItem {
    id: string
    eventType: 'homework_submission' | 'solution_reveal'
    occurredAt: string
    assignmentId: string
    assignmentTitle: string
    collectionTitle: string
    questionId: string
    questionIndex: number
    submittedAnswer: string | null
    isCorrect: boolean | null
}

interface StudentEventLogsDialogProps {
    classroomId: string
    student: { id: string, name: string }
}

function formatTimestamp(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "Unknown time"
    return new Intl.DateTimeFormat('lt-LT', {
        timeZone: 'Europe/Vilnius',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date)
}

export function StudentEventLogsDialog({ classroomId, student }: StudentEventLogsDialogProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [events, setEvents] = useState<StudentEventLogItem[]>([])
    const [error, setError] = useState<string | null>(null)
    const requestIdRef = useRef(0)

    const fetchLogs = useCallback(async () => {
        const requestId = ++requestIdRef.current
        setIsLoading(true)
        setError(null)

        const result = await getStudentClassroomEventLogs(classroomId, student.id)
        if (requestIdRef.current !== requestId) return

        if (!result.success) {
            setEvents([])
            setError(result.error || "Failed to load logs")
            setIsLoading(false)
            return
        }

        setEvents(result.events || [])
        setError(null)
        setIsLoading(false)
    }, [classroomId, student.id])

    const dialogDescription = useMemo(
        () => `Homework submissions and solution reveals for ${student.name} in this classroom.`,
        [student.name]
    )

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (nextOpen) {
            void fetchLogs()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    View logs
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{student.name} Logs</DialogTitle>
                    <DialogDescription>
                        {dialogDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto pr-1">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <p className="py-6 text-sm text-rose-600">{error}</p>
                    ) : events.length === 0 ? (
                        <p className="py-6 text-sm text-muted-foreground">
                            No logs found for this student in this classroom.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {events.map((event) => {
                                const questionNumber = Number.isFinite(event.questionIndex)
                                    ? event.questionIndex + 1
                                    : null
                                const homeworkAnswer = (event.submittedAnswer || '').trim()

                                return (
                                    <div
                                        key={`${event.eventType}-${event.id}`}
                                        className="rounded-md border border-border/50 bg-background p-4 space-y-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant={event.eventType === 'homework_submission' ? "default" : "secondary"}>
                                                    {event.eventType === 'homework_submission' ? "Homework submission" : "Solution reveal"}
                                                </Badge>
                                                {event.eventType === 'homework_submission' && event.isCorrect !== null && (
                                                    <Badge
                                                        className={event.isCorrect
                                                            ? "bg-green-600 text-white hover:bg-green-600"
                                                            : "bg-rose-600 text-white hover:bg-rose-600"}
                                                    >
                                                        {event.isCorrect ? "Correct" : "Incorrect"}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="font-mono text-[11px] text-muted-foreground">
                                                {formatTimestamp(event.occurredAt)}
                                            </span>
                                        </div>

                                        <div className="text-sm">
                                            <p className="font-medium">
                                                Collection: {event.collectionTitle}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {event.assignmentTitle}
                                                {questionNumber !== null ? ` - Question ${questionNumber}` : ''}
                                            </p>
                                        </div>

                                        {event.eventType === 'homework_submission' ? (
                                            <p className="text-sm text-muted-foreground">
                                                Submitted answer:{" "}
                                                <span className="font-mono text-foreground break-all">
                                                    {homeworkAnswer.length > 0 ? homeworkAnswer : "(empty)"}
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Student revealed solution.
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

