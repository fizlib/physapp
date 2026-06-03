'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { headers } from 'next/headers'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { generateContentWithFallback } from '@/lib/gemini'
import { calculateAssignmentMaxPoints } from '@/lib/points'
import {
    buildProgressEarnedParts,
    buildProgressSubmittedAnswers,
    buildScoredQuestionOrder,
    calculateScaledScore,
    fillTimedOutAnswers,
    isScoredSimulationUrl,
    SCORED_TEST_SIMULATION_ID,
    toScoredAnswerMap,
    toScoredQuestionOrder,
    type ScoredAnswerMap,
    type ScoredQuestionOrderItem,
} from '@/lib/ninth-grade-scored-test'

// ... (keep existing code) ...


const LessonSlotSchema = z.object({
    day: z.number().min(0).max(6),
    time: z.string().regex(/^\d{2}:\d{2}$/)
})

const CreateClassSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['private_student', 'school_class']).default('school_class'),
    lessonSchedule: z.array(LessonSlotSchema).optional(),
})

const CreateCollectionSchema = z.object({
    title: z.string().min(1),
    classroomId: z.string().uuid(),
    category: z.enum(['homework', 'classwork', 'information']).default('homework'),
})

const AddStudentSchema = z.object({
    email: z.string().email(),
    classroomId: z.string().uuid(),
})

const SubmitTeacherManualPointsAnswerSchema = z.object({
    classroomId: z.string().uuid(),
    studentId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    questionId: z.string().uuid(),
    submittedAnswer: z.string().trim().min(1),
    isCorrect: z.boolean(),
})

const SetTeacherExercisePointsDisabledSchema = z.object({
    classroomId: z.string().uuid(),
    studentId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    disabled: z.boolean(),
})

const AddBonusPointsSchema = z.object({
    classroomId: z.string().uuid(),
    amount: z.number().int().min(1),
    studentIds: z.array(z.string().uuid()).min(1),
})

const AssignRandomGroupsSchema = z.object({
    classroomId: z.string().uuid(),
    groupSize: z.number().int().min(2),
    leftoverStrategy: z.enum(['smaller_group', 'distribute']),
    studentIds: z.array(z.string().uuid()).min(1),
    questionsEnabled: z.boolean().default(false),
    questions: z.array(z.string()).default([]),
})

const RANDOM_GROUP_QUESTION_INSTRUCTION = "Kai ateis tavo eilė, perskaityk klausimą kitiems grupės nariams. Išklausyk jų atsakymus. Po to, jei nori, gali pridėti savo mintį."

import { getClientIp } from '@/lib/ip'

type PointQuestion = {
    id: string
    created_at?: string | null
    question_type: string
    correct_value?: number | string | null
    tolerance_percent?: number | string | null
    correct_answer?: string | null
    points?: number | string | null
}

type PointProgressRow = {
    id: string
    submitted_answers: unknown
    earned_points_per_part: unknown
}

type ProgressSubmissionRow = {
    student_id: string
    submitted_answers: unknown
    earned_points_per_part: unknown
}

type ClassroomStudentProfileRow = {
    first_name: string | null
    last_name: string | null
    email: string | null
}

type EnrollmentWithStudentProfileRow = {
    student_id: string
    profiles: ClassroomStudentProfileRow | ClassroomStudentProfileRow[] | null
}

type PointsDisabledProgressRow = {
    earned_points?: number | string | null
    points_disabled_by_teacher?: boolean | null
}

type ScoredSimulationAssignmentRow = {
    id: string
    classroom_id?: string | null
    collection_id?: string | null
    simulation_url?: string | null
    questions?: Array<{ id: string; points?: number | null }> | null
}

type AutoSubmitProgressRow = {
    student_id: string
    assignment_id: string
    submitted_answers: unknown
    earned_points_per_part: unknown
    points_disabled_by_teacher?: boolean | null
}

function sortQuestionsByCreatedAt<T extends { created_at?: string | null }>(questions: T[]): T[] {
    return [...questions].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return aTime - bTime
    })
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function toSubmittedAnswerMap(value: unknown): Record<string, string> {
    if (!isRecordObject(value)) return {}

    return Object.entries(value).reduce<Record<string, string>>((acc, [key, answer]) => {
        if (!key || answer === undefined) return acc
        acc[key] = answer === null ? '' : String(answer)
        return acc
    }, {})
}

function toEarnedPointsMap(value: unknown): Record<string, number> {
    if (!isRecordObject(value)) return {}

    return Object.entries(value).reduce<Record<string, number>>((acc, [key, points]) => {
        if (!key) return acc
        const numericPoints = Number(points)
        acc[key] = Number.isFinite(numericPoints) ? numericPoints : 0
        return acc
    }, {})
}

function recordsEqual<T extends string | number>(left: Record<string, T>, right: Record<string, T>) {
    const leftEntries = Object.entries(left)
    const rightEntries = Object.entries(right)
    if (leftEntries.length !== rightEntries.length) return false

    return leftEntries.every(([key, value]) => right[key] === value)
}

function parseMaybeNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
}

function getQuestionPoints(question: PointQuestion): number {
    const points = Number(question.points)
    return Number.isFinite(points) && points > 0 ? points : 1
}

function isSubmittedAnswerCorrect(question: PointQuestion, submittedAnswer: string): boolean {
    if (submittedAnswer.trim() === '') return false

    if (question.question_type === 'numerical') {
        const answerValue = parseMaybeNumber(submittedAnswer)
        const correctValue = parseMaybeNumber(question.correct_value)
        if (answerValue === null || correctValue === null) return false

        const tolerancePercent = parseMaybeNumber(question.tolerance_percent) ?? 0
        const margin = Math.abs(correctValue * (tolerancePercent / 100))
        return Math.abs(answerValue - correctValue) <= margin
    }

    if (question.question_type === 'multiple_choice') {
        return submittedAnswer.trim().toUpperCase() === (question.correct_answer || '').trim().toUpperCase()
    }

    return false
}

function sumEarnedPoints(earnedPointsPerPart: Record<string, number>): number {
    return Object.values(earnedPointsPerPart).reduce((sum, points) => sum + points, 0)
}

function getEffectiveEarnedPoints(progress: PointsDisabledProgressRow | null | undefined): number {
    if (!progress || progress.points_disabled_by_teacher) return 0

    const earnedPoints = Number(progress.earned_points)
    return Number.isFinite(earnedPoints) ? earnedPoints : 0
}

async function mirrorScoredSimulationProgressForTeacher(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    assignment: { id: string; classroom_id?: string | null; collection_id?: string | null },
    studentId: string,
    order: ScoredQuestionOrderItem[],
    answers: ScoredAnswerMap,
    isCompleted: boolean
) {
    const { data: existingProgress } = await supabaseAdmin
        .from('assignment_progress')
        .select('points_disabled_by_teacher')
        .eq('assignment_id', assignment.id)
        .eq('student_id', studentId)
        .maybeSingle()

    const completedIndices = order
        .map((item, index) => answers[item.key] ? index : null)
        .filter((index): index is number => index !== null)

    const earnedPoints = calculateScaledScore(answers, order.length)

    const { error } = await supabaseAdmin
        .from('assignment_progress')
        .upsert({
            student_id: studentId,
            assignment_id: assignment.id,
            completed_question_indices: completedIndices,
            is_completed: isCompleted,
            active_question_index: Math.min(completedIndices.length, Math.max(order.length - 1, 0)),
            revealed_question_indices: [],
            submitted_answers: buildProgressSubmittedAnswers(answers),
            earned_points_per_part: buildProgressEarnedParts(answers),
            earned_points: earnedPoints,
            points_disabled_by_teacher: !!existingProgress?.points_disabled_by_teacher,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'student_id, assignment_id',
        })

    if (error) {
        console.error("Scored simulation progress mirror error", {
            assignmentId: assignment.id,
            studentId,
            error,
        })
    }
}

async function finalizeScoredSimulationAttemptForTeacher(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    assignment: { id: string; classroom_id?: string | null; collection_id?: string | null },
    studentId: string,
    completedAtIso = new Date().toISOString()
) {
    const { data: attempt } = await supabaseAdmin
        .from('simulation_test_attempts')
        .select('*')
        .eq('assignment_id', assignment.id)
        .eq('student_id', studentId)
        .maybeSingle()

    const order = toScoredQuestionOrder(attempt?.question_order).length > 0
        ? toScoredQuestionOrder(attempt?.question_order)
        : buildScoredQuestionOrder()
    const answers = fillTimedOutAnswers(order, toScoredAnswerMap(attempt?.answers), completedAtIso)
    const earnedPoints = calculateScaledScore(answers, order.length)

    const { error: attemptError } = await supabaseAdmin
        .from('simulation_test_attempts')
        .upsert({
            assignment_id: assignment.id,
            student_id: studentId,
            simulation_id: SCORED_TEST_SIMULATION_ID,
            question_order: order,
            answers,
            current_index: order.length,
            current_question_started_at: null,
            current_question_deadline_at: null,
            completed_at: completedAtIso,
            earned_points: earnedPoints,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'assignment_id, student_id',
        })

    if (attemptError) {
        console.error("Scored simulation finalize attempt error", {
            assignmentId: assignment.id,
            studentId,
            error: attemptError,
        })
        return
    }

    await mirrorScoredSimulationProgressForTeacher(
        supabaseAdmin,
        assignment,
        studentId,
        order,
        answers,
        true
    )
}

function isPointProgressCompleted(
    submittedAnswers: Record<string, string>,
    questions: PointQuestion[],
    requiredVariationsCount?: number | null
): boolean {
    const submittedCount = Object.keys(submittedAnswers).length
    const requiredCount = Number(requiredVariationsCount) || 0

    return requiredCount > 0
        ? submittedCount >= requiredCount
        : submittedCount >= questions.length
}

function normalizePointProgressForQuestions(
    submittedAnswersInput: unknown,
    earnedPointsInput: unknown,
    questionsInput: PointQuestion[]
) {
    const questions = sortQuestionsByCreatedAt(questionsInput)
    const rawSubmittedAnswers = toSubmittedAnswerMap(submittedAnswersInput)
    const rawEarnedPoints = toEarnedPointsMap(earnedPointsInput)
    const currentQuestionIds = new Set(questions.map((question) => question.id))
    const submittedAnswers: Record<string, string> = {}
    const orphanedAnswers: Array<[string, string]> = []

    for (const [questionId, answer] of Object.entries(rawSubmittedAnswers)) {
        if (currentQuestionIds.has(questionId)) {
            submittedAnswers[questionId] = answer
        } else {
            orphanedAnswers.push([questionId, answer])
        }
    }

    const unansweredQuestions = questions.filter((question) => submittedAnswers[question.id] === undefined)
    const canMapAllLegacyAnswers = Object.keys(submittedAnswers).length === 0
        && orphanedAnswers.length === questions.length
    const canMapSingleLegacyAnswer = orphanedAnswers.length === 1
        && unansweredQuestions.length === 1

    if (canMapAllLegacyAnswers || canMapSingleLegacyAnswer) {
        orphanedAnswers.slice(0, unansweredQuestions.length).forEach(([, answer], index) => {
            submittedAnswers[unansweredQuestions[index].id] = answer
        })
    }

    const earnedPointsPerPart: Record<string, number> = {}
    for (const question of questions) {
        if (submittedAnswers[question.id] === undefined) continue
        earnedPointsPerPart[question.id] = isSubmittedAnswerCorrect(question, submittedAnswers[question.id])
            ? getQuestionPoints(question)
            : 0
    }

    return {
        submittedAnswers,
        earnedPointsPerPart,
        changed: !recordsEqual(rawSubmittedAnswers, submittedAnswers) || !recordsEqual(rawEarnedPoints, earnedPointsPerPart)
    }
}

async function recalculateAssignmentPointProgress(
    supabaseAdmin: ReturnType<typeof createAdminClient>,
    assignmentId: string,
    questions: PointQuestion[],
    requiredVariationsCount?: number | null
): Promise<{ success: boolean, error?: string }> {
    const { data: progressRows, error: progressFetchError } = await supabaseAdmin
        .from('assignment_progress')
        .select('id, submitted_answers, earned_points_per_part')
        .eq('assignment_id', assignmentId)

    if (progressFetchError) {
        console.error("Point progress fetch error", progressFetchError)
        return { success: false, error: "Failed to fetch student progress for recalculation" }
    }

    try {
        await Promise.all(((progressRows || []) as PointProgressRow[]).map(async (progress) => {
            const normalizedProgress = normalizePointProgressForQuestions(
                progress.submitted_answers,
                progress.earned_points_per_part,
                questions
            )
            const totalEarnedPoints = sumEarnedPoints(normalizedProgress.earnedPointsPerPart)
            const isCompleted = isPointProgressCompleted(
                normalizedProgress.submittedAnswers,
                questions,
                requiredVariationsCount
            )

            const { error: updateError } = await supabaseAdmin
                .from('assignment_progress')
                .update({
                    submitted_answers: normalizedProgress.submittedAnswers,
                    earned_points_per_part: normalizedProgress.earnedPointsPerPart,
                    earned_points: totalEarnedPoints,
                    is_completed: isCompleted,
                    updated_at: new Date().toISOString()
                })
                .eq('id', progress.id)

            if (updateError) throw updateError
        }))
    } catch (error) {
        console.error("Point progress recalculation error", error)
        return { success: false, error: "Failed to recalculate student points" }
    }

    return { success: true }
}

export async function createClassroom(formData: FormData) {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const name = formData.get('name') as string
    const type = formData.get('type') as 'private_student' | 'school_class' || 'school_class'
    const lessonScheduleRaw = formData.get('lessonSchedule') as string | null

    let lessonSchedule = undefined
    if (lessonScheduleRaw && type === 'school_class') {
        try {
            lessonSchedule = JSON.parse(lessonScheduleRaw)
        } catch (e) {
            console.error('Failed to parse lesson schedule', e)
        }
    }

    const validated = CreateClassSchema.safeParse({ name, type, lessonSchedule })
    if (!validated.success) return { error: "Invalid name or type" }

    const ip = await getClientIp()

    const { error } = await supabase.from('classrooms').insert({
        teacher_id: user.id,
        name: name,
        type: validated.data.type,
        lesson_schedule: validated.data.lessonSchedule || null,
        allowed_ip: ip,
        ip_check_enabled: false
    })

    if (error) {
        console.error(error)
        return { error: 'Failed to create classroom' }
    }

    revalidatePath('/teacher')
    return { success: true }
}

const UpdateAssignmentTitleSchema = z.object({
    assignmentId: z.string().uuid(),
    title: z.string().min(1),
})

