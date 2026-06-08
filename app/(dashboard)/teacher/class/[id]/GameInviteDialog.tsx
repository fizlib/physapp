"use client"

import { useState } from "react"
import { CheckCircle2, Coffee, Gamepad2, Loader2, Send, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    CLASSROOM_GAMES,
    type ClassroomGameId,
} from "@/lib/classroom-games"
import {
    getClassroomStudents,
    sendGameInviteToStudents,
} from "../../actions"

interface GameInviteDialogProps {
    classroomId: string
}

interface GameInviteStudent {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
}

const gameIds = Object.keys(CLASSROOM_GAMES) as ClassroomGameId[]

function getStudentName(student: GameInviteStudent): string {
    return [student.first_name, student.last_name].filter(Boolean).join(" ")
        || student.email
        || "Unnamed"
}

function GameIcon({ gameId, className }: { gameId: ClassroomGameId, className?: string }) {
    if (gameId === "coffee") return <Coffee className={className} />
    return <Gamepad2 className={className} />
}

export function GameInviteDialog({ classroomId }: GameInviteDialogProps) {
    const [open, setOpen] = useState(false)
    const [students, setStudents] = useState<GameInviteStudent[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [selectedGameId, setSelectedGameId] = useState<ClassroomGameId | null>(null)
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [sentCount, setSentCount] = useState<number | null>(null)

    const loadStudents = async () => {
        setLoadingStudents(true)
        setStudents([])
        setSelectedIds(new Set())

        try {
            const data = await getClassroomStudents(classroomId)
            setStudents(data)
            setSelectedIds(new Set(data.map((student) => student.id)))
        } catch (error) {
            console.error("Failed to load students for game invitation:", error)
            toast.error("Failed to load students")
        } finally {
            setLoadingStudents(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (isPending) return

        setOpen(isOpen)
        if (isOpen) {
            setSelectedGameId(null)
            setSentCount(null)
            void loadStudents()
        }
    }

    const toggleStudent = (studentId: string) => {
        setSelectedIds((current) => {
            const next = new Set(current)
            if (next.has(studentId)) {
                next.delete(studentId)
            } else {
                next.add(studentId)
            }
            return next
        })
    }

    const toggleAll = () => {
        if (students.length > 0 && selectedIds.size === students.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(students.map((student) => student.id)))
        }
    }

    const handleSubmit = async () => {
        if (!selectedGameId) {
            toast.error("Select a game")
            return
        }

        if (selectedIds.size === 0) {
            toast.error("Select at least one student")
            return
        }

        setIsPending(true)
        try {
            const result = await sendGameInviteToStudents(
                classroomId,
                selectedGameId,
                Array.from(selectedIds)
            )

            if (result.success) {
                setSentCount(selectedIds.size)
                toast.success(result.message || "Game invitation sent")
            } else {
                toast.error(result.error || "Failed to send game invitation")
            }
        } catch (error) {
            console.error("Failed to send game invitation:", error)
            toast.error("An error occurred")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    Invite to Game
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Gamepad2 className="h-5 w-5 text-primary" />
                        Invite to Game
                    </DialogTitle>
                    <DialogDescription>
                        Select a game and enrolled students to invite.
                    </DialogDescription>
                </DialogHeader>

                {sentCount !== null ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                        <div>
                            <h3 className="font-semibold">Invitation sent</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {sentCount} selected student{sentCount === 1 ? "" : "s"} will see the popup after refreshing or navigating inside the app.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
                        <div className="space-y-2">
                            <Label>Game</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {gameIds.map((gameId) => {
                                    const game = CLASSROOM_GAMES[gameId]
                                    const isSelected = selectedGameId === gameId
                                    return (
                                        <button
                                            key={gameId}
                                            type="button"
                                            disabled={isPending}
                                            onClick={() => setSelectedGameId(gameId)}
                                            className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50 ${
                                                isSelected ? "border-primary bg-primary/5" : "border-border"
                                            }`}
                                        >
                                            <div className="rounded-md bg-primary/10 p-2 text-primary">
                                                <GameIcon gameId={gameId} className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block truncate text-sm font-semibold">{game.name}</span>
                                                <span className="block truncate font-mono text-[10px] text-muted-foreground">{game.path}</span>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4" />
                                    Students ({selectedIds.size}/{students.length})
                                </Label>
                                <div className="flex items-center gap-2 pr-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">All</span>
                                    <Checkbox
                                        checked={students.length > 0 && selectedIds.size === students.length}
                                        onCheckedChange={toggleAll}
                                        disabled={isPending || loadingStudents || students.length === 0}
                                    />
                                </div>
                            </div>

                            {loadingStudents ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : students.length === 0 ? (
                                <p className="py-6 text-center text-sm italic text-muted-foreground">
                                    No students enrolled yet.
                                </p>
                            ) : (
                                <div className="max-h-60 divide-y overflow-y-auto rounded-md border">
                                    {students.map((student) => {
                                        const isSelected = selectedIds.has(student.id)
                                        return (
                                            <label
                                                key={student.id}
                                                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-accent/50 ${
                                                    isSelected ? "" : "opacity-60"
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleStudent(student.id)}
                                                    disabled={isPending}
                                                />
                                                <span className="truncate text-sm font-medium">
                                                    {getStudentName(student)}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {sentCount !== null ? (
                        <Button onClick={() => setOpen(false)}>Done</Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={!selectedGameId || selectedIds.size === 0 || loadingStudents || isPending}
                            >
                                {isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {isPending ? "Sending..." : `Send (${selectedIds.size})`}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
