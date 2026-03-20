"use client"

import { useEffect } from "react"
import { syncClassroomIp } from "./actions"

export function TeacherIpSync({ classroomId }: { classroomId: string }) {
    useEffect(() => {
        // Initial sync
        syncClassroomIp(classroomId)

        // Poll every 60 seconds for teacher IP changes
        const interval = setInterval(() => {
            syncClassroomIp(classroomId)
        }, 60000)

        return () => clearInterval(interval)
    }, [classroomId])

    return null // Invisible component
}
