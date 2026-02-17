'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getClientIp } from '@/lib/ip'

const HomeworkSubmissionEventSchema = z.object({
    questionId: z.string().uuid(),
    questionIndex: z.number().int().nonnegative(),
    submittedAnswer: z.string(),
    isCorrect: z.boolean()
})

type HomeworkSubmissionEventInput = z.infer<typeof HomeworkSubmissionEventSchema>

const UpsertProgressSchema = z.object({
    assignmentId: z.string().uuid(),
    completedIndices: z.array(z.number()),
    isCompleted: z.boolean(),
    activeQuestionIndex: z.number().optional(),
    revealedIndices: z.array(z.number()).optional(),
    submittedAnswers: z.record(z.string(), z.string()).optional(),
    submissionEvent: HomeworkSubmissionEventSchema.optional()
})

const LogSolutionRevealClickSchema = z.object({
    assignmentId: z.string().uuid(),
    questionId: z.string().uuid(),
    questionIndex: z.number().int().nonnegative()
})

export type ActionState = {
    success: boolean
    message?: string
    error?: string
}

export async function logSolutionRevealClick(
    assignmentId: string,
    questionId: string,
    questionIndex: number
): Promise<ActionState> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = LogSolutionRevealClickSchema.safeParse({ assignmentId, questionId, questionIndex })
    if (!validated.success) return { success: false, error: "Invalid data" }

    const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
            classroom_id,
            published,
            collections (
                id,
                category
            ),
            classrooms (
                allowed_ip,
                ip_check_enabled
            )
        `)
        .eq('id', assignmentId)
        .maybeSingle()

    if (assignmentError || !assignmentData) {
        return { success: false, error: "Unauthorized" }
    }

    if (!assignmentData.published) {
        return { success: false, error: "This assignment is currently in draft and cannot be saved." }
    }

    const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('classroom_id', assignmentData.classroom_id)
        .maybeSingle()

    if (enrollmentError || !enrollment) {
        return { success: false, error: "Unauthorized" }
    }

    const studentIp = await getClientIp()
    const classroomData = assignmentData.classrooms
    const collectionData = assignmentData.collections
    const classroom = Array.isArray(classroomData) ? classroomData[0] : classroomData
    const collection = Array.isArray(collectionData) ? collectionData[0] : collectionData

    if (collection?.category === 'classwork' && classroom?.ip_check_enabled && classroom?.allowed_ip) {
        if (studentIp !== classroom.allowed_ip) {
            const { data: bypass } = await createAdminClient()
                .from('ip_bypasses')
                .select('id')
                .eq('user_id', user.id)
                .eq('collection_id', collection.id)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle()

            if (!bypass) {
                return { success: false, error: "Access restricted: You have moved to a different network. Please reconnect to the classroom network to save progress." }
            }
        }
    }

    const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('id')
        .eq('id', questionId)
        .eq('assignment_id', assignmentId)
        .maybeSingle()

    if (questionError || !question) {
        return { success: false, error: "Invalid question" }
    }

    const { error } = await supabase
        .from('solution_reveal_events')
        .insert({
            student_id: user.id,
            assignment_id: assignmentId,
            question_id: questionId,
            question_index: questionIndex
        })

    if (error) {
        console.error("Solution Reveal Log Error", error)
        return { success: false, error: "Failed to log solution reveal" }
    }

    return { success: true }
}

export async function upsertAssignmentProgress(
    assignmentId: string,
    completedIndices: number[],
    isCompleted: boolean,
    activeQuestionIndex?: number,
    revealedIndices?: number[],
    submittedAnswers?: Record<string, string>,
    submissionEvent?: HomeworkSubmissionEventInput
): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = UpsertProgressSchema.safeParse({ assignmentId, completedIndices, isCompleted, activeQuestionIndex, revealedIndices, submittedAnswers, submissionEvent })
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
                id,
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
                // Check for bypass
                const { data: bypass } = await createAdminClient()
                    .from('ip_bypasses')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('collection_id', collection.id)
                    .gt('expires_at', new Date().toISOString())
                    .maybeSingle()

                if (!bypass) {
                    return { success: false, error: "Access restricted: You have moved to a different network. Please reconnect to the classroom network to save progress." }
                }
            }
        }
    }

    if (submissionEvent) {
        if (!assignmentData) {
            return { success: false, error: "Unauthorized" }
        }

        const collectionData = assignmentData.collections
        const collection = Array.isArray(collectionData) ? collectionData[0] : collectionData
        const isHomeworkAssignment = (collection as { category?: string | null } | null | undefined)?.category !== 'classwork'

        if (isHomeworkAssignment) {
            const { data: question, error: questionError } = await supabase
                .from('questions')
                .select('id')
                .eq('id', submissionEvent.questionId)
                .eq('assignment_id', assignmentId)
                .maybeSingle()

            if (questionError || !question) {
                return { success: false, error: "Invalid question" }
            }

            const { error: submissionEventError } = await supabase
                .from('homework_submission_events')
                .insert({
                    student_id: user.id,
                    assignment_id: assignmentId,
                    question_id: submissionEvent.questionId,
                    question_index: submissionEvent.questionIndex,
                    submitted_answer: submissionEvent.submittedAnswer,
                    is_correct: submissionEvent.isCorrect
                })

            if (submissionEventError) {
                console.error("Homework Submission Log Error", submissionEventError)
                return { success: false, error: "Failed to log homework submission" }
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
            submitted_answers: submittedAnswers || {},
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

export async function checkIpAccess(classroomId: string, category: string, collectionId?: string): Promise<{ isRestricted: boolean, studentIp?: string }> {
    const supabase = await createClient()
    const studentIp = await getClientIp()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('allowed_ip, ip_check_enabled')
        .eq('id', classroomId)
        .single()

    if (!classroom) return { isRestricted: false }

    let isRestricted = category === 'classwork' &&
        classroom.ip_check_enabled &&
        classroom.allowed_ip &&
        studentIp !== classroom.allowed_ip

    if (isRestricted && user && collectionId) {
        // Check for bypass
        const { data: bypass } = await createAdminClient()
            .from('ip_bypasses')
            .select('id')
            .eq('user_id', user.id)
            .eq('collection_id', collectionId)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

        if (bypass) {
            isRestricted = false
        }
    }

    return { isRestricted, studentIp }
}

// Lightweight status check used by classwork polling:
// combines IP restriction and test mode state in a single server action call.
export async function getCollectionRuntimeStatus(
    classroomId: string,
    category: string,
    collectionId: string,
    includeTestModeStatus = true
): Promise<{
    success: boolean
    isRestricted: boolean
    studentIp?: string
    testModeEndsAt?: string | null
    error?: string
}> {
    const supabase = await createClient()
    const studentIp = await getClientIp()
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: classroom, error: classroomError }, { data: collection, error: collectionError }] = await Promise.all([
        supabase
            .from('classrooms')
            .select('allowed_ip, ip_check_enabled')
            .eq('id', classroomId)
            .single(),
        includeTestModeStatus
            ? supabase
                .from('collections')
                .select('test_mode_ends_at')
                .eq('id', collectionId)
                .single()
            : Promise.resolve({ data: null, error: null })
    ])

    if (classroomError || collectionError) {
        console.error("Error fetching collection runtime status:", classroomError || collectionError)
        return {
            success: false,
            isRestricted: false,
            studentIp,
            error: "Failed to fetch runtime status"
        }
    }

    let isRestricted = category === 'classwork' &&
        classroom?.ip_check_enabled &&
        classroom?.allowed_ip &&
        studentIp !== classroom.allowed_ip

    if (isRestricted && user) {
        const { data: bypass } = await createAdminClient()
            .from('ip_bypasses')
            .select('id')
            .eq('user_id', user.id)
            .eq('collection_id', collectionId)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

        if (bypass) {
            isRestricted = false
        }
    }

    return {
        success: true,
        isRestricted,
        studentIp,
        testModeEndsAt: collection?.test_mode_ends_at || null
    }
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

// Lightweight publish status check for polling while waiting for unlock.
export async function getAssignmentPublishStatus(assignmentId: string): Promise<{
    success: boolean
    isPublished: boolean
}> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('assignments')
        .select('published')
        .eq('id', assignmentId)
        .single()

    if (error) {
        console.error("Error fetching assignment publish status:", error)
        return { success: false, isPublished: false }
    }

    return {
        success: true,
        isPublished: !!data?.published
    }
}

export async function getCollectionAssignments(collectionId: string): Promise<{ success: boolean, assignments?: any[] }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('assignments')
        .select('*, questions(*)')
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true })

    if (error) {
        console.error("Error fetching collection assignments:", error)
        return { success: false }
    }

    // Sort questions for each assignment
    data?.forEach((assign: any) => {
        if (assign.questions) {
            assign.questions.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        }
    })

    return { success: true, assignments: data }
}

// Fetch progress data for all assignments in a collection
export async function getCollectionProgress(collectionId: string): Promise<{
    success: boolean
    progress?: any[]
    error?: string
}> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // First get all assignment IDs in this collection
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('collection_id', collectionId)

    if (!assignments || assignments.length === 0) {
        return { success: true, progress: [] }
    }

    const assignmentIds = assignments.map(a => a.id)

    // Fetch progress for these assignments
    const { data: progress, error } = await supabase
        .from('assignment_progress')
        .select('assignment_id, completed_question_indices, revealed_question_indices, is_completed, active_question_index, submitted_answers, earned_points_per_part')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds)

    if (error) {
        console.error("Error fetching collection progress:", error)
        return { success: false, error: "Failed to fetch progress" }
    }

    return { success: true, progress: progress || [] }
}

// Check collection test mode status (for polling when waiting for test to start)
export async function getCollectionTestStatus(collectionId: string): Promise<{
    success: boolean
    testModeEndsAt?: string | null
    error?: string
}> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('collections')
        .select('test_mode_ends_at')
        .eq('id', collectionId)
        .single()

    if (error) {
        console.error("Error fetching collection test status:", error)
        return { success: false, error: "Failed to fetch test status" }
    }

    return {
        success: true,
        testModeEndsAt: data?.test_mode_ends_at || null
    }
}

// New action for point-based exercises - one try per question part
export async function submitPointsAnswer(
    assignmentId: string,
    questionId: string,
    submittedAnswer: string,
    isCorrect: boolean,
    pointsPerPart: number,
    totalQuestions: number,
    requiredVariationsCount?: number,
    questionIndex?: number
): Promise<ActionState & { alreadySubmitted?: boolean }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    if (questionIndex !== undefined && (!Number.isInteger(questionIndex) || questionIndex < 0)) {
        return { success: false, error: "Invalid data" }
    }

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

    if (questionIndex !== undefined) {
        const [{ data: assignmentData, error: assignmentError }, { data: question, error: questionError }] = await Promise.all([
            supabase
                .from('assignments')
                .select(`
                    collections (
                        category
                    )
                `)
                .eq('id', assignmentId)
                .maybeSingle(),
            supabase
                .from('questions')
                .select('id')
                .eq('id', questionId)
                .eq('assignment_id', assignmentId)
                .maybeSingle()
        ])

        if (assignmentError || !assignmentData) {
            return { success: false, error: "Unauthorized" }
        }

        if (questionError || !question) {
            return { success: false, error: "Invalid question" }
        }

        const collectionData = assignmentData.collections
        const collection = Array.isArray(collectionData) ? collectionData[0] : collectionData
        const isHomeworkAssignment = (collection as { category?: string | null } | null | undefined)?.category !== 'classwork'

        if (isHomeworkAssignment) {
            const { error: submissionEventError } = await supabase
                .from('homework_submission_events')
                .insert({
                    student_id: user.id,
                    assignment_id: assignmentId,
                    question_id: questionId,
                    question_index: questionIndex,
                    submitted_answer: submittedAnswer,
                    is_correct: isCorrect
                })

            if (submissionEventError) {
                console.error("Homework Submission Log Error", submissionEventError)
                return { success: false, error: "Failed to log homework submission" }
            }
        }
    }

    // Add this question's submission
    submittedAnswers[questionId] = submittedAnswer
    earnedPointsPerPart[questionId] = isCorrect ? pointsPerPart : 0

    // Calculate total earned points
    const totalEarnedPoints = Object.values(earnedPointsPerPart).reduce((sum, pts) => sum + pts, 0)

    // Count how many questions have been submitted
    const submittedCount = Object.keys(submittedAnswers).length

    // Mark as completed only when all questions are submitted
    // If variation mode, check against required variations count
    const isFullyCompleted = (requiredVariationsCount && requiredVariationsCount > 0)
        ? submittedCount >= requiredVariationsCount
        : submittedCount >= totalQuestions

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

// Auto-submit all unanswered points questions for all exercises in a collection
export async function autoSubmitCollectionPointsAnswers(collectionId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Fetch all PUBLISHED assignments in collection with points enabled
    // IMPORTANT: Only process published assignments to avoid pre-submitting for unpublished exercises
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, points_enabled, questions(id, points)')
        .eq('collection_id', collectionId)
        .eq('points_enabled', true)
        .eq('published', true)

    if (!assignments || assignments.length === 0) {
        return { success: true } // No points-enabled exercises
    }

    // Fetch existing progress for all these assignments
    const assignmentIds = assignments.map(a => a.id)
    const { data: progressData } = await supabase
        .from('assignment_progress')
        .select('assignment_id, submitted_answers, earned_points_per_part')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds)

    const progressMap = new Map(progressData?.map(p => [p.assignment_id, p]) || [])

    // Process each assignment
    for (const assignment of assignments) {
        const questions = (assignment as any).questions || []
        if (questions.length === 0) continue

        const progress = progressMap.get(assignment.id)
        const submittedAnswers: Record<string, string> = progress?.submitted_answers || {}
        const earnedPointsPerPart: Record<string, number> = progress?.earned_points_per_part || {}

        let hasNewSubmissions = false

        // Submit empty answers for unanswered questions
        for (const question of questions) {
            if (submittedAnswers[question.id] === undefined) {
                submittedAnswers[question.id] = ''
                earnedPointsPerPart[question.id] = 0
                hasNewSubmissions = true
            }
        }

        if (hasNewSubmissions) {
            // Calculate total earned points
            const totalEarnedPoints = Object.values(earnedPointsPerPart).reduce((sum, pts) => sum + pts, 0)

            // Upsert the progress with all answers submitted
            const { error } = await supabase
                .from('assignment_progress')
                .upsert({
                    student_id: user.id,
                    assignment_id: assignment.id,
                    submitted_answers: submittedAnswers,
                    earned_points_per_part: earnedPointsPerPart,
                    earned_points: totalEarnedPoints,
                    is_completed: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'student_id, assignment_id'
                })

            if (error) {
                console.error("Auto-submit error for assignment", assignment.id, error)
            }
        }
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
            required_variations_count,
            questions (id, points, correct_value, correct_answer)
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
        const requiredCount = a.required_variations_count || 0
        const isVariation = requiredCount > 0

        let exercisePoints = isPointsExercise ? (a.points || 1) : 0

        // If variation exercise, points should be (points of first variation * requiredCount)
        if (isPointsExercise && isVariation && a.questions?.[0]) {
            const pointsPerVariation = a.questions[0].points || 1
            exercisePoints = pointsPerVariation * requiredCount
        }

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
        .select(`
            id, 
            classroom_id, 
            points, 
            points_enabled,
            required_variations_count,
            questions (points)
        `)
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

    assignments.forEach((a: any) => {
        const cid = a.classroom_id
        if (stats[cid]) {
            const requiredCount = a.required_variations_count || 0
            const isVariation = requiredCount > 0

            // Use exercise-level points if set, otherwise calculate from question points
            let max = a.points || 0

            if (isVariation && a.questions?.[0]) {
                const pointsPerVariation = a.questions[0].points || 1
                max = pointsPerVariation * requiredCount
            }

            const earned = progressMap.get(a.id) || 0
            stats[cid].totalPoints += max
            stats[cid].earnedPoints += earned
        }
    })

    return { success: true, stats }
}
