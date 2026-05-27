'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const MarkPopupNotificationSeenSchema = z.object({
    notificationId: z.string().uuid(),
})

export type StudentPopupNotification = {
    id: string
    title: string
    body: string
    createdAt: string
    classroomName: string | null
    groupNumber: number | null
    members: Array<{
        id: string | null
        name: string
    }>
    assignedQuestions: Array<{
        number: number
        text: string
    }>
    questionInstruction: string | null
}

type StudentPopupNotificationRow = {
    id: string
    title: string
    body: string
    metadata: unknown
    created_at: string
}

type ActionState = {
    success: boolean
    error?: string
}

function readPopupNotificationMetadata(metadata: unknown): Omit<StudentPopupNotification, 'id' | 'title' | 'body' | 'createdAt'> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {
            classroomName: null,
            groupNumber: null,
            members: [],
            assignedQuestions: [],
            questionInstruction: null,
        }
    }

    const value = metadata as Record<string, unknown>
    const members = Array.isArray(value.members)
        ? value.members
            .filter((member): member is Record<string, unknown> => !!member && typeof member === 'object' && !Array.isArray(member))
            .map((member) => ({
                id: typeof member.id === 'string' ? member.id : null,
                name: typeof member.name === 'string' && member.name.trim() ? member.name : 'Mokinys',
            }))
        : []
    const assignedQuestions = Array.isArray(value.assignedQuestions)
        ? value.assignedQuestions
            .filter((question): question is Record<string, unknown> => !!question && typeof question === 'object' && !Array.isArray(question))
            .map((question) => ({
                number: typeof question.number === 'number' && Number.isFinite(question.number) ? question.number : 0,
                text: typeof question.text === 'string' ? question.text : '',
            }))
            .filter((question) => question.number > 0 && question.text.trim().length > 0)
        : []

    return {
        classroomName: typeof value.classroomName === 'string' ? value.classroomName : null,
        groupNumber: typeof value.groupNumber === 'number' && Number.isFinite(value.groupNumber) ? value.groupNumber : null,
        members,
        assignedQuestions,
        questionInstruction: typeof value.questionInstruction === 'string' ? value.questionInstruction : null,
    }
}

export async function getUnseenPopupNotifications(): Promise<{
    success: boolean
    notifications?: StudentPopupNotification[]
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data, error } = await supabase
        .from('student_popup_notifications')
        .select('id, title, body, metadata, created_at')
        .eq('student_id', user.id)
        .is('seen_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching popup notifications:", error)
        return { success: false, error: "Failed to fetch popup notifications" }
    }

    const rows = (data || []) as StudentPopupNotificationRow[]
    const [latestNotification, ...olderNotifications] = rows

    if (olderNotifications.length > 0) {
        const { error: updateError } = await supabase
            .from('student_popup_notifications')
            .update({ seen_at: new Date().toISOString() })
            .in('id', olderNotifications.map((notification) => notification.id))
            .eq('student_id', user.id)

        if (updateError) {
            console.error("Error clearing older popup notifications:", updateError)
        }
    }

    const notifications = latestNotification ? [latestNotification].map((notification) => {
        const metadata = readPopupNotificationMetadata(notification.metadata)
        return {
            id: notification.id,
            title: notification.title,
            body: metadata.members.length > 0 ? "" : notification.body,
            createdAt: notification.created_at,
            ...metadata,
        }
    }) : []

    return { success: true, notifications }
}

export async function markPopupNotificationSeen(notificationId: string): Promise<ActionState> {
    const validated = MarkPopupNotificationSeenSchema.safeParse({ notificationId })
    if (!validated.success) return { success: false, error: "Invalid notification" }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('student_popup_notifications')
        .update({ seen_at: new Date().toISOString() })
        .eq('id', validated.data.notificationId)
        .eq('student_id', user.id)

    if (error) {
        console.error("Error marking popup notification as seen:", error)
        return { success: false, error: "Failed to mark popup notification as seen" }
    }

    return { success: true }
}
