"use client"

import { useEffect } from "react"
import { syncClassroomIp } from "./actions"

export function TeacherIpSync({ classroomId }: { classroomId: string }) {
    useEffect(() => {
        // Initial sync
        syncClassroomIp(classroomId)

        // Poll every 30 seconds for teacher IP changes
        // (Matched to student check to prevent accidental lockouts)
        const interval = setInterval(() => {
            syncClassroomIp(classroomId)
        }, 30000)

        return () => clearInterval(interval)
    }, [classroomId])

    return null // Invisible component
}