export async function updateAssignmentWithQuestion(assignmentId: string, classroomId: string, exerciseData: unknown): Promise<ActionState> {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 2. Validate Data
    const validated = ExerciseSchema.safeParse(exerciseData)
    if (!validated.success) {
        console.error("Validation Error", validated.error)
        return { success: false, error: "Invalid exercise data" }
    }
    const data = validated.data

    // 3. Verify Ownership
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // 4. Update Assignment
    const { error: assignmentError } = await supabase
        .from('assignments')
        .update({
            title: data.title,
            category: data.category,
            show_all_questions: data.show_all_questions || false,
            points_enabled: data.points_enabled || false,
            points: data.points_enabled ? (data.points || 1) : null,
            required_variations_count: data.required_variations_count || null,
            simulation_url: data.simulation_url || null,
            theory_content: data.theory_content || null,
            theory_image_url: data.theory_image_url || null
        })
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)

    if (assignmentError) {
        console.error("Assignment Update Error", assignmentError)
        return { success: false, error: "Failed to update assignment" }
    }

    // 5. Update Questions while preserving ids that existing student progress is keyed to.
    const { data: existingQuestions, error: existingQuestionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('assignment_id', assignmentId)

    if (existingQuestionsError) {
        console.error("Fetch Existing Questions Error", existingQuestionsError)
        return { success: false, error: "Failed to update questions (fetch step)" }
    }

    const existingQuestionIds = new Set((existingQuestions || []).map((question) => question.id))
    const retainedQuestionIds = new Set<string>()
    const orderedCreatedAtBase = Date.now()

    const buildQuestionPayload = (q: (typeof data.questions)[number], index: number) => ({
        assignment_id: assignmentId,
        latex_text: q.latex_text,
        question_type: q.type,
        correct_value: q.type === 'numerical' ? q.correct_value : null,
        tolerance_percent: q.type === 'numerical' ? q.tolerance : null,
        options: q.type === 'multiple_choice' ? q.options : null,
        correct_answer: q.type === 'multiple_choice' ? q.correct_answer : null,
        diagram_type: q.diagram_type || null,
        diagram_svg: q.diagram_svg || null,
        diagram_image_url: q.diagram_image_url || null,
        solution_text: q.solution_text || null,
        points: q.points || 1,
        created_at: new Date(orderedCreatedAtBase + index).toISOString()
    })

    for (const [index, question] of data.questions.entries()) {
        const payload = buildQuestionPayload(question, index)
        const existingQuestionId = question.id
        const shouldUpdateExistingQuestion = typeof existingQuestionId === 'string'
            && existingQuestionIds.has(existingQuestionId)
            && !retainedQuestionIds.has(existingQuestionId)

        if (shouldUpdateExistingQuestion && existingQuestionId) {
            retainedQuestionIds.add(existingQuestionId)
            const { error: updateQuestionError } = await supabase
                .from('questions')
                .update(payload)
                .eq('id', existingQuestionId)
                .eq('assignment_id', assignmentId)

            if (updateQuestionError) {
                console.error("Update Question Error", updateQuestionError)
                return { success: false, error: "Failed to update questions (update step)" }
            }
        } else {
            const { error: insertQuestionError } = await supabase
                .from('questions')
                .insert(payload)

            if (insertQuestionError) {
                console.error("Insert Question Error", insertQuestionError)
                return { success: false, error: "Failed to update questions (insert step)" }
            }
        }
    }

    const questionIdsToDelete = [...existingQuestionIds].filter((questionId) => !retainedQuestionIds.has(questionId))
    if (questionIdsToDelete.length > 0) {
        const { error: deleteQuestionError } = await supabase
            .from('questions')
            .delete()
            .eq('assignment_id', assignmentId)
            .in('id', questionIdsToDelete)

        if (deleteQuestionError) {
            console.error("Delete Removed Questions Error", deleteQuestionError)
            return { success: false, error: "Failed to update questions (delete step)" }
        }
    }

    if (data.points_enabled) {
        const supabaseAdmin = createAdminClient()
        const { data: updatedQuestions, error: updatedQuestionsError } = await supabaseAdmin
            .from('questions')
            .select('id, created_at, question_type, correct_value, tolerance_percent, correct_answer, points')
            .eq('assignment_id', assignmentId)

        if (updatedQuestionsError) {
            console.error("Fetch Updated Questions Error", updatedQuestionsError)
            return { success: false, error: "Failed to fetch updated questions for recalculation" }
        }

        const recalculationResult = await recalculateAssignmentPointProgress(
            supabaseAdmin,
            assignmentId,
            sortQuestionsByCreatedAt((updatedQuestions || []) as PointQuestion[]),
            data.required_variations_count
        )

        if (!recalculationResult.success) {
            return { success: false, error: recalculationResult.error }
        }
    }

    revalidatePath(`/teacher/class/${classroomId}/assignment/${assignmentId}`)
    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function updateAssignmentTitle(assignmentId: string, classroomId: string, title: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = UpdateAssignmentTitleSchema.safeParse({ assignmentId, title })
    if (!validated.success) return { success: false, error: "Invalid title" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('assignments')
        .update({ title: title })
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId) // Extra safety

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update assignment title' }
    }

    revalidatePath(`/teacher/class/${classroomId}/assignment/${assignmentId}`)
    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function deleteAssignment(assignmentId: string, classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Manual Cascade Delete
    // 1. Submissions
    // 2. Questions
    // 3. Assignment

    // Delete Submissions
    await supabase.from('submissions').delete().eq('assignment_id', assignmentId)
    // Delete Questions
    await supabase.from('questions').delete().eq('assignment_id', assignmentId)
    // Delete Assignment
    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to delete assignment' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}
export type ActionState = {
    success: boolean
    message?: string
    error?: string
}

type RandomGroupLeftoverStrategy = 'smaller_group' | 'distribute'

export type RandomGroupAssignedQuestion = {
    number: number
    text: string
}

export type RandomGroupAssignmentMember = {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
    name: string
    assignedQuestions: RandomGroupAssignedQuestion[]
}

export type RandomGroupAssignmentGroup = {
    groupNumber: number
    members: RandomGroupAssignmentMember[]
}

export type AssignRandomGroupsState = ActionState & {
    batchId?: string
    createdAt?: string
    groups?: RandomGroupAssignmentGroup[]
}

export type RandomGroupQuestionSet = {
    id: string
    questions: string[]
    questionCount: number
    lastUsedAt: string
}

export async function addStudent(prevState: any, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const classroomId = formData.get('classroomId') as string

    const validated = AddStudentSchema.safeParse({ email, classroomId })
    if (!validated.success) return { success: false, error: "Invalid email" }

    // Call the RPC function
    const { data, error } = await supabase.rpc('add_student_by_email', {
        p_course_id: classroomId,
        p_email: email
    })

    if (error) return { success: false, error: error.message }

    // RPC returns a table/array, usually the first item tells us the result
    // Based on my SQL: RETURNS TABLE (success BOOLEAN, message TEXT)
    const result = data && data[0]

    if (result && !result.success) {
        return { success: false, error: result.message }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath('/student')
    return { success: true, message: result?.message }
}

const RemoveStudentSchema = z.object({
    studentId: z.string().uuid(),
    classroomId: z.string().uuid(),
})

export async function removeStudent(prevState: any, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const studentId = formData.get('studentId') as string
    const classroomId = formData.get('classroomId') as string

    const validated = RemoveStudentSchema.safeParse({ studentId, classroomId })
    if (!validated.success) return { success: false, error: "Invalid data" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Remove enrollment
    const { error } = await supabase
        .from('enrollments')
        .delete()
        .match({ student_id: studentId, classroom_id: classroomId })

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to remove student' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

const EnrollStudentSchema = z.object({
    studentId: z.string().uuid(),
    classroomId: z.string().uuid(),
})

export async function enrollStudent(studentId: string, classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = EnrollStudentSchema.safeParse({ studentId, classroomId })
    if (!validated.success) return { success: false, error: "Invalid data" }

    const { data, error } = await supabase.rpc('enroll_student', {
        p_student_id: studentId,
        p_classroom_id: classroomId
    })

    if (error) return { success: false, error: error.message }

    const result = data && data[0]

    if (result && !result.success) {
        return { success: false, error: result.message }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath('/student')
    return { success: true, message: result?.message }
}

export async function getStudentsNotInClassroom(classroomId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase.rpc('get_students_not_in_classroom', {
        p_classroom_id: classroomId
    })

    if (error) {
        console.error('Error fetching students not in classroom:', error)
        return []
    }

    return data
}

export async function setStudentActiveClassroom(classroomId: string, studentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data, error } = await supabase.rpc('set_active_classroom', {
        p_student_id: studentId,
        p_classroom_id: classroomId
    })

    if (error) return { success: false, error: error.message }

    const result = data && data[0]
    if (result && !result.success) {
        return { success: false, error: result.message }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath('/student')
    return { success: true, message: result?.message }
}

const UpdateClassroomNameSchema = z.object({
    classroomId: z.string().uuid(),
    name: z.string().min(1),
})

export async function updateClassroomName(classroomId: string, name: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = UpdateClassroomNameSchema.safeParse({ classroomId, name })
    if (!validated.success) return { success: false, error: "Invalid name" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('classrooms')
        .update({ name: name })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update classroom name' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

const QuestionSchema = z.object({
    id: z.string().uuid().optional(),
    type: z.enum(['numerical', 'multiple_choice']),
    latex_text: z.string(),
    correct_value: z.number().nullable().optional(),
    tolerance: z.number().nullable().optional(),
    options: z.array(z.string()).nullable().optional(),
    correct_answer: z.string().nullable().optional(),
    diagram_type: z.enum(['graph', 'scheme']).nullable().optional(),
    diagram_svg: z.string().nullable().optional(),
    diagram_image_url: z.string().nullable().optional(),
    solution_text: z.string().nullable().optional(),
    points: z.number().min(1).default(1).optional()
})

const ExerciseSchema = z.object({
    title: z.string(),
    // Category is now handled at the collection level, but keeping optional for backward compat if needed, or just removing.
    // We'll default to 'homework' for the DB constraint but it won't be used for logic.
    category: z.enum(['homework', 'classwork']).default('homework').optional(),
    questions: z.array(QuestionSchema).optional().default([]),
    show_all_questions: z.boolean().default(false).optional(),
    required_variations_count: z.number().nullable().optional(),
    points_enabled: z.boolean().default(false).optional(),
    points: z.number().min(1).default(1).optional(),
    simulation_url: z.string().nullable().optional(),
    theory_content: z.string().nullable().optional(),
    theory_image_url: z.string().nullable().optional()
})

export async function uploadIllustration(formData: FormData): Promise<{ success: boolean, url?: string, error?: string }> {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const file = formData.get('image') as File
    if (!file) {
        return { success: false, error: "No image file provided" }
    }

    console.log("Uploading illustration to Supabase Storage...")
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `illustrations/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('illustrations')
        .upload(filePath, file)

    if (uploadError) {
        console.error("Storage upload error:", uploadError)
        return { success: false, error: "Failed to upload illustration" }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('illustrations')
        .getPublicUrl(filePath)

    return { success: true, url: publicUrl }
}

const normalizeSvgString = (svg: string) => {
    const parseSvgDimension = (value?: string) => {
        if (!value) return null
        const normalized = value.trim().toLowerCase()
        if (normalized.endsWith('%')) return null
        const match = normalized.match(/^([0-9]*\.?[0-9]+)(px)?$/)
        if (!match) return null
        const parsed = Number.parseFloat(match[1])
        return Number.isFinite(parsed) ? parsed : null
    }

    const formatDimension = (value: number) => (
        Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
    )

    let result = svg.trim()
    result = result.replace(/&lt;/g, '<')
    result = result.replace(/&gt;/g, '>')
    result = result.replace(/&amp;/g, '&')
    result = result.replace(/&quot;/g, '"')
    result = result.replace(/&#39;/g, "'")
    result = result.replace(/&#x27;/g, "'")
    result = result.replace(/&#x2F;/g, '/')
    result = result.replace(/\\n/g, '\n')
    result = result.replace(/\\r/g, '')

    const svgTagMatch = result.match(/<svg\b([^>]*)>/i)
    if (!svgTagMatch) return result.trim()

    let attrs = (svgTagMatch[1] || '').replace(/\s+/g, ' ').trim()
    const widthValue = attrs.match(/\bwidth\s*=\s*["']([^"']+)["']/i)?.[1]
    const heightValue = attrs.match(/\bheight\s*=\s*["']([^"']+)["']/i)?.[1]
    const numericWidth = parseSvgDimension(widthValue)
    const numericHeight = parseSvgDimension(heightValue)
    const hasViewBox = /\bviewBox\s*=\s*["'][^"']*["']/i.test(attrs)

    // Preserve sizing context by deriving viewBox before stripping fixed dimensions.
    if (!hasViewBox && numericWidth !== null && numericHeight !== null) {
        attrs = `${attrs} viewBox="0 0 ${formatDimension(numericWidth)} ${formatDimension(numericHeight)}"`.trim()
    }

    if (/\bviewBox\s*=\s*["'][^"']*["']/i.test(attrs)) {
        attrs = attrs
            .replace(/\s+width\s*=\s*["'][^"']*["']/ig, '')
            .replace(/\s+height\s*=\s*["'][^"']*["']/ig, '')
            .trim()
    }

    result = result.replace(/<svg\b[^>]*>/i, `<svg${attrs ? ` ${attrs}` : ''}>`)
    return result.trim()
}

const extractSvgFromText = (text: string) => {
    const cleaned = text
        .replace(/```svg/gi, '')
        .replace(/```xml/gi, '')
        .replace(/```html/gi, '')
        .replace(/```/g, '')
        .trim()

    const svgMatch = cleaned.match(/<svg[\s\S]*<\/svg>/i)
    if (!svgMatch) return null

    return normalizeSvgString(svgMatch[0])
}

const sanitizeOptionSvg = (opt: string) => {
    if (opt && opt.trim().startsWith('<svg')) {
        return normalizeSvgString(opt)
    }
    return opt
}

function processExerciseData(data: any, generateSolution: boolean, diagramImageUrl: string | null) {
    if (!data.questions) return data

    data.questions = data.questions.map((q: any) => {
        // Sanitize options if they contain SVG
        if (q.type === 'multiple_choice' && q.options && Array.isArray(q.options)) {
            q.options = q.options.map((opt: string) => sanitizeOptionSvg(opt))
        }

        // Sanitize SVG content
        if (q.diagram_svg && typeof q.diagram_svg === 'string') {
            q.diagram_svg = normalizeSvgString(q.diagram_svg)
        }

        if (q.type === 'multiple_choice' && q.correct_answer) {
            let ans = q.correct_answer.trim().toUpperCase()
            ans = ans.replace(/\*/g, '').replace(/_/g, '')

            if (!['A', 'B', 'C', 'D'].includes(ans)) {
                if (q.options && Array.isArray(q.options)) {
                    const matchIndex = q.options.findIndex((opt: string) => opt.toLowerCase().trim() === ans.toLowerCase())
                    if (matchIndex !== -1) {
                        ans = ['A', 'B', 'C', 'D'][matchIndex]
                    }
                }
            }

            if (!['A', 'B', 'C', 'D'].includes(ans)) {
                const match = ans.match(/\b([A-D])\b/)
                if (match) {
                    ans = match[1]
                }
            }
            q.correct_answer = ans
        }

        // Map Gemini 'solution' field to our 'solution_text'
        if (generateSolution && q.solution) {
            q.solution_text = q.solution
        } else if (!q.solution_text) {
            q.solution_text = null
        }

        // Randomize multiple choice options
        if (q.type === 'multiple_choice' && q.options && Array.isArray(q.options) && q.options.length > 0) {
            const options = [...q.options]
            const correctLetter = q.correct_answer || 'A'
            const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctLetter)

            if (correctIndex !== -1 && correctIndex < options.length) {
                const correctValue = options[correctIndex]
                for (let i = options.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [options[i], options[j]] = [options[j], options[i]];
                }
                const newCorrectIndex = options.indexOf(correctValue)
                if (newCorrectIndex !== -1) {
                    q.options = options
                    q.correct_answer = ['A', 'B', 'C', 'D'][newCorrectIndex]
                }
            } else {
                for (let i = options.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [options[i], options[j]] = [options[j], options[i]];
                }
                q.options = options
            }
        }

        if (diagramImageUrl) {
            q.diagram_image_url = diagramImageUrl
        }

        return q
    })

    return data
}

function robustJsonParse(raw: string): any {
    // Strip markdown code fences
    let jsonStr = raw.replace(/```json/g, '').replace(/```/g, '').trim()

    // Escape real newlines/tabs inside quoted strings
    jsonStr = jsonStr.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    })

    // Strategy 1: Try direct parse
    try {
        return JSON.parse(jsonStr)
    } catch (_) { /* continue */ }

    // Strategy 2: Remove control characters
    let cleaned = jsonStr.replace(/[\x00-\x1F\x7F]/g, '')
    try {
        return JSON.parse(cleaned)
    } catch (_) { /* continue */ }

    // Strategy 3: Fix trailing commas before } or ]
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')
    try {
        return JSON.parse(cleaned)
    } catch (_) { /* continue */ }

    // Strategy 4: Extract the outermost { ... } and try to parse that
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extracted = cleaned.slice(firstBrace, lastBrace + 1)
        try {
            return JSON.parse(extracted)
        } catch (_) { /* continue */ }

        // Strategy 5: Truncate at the last valid closing structure
        const lastArrayClose = extracted.lastIndexOf(']')
        if (lastArrayClose !== -1) {
            const truncated = extracted.slice(0, lastArrayClose + 1) + '}'
            try {
                return JSON.parse(truncated)
            } catch (_) { /* continue */ }
        }
    }

    // All strategies failed
    throw new SyntaxError(`Failed to parse Gemini response as JSON. Response length: ${raw.length}. First 200 chars: ${raw.slice(0, 200)}`)
}

async function callGeminiForExercise(prompt: string, imagePart: Part, modelName: string = 'gemini-3-flash-preview'): Promise<any> {
    console.log(`Calling Gemini API with model: ${modelName}...`)
    const result = await generateContentWithFallback(modelName, [prompt, imagePart])
    const response = await result.response
    const text = response.text()
    console.log("Gemini Raw Response length:", text.length)

    return robustJsonParse(text)
}

export async function generateExerciseFromImage(formData: FormData) {
    console.log("Starting generateExerciseFromImage...")

    const variationCount = parseInt(formData.get('variationCount') as string || '1')
    const generationType = formData.get('generationType') as 'exact' | 'similar' || 'exact'
    const isVariationMode = variationCount > 1
    const variationType = formData.get('variationType') as 'numbers' | 'descriptions' || 'numbers'
    const exerciseType = formData.get('exerciseType') as 'auto' | 'numerical' | 'multiple_choice' | 'theory' || 'auto'
    const answersInSvg = formData.get('answersInSvg') === 'true'
    const generateSolution = formData.get('generateSolution') === 'true'
    const useImageAsIllustration = formData.get('useImageAsIllustration') === 'true'
    const customInstructions = formData.get('customInstructions') as string || ''
    const model = formData.get('model') as string || 'gemini-3-flash-preview'

    const file = formData.get('image') as File
    if (!file) {
        console.error("No image file provided")
        return { error: "No image file provided" }
    }

    let diagramImageUrl = null
    const illustrationFile = formData.get('illustration') as File
    const fileToUpload = illustrationFile || (useImageAsIllustration ? file : null)

    if (useImageAsIllustration && fileToUpload) {
        const supabase = await createClient()
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = `illustrations/${fileName}`
        const { error: uploadError } = await supabase.storage.from('illustrations').upload(filePath, fileToUpload)
        if (uploadError) return { success: false, error: "Failed to upload illustration" }
        const { data: { publicUrl } } = supabase.storage.from('illustrations').getPublicUrl(filePath)
        diagramImageUrl = publicUrl
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Image = Buffer.from(arrayBuffer).toString('base64')
    const imagePart: Part = { inlineData: { data: base64Image, mimeType: file.type } }

    const generationMethod = formData.get('generationMethod') as 'batch' | 'parallel' || 'batch'

    const genericRules = `
  Analyze this physics/math problem image.
  Identify if there are multiple parts to the problem (e.g., 1., 2., 3. or a), b), c)).
  CRITICAL: All generated output text (title, question_text, options, solution) MUST be in the Lithuanian language.
  
  EXERCISE TYPE RULES:
  ${exerciseType === 'numerical' ? `
  - FORCED TYPE: Numerical calculation.
  - If the image contains a multiple-choice question, IGNORE the options and transform it into a direct calculation.
  ` : exerciseType === 'multiple_choice' ? `
  - FORCED TYPE: Multiple choice.
  - If the image is a numerical problem, create 4 plausible multiple-choice options (A, B, C, D).
  - IMPORTANT: The "options" array MUST contain ONLY the answer text. DO NOT include prefixes like "A)", "B)", "C)", "D)" or "A. ", "B. ", etc. inside the options.
  ${answersInSvg ? '- ANSWERS AS ILLUSTRATIONS: Each option MUST be a full <svg> string.' : ''}
  ` : '- TYPE DETECTION: Auto-detect (numerical or multiple_choice).'}

  ${generateSolution ? 'SOLUTION MANUAL MODE: Generate step-by-step solution in Lithuanian.' : ''}

  LATEX FORMATTING: Use LaTeX for ALL math, units, and symbols. For multiple_choice options, wrap LaTeX in single dollar signs.
  NUMERICAL UNITS: Use SI units (m, s, kg, N, J, etc.) for correct_value.
  PHYSICAL CONSTANTS: Use g = 10 m/s^2 for gravitational acceleration unless otherwise specified in the problem image.
  NOTATION: "Sunkio jėga" (Gravity force) MUST be written as F with a subscript "s" (F_s in LaTeX), and "Svoris" (Weight) MUST be written as P.

  ${useImageAsIllustration ? '- DO NOT generate diagram_svg/type.' : `
  - Generate diagram_svg ONLY if the input image contains a diagram, graph, schema, or TABLE. If the input image is text-only (no tables/graphs), set diagram_type and diagram_svg to null.
  - For TABLES: If the image contains a table, generate it as a visually appealing <svg> object (diagram_type: "scheme"), NOT as markdown embedded in latex_text. Ensure clear borders, centered text, and a distinct header row.
  - For VECTORS: Include gray grid, snap points, DRAW ARROWS above labels, position labels with offset.
  - CRITICAL: Inside <svg> tags, DO NOT use LaTeX syntax (e.g., no $ delimiters, no \\vec, no \\frac). Use plain text or Unicode characters for labels (e.g., use 'Fs' instead of '\\vec{F}_s').
  `}
  
  Return JSON:
  {
    "title": "Short title",
    "questions": [
        {
            "type": "numerical" | "multiple_choice",
            "latex_text": "text",
            "correct_value": number | null,
            "tolerance": number | null,
            "options": ["A", "B", "C", "D"] | null,
            "correct_answer": "A" | "B" | "C" | "D" | null,
            "diagram_type": "graph" | "scheme" | null,
            "diagram_svg": "<svg>...</svg>" | null,
            "solution": "LaTeX steps" | null
        }
    ]
  }
    `;

    try {
        // Theory mode: extract text content from image as LaTeX
        if (exerciseType === 'theory') {
            const theoryPrompt = `
        Analyze this physics/math image and extract all theory content from it.
        CRITICAL: All generated output text MUST be in the Lithuanian language.
        
        TASK: Extract the theory, definitions, formulas, explanations, and any textual content from this image.
        
        FORMATTING RULES (VERY IMPORTANT):
        - Use plain text for regular content
        - Use **bold** (markdown double asterisks) for headings and important terms — do NOT use \\textbf{} or other LaTeX text commands
        - Use *italic* (markdown single asterisks) for emphasis
        - Use $...$ for inline math expressions (e.g. $F = ma$, $v = \\frac{s}{t}$)
        - Use $$...$$ for display/block math equations on their own line
        - Use line breaks (\\n) to separate paragraphs
        - Use numbered lists (1. 2. 3.) or bullet points (- ) for lists
        - NEVER use \\textbf{}, \\textit{}, \\begin{}, \\item, or other LaTeX text-mode commands — only use LaTeX INSIDE $ delimiters for math
        
        ${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}
        
        Return JSON:
        {
            "title": "Short descriptive title for this theory section",
            "theory_content": "Full formatted theory text extracted from the image"
        }
            `;

            const data = await callGeminiForExercise(theoryPrompt, imagePart, model)
            return { success: true, data: { title: data.title || '', theory_content: data.theory_content || '' } }
        }

        if (generationMethod === 'batch' || !isVariationMode) {
            const prompt = `
        ${genericRules}
        GENERATION MODE: BATCH
        Generate a list of questions, one for each part found${isVariationMode ? ` (multiplied by ${variationCount} variations)` : ''}. If there is only one problem, generate a list with one item${isVariationMode ? ` (which means ${variationCount} items total due to variations)` : ''}.
        
        ${isVariationMode ? `
        VARIATION RULES:
        ${variationType === 'numbers' ? '- Keep EXACT SAME context/story/structure, ONLY change numbers.' : '- Change context/story (e.g., car -> train), keep same logic.'}
        - Difficulty must remain consistent.
        - Ensure MCQ options are relevant to each variation.
        ` : (generationType === 'similar' ? 'Make it a SIMILAR problem (different numbers/context) but based ON the image.' : 'Create the BASE exercise as seen in the image.')}
        
        ${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}
      `;

            let data = await callGeminiForExercise(prompt, imagePart, model)
            data = processExerciseData(data, generateSolution, diagramImageUrl)
            return { success: true, data }
        } else {
            // Stage 1: Generate Base Exercise
            const basePrompt = `
        ${genericRules}
        GENERATION MODE: Create the BASE exercise as seen in the image.
        ${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}
      `;

            let baseData = await callGeminiForExercise(basePrompt, imagePart, model)
            baseData = processExerciseData(baseData, generateSolution, diagramImageUrl)

            // Stage 2: Generate Variations in Parallel
            const variationPromises = []
            for (let i = 0; i < variationCount - 1; i++) {
                const varPrompt = `
          ${genericRules}
          GENERATION MODE: Create a NEW VARIATION based on this reference JSON:
          ${JSON.stringify(baseData)}
          
          VARIATION RULES:
          ${variationType === 'numbers' ? '- Keep EXACT SAME context/story/structure, ONLY change numbers.' : '- Change context/story (e.g., car -> train), keep same logic.'}
          - Difficulty must remain consistent.
          - DO NOT include the base exercise as a variation.
          - Ensure MCQ options are relevant to the NEW variation.
          ${customInstructions ? `CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}
        `;
                variationPromises.push(callGeminiForExercise(varPrompt, imagePart, model))
            }

            const variations = await Promise.all(variationPromises)
            const processedVariations = variations.map(v => processExerciseData(v, generateSolution, diagramImageUrl))

            // Combine all questions
            const allQuestions = [...baseData.questions]
            processedVariations.forEach(v => {
                if (v.questions) allQuestions.push(...v.questions)
            })

            return {
                success: true,
                data: {
                    ...baseData,
                    questions: allQuestions
                }
            }
        }

    } catch (error: any) {
        console.error("Gemini Error:", error)
        return { success: false, error: error.message || "Failed to generate exercise" }
    }
}

export async function createAssignmentWithQuestion(classroomId: string, exerciseData: unknown, collectionId?: string) {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 2. Validate Data
    const validated = ExerciseSchema.safeParse(exerciseData)
    if (!validated.success) {
        console.error("Validation Error", validated.error)
        return { success: false, error: "Invalid exercise data" }
    }
    const data = validated.data

    // Calculate order_index
    let nextOrderIndex = 0
    if (collectionId) {
        const { data: maxOrderData } = await supabase
            .from('assignments')
            .select('order_index')
            .eq('collection_id', collectionId)
            .order('order_index', { ascending: false })
            .limit(1)

        if (maxOrderData && maxOrderData.length > 0) {
            nextOrderIndex = (maxOrderData[0].order_index || 0) + 1
        }
    }

    // 3. Create Assignment

    const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
            classroom_id: classroomId,
            title: data.title,
            // category: data.category, // We let it default or set to 'homework' as placeholder since it's now generic
            published: true,
            collection_id: collectionId || null,
            order_index: nextOrderIndex,
            show_all_questions: data.show_all_questions || false,
            required_variations_count: data.required_variations_count || null,
            points_enabled: data.points_enabled || false,
            points: data.points_enabled ? (data.points || 1) : null,
            simulation_url: data.simulation_url || null,
            theory_content: data.theory_content || null,
            theory_image_url: data.theory_image_url || null
        })
        .select()
        .single()

    if (assignmentError || !assignment) {
        console.error("Assignment Error", assignmentError)
        return { success: false, error: "Failed to create assignment" }
    }

    // 4. Create Questions (skip for simulation and theory exercises)
    if (!data.simulation_url && !data.theory_content && data.questions && data.questions.length > 0) {
        const questionsToInsert = data.questions.map((q, index) => ({
            assignment_id: assignment.id,
            latex_text: q.latex_text,
            question_type: q.type,
            correct_value: q.type === 'numerical' ? q.correct_value : null,
            tolerance_percent: q.type === 'numerical' ? q.tolerance : null,
            // @ts-ignore
            options: q.type === 'multiple_choice' ? q.options : null,
            // @ts-ignore
            correct_answer: q.type === 'multiple_choice' ? q.correct_answer : null,
            // Save diagram for all questions/variations
            diagram_type: q.diagram_type || null,
            diagram_svg: q.diagram_svg || null,
            diagram_image_url: q.diagram_image_url || null,
            solution_text: q.solution_text || null,
            points: q.points || 1
        }))

        const { error: questionError } = await supabase
            .from('questions')
            .insert(questionsToInsert)

        if (questionError) {
            console.error("Question Error", questionError)
            return { success: false, error: "Failed to create question" }
        }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    if (collectionId) {
        revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    }
    return { success: true }
}

export async function toggleAssignmentPublish(assignmentId: string, classroomId: string, published: boolean) {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom (skipping deep verification for speed, relying on RLS)
    // Actually RLS might block if we don't own it, which is fine.

    const { error } = await supabase
        .from('assignments')
        .update({ published: published })
        .eq('id', assignmentId)

    if (error) {
        console.error(error)
        return { success: false, error: "Failed to update assignment" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath(`/teacher/class/${classroomId}/assignment/${assignmentId}`)
    return { success: true }
}

export async function batchUpdateAssignments(
    assignmentIds: string[],
    classroomId: string,
    updates: any
): Promise<ActionState> {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('assignments')
        .update(updates)
        .in('id', assignmentIds)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error("Batch update error:", error)
        return { success: false, error: "Failed to perform bulk update" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function updateClassroomType(classroomId: string, type: 'private_student' | 'school_class'): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('classrooms')
        .update({ type: type })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update classroom type' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function updateLessonSchedule(classroomId: string, schedule: { day: number, time: string }[]): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Validate schedule
    const validatedSchedule = z.array(LessonSlotSchema).safeParse(schedule)
    if (!validatedSchedule.success) {
        return { success: false, error: "Invalid schedule format" }
    }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('classrooms')
        .update({ lesson_schedule: schedule.length > 0 ? schedule : null })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update lesson schedule' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function deleteClassroom(classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Manual Cascade Delete
    // 1. Submissions (via assignments)
    // 2. Questions (via assignments)
    // 3. Assignments
    // 4. Enrollments
    // 5. Classroom

    // Note: This is a heavy operation. Ideally, use ON DELETE CASCADE in Postgres, 
    // but doing it manually here since we haven't set that up yet.

    // 1. Get Assignment IDs
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('classroom_id', classroomId)

    const assignmentIds = assignments?.map(a => a.id) || []

    if (assignmentIds.length > 0) {
        // Delete Submissions
        await supabase.from('submissions').delete().in('assignment_id', assignmentIds)
        // Delete Questions
        await supabase.from('questions').delete().in('assignment_id', assignmentIds)
        // Delete Assignments
        await supabase.from('assignments').delete().in('id', assignmentIds)
    }

    // Delete Enrollments
    await supabase.from('enrollments').delete().eq('classroom_id', classroomId)

    // Delete Classroom
    const { error } = await supabase.from('classrooms').delete().eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to delete classroom' }
    }

    revalidatePath('/teacher')
    return { success: true }
}


export async function createCollection(classroomId: string, title: string, category: 'homework' | 'classwork' | 'information' = 'homework', scheduledDate?: string, infoContent?: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = CreateCollectionSchema.safeParse({ title, classroomId, category })
    if (!validated.success) return { success: false, error: "Invalid data" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase.from('collections').insert({
        classroom_id: classroomId,
        title: title,
        category: category,
        scheduled_date: scheduledDate || null,
        info_content: category === 'information' ? (infoContent || null) : null
    })

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to create collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function updateCollection(classroomId: string, collectionId: string, title: string, category: 'homework' | 'classwork' | 'information', scheduledDate?: string, slidesUrl?: string | null, scheduledEndDate?: string, tabMonitoringEnabled?: boolean, autoDisableTabMonitoringAfterTest?: boolean, infoContent?: string, infoButtonColor?: string, theoryContent?: string, infoPdfUrl?: string | null): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = CreateCollectionSchema.safeParse({ title, classroomId, category })
    if (!validated.success) return { success: false, error: "Invalid data" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const updateData: any = {
        title: title,
        category: category,
        scheduled_date: category === 'information' ? null : (scheduledDate || null),
        scheduled_end_at: null, // Time-based locking removed; always clear end time
        info_content: category === 'information' ? (infoContent || null) : null,
        info_button_color: category === 'information' ? (infoButtonColor || 'neutral') : null,
        info_pdf_url: category === 'information' ? (infoPdfUrl !== undefined ? (infoPdfUrl || null) : undefined) : null
    }

    if (tabMonitoringEnabled !== undefined) {
        updateData.tab_monitoring_enabled = tabMonitoringEnabled
    }

    if (autoDisableTabMonitoringAfterTest !== undefined) {
        updateData.auto_disable_tab_monitoring_after_test = autoDisableTabMonitoringAfterTest
    }

    if (slidesUrl !== undefined) {
        updateData.slides_url = slidesUrl
    }

    if (category !== 'information' && theoryContent !== undefined) {
        updateData.theory_content = theoryContent || null
    }

    const { error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', collectionId)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

export async function toggleTabMonitoring(classroomId: string, collectionId: string, enabled: boolean): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('collections')
        .update({ tab_monitoring_enabled: enabled })
        .eq('id', collectionId)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to toggle tab monitoring' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

export async function uploadCollectionSlides(formData: FormData): Promise<{ success: boolean, url?: string, error?: string }> {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: "No file provided" }
    }

    console.log("Uploading collection slides to Supabase Storage...")
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `slides/${fileName}`

    // Use a try-catch for storage interaction
    try {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('collection_slides')
            .upload(filePath, file, {
                cacheControl: '31536000',
                upsert: false
            })

        if (uploadError) {
            console.error("Storage upload error:", uploadError)
            return { success: false, error: "Failed to upload slides" }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('collection_slides')
            .getPublicUrl(filePath)

        return { success: true, url: publicUrl }
    } catch (err) {
        console.error("Upload exception:", err)
        return { success: false, error: "An error occurred during upload" }
    }
}

export async function listCollectionSlides(): Promise<{ success: boolean, files?: { name: string, url: string }[], error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const { data, error } = await supabase.storage
            .from('collection_slides')
            .list('slides', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'desc' },
            })

        if (error) {
            console.error("Storage list error:", error)
            return { success: false, error: "Failed to list slides" }
        }

        const filesWithUrls = data.map(file => {
            const { data: { publicUrl } } = supabase.storage
                .from('collection_slides')
                .getPublicUrl(`slides/${file.name}`)

            return {
                name: file.name,
                url: publicUrl
            }
        })

        return { success: true, files: filesWithUrls }
    } catch (err) {
        console.error("List exception:", err)
        return { success: false, error: "An error occurred while fetching slides library" }
    }
}


export async function addExerciseToCollection(targetClassroomId: string, targetCollectionId: string, sourceAssignmentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        // 1. Fetch Source Assignment and Questions
        const { data: sourceAss, error: assError } = await supabase
            .from('assignments')
            .select('*, questions(*)')
            .eq('id', sourceAssignmentId)
            .single()

        if (assError || !sourceAss) {
            console.error("Error fetching source assignment:", assError)
            return { success: false, error: "Source exercise not found" }
        }

        // 2. Verify teacher owns BOTH classrooms (the target and possibly the source)
        // We definitely need to check the target classroom ownership
        const { data: targetClassroom } = await supabase
            .from('classrooms')
            .select('teacher_id')
            .eq('id', targetClassroomId)
            .single()

        if (!targetClassroom || targetClassroom.teacher_id !== user.id) {
            return { success: false, error: "Unauthorized to manage the target classroom" }
        }

        // 3. Calculate order_index for the new assignment in the target collection
        let nextOrderIndex = 0
        const { data: maxOrderData } = await supabase
            .from('assignments')
            .select('order_index')
            .eq('collection_id', targetCollectionId)
            .order('order_index', { ascending: false })
            .limit(1)

        if (maxOrderData && maxOrderData.length > 0) {
            nextOrderIndex = (maxOrderData[0].order_index || 0) + 1
        }

        // 4. Create New Assignment (Copy)
        const { data: newAss, error: newAssError } = await supabase
            .from('assignments')
            .insert({
                classroom_id: targetClassroomId,
                collection_id: targetCollectionId,
                title: sourceAss.title,
                published: true, // Import as published
                order_index: nextOrderIndex,
                show_all_questions: sourceAss.show_all_questions,
                required_variations_count: sourceAss.required_variations_count,
                points_enabled: sourceAss.points_enabled,
                points: sourceAss.points
            })
            .select()
            .single()

        if (newAssError || !newAss) {
            console.error("Error copying assignment:", newAssError)
            return { success: false, error: "Failed to create copied exercise" }
        }

        // 5. Copy Questions
        if (sourceAss.questions && sourceAss.questions.length > 0) {
            const questionsToInsert = sourceAss.questions.map((q: any) => ({
                assignment_id: newAss.id,
                latex_text: q.latex_text,
                question_type: q.question_type,
                correct_value: q.correct_value,
                tolerance_percent: q.tolerance_percent,
                options: q.options,
                correct_answer: q.correct_answer,
                diagram_type: q.diagram_type,
                diagram_svg: q.diagram_svg,
                diagram_image_url: q.diagram_image_url,
                solution_text: q.solution_text,
                points: q.points
            }))

            const { error: newQuestError } = await supabase
                .from('questions')
                .insert(questionsToInsert)

            if (newQuestError) {
                console.error("Error copying questions:", newQuestError)
            }
        }

        revalidatePath(`/teacher/class/${targetClassroomId}/collection/${targetCollectionId}`)
        return { success: true }
    } catch (err) {
        console.error("Deep copy import error:", err)
        return { success: false, error: "An unexpected error occurred during import" }
    }
}

export async function removeExerciseFromCollection(classroomId: string, collectionId: string, assignmentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('assignments')
        .update({ collection_id: null })
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to remove exercise from collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

export async function getStudentClassroomProgress(classroomId: string, studentId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Verify teacher owns the classroom (optional but good practice)
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return null
    }

    // 1. Fetch Collections
    const { data: collections } = await supabase
        .from('collections')
        .select('*, assignments(id, order_index, points, points_enabled, published, required_variations_count, questions(points))')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

    if (!collections) return []

    // 2. Fetch Progress for this student
    const allAssignments = collections.flatMap((c: any) => c.assignments || [])
    const allAssignmentIds = allAssignments.map((a: any) => a.id)
    const assignmentMetaById = new Map(
        allAssignments.map((a: any) => [
            a.id,
            {
                pointsEnabled: !!a.points_enabled,
                requiredVariationsCount: a.required_variations_count || 0,
                questionCount: Array.isArray(a.questions) ? a.questions.length : 0
            }
        ])
    )

    // Use Admin Client to bypass RLS for reading other users' progress
    const supabaseAdmin = createAdminClient()

    const completedAssignmentIds = new Set<string>()
    const earnedPointsMap = new Map<string, number>()
    const pointsDisabledMap = new Map<string, boolean>()
    const submittedAnswersMap = new Map<string, any>()

    if (allAssignmentIds.length > 0) {
        const { data: progressData } = await supabaseAdmin
            .from('assignment_progress')
            .select('assignment_id, is_completed, earned_points, points_disabled_by_teacher, submitted_answers, completed_question_indices')
            .in('assignment_id', allAssignmentIds)
            .eq('student_id', studentId)

        if (progressData) {
            progressData.forEach((p: any) => {
                const meta = assignmentMetaById.get(p.assignment_id)
                const completedIndicesCount = Array.isArray(p.completed_question_indices)
                    ? p.completed_question_indices.length
                    : 0
                const submittedCount = p.submitted_answers && typeof p.submitted_answers === 'object'
                    ? Object.keys(p.submitted_answers).length
                    : 0

                const requiredToComplete = meta
                    ? ((meta.requiredVariationsCount > 0 ? meta.requiredVariationsCount : meta.questionCount) || 0)
                    : 0

                const inferredCompletion = !!meta && requiredToComplete > 0 && (
                    meta.pointsEnabled
                        ? submittedCount >= requiredToComplete
                        : completedIndicesCount >= requiredToComplete
                )

                if (p.is_completed || inferredCompletion) completedAssignmentIds.add(p.assignment_id)
                if (p.earned_points != null || p.points_disabled_by_teacher) {
                    earnedPointsMap.set(p.assignment_id, getEffectiveEarnedPoints(p))
                }
                if (p.points_disabled_by_teacher) pointsDisabledMap.set(p.assignment_id, true)
                if (p.submitted_answers) submittedAnswersMap.set(p.assignment_id, p.submitted_answers)
            })
        }
    }

    // 3. calculate progress and points
    let classroomTotalPoints = 0
    let classroomEarnedPoints = 0

    const collectionsWithProgress = collections.map((collection: any) => {
        const total = collection.assignments.length
        const completed = collection.assignments.filter((a: any) => completedAssignmentIds.has(a.id)).length
        const progress = total === 0 ? 0 : (completed / total) * 100

        // Map assignments to status objects
        const assignmentStatuses = collection.assignments
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            .map((a: any) => {
                const earned = earnedPointsMap.get(a.id)
                const submitted = submittedAnswersMap.get(a.id)
                const totalPts = calculateAssignmentMaxPoints(a)
                const pointsDisabledByTeacher = pointsDisabledMap.get(a.id) || false

                let status: 'correct' | 'incorrect' | 'unsubmitted' | 'not_counted' = 'unsubmitted'

                const isCompleted = completedAssignmentIds.has(a.id)
                const hasSubmission = submitted && Object.keys(submitted).length > 0
                const isPointExercise = !!a.points_enabled

                // For point exercises, completion can still be 0 points, so correctness depends on earned points.
                // For non-point exercises, completion itself means done/correct for teacher progress display.
                if (isPointExercise) {
                    if (isCompleted || hasSubmission) {
                        if (pointsDisabledByTeacher) {
                            status = 'not_counted'
                        } else if (earned != null && earned >= totalPts && totalPts > 0) {
                            status = 'correct'
                        } else {
                            status = 'incorrect'
                        }
                    }
                } else if (isCompleted) {
                    status = 'correct'
                } else if (hasSubmission) {
                    status = 'incorrect'
                }

                return {
                    id: a.id,
                    status,
                    points: totalPts,
                    earned: earned || 0,
                    pointsEnabled: !!a.points_enabled,
                    pointsDisabledByTeacher,
                }
            })

        // Calculate points for this collection
        collection.assignments.forEach((a: any) => {
            if (a.points_enabled && a.published) {
                const max = calculateAssignmentMaxPoints(a)

                classroomTotalPoints += max
                classroomEarnedPoints += (earnedPointsMap.get(a.id) || 0)
            }
        })

        return {
            ...collection,
            progress,
            totalAssignments: total,
            completedAssignments: completed,
            assignmentStatuses
        }
    })

    // Add bonus points from enrollment and check cheater flag
    const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('bonus_points, is_cheater')
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId)
        .maybeSingle()

    const bonusPoints = enrollment?.bonus_points || 0
    const isCheater = !!enrollment?.is_cheater

    // If cheater-flagged, zero out exercise points but keep bonus
    if (isCheater) {
        classroomEarnedPoints = bonusPoints
    } else {
        classroomEarnedPoints += bonusPoints
    }

    return {
        collections: collectionsWithProgress,
        totalPoints: classroomTotalPoints,
        earnedPoints: classroomEarnedPoints
    }
}

/**
 * Bulk-fetch earned/max points for ALL students in a classroom.
 * Shares the expensive work (auth, classroom check, collections fetch)
 * instead of repeating it per student like getStudentClassroomProgress does.
 */
export async function getBulkStudentPoints(
    classroomId: string,
    studentIds: string[]
): Promise<Record<string, { earned: number; max: number }>> {
    if (studentIds.length === 0) return {}

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return {}

    // Verify teacher owns the classroom (once, not per student)
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) return {}

    // Fetch collections + assignments ONCE (same query as getStudentClassroomProgress)
    const { data: collections } = await supabase
        .from('collections')
        .select('*, assignments(id, order_index, points, points_enabled, published, required_variations_count, questions(points))')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

    if (!collections) return {}

    const allAssignments = collections.flatMap((c: any) => c.assignments || [])
    const allAssignmentIds = allAssignments.map((a: any) => a.id)

    // Pre-compute classroom total max points (same logic as original)
    let classroomTotalPoints = 0
    collections.forEach((collection: any) => {
        collection.assignments.forEach((a: any) => {
            if (a.points_enabled && a.published) {
                classroomTotalPoints += calculateAssignmentMaxPoints(a)
            }
        })
    })

    const supabaseAdmin = createAdminClient()

    // Fetch bonus points and cheater flag for all students in one query
    const { data: enrollmentData } = await supabaseAdmin
        .from('enrollments')
        .select('student_id, bonus_points, is_cheater')
        .eq('classroom_id', classroomId)
        .in('student_id', studentIds)

    const bonusByStudent = new Map<string, number>()
    const cheaterSet = new Set<string>()
    if (enrollmentData) {
        for (const e of enrollmentData) {
            bonusByStudent.set(e.student_id as string, e.bonus_points || 0)
            if (e.is_cheater) cheaterSet.add(e.student_id as string)
        }
    }

    // Fetch progress per student (same query as original, just in parallel)
    const progressResults = await Promise.all(
        studentIds.map(async (studentId) => {
            if (allAssignmentIds.length === 0) return { studentId, earned: 0 }

            const { data: progressData } = await supabaseAdmin
                .from('assignment_progress')
                .select('assignment_id, earned_points, points_disabled_by_teacher')
                .in('assignment_id', allAssignmentIds)
                .eq('student_id', studentId)

            // Exact same earned points calculation as getStudentClassroomProgress
            const earnedPointsMap = new Map<string, number>()
            if (progressData) {
                progressData.forEach((p: any) => {
                    if (p.earned_points != null || p.points_disabled_by_teacher) {
                        earnedPointsMap.set(p.assignment_id, getEffectiveEarnedPoints(p))
                    }
                })
            }

            let earned = 0
            collections.forEach((collection: any) => {
                collection.assignments.forEach((a: any) => {
                    if (a.points_enabled && a.published) {
                        earned += (earnedPointsMap.get(a.id) || 0)
                    }
                })
            })

            return { studentId, earned }
        })
    )

    // Build result — cheater-flagged students show only bonus points
    const result: Record<string, { earned: number; max: number }> = {}
    for (const { studentId, earned } of progressResults) {
        const bonus = bonusByStudent.get(studentId) || 0
        const isCheater = cheaterSet.has(studentId)
        result[studentId] = {
            earned: isCheater ? bonus : earned + bonus,
            max: classroomTotalPoints
        }
    }

    return result
}

interface HomeworkSubmissionEventRow {
    id: string
    assignment_id: string | null
    question_id: string | null
    question_index: number | null
    submitted_answer: string | null
    is_correct: boolean | null
    submitted_at: string | null
}

interface SolutionRevealEventRow {
    id: string
    assignment_id: string | null
    question_id: string | null
    question_index: number | null
    clicked_at: string | null
}

interface ClassroomAssignmentLogMeta {
    id: string
    title: string | null
    collection_id: string | null
}

interface CollectionLogMeta {
    id: string
    title: string | null
}

export interface StudentEventLogItem {
    id: string
    eventType: 'homework_submission' | 'solution_reveal'
    occurredAt: string
    assignmentId: string
    assignmentTitle: string
    collectionTitle: string
    questionId: string
    questionIndex: number
    submittedAnswer: string | null
    isCorrect: boolean | null
}

export async function getStudentClassroomEventLogs(
    classroomId: string,
    studentId: string
): Promise<{ success: boolean, events: StudentEventLogItem[], error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, events: [], error: "Unauthorized" }

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, events: [], error: "Unauthorized to view student logs for this classroom" }
    }

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId)
        .maybeSingle()

    if (!enrollment) {
        return { success: false, events: [], error: "Student is not enrolled in this classroom" }
    }

    const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, title, collection_id')
        .eq('classroom_id', classroomId)

    if (assignmentsError) {
        console.error("Student logs assignment fetch error", assignmentsError)
        return { success: false, events: [], error: "Failed to fetch classroom assignments" }
    }

    const assignmentRows = (assignments || []) as ClassroomAssignmentLogMeta[]
    if (assignmentRows.length === 0) {
        return { success: true, events: [] }
    }

    const assignmentIds = assignmentRows
        .map((assignment) => assignment.id)
        .filter((assignmentId): assignmentId is string => typeof assignmentId === 'string' && assignmentId.length > 0)

    if (assignmentIds.length === 0) {
        return { success: true, events: [] }
    }

    const collectionIds = assignmentRows
        .map((assignment) => assignment.collection_id)
        .filter((collectionId): collectionId is string => typeof collectionId === 'string' && collectionId.length > 0)

    const uniqueCollectionIds = [...new Set(collectionIds)]
    let collectionTitleById = new Map<string, string>()

    if (uniqueCollectionIds.length > 0) {
        const { data: collections, error: collectionsError } = await supabase
            .from('collections')
            .select('id, title')
            .in('id', uniqueCollectionIds)

        if (collectionsError) {
            console.error("Student logs collection fetch error", collectionsError)
            return { success: false, events: [], error: "Failed to fetch collection metadata" }
        }

        collectionTitleById = new Map<string, string>(
            ((collections || []) as CollectionLogMeta[]).map((collection) => [
                collection.id,
                collection.title?.trim() || "Untitled collection"
            ])
        )
    }

    const assignmentTitleById = new Map<string, string>(
        assignmentRows.map((assignment) => [
            assignment.id,
            assignment.title?.trim() || "Untitled assignment"
        ])
    )

    const collectionTitleByAssignmentId = new Map<string, string>(
        assignmentRows.map((assignment) => {
            const collectionId = assignment.collection_id
            if (typeof collectionId !== 'string' || collectionId.length === 0) {
                return [assignment.id, "No collection"]
            }
            return [assignment.id, collectionTitleById.get(collectionId) || "Unknown collection"]
        })
    )

    const supabaseAdmin = createAdminClient()
    const [homeworkEventsResult, revealEventsResult] = await Promise.all([
        supabaseAdmin
            .from('homework_submission_events')
            .select('id, assignment_id, question_id, question_index, submitted_answer, is_correct, submitted_at')
            .eq('student_id', studentId)
            .in('assignment_id', assignmentIds)
            .order('submitted_at', { ascending: false }),
        supabaseAdmin
            .from('solution_reveal_events')
            .select('id, assignment_id, question_id, question_index, clicked_at')
            .eq('student_id', studentId)
            .in('assignment_id', assignmentIds)
            .order('clicked_at', { ascending: false })
    ])

    if (homeworkEventsResult.error) {
        console.error("Student logs homework events fetch error", homeworkEventsResult.error)
        return { success: false, events: [], error: "Failed to fetch homework submission logs" }
    }

    if (revealEventsResult.error) {
        console.error("Student logs solution reveal events fetch error", revealEventsResult.error)
        return { success: false, events: [], error: "Failed to fetch solution reveal logs" }
    }

    const homeworkEvents = (homeworkEventsResult.data || []) as HomeworkSubmissionEventRow[]
    const revealEvents = (revealEventsResult.data || []) as SolutionRevealEventRow[]

    const normalizedHomeworkEvents: StudentEventLogItem[] = homeworkEvents.map((event) => {
        const assignmentId = typeof event.assignment_id === 'string' ? event.assignment_id : ''
        const questionId = typeof event.question_id === 'string' ? event.question_id : ''
        const questionIndex = Number.isFinite(event.question_index) ? Number(event.question_index) : 0

        return {
            id: event.id,
            eventType: 'homework_submission',
            occurredAt: event.submitted_at || new Date(0).toISOString(),
            assignmentId,
            assignmentTitle: assignmentTitleById.get(assignmentId) || "Unknown assignment",
            collectionTitle: collectionTitleByAssignmentId.get(assignmentId) || "Unknown collection",
            questionId,
            questionIndex,
            submittedAnswer: event.submitted_answer ?? '',
            isCorrect: typeof event.is_correct === 'boolean' ? event.is_correct : null
        }
    })

    const normalizedRevealEvents: StudentEventLogItem[] = revealEvents.map((event) => {
        const assignmentId = typeof event.assignment_id === 'string' ? event.assignment_id : ''
        const questionId = typeof event.question_id === 'string' ? event.question_id : ''
        const questionIndex = Number.isFinite(event.question_index) ? Number(event.question_index) : 0

        return {
            id: event.id,
            eventType: 'solution_reveal',
            occurredAt: event.clicked_at || new Date(0).toISOString(),
            assignmentId,
            assignmentTitle: assignmentTitleById.get(assignmentId) || "Unknown assignment",
            collectionTitle: collectionTitleByAssignmentId.get(assignmentId) || "Unknown collection",
            questionId,
            questionIndex,
            submittedAnswer: null,
            isCorrect: null
        }
    })

    const mergedEvents = [...normalizedHomeworkEvents, ...normalizedRevealEvents]
        .sort((a, b) => {
            const aTime = new Date(a.occurredAt).getTime()
            const bTime = new Date(b.occurredAt).getTime()
            return bTime - aTime
        })

    return { success: true, events: mergedEvents }
}

