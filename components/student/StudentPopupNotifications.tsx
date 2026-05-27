"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Users } from "lucide-react"
import {
    getUnseenPopupNotifications,
    markPopupNotificationSeen,
    type StudentPopupNotification,
} from "@/app/(dashboard)/student/popup-actions"

export function StudentPopupNotifications() {
    const pathname = usePathname()
    const [queue, setQueue] = useState<StudentPopupNotification[]>([])
    const [acknowledging, setAcknowledging] = useState(false)

    const currentNotification = queue[0] || null

    useEffect(() => {
        let cancelled = false

        const loadNotifications = async () => {
            const result = await getUnseenPopupNotifications()
            if (cancelled || !result.success || !result.notifications) return

            setQueue(result.notifications.slice(0, 1))
        }

        loadNotifications()

        return () => {
            cancelled = true
        }
    }, [pathname])

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

    return (
        <Dialog
            open={!!currentNotification}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    void handleAcknowledge()
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
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
                    </div>
                )}

            </DialogContent>
        </Dialog>
    )
}
