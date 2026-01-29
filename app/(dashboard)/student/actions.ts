'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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