export async function getStudentAssignmentSubmissionForTeacher(
    classroomId: string,
    studentId: string,
    assignmentId: string
) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return null
    }

    const { data: assignment } = await supabase
        .from('assignments')
        .select(`
            id,
            title,
            points_enabled,
            points,
            required_variations_count,
            questions(
                id,
                created_at,
                question_type,
                latex_text,
                options,
                correct_value,
                tolerance_percent,
                correct_answer,
                diagram_type,
                diagram_svg,
                diagram_image_url,
                points
            )
        `)
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)
        .single()

    if (!assignment) return null

    const supabaseAdmin = createAdminClient()
    const { data: progress } = await supabaseAdmin
        .from('assignment_progress')
        .select('submitted_answers, earned_points, earned_points_per_part, points_disabled_by_teacher, is_completed')
        .eq('student_id', studentId)
        .eq('assignment_id', assignmentId)
        .maybeSingle()

    const orderedQuestions = [...(assignment.questions || [])].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return aTime - bTime
    })
    const normalizedProgress = normalizePointProgressForQuestions(
        progress?.submitted_answers,
        progress?.earned_points_per_part,
        orderedQuestions as PointQuestion[]
    )

    return {
        assignment: {
            ...assignment,
            questions: orderedQuestions
        },
        submittedAnswers: normalizedProgress.submittedAnswers,
        earnedPointsPerPart: normalizedProgress.earnedPointsPerPart,
        earnedPoints: sumEarnedPoints(normalizedProgress.earnedPointsPerPart),
        pointsDisabledByTeacher: !!progress?.points_disabled_by_teacher,
        isCompleted: assignment.points_enabled
            ? isPointProgressCompleted(normalizedProgress.submittedAnswers, orderedQuestions as PointQuestion[], assignment.required_variations_count)
            : !!progress?.is_completed
    }
}

