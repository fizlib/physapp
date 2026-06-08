"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Gamepad2, Loader2, Users } from "lucide-react"
import {
    getUnseenPopupNotifications,
    markPopupNotificationSeen,
    type StudentPopupNotification,
} from "@/app/(dashboard)/student/popup-actions"
import {
    CLASSROOM_GAMES,
    isClassroomGameId,
} from "@/lib/classroom-games"
import { createClient } from "@/lib/supabase/client"

export function StudentPopupNotifications() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const [queue, setQueue] = useState<StudentPopupNotification[]>([])
    const [acknowledging, setAcknowledging] = useState(false)
    const [accepting, setAccepting] = useState(false)
    const [acceptError, setAcceptError] = useState<string | null>(null)

    const currentNotification = queue[0] || null
    const invitedGamePath = currentNotification?.kind === "game_invite" && currentNotification.gameId
        ? CLASSROOM_GAMES[currentNotification.gameId].path
        : null

    useEffect(() => {
        let cancelled = false

        const loadNotifications = async () => {
            const result = await getUnseenPopupNotifications()
            if (cancelled || !result.success || !result.notifications) return

            setQueue(result.notifications.slice(0, 1))
            setAcceptError(null)
        }

        loadNotifications()

        return () => {
            cancelled = true
        }
    }, [pathname])

    useEffect(() => {
        if (invitedGamePath) {
            router.prefetch(invitedGamePath)
        }
    }, [invitedGamePath, router])

    const handleAcknowledge = async () => {
        if (!currentNotification || acknowledging) return

        setAcknowledging(true)
        const notificationId = currentNotification.id
        const result = await markPopupNotificationSeen(notificationId)

        if (result.success) {
            setQueue((prev) => prev.filter((notification) => notification.id !== notificationId))
        } else {
            console.error(result.error || "Failed to mark popup notification as seen")
        }

        setAcknowledging(false)
    }

    const handleAcceptGameInvite = async () => {
        if (
            !currentNotification
            || currentNotification.kind !== "game_invite"
            || !currentNotification.gameId
            || accepting
        ) {
            return
        }

        setAccepting(true)
        setAcceptError(null)
        try {
            const { data, error } = await supabase.rpc("accept_game_invite", {
                p_notification_id: currentNotification.id,
            })

            if (error) {
                console.error("Error accepting game invitation:", error)
                setAcceptError("Nepavyko priimti kvietimo. Bandykite dar kartą.")
                setAccepting(false)
                return
            }

            const result = Array.isArray(data) ? data[0] : data
            if (!result?.success) {
                setAcceptError(
                    typeof result?.message === "string"
                        ? result.message
                        : "Nepavyko priimti kvietimo."
                )
                setAccepting(false)
                return
            }

            const returnedGameId: unknown = result.game_id
            if (!isClassroomGameId(returnedGameId)) {
                setAcceptError("Žaidimo nuoroda nebegalioja.")
                setAccepting(false)
                return
            }

            const gamePath = CLASSROOM_GAMES[returnedGameId].path
            setQueue((prev) => prev.filter((notification) => notification.id !== currentNotification.id))
            router.push(gamePath)
        } catch (error) {
            console.error("Failed to accept game invitation:", error)
            setAcceptError("Nepavyko priimti kvietimo. Bandykite dar kartą.")
            setAccepting(false)
        }
    }

    const isGameInvite = currentNotification?.kind === "game_invite"

    return (
        <Dialog
            open={!!currentNotification}
            onOpenChange={(isOpen) => {
                if (!isOpen && !accepting) {
                    void handleAcknowledge()
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isGameInvite ? (
                            <Gamepad2 className="h-5 w-5 text-primary" />
                        ) : (
                            <Users className="h-5 w-5 text-primary" />
                        )}
                        {currentNotification?.title || "Pranešimas"}
                    </DialogTitle>
                    <DialogDescription>
                        {currentNotification?.classroomName || "Klasė"}
                        {currentNotification?.groupNumber ? ` · ${currentNotification.groupNumber} grupė` : ""}
                    </DialogDescription>
                </DialogHeader>

                {currentNotification && (
                    <div className="space-y-4">
                        {currentNotification.body.trim() && (
                            <p className="text-sm leading-relaxed text-foreground">
                                {currentNotification.body}
                            </p>
                        )}

                        {currentNotification.members.length > 0 && (
                            <div className="rounded-md border bg-muted/20 p-3">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Grupės nariai
                                </div>
                                <div className="space-y-1.5">
                                    {currentNotification.members.map((member) => (
                                        <div key={member.id || member.name} className="rounded-md bg-background px-2.5 py-1.5 text-sm font-medium">
                                            {member.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentNotification.assignedQuestions.length > 0 && (
                            <div className="space-y-3 rounded-md border bg-primary/5 p-3">
                                {currentNotification.questionInstruction && (
                                    <p className="text-sm leading-relaxed text-foreground">
                                        {currentNotification.questionInstruction}
                                    </p>
                                )}
                                <div className="space-y-2">
                                    {currentNotification.assignedQuestions.map((question) => (
                                        <div key={question.number} className="rounded-md bg-background px-3 py-2 text-sm">
                                            <span className="font-semibold">{question.number}.</span> {question.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {acceptError && (
                            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                                {acceptError}
                            </div>
                        )}
                    </div>
                )}

                {currentNotification?.kind === "game_invite" && currentNotification.gameId && (
                    <DialogFooter>
                        <Button onClick={handleAcceptGameInvite} disabled={accepting || acknowledging}>
                            {accepting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Gamepad2 className="mr-2 h-4 w-4" />
                            )}
                            {accepting ? "Jungiamasi..." : "Prisijungti prie žaidimo"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
