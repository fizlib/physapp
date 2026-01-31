'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getClientIp } from '@/lib/ip'

const UpsertProgressSchema = z.object({
    assignmentId: z.string().uuid(),
    completedIndices: z.array(z.number()),
    isCompleted: z.boolean(),
    activeQuestionIndex: z.number().optional(),
    revealedIndices: z.array(z.number()).optional()
})

export type ActionState = {
    success: boolean
    message?: string
    error?: string
}

export async function upsertAssignmentProgress(
    assignmentId: string,
    completedIndices: number[],
    isCompleted: boolean,
    activeQuestionIndex?: number,
    revealedIndices?: number[]
): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = UpsertProgressSchema.safeParse({ assignmentId, completedIndices, isCompleted, activeQuestionIndex })
    if (!validated.success) return { success: false, error: "Invalid data" }

    // IP Enforcement Check
    const studentIp = await getClientIp()

    // Fetch classroom info via assignment -> collection link
    const { data: assignmentData } = await supabase
        .from('assignments')
        .select(`
            classroom_id,
            published,
            collections (
                category
            ),
            classrooms (
                allowed_ip,
                ip_check_enabled
            )
        `)
        .eq('id', assignmentId)
        .single()

    if (assignmentData && !assignmentData.published) {
        return { success: false, error: "This assignment is currently in draft and cannot be saved." }
    }

    if (assignmentData) {
        // Handle potential array return from join (depends on Supabase client version/types)
        const classroom: any = Array.isArray(assignmentData.classrooms) ? assignmentData.classrooms[0] : assignmentData.classrooms
        const collection: any = Array.isArray(assignmentData.collections) ? assignmentData.collections[0] : assignmentData.collections

        // Only restrict 'classwork'
        if (collection?.category === 'classwork' && classroom?.ip_check_enabled && classroom?.allowed_ip) {
            if (studentIp !== classroom.allowed_ip) {
                return { success: false, error: "Access restricted: You have moved to a different network. Please reconnect to the classroom network to save progress." }
            }
        }
    }

    const { error } = await supabase
        .from('assignment_progress')
        .upsert({
            student_id: user.id,
            assignment_id: assignmentId,
            completed_question_indices: completedIndices,
            is_completed: isCompleted,
            active_question_index: activeQuestionIndex,
            revealed_question_indices: revealedIndices || [],
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id, assignment_id'
        })

    if (error) {
        console.error("Progress Upsert Error", error)
        return { success: false, error: "Failed to save progress" }
    }

    // We might want to revalidate, but maybe not strictly necessary for every question step
    // But definitely for completion status change
    if (isCompleted) {
        // Revalidate collection view or similar if we knew the path.
        // Since we don't have the collection ID easily here, we might skip precise revalidation 
        // or pass it in. For now, we'll skip aggressive server revalidation and rely on client state
        // until page navigation where `native` revalidation happens.
    }

    return { success: true }
}

export async function checkIpAccess(classroomId: string, category: string): Promise<{ isRestricted: boolean, studentIp?: string }> {
    const supabase = await createClient()
    const studentIp = await getClientIp()

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('allowed_ip, ip_check_enabled')
        .eq('id', classroomId)
        .single()

    if (!classroom) return { isRestricted: false }

    const isRestricted = category === 'classwork' &&
        classroom.ip_check_enabled &&
        classroom.allowed_ip &&
        studentIp !== classroom.allowed_ip

    return { isRestricted, studentIp }
}