export async function setTeacherExercisePointsDisabled(
    classroomId: string,
    studentId: string,
    assignmentId: string,
    disabled: boolean
): Promise<ActionState & {
    review?: Awaited<ReturnType<typeof getStudentAssignmentSubmissionForTeacher>>
}> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = SetTeacherExercisePointsDisabledSchema.safeParse({
        classroomId,
        studentId,
        assignmentId,
        disabled
    })

    if (!validated.success) {
        return { success: false, error: "Invalid request" }
    }

    const payload = validated.data

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', payload.classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('classroom_id', payload.classroomId)
        .eq('student_id', payload.studentId)
        .maybeSingle()

    if (!enrollment) {
        return { success: false, error: "Student is not enrolled in this classroom" }
    }

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, points_enabled, collection_id')
        .eq('id', payload.assignmentId)
        .eq('classroom_id', payload.classroomId)
        .single()

    if (!assignment) {
        return { success: false, error: "Exercise not found" }
    }

    if (!assignment.points_enabled) {
        return { success: false, error: "Only pointed exercises can be changed" }
    }

    const supabaseAdmin = createAdminClient()
    const { data: updatedProgress, error: updateError } = await supabaseAdmin
        .from('assignment_progress')
        .update({
            points_disabled_by_teacher: payload.disabled,
            updated_at: new Date().toISOString()
        })
        .eq('student_id', payload.studentId)
        .eq('assignment_id', payload.assignmentId)
        .select('id')
        .maybeSingle()

    if (updateError) {
        console.error("Teacher points disable update error", updateError)
        return { success: false, error: "Failed to update exercise points" }
    }

    if (!updatedProgress) {
        return { success: false, error: "No student progress found for this exercise" }
    }

    revalidatePath(`/teacher/class/${payload.classroomId}`)
    revalidatePath(`/student/class/${payload.classroomId}`)
    if (assignment.collection_id) {
        revalidatePath(`/student/class/${payload.classroomId}/collection/${assignment.collection_id}`)
    }

    const review = await getStudentAssignmentSubmissionForTeacher(
        payload.classroomId,
        payload.studentId,
        payload.assignmentId
    )

    return { success: true, review }
}

