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

export async function checkAssignmentPublished(assignmentId: string): Promise<{ isPublished: boolean, assignment?: any }> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('assignments')
        .select('*, questions(*)')
        .eq('id', assignmentId)
        .single()

    if (!data) return { isPublished: false }

    if (data.published) {
        // Sort questions by created_at
        if (data.questions) {
            data.questions.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        }
        return { isPublished: true, assignment: data }
    }

    return { isPublished: false }
}

// New action for point-based exercises - one try per question part
export async function submitPointsAnswer(
    assignmentId: string,
    questionId: string,
    submittedAnswer: string,
    isCorrect: boolean,
    pointsPerPart: number,
    totalQuestions: number
): Promise<ActionState & { alreadySubmitted?: boolean }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Fetch existing progress
    const { data: existing } = await supabase
        .from('assignment_progress')
        .select('submitted_answers, earned_points_per_part, completed_question_indices')
        .eq('student_id', user.id)
        .eq('assignment_id', assignmentId)
        .single()

    // Parse existing per-part data
    const submittedAnswers: Record<string, string> = existing?.submitted_answers || {}
    const earnedPointsPerPart: Record<string, number> = existing?.earned_points_per_part || {}
    const completedIndices: number[] = existing?.completed_question_indices || []

    // Check if this specific question was already submitted
    if (submittedAnswers[questionId] !== undefined) {
        return { success: false, error: "Answer already submitted for this part", alreadySubmitted: true }
    }

    // Add this question's submission
    submittedAnswers[questionId] = submittedAnswer
    earnedPointsPerPart[questionId] = isCorrect ? pointsPerPart : 0

    // Calculate total earned points
    const totalEarnedPoints = Object.values(earnedPointsPerPart).reduce((sum, pts) => sum + pts, 0)

    // Count how many questions have been submitted
    const submittedCount = Object.keys(submittedAnswers).length

    // Mark as completed only when all questions are submitted
    const isFullyCompleted = submittedCount >= totalQuestions

    const { error } = await supabase
        .from('assignment_progress')
        .upsert({
            student_id: user.id,
            assignment_id: assignmentId,
            completed_question_indices: completedIndices,
            is_completed: isFullyCompleted,
            submitted_answers: submittedAnswers,
            earned_points_per_part: earnedPointsPerPart,
            earned_points: totalEarnedPoints,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id, assignment_id'
        })

    if (error) {
        console.error("Points Submit Error", error)
        return { success: false, error: "Failed to submit answer" }
    }

    return { success: true }
}

// Get collection results for student (points summary)
export async function getCollectionResults(collectionId: string): Promise<{
    success: boolean
    results?: {
        totalPoints: number
        earnedPoints: number
        exercises: Array<{
            id: string
            title: string
            pointsEnabled: boolean
            points: number
            earnedPoints: number | null
            submittedAnswer: string | null
            isCorrect: boolean | null
        }>
    }
    error?: string
}> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Fetch assignments in collection with their progress
    const { data: assignments } = await supabase
        .from('assignments')
        .select(`
            id,
            title,
            points_enabled,
            points,
            questions (correct_value, correct_answer)
        `)
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true })

    if (!assignments) return { success: false, error: "Collection not found" }

    // Fetch progress for these assignments
    const assignmentIds = assignments.map(a => a.id)
    const { data: progressData } = await supabase
        .from('assignment_progress')
        .select('assignment_id, earned_points, submitted_answer, is_completed')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds)

    const progressMap = new Map(progressData?.map(p => [p.assignment_id, p]) || [])

    let totalPoints = 0
    let earnedPoints = 0

    const exercises = assignments.map((a: any) => {
        const progress = progressMap.get(a.id)
        const isPointsExercise = a.points_enabled
        const exercisePoints = a.points || 1

        if (isPointsExercise) {
            totalPoints += exercisePoints
            if (progress?.earned_points != null) {
                earnedPoints += progress.earned_points
            }
        }

        return {
            id: a.id,
            title: a.title,
            pointsEnabled: isPointsExercise,
            points: exercisePoints,
            earnedPoints: progress?.earned_points ?? null,
            submittedAnswer: progress?.submitted_answer ?? null,
            isCorrect: progress?.earned_points != null ? progress.earned_points > 0 : null
        }
    })

    return {
        success: true,
        results: {
            totalPoints,
            earnedPoints,
            exercises
        }
    }
}

// Get stats for all enrolled classrooms of type 'school_class'
export async function getStudentDashboardStats(): Promise<{
    success: boolean
    stats?: Record<string, { totalPoints: number, earnedPoints: number }>
    error?: string
}> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 1. Get enrolled classrooms
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
            classroom_id,
            classrooms (
                id,
                type
            )
        `)
        .eq('student_id', user.id)

    if (!enrollments) return { success: false, error: "No enrollments found" }

    const schoolClassIds = enrollments
        .filter((e: any) => e.classrooms?.type === 'school_class')
        .map((e: any) => e.classroom_id)

    if (schoolClassIds.length === 0) return { success: true, stats: {} }

    // 2. Fetch all published assignments with points for these classrooms
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, classroom_id, points, points_enabled')
        .in('classroom_id', schoolClassIds)
        .eq('published', true)
        .eq('points_enabled', true)

    if (!assignments) return { success: true, stats: {} }

    // 3. Fetch progress for these assignments
    const assignmentIds = assignments.map(a => a.id)
    const { data: progress } = await supabase
        .from('assignment_progress')
        .select('assignment_id, earned_points')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds)

    const progressMap = new Map(progress?.map(p => [p.assignment_id, p.earned_points || 0]) || [])

    const stats: Record<string, { totalPoints: number, earnedPoints: number }> = {}

    schoolClassIds.forEach(cid => {
        stats[cid] = { totalPoints: 0, earnedPoints: 0 }
    })

    assignments.forEach(a => {
        const cid = a.classroom_id
        if (stats[cid]) {
            const max = a.points || 0
            const earned = progressMap.get(a.id) || 0
            stats[cid].totalPoints += max
            stats[cid].earnedPoints += earned
        }
    })

    return { success: true, stats }
}