export async function submitTeacherManualPointsAnswer(
    classroomId: string,
    studentId: string,
    assignmentId: string,
    questionId: string,
    submittedAnswer: string,
    isCorrect: boolean
): Promise<ActionState & {
    submittedAnswers?: Record<string, string>
    earnedPointsPerPart?: Record<string, number>
    earnedPoints?: number
    pointsDisabledByTeacher?: boolean
    isCompleted?: boolean
}> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = SubmitTeacherManualPointsAnswerSchema.safeParse({
        classroomId,
        studentId,
        assignmentId,
        questionId,
        submittedAnswer,
        isCorrect
    })

    if (!validated.success) {
        return { success: false, error: "Invalid submission data" }
    }

    const payload = validated.data

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', payload.classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { data: assignment } = await supabase
        .from('assignments')
        .select(`
            id,
            points_enabled,
            required_variations_count,
            questions(
                id,
                created_at,
                question_type,
                correct_value,
                tolerance_percent,
                correct_answer,
                points
            )
        `)
        .eq('id', payload.assignmentId)
        .eq('classroom_id', payload.classroomId)
        .single()

    if (!assignment) {
        return { success: false, error: "Exercise not found" }
    }

    if (!assignment.points_enabled) {
        return { success: false, error: "Manual submission is available only for point exercises" }
    }

    const questions = sortQuestionsByCreatedAt(Array.isArray(assignment.questions) ? assignment.questions as PointQuestion[] : [])
    const selectedQuestion = questions.find((question) => question.id === payload.questionId)

    if (!selectedQuestion) {
        return { success: false, error: "Selected variation was not found" }
    }

    const supabaseAdmin = createAdminClient()
    const { data: existingProgress } = await supabaseAdmin
        .from('assignment_progress')
        .select('submitted_answers, earned_points_per_part, points_disabled_by_teacher, completed_question_indices')
        .eq('student_id', payload.studentId)
        .eq('assignment_id', payload.assignmentId)
        .maybeSingle()

    const normalizedProgress = normalizePointProgressForQuestions(
        existingProgress?.submitted_answers,
        existingProgress?.earned_points_per_part,
        questions
    )
    const submittedAnswers: Record<string, string> = { ...normalizedProgress.submittedAnswers }
    const earnedPointsPerPart: Record<string, number> = { ...normalizedProgress.earnedPointsPerPart }
    const completedIndices: number[] = Array.isArray(existingProgress?.completed_question_indices)
        ? existingProgress.completed_question_indices
        : []

    submittedAnswers[payload.questionId] = payload.submittedAnswer

    const pointsPerPart = getQuestionPoints(selectedQuestion)
    earnedPointsPerPart[payload.questionId] = isSubmittedAnswerCorrect(selectedQuestion, payload.submittedAnswer) ? pointsPerPart : 0

    const totalEarnedPoints = sumEarnedPoints(earnedPointsPerPart)
    const isFullyCompleted = isPointProgressCompleted(submittedAnswers, questions, assignment.required_variations_count)

    const { error: upsertError } = await supabaseAdmin
        .from('assignment_progress')
        .upsert({
            student_id: payload.studentId,
            assignment_id: payload.assignmentId,
            completed_question_indices: completedIndices,
            is_completed: isFullyCompleted,
            submitted_answers: submittedAnswers,
            earned_points_per_part: earnedPointsPerPart,
            earned_points: totalEarnedPoints,
            points_disabled_by_teacher: !!existingProgress?.points_disabled_by_teacher,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id, assignment_id'
        })

    if (upsertError) {
        console.error("Teacher manual points submit error", upsertError)
        return { success: false, error: "Failed to submit answer manually" }
    }

    revalidatePath(`/teacher/class/${payload.classroomId}`)

    return {
        success: true,
        submittedAnswers,
        earnedPointsPerPart,
        earnedPoints: totalEarnedPoints,
        pointsDisabledByTeacher: !!existingProgress?.points_disabled_by_teacher,
        isCompleted: isFullyCompleted
    }
}

export async function overrideAnswerCorrectness(
    classroomId: string,
    studentId: string,
    assignmentId: string,
    questionId: string
): Promise<ActionState & {
    submittedAnswers?: Record<string, string>
    earnedPointsPerPart?: Record<string, number>
    earnedPoints?: number
    pointsDisabledByTeacher?: boolean
    isCompleted?: boolean
}> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { data: assignment } = await supabase
        .from('assignments')
        .select(`
            id,
            points_enabled,
            required_variations_count,
            questions(
                id,
                created_at,
                question_type,
                correct_value,
                tolerance_percent,
                correct_answer,
                points
            )
        `)
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)
        .single()

    if (!assignment) {
        return { success: false, error: "Exercise not found" }
    }

    const questions = sortQuestionsByCreatedAt(Array.isArray(assignment.questions) ? assignment.questions as PointQuestion[] : [])
    const selectedQuestion = questions.find((q) => q.id === questionId)

    if (!selectedQuestion) {
        return { success: false, error: "Question not found" }
    }

    const supabaseAdmin = createAdminClient()
    const { data: existingProgress } = await supabaseAdmin
        .from('assignment_progress')
        .select('submitted_answers, earned_points_per_part, points_disabled_by_teacher, completed_question_indices')
        .eq('student_id', studentId)
        .eq('assignment_id', assignmentId)
        .maybeSingle()

    const normalizedProgress = normalizePointProgressForQuestions(
        existingProgress?.submitted_answers,
        existingProgress?.earned_points_per_part,
        questions
    )
    const submittedAnswers: Record<string, string> = { ...normalizedProgress.submittedAnswers }

    // Verify the student actually submitted an answer for this question
    if (submittedAnswers[questionId] === undefined) {
        return { success: false, error: "Student has not submitted an answer for this question" }
    }

    const earnedPointsPerPart: Record<string, number> = { ...normalizedProgress.earnedPointsPerPart }

    const completedIndices: number[] = Array.isArray(existingProgress?.completed_question_indices)
        ? existingProgress.completed_question_indices
        : []

    // Override: award full points for this question
    const pointsPerPart = getQuestionPoints(selectedQuestion)
    earnedPointsPerPart[questionId] = pointsPerPart

    const totalEarnedPoints = sumEarnedPoints(earnedPointsPerPart)
    const isFullyCompleted = isPointProgressCompleted(submittedAnswers, questions, assignment.required_variations_count)

    const { error: upsertError } = await supabaseAdmin
        .from('assignment_progress')
        .upsert({
            student_id: studentId,
            assignment_id: assignmentId,
            completed_question_indices: completedIndices,
            is_completed: isFullyCompleted,
            submitted_answers: submittedAnswers,
            earned_points_per_part: earnedPointsPerPart,
            earned_points: totalEarnedPoints,
            points_disabled_by_teacher: !!existingProgress?.points_disabled_by_teacher,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'student_id, assignment_id'
        })

    if (upsertError) {
        console.error("Override answer correctness error", upsertError)
        return { success: false, error: "Failed to override answer" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)

    return {
        success: true,
        submittedAnswers,
        earnedPointsPerPart,
        earnedPoints: totalEarnedPoints,
        pointsDisabledByTeacher: !!existingProgress?.points_disabled_by_teacher,
        isCompleted: isFullyCompleted
    }
}

export async function deleteCollection(collectionId: string, classroomId: string, deleteExercises: boolean = false): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    if (deleteExercises) {
        // 1. Get all assignment IDs in this collection
        const { data: assignments } = await supabase
            .from('assignments')
            .select('id')
            .eq('collection_id', collectionId)

        const assignmentIds = assignments?.map(a => a.id) || []

        if (assignmentIds.length > 0) {
            // 2. Delete Submissions
            await supabase.from('submissions').delete().in('assignment_id', assignmentIds)
            // 3. Delete Questions
            await supabase.from('questions').delete().in('assignment_id', assignmentIds)
            // 4. Delete Assignments
            const { error: deleteAssError } = await supabase.from('assignments').delete().in('id', assignmentIds)
            if (deleteAssError) {
                console.error("Delete Assignments Error", deleteAssError)
                return { success: false, error: 'Failed to delete exercises' }
            }
        }
    } else {
        // Unlink assignments (set collection_id to null)
        const { error: unlinkError } = await supabase
            .from('assignments')
            .update({ collection_id: null })
            .eq('collection_id', collectionId)

        if (unlinkError) {
            console.error("Unlink Error", unlinkError)
            return { success: false, error: 'Failed to unlink exercises from collection' }
        }
    }

    // Finally, delete the collection
    const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)

    if (deleteError) {
        console.error("Delete Error", deleteError)
        return { success: false, error: 'Failed to delete collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function updateClassroomIpSettings(
    classroomId: string,
    allowedIp: string,
    enabled: boolean
): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('classrooms')
        .update({
            allowed_ip: allowedIp,
            ip_check_enabled: enabled
        })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update IP settings' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function getCurrentIp(): Promise<{ ip: string }> {
    const ip = await getClientIp()
    return { ip }
}

export async function syncClassroomIp(classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Get current IP
    const currentIp = await getClientIp()

    // 1. Check if teacher owns the classroom and if IP restriction is enabled
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id, allowed_ip, ip_check_enabled')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // 2. Only update if enabled and IF it actually changed
    if (classroom.ip_check_enabled && classroom.allowed_ip !== currentIp) {
        const { error } = await supabase
            .from('classrooms')
            .update({ allowed_ip: currentIp })
            .eq('id', classroomId)

        if (error) {
            console.error('IP Sync Error:', error)
            return { success: false, error: "Failed to sync IP" }
        }
    }

    return { success: true }
}


export async function updateAssignmentOrder(
    classroomId: string,
    collectionId: string,
    items: { id: string, order_index: number }[]
): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Perform updates in a loop (Supabase doesn't easily support bulk updates with different values for different rows in JS without RPC)
    // However, for small lists (exercises in a collection), individual updates are acceptable.
    // A better way would be an RPC but let's stick to this for simplicity if it's not too many.

    for (const item of items) {
        const { error } = await supabase
            .from('assignments')
            .update({ order_index: item.order_index })
            .eq('id', item.id)
            .eq('collection_id', collectionId)
            .eq('classroom_id', classroomId)

        if (error) {
            console.error(`Error updating order for ${item.id}:`, error)
        }
    }

    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

export async function getTeacherClassrooms(excludeClassroomId?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
        .from('classrooms')
        .select('id, name')
        .eq('teacher_id', user.id)

    if (excludeClassroomId) {
        query = query.neq('id', excludeClassroomId)
    }

    const { data, error } = await query.order('name')

    if (error) {
        console.error('Error fetching teacher classrooms:', error)
        return []
    }

    return data
}

export async function getClassroomCollections(classroomId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('collections')
        .select('id, title, category')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching classroom collections:', error)
        return []
    }

    return data
}

export async function importCollection(targetClassroomId: string, sourceCollectionId: string, publish: boolean = true): Promise<ActionState> {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        // 2. Fetch Source Collection
        const { data: sourceCollection, error: colError } = await supabase
            .from('collections')
            .select('*')
            .eq('id', sourceCollectionId)
            .single()

        if (colError || !sourceCollection) {
            return { success: false, error: "Source collection not found" }
        }

        // 3. Fetch Source Assignments and their Questions
        const { data: sourceAssignments, error: assError } = await supabase
            .from('assignments')
            .select('*, questions(*)')
            .eq('collection_id', sourceCollectionId)
            .order('order_index', { ascending: true })

        if (assError) {
            console.error("Error fetching source assignments:", assError)
            return { success: false, error: "Failed to fetch source exercises" }
        }

        // 4. Create New Collection in Target Classroom
        const { data: newCollection, error: newColError } = await supabase
            .from('collections')
            .insert({
                classroom_id: targetClassroomId,
                title: sourceCollection.title,
                category: sourceCollection.category,
                slides_url: sourceCollection.slides_url,
                info_content: sourceCollection.info_content || null,
                info_button_color: sourceCollection.info_button_color || null,
                info_pdf_url: sourceCollection.info_pdf_url || null,
                theory_content: sourceCollection.theory_content || null,
                scheduled_date: null // Don't copy schedule
            })
            .select()
            .single()

        if (newColError || !newCollection) {
            console.error("Error creating new collection:", newColError)
            return { success: false, error: "Failed to create new collection" }
        }

        // 5. Copy Assignments and Questions
        if (sourceAssignments && sourceAssignments.length > 0) {
            for (const sourceAss of sourceAssignments) {
                const shouldPublishAssignment = publish

                // Copy Assignment
                const { data: newAss, error: newAssError } = await supabase
                    .from('assignments')
                    .insert({
                        classroom_id: targetClassroomId,
                        collection_id: newCollection.id,
                        title: sourceAss.title,
                        published: shouldPublishAssignment,
                        order_index: sourceAss.order_index,
                        show_all_questions: sourceAss.show_all_questions,
                        required_variations_count: sourceAss.required_variations_count,
                        points_enabled: sourceAss.points_enabled,
                        points: sourceAss.points,
                        simulation_url: sourceAss.simulation_url || null,
                        theory_content: sourceAss.theory_content || null,
                        theory_image_url: sourceAss.theory_image_url || null
                    })
                    .select()
                    .single()

                if (newAssError || !newAss) {
                    console.error("Error copying assignment:", newAssError)
                    continue // Skip this assignment if it fails
                }

                // Copy Questions
                if (sourceAss.questions && sourceAss.questions.length > 0) {
                    const questionsToInsert = sourceAss.questions.map((q: any) => ({
                        assignment_id: newAss.id,
                        latex_text: q.latex_text,
                        question_type: q.question_type,
                        correct_value: q.correct_value,
                        tolerance_percent: q.tolerance_percent,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        diagram_type: q.diagram_type,
                        diagram_svg: q.diagram_svg,
                        diagram_image_url: q.diagram_image_url,
                        solution_text: q.solution_text,
                        points: q.points
                    }))

                    const { error: newQuestError } = await supabase
                        .from('questions')
                        .insert(questionsToInsert)

                    if (newQuestError) {
                        console.error("Error copying questions:", newQuestError)
                    }
                }
            }
        }

        revalidatePath(`/teacher/class/${targetClassroomId}`)
        return { success: true }
    } catch (err) {
        console.error("Import error:", err)
        return { success: false, error: "An unexpected error occurred during import" }
    }
}

export async function getCollectionExercises(collectionId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('assignments')
        .select('id, title')
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true })

    if (error) {
        console.error('Error fetching collection exercises:', error)
        return []
    }

    return data
}

export async function generateVariationsFromExercise(
    baseQuestion: any,
    count: number,
    variationType: 'numbers' | 'similar',
    generateSolution: boolean
): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const prompt = `
    Analyze the following physics/math problem provided in JSON format.
    Create ${count} NEW VARIATIONS based on this reference JSON.
    
    REFERENCE QUESTION:
    ${JSON.stringify(baseQuestion)}
    
    VARIATION RULES:
    ${variationType === 'numbers'
            ? '- Keep EXACT SAME context/story/structure, ONLY change numbers and relevant calculation results.'
            : '- Change context/story (e.g., car -> train), keep same logic and difficulty level.'}
    - Difficulty must remain consistent with the original.
    - CRITICAL: All generated output text (latex_text, options, solution) MUST be in the Lithuanian language.
    - LATEX FORMATTING: Use LaTeX for ALL math, units, and symbols. For multiple_choice options, wrap LaTeX in single dollar signs.
    - NUMERICAL UNITS: Use SI units (m, s, kg, N, J, etc.) for correct_value.
    - PHYSICAL CONSTANTS: Use g = 10 m/s^2 for gravitational acceleration unless otherwise specified in the problem image.
    - NOTATION: Weight ("Sunkio jėga") MUST be written as F with a subscript "s" (F_s in LaTeX).
    - If diagram_svg exists, keep the same diagram structure but update labels or values if they changed in the text.
    - CRITICAL: Inside <svg> tags, DO NOT use LaTeX syntax (e.g., no $ delimiters, no \\vec, no \\frac). Use plain text or Unicode characters for labels.
    ${generateSolution ? '- SOLUTION MANUAL MODE: Generate step-by-step solution in Lithuanian for each variation.' : ''}

    Return JSON as an ARRAY of objects (questions):
    [
        {
            "type": "numerical" | "multiple_choice",
            "latex_text": "text",
            "correct_value": number | null,
            "tolerance": number | null,
            "options": ["A", "B", "C", "D"] | null,
            "correct_answer": "A" | "B" | "C" | "D" | null,
            "diagram_type": "graph" | "scheme" | null,
            "diagram_svg": "<svg>...</svg>" | null,
            "solution": "LaTeX steps" | null
        }
    ]
    `;

    try {
        console.log(`Calling Gemini for ${count} variations...`)
        const result = await generateContentWithFallback("gemini-3-flash-preview", [prompt])
        const response = await result.response
        const text = response.text()

        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
        jsonStr = jsonStr.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
            return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
        })

        let variations = JSON.parse(jsonStr)
        if (!Array.isArray(variations)) {
            variations = [variations]
        }

        const processedVariations = variations.map((v: any) => {
            const processed = processExerciseData({ questions: [v] }, generateSolution, baseQuestion.diagram_image_url)
            return processed.questions[0]
        })

        return { success: true, data: processedVariations }
    } catch (error: any) {
        console.error("Gemini Variation Error:", error)
        return { success: false, error: error.message || "Failed to generate variations" }
    }
}

const EditSvgTargetSchema = z.object({
    index: z.number().int().min(0),
    latex_text: z.string().optional(),
    diagram_svg: z.string().min(1),
    diagram_type: z.enum(['graph', 'scheme']).nullable().optional()
})

const EditExerciseSvgPromptSchema = z.object({
    classroomId: z.string().uuid(),
    assignmentId: z.string().uuid(),
    prompt: z.string().trim().min(1),
    targets: z.array(EditSvgTargetSchema).min(1)
})

export async function editExerciseSvgWithPrompt(input: {
    classroomId: string
    assignmentId: string
    prompt: string
    targets: Array<{
        index: number
        latex_text?: string
        diagram_svg: string
        diagram_type?: 'graph' | 'scheme' | null
    }>
}): Promise<{ success: boolean; data?: Array<{ index: number; diagram_svg: string }>; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = EditExerciseSvgPromptSchema.safeParse(input)
    if (!validated.success) {
        return { success: false, error: "Invalid SVG edit request" }
    }

    const data = validated.data

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', data.classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .select('id')
        .eq('id', data.assignmentId)
        .eq('classroom_id', data.classroomId)
        .single()

    if (assignmentError || !assignment) {
        return { success: false, error: "Assignment not found" }
    }

    try {
        const editedTargets = await Promise.all(
            data.targets.map(async (target) => {
                const geminiPrompt = `
You are an SVG editor for physics/math classroom exercises.
Apply the user's edit request to the SVG below.

USER EDIT REQUEST:
${data.prompt}

QUESTION CONTEXT:
${target.latex_text || '(no question text)'}

CURRENT SVG:
${target.diagram_svg}

RULES:
- Return ONLY one valid <svg>...</svg> string.
- Do not return markdown, JSON, or explanations.
- Keep the diagram semantically consistent with the question unless the request says otherwise.
- Preserve existing coordinate system/viewBox when possible.
- CRITICAL: Inside <svg> tags, DO NOT use LaTeX syntax (e.g., no $ delimiters, no \\vec, no \\frac). Use plain text or Unicode characters for labels.
`

                const result = await generateContentWithFallback("gemini-3-flash-preview", [geminiPrompt])
                const response = await result.response
                const text = response.text()
                const editedSvg = extractSvgFromText(text)

                if (!editedSvg) {
                    throw new Error(`Gemini did not return a valid SVG for question ${target.index + 1}`)
                }

                return {
                    index: target.index,
                    diagram_svg: editedSvg
                }
            })
        )

        return { success: true, data: editedTargets }
    } catch (error: any) {
        console.error("Gemini SVG edit error:", error)
        return { success: false, error: error.message || "Failed to edit SVG" }
    }
}

// Start timed test mode for a collection
export async function startTestCollection(
    collectionId: string,
    classroomId: string,
    durationMinutes: number,
    selectedStudentIds?: string[]
): Promise<ActionState> {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Calculate end time
    const testEndTime = new Date()
    testEndTime.setMinutes(testEndTime.getMinutes() + durationMinutes)
    const testEndTimeIso = testEndTime.toISOString()

    // Update collection with test_mode_ends_at
    const { error: collectionError } = await supabase
        .from('collections')
        .update({ test_mode_ends_at: testEndTimeIso })
        .eq('id', collectionId)
        .eq('classroom_id', classroomId)

    if (collectionError) {
        console.error("Collection update error:", collectionError)
        return { success: false, error: "Failed to start test mode" }
    }

    // Publish all assignments in collection that have points_enabled = true
    const { error: assignmentError } = await supabase
        .from('assignments')
        .update({ published: true })
        .eq('collection_id', collectionId)
        .eq('points_enabled', true)

    if (assignmentError) {
        console.error("Assignment publish error:", assignmentError)
        return { success: false, error: "Failed to publish pointed exercises" }
    }

    // Manage test participants
    if (selectedStudentIds && selectedStudentIds.length > 0) {
        // Remove old participants for this collection
        await supabaseAdmin
            .from('collection_test_participants')
            .delete()
            .eq('collection_id', collectionId)

        // Insert new participants
        const participantRows = selectedStudentIds.map(studentId => ({
            collection_id: collectionId,
            student_id: studentId,
            test_mode_ends_at: testEndTimeIso,
        }))

        const { error: participantsError } = await supabaseAdmin
            .from('collection_test_participants')
            .insert(participantRows)

        if (participantsError) {
            console.error("Participants insert error:", participantsError)
            // Non-fatal: test still works, just without participant filtering
        }

        // Reset assignment_progress for selected students on pointed exercises in this collection
        const { data: pointedAssignments } = await supabase
            .from('assignments')
            .select('id, simulation_url')
            .eq('collection_id', collectionId)
            .eq('points_enabled', true)

        if (pointedAssignments && pointedAssignments.length > 0) {
            const pointedIds = pointedAssignments.map(a => a.id)
            const { error: resetError } = await supabaseAdmin
                .from('assignment_progress')
                .delete()
                .in('assignment_id', pointedIds)
                .in('student_id', selectedStudentIds)

            if (resetError) {
                console.error("Progress reset error:", resetError)
                // Non-fatal
            }

            const scoredSimulationIds = (pointedAssignments as ScoredSimulationAssignmentRow[])
                .filter((assignment) => isScoredSimulationUrl(assignment.simulation_url))
                .map((assignment) => assignment.id)

            if (scoredSimulationIds.length > 0) {
                const { error: attemptResetError } = await supabaseAdmin
                    .from('simulation_test_attempts')
                    .delete()
                    .in('assignment_id', scoredSimulationIds)
                    .in('student_id', selectedStudentIds)

                if (attemptResetError) {
                    console.error("Scored simulation attempt reset error:", attemptResetError)
                }
            }
        }
    }

    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    revalidatePath(`/student/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

// End test mode for a collection (called when time expires or manually)
export async function endTestCollection(
    collectionId: string,
    classroomId: string
): Promise<ActionState> {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Check if we need to auto-disable tab monitoring
    const { data: collectionData } = await supabase
        .from('collections')
        .select('auto_disable_tab_monitoring_after_test, tab_monitoring_enabled')
        .eq('id', collectionId)
        .eq('classroom_id', classroomId)
        .single()

    const updateFields: any = { test_mode_ends_at: null }
    if (collectionData?.auto_disable_tab_monitoring_after_test && collectionData?.tab_monitoring_enabled) {
        updateFields.tab_monitoring_enabled = false
    }

    // Clear test_mode_ends_at (and optionally disable tab monitoring)
    const { error: collectionError } = await supabase
        .from('collections')
        .update(updateFields)
        .eq('id', collectionId)
        .eq('classroom_id', classroomId)

    if (collectionError) {
        console.error("Collection update error:", collectionError)
        return { success: false, error: "Failed to end test mode" }
    }

    // Pointed exercises remain published - access control is handled client-side:
    // Students who haven't taken the test see them as locked (isPointedAndLocked),
    // while students who completed the test can review their answers.

    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    revalidatePath(`/student/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

// Get the test_mode_ends_at for a collection (lightweight poll for teacher timer)
export async function getCollectionTestEndTime(
    collectionId: string,
    classroomId: string
): Promise<{ success: boolean, testModeEndsAt?: string | null, error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: collection } = await supabase
        .from('collections')
        .select('test_mode_ends_at')
        .eq('id', collectionId)
        .eq('classroom_id', classroomId)
        .single()

    if (!collection) return { success: false, error: "Collection not found" }

    return { success: true, testModeEndsAt: collection.test_mode_ends_at || null }
}

// Auto-submit empty answers for ALL test participants (server-side, uses admin client)
// This ensures offline students also get their answers submitted when the timer expires.
export async function autoSubmitForAllTestParticipants(
    collectionId: string,
    classroomId: string
): Promise<ActionState> {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Fetch all test participants for this collection
    const { data: participants } = await supabaseAdmin
        .from('collection_test_participants')
        .select('student_id')
        .eq('collection_id', collectionId)

    if (!participants || participants.length === 0) {
        return { success: true } // No participants
    }

    const studentIds = participants.map(p => p.student_id)

    // Fetch all PUBLISHED assignments in collection with points enabled
    const { data: assignments } = await supabaseAdmin
        .from('assignments')
        .select('id, classroom_id, collection_id, points_enabled, simulation_url, questions(id, points)')
        .eq('collection_id', collectionId)
        .eq('points_enabled', true)
        .eq('published', true)

    if (!assignments || assignments.length === 0) {
        return { success: true } // No points-enabled exercises
    }

    const assignmentRows = assignments as ScoredSimulationAssignmentRow[]
    const assignmentIds = assignmentRows.map(a => a.id)

    // Fetch existing progress for ALL participants on these assignments
    const { data: allProgress } = await supabaseAdmin
        .from('assignment_progress')
        .select('student_id, assignment_id, submitted_answers, earned_points_per_part, points_disabled_by_teacher')
        .in('assignment_id', assignmentIds)
        .in('student_id', studentIds)

    // Build a lookup: studentId -> assignmentId -> progress
    const progressLookup = new Map<string, Map<string, AutoSubmitProgressRow>>()
    const progressRows = (allProgress || []) as AutoSubmitProgressRow[]
    progressRows.forEach(p => {
        if (!progressLookup.has(p.student_id)) {
            progressLookup.set(p.student_id, new Map())
        }
        progressLookup.get(p.student_id)!.set(p.assignment_id, p)
    })

    // Process each student × assignment combination
    for (const studentId of studentIds) {
        const studentProgress = progressLookup.get(studentId) || new Map()

        for (const assignment of assignmentRows) {
            if (isScoredSimulationUrl(assignment.simulation_url)) {
                await finalizeScoredSimulationAttemptForTeacher(
                    supabaseAdmin,
                    assignment,
                    studentId
                )
                continue
            }

            const questions = assignment.questions || []
            if (questions.length === 0) continue

            const progress = studentProgress.get(assignment.id)
            const submittedAnswers = toSubmittedAnswerMap(progress?.submitted_answers)
            const earnedPointsPerPart = toEarnedPointsMap(progress?.earned_points_per_part)

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

                // Upsert using admin client (bypasses RLS)
                const { error } = await supabaseAdmin
                    .from('assignment_progress')
                    .upsert({
                        student_id: studentId,
                        assignment_id: assignment.id,
                        submitted_answers: submittedAnswers,
                        earned_points_per_part: earnedPointsPerPart,
                        earned_points: totalEarnedPoints,
                        points_disabled_by_teacher: !!progress?.points_disabled_by_teacher,
                        is_completed: true,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'student_id, assignment_id'
                    })

                if (error) {
                    console.error("Auto-submit error for student", studentId, "assignment", assignment.id, error)
                }
            }
        }
    }

    return { success: true }
}

// Fetch students for the test start dialog
export async function getStudentsForTestDialog(
    classroomId: string,
    collectionId: string
): Promise<{
    success: boolean
    students?: Array<{
        id: string
        firstName: string | null
        lastName: string | null
        hasCompleted: boolean
        earnedPoints: number
        maxPoints: number
    }>
    error?: string
}> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Fetch enrolled students (include cheater flag)
    const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('student_id, is_cheater, profiles:student_id(id, first_name, last_name)')
        .eq('classroom_id', classroomId)

    if (enrollError || !enrollments) {
        return { success: false, error: "Failed to fetch students" }
    }

    // Fetch pointed assignments in this collection
    const { data: pointedAssignments } = await supabase
        .from('assignments')
        .select('id, points, required_variations_count, questions(id, points)')
        .eq('collection_id', collectionId)
        .eq('points_enabled', true)

    const pointedIds = pointedAssignments?.map(a => a.id) || []

    // Calculate max points for the collection
    let maxPoints = 0
    if (pointedAssignments) {
        pointedAssignments.forEach((a: any) => {
            let assignmentMax = calculateAssignmentMaxPoints(a)
            maxPoints += assignmentMax
        })
    }

    // Fetch progress for all students on pointed assignments
    const studentIds = enrollments
        .map((e: any) => {
            const profile = e.profiles
            return profile?.id || e.student_id
        })
        .filter((id: unknown): id is string => typeof id === 'string')

    let progressByStudent: Record<string, { earned: number; completed: boolean }> = {}

    if (pointedIds.length > 0 && studentIds.length > 0) {
        const supabaseAdmin = createAdminClient()
        const { data: progressData } = await supabaseAdmin
            .from('assignment_progress')
            .select('student_id, assignment_id, earned_points, points_disabled_by_teacher, is_completed')
            .in('assignment_id', pointedIds)
            .in('student_id', studentIds)

        if (progressData) {
            progressData.forEach((p: any) => {
                const sid = p.student_id
                if (!progressByStudent[sid]) {
                    progressByStudent[sid] = { earned: 0, completed: true }
                }
                progressByStudent[sid].earned += getEffectiveEarnedPoints(p)
                if (!p.is_completed) {
                    progressByStudent[sid].completed = false
                }
            })
        }
    }

    const students = enrollments.map((enrollment: any) => {
        const profile = enrollment.profiles
        const studentId = profile?.id || enrollment.student_id
        const progress = progressByStudent[studentId]
        const isCheater = !!enrollment.is_cheater
        // Consider "has completed" only if they have progress at all and all pointed exercises are completed
        const hasProgress = !!progress
        const completedAllPointed = hasProgress && progress.completed && pointedIds.length > 0
        // But also check if they actually have progress rows for ALL pointed assignments
        return {
            id: studentId,
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
            hasCompleted: completedAllPointed,
            earnedPoints: isCheater ? 0 : (progress?.earned || 0),
            maxPoints,
        }
    })

    // Sort by last name
    students.sort((a: any, b: any) => {
        const aName = (a.lastName || '').toLowerCase()
        const bName = (b.lastName || '').toLowerCase()
        return aName.localeCompare(bName)
    })

    return { success: true, students }
}

export async function getBlockedStudents(classroomId: string): Promise<{ success: boolean, blockedStudentIds?: string[], error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Get all collections with tab monitoring enabled in this classroom
    const { data: collections } = await supabase
        .from('collections')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('tab_monitoring_enabled', true)

    if (!collections || collections.length === 0) {
        return { success: true, blockedStudentIds: [] }
    }

    const collectionIds = collections.map(c => c.id)

    // Get all blocked violations
    const { data: violations, error } = await supabase
        .from('tab_monitoring_violations')
        .select('student_id')
        .in('collection_id', collectionIds)
        .eq('blocked', true)

    if (error) {
        console.error("Error fetching blocked students:", error)
        return { success: false, error: "Failed to fetch blocked students" }
    }

    const blockedStudentIds = [...new Set(violations?.map(v => v.student_id) || [])]
    return { success: true, blockedStudentIds }
}

export async function unblockStudent(collectionId: string, studentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom via collection
    const { data: collection } = await supabase
        .from('collections')
        .select('classroom_id, classrooms(teacher_id)')
        .eq('id', collectionId)
        .single()

    if (!collection) return { success: false, error: "Collection not found" }

    const classroom: any = Array.isArray(collection.classrooms) ? collection.classrooms[0] : collection.classrooms
    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    const { error } = await supabase
        .from('tab_monitoring_violations')
        .update({
            blocked: false,
            unblocked_at: new Date().toISOString()
        })
        .eq('collection_id', collectionId)
        .eq('student_id', studentId)

    if (error) {
        console.error("Error unblocking student:", error)
        return { success: false, error: "Failed to unblock student" }
    }

    revalidatePath(`/teacher/class/${collection.classroom_id}`)
    return { success: true }
}

export async function unblockStudentFromClassroom(classroomId: string, studentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Get all monitored collections in this classroom
    const { data: collections } = await supabase
        .from('collections')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('tab_monitoring_enabled', true)

    if (!collections || collections.length === 0) {
        return { success: true }
    }

    const collectionIds = collections.map(c => c.id)

    // Unblock the student from all monitored collections
    const { error } = await supabase
        .from('tab_monitoring_violations')
        .update({
            blocked: false,
            unblocked_at: new Date().toISOString()
        })
        .in('collection_id', collectionIds)
        .eq('student_id', studentId)

    if (error) {
        console.error("Error unblocking student from classroom:", error)
        return { success: false, error: "Failed to unblock student" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function unblockAllStudentsInClassroom(classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    const { data: collections } = await supabase
        .from('collections')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('tab_monitoring_enabled', true)

    if (!collections || collections.length === 0) {
        return { success: true }
    }

    const collectionIds = collections.map(c => c.id)

    const { error } = await supabase
        .from('tab_monitoring_violations')
        .update({
            blocked: false,
            unblocked_at: new Date().toISOString()
        })
        .in('collection_id', collectionIds)
        .eq('blocked', true)

    if (error) {
        console.error("Error unblocking all students:", error)
        return { success: false, error: "Failed to unblock students" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

// Get all student submissions for a specific exercise (used in collection statistics drill-down)
export async function getExerciseSubmissions(
    classroomId: string,
    assignmentId: string
): Promise<{
    success: boolean
    error?: string
    assignment?: {
        id: string
        title: string
        required_variations_count: number | null
        questions: Array<{
            id: string
            question_type: 'numerical' | 'multiple_choice'
            latex_text: string | null
            correct_value: number | null
            tolerance_percent: number | null
            correct_answer: string | null
        }>
    }
    students?: Array<{
        id: string
        firstName: string | null
        lastName: string | null
        submittedAnswers: Record<string, string>
        results: Record<string, boolean>
    }>
}> {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Fetch assignment with questions
    const { data: assignment } = await supabase
        .from('assignments')
        .select(`
            id,
            title,
            required_variations_count,
            questions(
                id,
                created_at,
                question_type,
                latex_text,
                correct_value,
                tolerance_percent,
                correct_answer,
                points
            )
        `)
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)
        .single()

    if (!assignment) return { success: false, error: "Assignment not found" }

    // Sort questions by created_at
    const orderedQuestions = [...(assignment.questions || [])].sort((a: any, b: any) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return aTime - bTime
    })

    // Fetch enrolled students
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, profiles:student_id(id, first_name, last_name)')
        .eq('classroom_id', classroomId)

    if (!enrollments) return { success: false, error: "Failed to fetch students" }

    const studentIds = enrollments
        .map((e: any) => e.profiles?.id || e.student_id)
        .filter((id: unknown): id is string => typeof id === 'string')

    // Fetch all progress rows for this assignment using admin client (bypasses RLS)
    const { data: progressRows } = await supabaseAdmin
        .from('assignment_progress')
        .select('student_id, submitted_answers, earned_points_per_part')
        .eq('assignment_id', assignmentId)
        .in('student_id', studentIds)

    // Build lookup for progress
    const progressByStudent = new Map<string, Record<string, string>>()
    const typedProgressRows = (progressRows || []) as ProgressSubmissionRow[]
    typedProgressRows.forEach((p) => {
        const normalizedProgress = normalizePointProgressForQuestions(
            p.submitted_answers,
            p.earned_points_per_part,
            orderedQuestions as PointQuestion[]
        )

        if (Object.keys(normalizedProgress.submittedAnswers).length > 0) {
            progressByStudent.set(p.student_id, normalizedProgress.submittedAnswers)
        }
    })

    // Build student results
    const students = enrollments
        .filter((e: any) => {
            const sid = e.profiles?.id || e.student_id
            return progressByStudent.has(sid)
        })
        .map((e: any) => {
            const profile = e.profiles
            const studentId = profile?.id || e.student_id
            const submittedAnswers = progressByStudent.get(studentId) || {}

            // Compute correctness per question
            const results: Record<string, boolean> = {}
            for (const question of orderedQuestions) {
                const answer = submittedAnswers[question.id]
                if (answer === undefined || answer === '') continue

                if (question.question_type === 'numerical') {
                    const numAnswer = parseFloat(answer)
                    const correctValue = question.correct_value
                    const tolerancePercent = question.tolerance_percent ?? 0
                    if (correctValue !== null && !isNaN(numAnswer)) {
                        const tolerance = Math.abs(correctValue) * (tolerancePercent / 100)
                        results[question.id] = Math.abs(numAnswer - correctValue) <= tolerance
                    } else {
                        results[question.id] = false
                    }
                } else if (question.question_type === 'multiple_choice') {
                    results[question.id] = answer === question.correct_answer
                }
            }

            return {
                id: studentId,
                firstName: profile?.first_name || null,
                lastName: profile?.last_name || null,
                submittedAnswers,
                results
            }
        })

    // Sort by last name
    students.sort((a, b) => {
        const aName = (a.lastName || '').toLowerCase()
        const bName = (b.lastName || '').toLowerCase()
        return aName.localeCompare(bName)
    })

    return {
        success: true,
        assignment: {
            ...assignment,
            questions: orderedQuestions.map((q: any) => ({
                id: q.id,
                question_type: q.question_type,
                latex_text: q.latex_text,
                correct_value: q.correct_value,
                tolerance_percent: q.tolerance_percent,
                correct_answer: q.correct_answer
            }))
        },
        students
    }
}

export async function addBonusPointsToStudents(
    classroomId: string,
    amount: number,
    studentIds: string[]
): Promise<ActionState> {
    const validated = AddBonusPointsSchema.safeParse({ classroomId, amount, studentIds })
    if (!validated.success) {
        return { success: false, error: "Invalid bonus points request" }
    }

    const selectedStudentIds = [...new Set(validated.data.studentIds)]
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', validated.data.classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Fetch selected enrollments, then increment bonus_points
    const supabaseAdmin = createAdminClient()
    const { data: enrollments, error: fetchError } = await supabaseAdmin
        .from('enrollments')
        .select('id, student_id, bonus_points')
        .eq('classroom_id', validated.data.classroomId)
        .in('student_id', selectedStudentIds)

    if (fetchError) {
        console.error(fetchError)
        return { success: false, error: "Failed to fetch enrollments" }
    }

    if (!enrollments || enrollments.length === 0) {
        return { success: false, error: "No selected students are enrolled in this classroom" }
    }

    const enrolledStudentIds = new Set(enrollments.map((enrollment) => enrollment.student_id))
    if (selectedStudentIds.some((studentId) => !enrolledStudentIds.has(studentId))) {
        return { success: false, error: "One or more selected students are not enrolled in this classroom" }
    }

    // Update each enrollment's bonus_points
    const updates = enrollments.map((enrollment) => ({
        id: enrollment.id,
        bonus_points: (enrollment.bonus_points || 0) + validated.data.amount
    }))

    for (const update of updates) {
        const { error: updateError } = await supabaseAdmin
            .from('enrollments')
            .update({ bonus_points: update.bonus_points })
            .eq('id', update.id)

        if (updateError) {
            console.error(updateError)
            return { success: false, error: "Failed to update bonus points" }
        }
    }

    revalidatePath(`/teacher/class/${validated.data.classroomId}`)
    return { success: true }
}

export async function addBonusPointsToAll(
    classroomId: string,
    amount: number
): Promise<ActionState> {
    const students = await getClassroomStudents(classroomId)
    return addBonusPointsToStudents(classroomId, amount, students.map((student) => student.id))
}

function formatRandomGroupStudentName(student: {
    first_name?: string | null
    last_name?: string | null
    email?: string | null
}): string {
    return [student.first_name, student.last_name].filter(Boolean).join(' ') || student.email || 'Unnamed student'
}

function getEnrollmentStudentProfile(enrollment: EnrollmentWithStudentProfileRow): ClassroomStudentProfileRow | null {
    return Array.isArray(enrollment.profiles) ? enrollment.profiles[0] || null : enrollment.profiles
}

function normalizeRandomGroupQuestions(questions: string[]): RandomGroupAssignedQuestion[] {
    return questions
        .map((question) => question.trim())
        .filter((question) => question.length > 0)
        .map((text, index) => ({
            number: index + 1,
            text,
        }))
}

function assignRandomGroupQuestions(
    groupStudentIds: string[],
    questions: RandomGroupAssignedQuestion[]
): Map<string, RandomGroupAssignedQuestion[]> {
    const questionsByStudentId = new Map<string, RandomGroupAssignedQuestion[]>(
        groupStudentIds.map((studentId) => [studentId, []])
    )

    questions.forEach((question, index) => {
        const studentId = groupStudentIds[index % groupStudentIds.length]
        questionsByStudentId.get(studentId)?.push(question)
    })

    return questionsByStudentId
}

function shuffleRandomGroupStudents<T>(items: T[]): T[] {
    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const current = shuffled[i]
        shuffled[i] = shuffled[j]
        shuffled[j] = current
    }
    return shuffled
}

function buildRandomGroupIdLists(
    shuffledStudentIds: string[],
    groupSize: number,
    leftoverStrategy: RandomGroupLeftoverStrategy
): string[][] {
    const remainder = shuffledStudentIds.length % groupSize

    if (remainder === 0 || leftoverStrategy === 'smaller_group') {
        const groups: string[][] = []
        for (let i = 0; i < shuffledStudentIds.length; i += groupSize) {
            groups.push(shuffledStudentIds.slice(i, i + groupSize))
        }
        return groups
    }

    const fullGroupCount = Math.floor(shuffledStudentIds.length / groupSize)
    const groups = Array.from({ length: fullGroupCount }, (_, index) => {
        const start = index * groupSize
        return shuffledStudentIds.slice(start, start + groupSize)
    })

    let cursor = fullGroupCount * groupSize
    for (let i = 0; i < remainder; i++) {
        groups[i % groups.length].push(shuffledStudentIds[cursor])
        cursor += 1
    }

    return groups
}

export async function assignRandomGroupsToStudents(
    classroomId: string,
    groupSize: number,
    leftoverStrategy: RandomGroupLeftoverStrategy,
    studentIds: string[],
    questionsEnabled: boolean = false,
    questions: string[] = []
): Promise<AssignRandomGroupsState> {
    const validated = AssignRandomGroupsSchema.safeParse({ classroomId, groupSize, leftoverStrategy, studentIds, questionsEnabled, questions })
    if (!validated.success) {
        return { success: false, error: "Invalid random groups request" }
    }

    const selectedStudentIds = [...new Set(validated.data.studentIds)]
    if (selectedStudentIds.length < validated.data.groupSize) {
        return { success: false, error: `Select at least ${validated.data.groupSize} students` }
    }

    const normalizedQuestions = validated.data.questionsEnabled
        ? normalizeRandomGroupQuestions(validated.data.questions)
        : []

    if (validated.data.questionsEnabled && normalizedQuestions.length === 0) {
        return { success: false, error: "Add at least one question or disable questions" }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id, name')
        .eq('id', validated.data.classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const supabaseAdmin = createAdminClient()
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from('enrollments')
        .select('student_id, profiles:student_id(first_name, last_name, email)')
        .eq('classroom_id', validated.data.classroomId)
        .in('student_id', selectedStudentIds)

    if (enrollmentsError) {
        console.error(enrollmentsError)
        return { success: false, error: "Failed to fetch selected students" }
    }

    if (!enrollments || enrollments.length !== selectedStudentIds.length) {
        return { success: false, error: "One or more selected students are not enrolled in this classroom" }
    }

    const studentById = new Map<string, RandomGroupAssignmentMember>()
    for (const enrollment of enrollments as EnrollmentWithStudentProfileRow[]) {
        const profile = getEnrollmentStudentProfile(enrollment)
        studentById.set(enrollment.student_id, {
            id: enrollment.student_id,
            firstName: profile?.first_name || null,
            lastName: profile?.last_name || null,
            email: profile?.email || null,
            name: formatRandomGroupStudentName(profile || {}),
            assignedQuestions: [],
        })
    }

    const shuffledStudentIds = shuffleRandomGroupStudents(selectedStudentIds)
    const groupIdLists = buildRandomGroupIdLists(shuffledStudentIds, validated.data.groupSize, validated.data.leftoverStrategy)
    const groups: RandomGroupAssignmentGroup[] = groupIdLists.map((groupIds, index) => {
        const questionsByStudentId = assignRandomGroupQuestions(groupIds, normalizedQuestions)

        return {
            groupNumber: index + 1,
            members: groupIds
                .map((studentId) => studentById.get(studentId))
                .filter((student): student is RandomGroupAssignmentMember => !!student)
                .map((student) => ({
                    ...student,
                    assignedQuestions: questionsByStudentId.get(student.id) || [],
                })),
        }
    })

    const { data: batch, error: batchError } = await supabaseAdmin
        .from('random_group_batches')
        .insert({
            classroom_id: validated.data.classroomId,
            teacher_id: user.id,
            group_size: validated.data.groupSize,
            leftover_strategy: validated.data.leftoverStrategy,
            selected_count: selectedStudentIds.length,
            questions_enabled: validated.data.questionsEnabled,
            questions: normalizedQuestions,
        })
        .select('id, created_at')
        .single()

    if (batchError || !batch) {
        console.error(batchError)
        return { success: false, error: "Failed to save random groups" }
    }

    const cleanupBatch = async () => {
        const { error } = await supabaseAdmin
            .from('random_group_batches')
            .delete()
            .eq('id', batch.id)
        if (error) console.error("Failed to clean up random group batch:", error)
    }

    const memberRows = groups.flatMap((group) =>
        group.members.map((member) => ({
            batch_id: batch.id,
            student_id: member.id,
            group_number: group.groupNumber,
            assigned_questions: member.assignedQuestions,
        }))
    )

    const { error: membersError } = await supabaseAdmin
        .from('random_group_members')
        .insert(memberRows)

    if (membersError) {
        console.error(membersError)
        await cleanupBatch()
        return { success: false, error: "Failed to save group members" }
    }

    if (validated.data.questionsEnabled) {
        const questionTexts = normalizedQuestions.map((question) => question.text)
        const questionsKey = JSON.stringify(questionTexts)
        const now = new Date().toISOString()

        const { data: existingQuestionSet, error: fetchQuestionSetError } = await supabaseAdmin
            .from('random_group_question_sets')
            .select('id')
            .eq('teacher_id', user.id)
            .eq('questions_key', questionsKey)
            .maybeSingle()

        if (fetchQuestionSetError) {
            console.error(fetchQuestionSetError)
            await cleanupBatch()
            return { success: false, error: "Failed to save question set" }
        }

        const { error: saveQuestionSetError } = existingQuestionSet
            ? await supabaseAdmin
                .from('random_group_question_sets')
                .update({ last_used_at: now })
                .eq('id', existingQuestionSet.id)
            : await supabaseAdmin
                .from('random_group_question_sets')
                .insert({
                    teacher_id: user.id,
                    questions: questionTexts,
                    questions_key: questionsKey,
                    question_count: questionTexts.length,
                    last_used_at: now,
                })

        if (saveQuestionSetError) {
            console.error(saveQuestionSetError)
            await cleanupBatch()
            return { success: false, error: "Failed to save question set" }
        }
    }

    const classroomName = classroom.name || 'classroom'
    const notificationRows = groups.flatMap((group) => {
        return group.members.map((member) => ({
            student_id: member.id,
            classroom_id: validated.data.classroomId,
            batch_id: batch.id,
            title: "Nauja grupės užduotis",
            body: "",
            metadata: {
                batchId: batch.id,
                classroomId: validated.data.classroomId,
                classroomName,
                groupNumber: group.groupNumber,
                members: group.members.map((groupMember) => ({
                    id: groupMember.id,
                    name: groupMember.name,
                })),
                assignedQuestions: member.assignedQuestions,
                questionInstruction: member.assignedQuestions.length > 0 ? RANDOM_GROUP_QUESTION_INSTRUCTION : undefined,
            },
        }))
    })

    const { error: notificationsError } = await supabaseAdmin
        .from('student_popup_notifications')
        .insert(notificationRows)

    if (notificationsError) {
        console.error(notificationsError)
        await cleanupBatch()
        return { success: false, error: "Failed to notify students" }
    }

    revalidatePath(`/teacher/class/${validated.data.classroomId}`)
    revalidatePath('/student')

    return {
        success: true,
        batchId: batch.id,
        createdAt: batch.created_at,
        groups,
    }
}

export async function getClassroomStudents(classroomId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) return []

    const { data, error } = await supabase
        .from('enrollments')
        .select('student_id, profiles:student_id(first_name, last_name, email)')
        .eq('classroom_id', classroomId)

    if (error) {
        console.error('Error fetching classroom students:', error)
        return []
    }

    return ((data || []) as EnrollmentWithStudentProfileRow[]).map((enrollment) => {
        const profile = getEnrollmentStudentProfile(enrollment)
        return {
            id: enrollment.student_id,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            email: profile?.email || null,
        }
    })
}

export async function getRandomGroupQuestionSets(): Promise<{
    success: boolean
    questionSets?: RandomGroupQuestionSet[]
    error?: string
}> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const { data, error } = await supabase
        .from('random_group_question_sets')
        .select('id, questions, question_count, last_used_at')
        .eq('teacher_id', user.id)
        .order('last_used_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error fetching random group question sets:', error)
        return { success: false, error: "Failed to fetch question sets" }
    }

    const questionSets = (data || []).map((row) => {
        const questions = Array.isArray(row.questions)
            ? row.questions.filter((question): question is string => typeof question === 'string')
            : []

        return {
            id: row.id,
            questions,
            questionCount: row.question_count || questions.length,
            lastUsedAt: row.last_used_at,
        }
    })

    return { success: true, questionSets }
}

export async function importStudentsFromClass(targetClassroomId: string, sourceClassroomId: string, setAsActive: boolean = false): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns BOTH classrooms
    const { data: targetClassroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', targetClassroomId)
        .single()

    if (!targetClassroom || targetClassroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage target classroom" }
    }

    const { data: sourceClassroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', sourceClassroomId)
        .single()

    if (!sourceClassroom || sourceClassroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage source classroom" }
    }

    // Fetch all enrollments from the source class
    const { data: sourceEnrollments, error: fetchError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('classroom_id', sourceClassroomId)

    if (fetchError) {
        console.error('Error fetching source enrollments:', fetchError)
        return { success: false, error: "Failed to fetch students from source class" }
    }

    if (!sourceEnrollments || sourceEnrollments.length === 0) {
        return { success: false, error: "No students found in the source class" }
    }

    const studentIds = sourceEnrollments.map(e => e.student_id)

    // Fetch existing enrollments in target to avoid duplicates
    const { data: existingEnrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('classroom_id', targetClassroomId)
        .in('student_id', studentIds)

    const alreadyEnrolledIds = new Set((existingEnrollments || []).map(e => e.student_id))

    // Insert students into target class (skip those already enrolled)
    // Note: Students remain in the source class (copy, not move)
    const newEnrollments = studentIds
        .filter(id => !alreadyEnrolledIds.has(id))
        .map(studentId => ({
            student_id: studentId,
            classroom_id: targetClassroomId,
        }))

    const supabaseAdmin = createAdminClient()

    if (newEnrollments.length > 0) {
        const { error: insertError } = await supabaseAdmin
            .from('enrollments')
            .insert(newEnrollments)

        if (insertError) {
            console.error('Error inserting target enrollments:', insertError)
            return { success: false, error: "Failed to add students to this class" }
        }
    }

    // If setAsActive, update active classroom for ALL source students now in target
    // (includes both newly inserted and previously existing duplicates)
    if (setAsActive) {
        for (const studentId of studentIds) {
            const { data, error } = await supabase.rpc('set_active_classroom', {
                p_student_id: studentId,
                p_classroom_id: targetClassroomId
            })

            const result = data && data[0]

            if (error || !result?.success) {
                console.error('Error setting active classroom during import:', error || result?.message)
                return {
                    success: false,
                    error: result?.message || error?.message || "Failed to set active classroom"
                }
            }
        }
    }

    const importedCount = newEnrollments.length
    const skippedCount = alreadyEnrolledIds.size

    revalidatePath(`/teacher/class/${targetClassroomId}`)
    revalidatePath(`/teacher/class/${sourceClassroomId}`)
    revalidatePath('/student')
    return {
        success: true,
        message: `Imported ${importedCount} student(s)${skippedCount > 0 ? ` (${skippedCount} already enrolled, skipped)` : ''}${setAsActive ? ' — set as active classroom' : ''}`
    }
}

export async function toggleCheaterMark(
    classroomId: string,
    studentId: string
): Promise<{ success: boolean; isCheater?: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // Fetch current cheater state
    const supabaseAdmin = createAdminClient()
    const { data: enrollment, error: fetchError } = await supabaseAdmin
        .from('enrollments')
        .select('is_cheater')
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId)
        .maybeSingle()

    if (fetchError || !enrollment) {
        return { success: false, error: "Student not enrolled in this classroom" }
    }

    const newValue = !enrollment.is_cheater

    const { error: updateError } = await supabaseAdmin
        .from('enrollments')
        .update({ is_cheater: newValue })
        .eq('classroom_id', classroomId)
        .eq('student_id', studentId)

    if (updateError) {
        console.error('Failed to toggle cheater mark:', updateError)
        return { success: false, error: "Failed to update cheater status" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true, isCheater: newValue }
}
