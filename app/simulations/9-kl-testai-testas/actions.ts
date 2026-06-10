"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
    addQuestionSeconds,
    buildProgressEarnedParts,
    buildScoredAnswerMapFromSubmittedAnswers,
    buildProgressSubmittedAnswers,
    buildScoredQuestionOrder,
    calculateScaledScore,
    getCorrectAnswerCount,
    getScoredTestEndAt,
    isScoredSimulationUrl,
    SCORED_TEST_MAX_POINTS,
    SCORED_TEST_QUESTION_SECONDS,
    SCORED_TEST_SIMULATION_ID,
    toScoredAnswerMap,
    toScoredQuestionOrder,
    type ScoredAnswerMap,
    type ScoredQuestionOrderItem,
} from "@/lib/ninth-grade-scored-test"

const AssignmentIdSchema = z.string().uuid()
const StartClassTestSchema = z.object({
    assignmentId: z.string().uuid(),
    studentIds: z.array(z.string().uuid()).min(1),
})
const CompleteAttemptSchema = z.object({
    assignmentId: z.string().uuid(),
    answers: z.record(z.string(), z.string()),
})

type Relation<T> = T | T[] | null | undefined

interface AssignmentContext {
    id: string
    title: string | null
    classroom_id: string
    collection_id: string | null
    published: boolean | null
    points_enabled: boolean | null
    points: number | string | null
    simulation_url: string | null
    collections?: Relation<{
        id: string
        title: string | null
        category: string | null
        test_mode_ends_at: string | null
        classroom_id: string
    }>
    classrooms?: Relation<{
        id: string
        teacher_id: string
    }>
}

interface AttemptRow {
    id: string
    assignment_id: string
    student_id: string
    simulation_id: string
    question_order: unknown
    answers: unknown
    current_index: number | null
    current_question_started_at: string | null
    current_question_deadline_at: string | null
    completed_at: string | null
    earned_points: number | null
}

interface ScoredTeacherStudent {
    id: string
    firstName: string | null
    lastName: string | null
    hasStarted: boolean
    hasCompleted: boolean
    earnedPoints: number
    maxPoints: number
}

type EnrollmentStudentProfile = {
    id?: string | null
    first_name?: string | null
    last_name?: string | null
}

type EnrollmentStudentRow = {
    student_id: string
    profiles?: Relation<EnrollmentStudentProfile>
}

export type ScoredSimulationState =
    | {
        status: 'teacher'
        assignmentId: string
        assignmentTitle: string
        classroomId: string
        collectionId: string
        collectionTitle: string
        totalStudents: number
        startedStudents: number
        completedStudents: number
        startedAt: string | null
        students: ScoredTeacherStudent[]
    }
    | {
        status: 'locked' | 'error'
        message: string
    }
    | {
        status: 'ready'
        assignmentTitle: string
        totalQuestions: number
        maxPoints: number
    }
    | {
        status: 'playing'
        assignmentTitle: string
        totalQuestions: number
        questionOrder: ScoredQuestionOrderItem[]
        startedAt: string
        serverNow: string
        questionSeconds: number
        maxPoints: number
    }
    | {
        status: 'completed'
        assignmentTitle: string
        totalQuestions: number
        correctCount: number
        earnedPoints: number
        maxPoints: number
    }

function firstRelation<T>(relation: Relation<T>): T | null {
    if (Array.isArray(relation)) return relation[0] ?? null
    return relation ?? null
}

function getAssignmentTitle(assignment: AssignmentContext) {
    return assignment.title?.trim() || "9 kl. Testai (testas)"
}

function getActiveCollection(assignment: AssignmentContext) {
    return firstRelation(assignment.collections)
}

function getClassroom(assignment: AssignmentContext) {
    return firstRelation(assignment.classrooms)
}

async function getSignedInUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return { supabase, user }
}

async function getProfileRole(userId: string) {
    const supabaseAdmin = createAdminClient()
    const { data } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

    return typeof data?.role === 'string' ? data.role : null
}

async function getAssignmentContext(assignmentId: string): Promise<AssignmentContext | null> {
    const supabaseAdmin = createAdminClient()
    const { data } = await supabaseAdmin
        .from('assignments')
        .select(`
            id,
            title,
            classroom_id,
            collection_id,
            published,
            points_enabled,
            points,
            simulation_url,
            collections (
                id,
                title,
                category,
                test_mode_ends_at,
                classroom_id
            ),
            classrooms (
                id,
                teacher_id
            )
        `)
        .eq('id', assignmentId)
        .maybeSingle()

    return (data as AssignmentContext | null) ?? null
}

function validateScoredAssignmentShape(assignment: AssignmentContext) {
    const collection = getActiveCollection(assignment)

    if (!isScoredSimulationUrl(assignment.simulation_url)) {
        return "Ši nuoroda nepriklauso vertinamam 9 kl. testui."
    }

    if (!assignment.points_enabled || Number(assignment.points) !== SCORED_TEST_MAX_POINTS) {
        return "Šis testas turi būti sukurtas kaip 10 taškų vertinama simuliacija."
    }

    if (!assignment.collection_id || !collection || collection.category !== 'classwork') {
        return "Šis testas pasiekiamas tik iš darbo klasėje rinkinio."
    }

    return null
}

async function getEnrolledStudents(classroomId: string) {
    const supabaseAdmin = createAdminClient()
    const { data } = await supabaseAdmin
        .from('enrollments')
        .select('student_id, profiles:student_id(id, first_name, last_name)')
        .eq('classroom_id', classroomId)

    const seen = new Set<string>()

    return ((data || []) as EnrollmentStudentRow[]).reduce<Array<{
        id: string
        firstName: string | null
        lastName: string | null
    }>>((students, enrollment) => {
        if (!enrollment.student_id || seen.has(enrollment.student_id)) return students

        seen.add(enrollment.student_id)
        const profile = firstRelation(enrollment.profiles)
        students.push({
            id: enrollment.student_id,
            firstName: profile?.first_name ?? null,
            lastName: profile?.last_name ?? null,
        })
        return students
    }, [])
}

async function getEnrolledStudentIds(classroomId: string) {
    const students = await getEnrolledStudents(classroomId)
    return students.map((student) => student.id)
}

async function getTeacherStartSummary(assignmentId: string, classroomId: string) {
    const supabaseAdmin = createAdminClient()
    const students = await getEnrolledStudents(classroomId)
    const studentIds = students.map((student) => student.id)

    if (studentIds.length === 0) {
        return {
            totalStudents: 0,
            startedStudents: 0,
            completedStudents: 0,
            startedAt: null,
            students: [],
        }
    }

    const [{ data: attempts }, { data: progressRows }] = await Promise.all([
        supabaseAdmin
            .from('simulation_test_attempts')
            .select('student_id, current_question_started_at, completed_at, earned_points')
            .eq('assignment_id', assignmentId)
            .in('student_id', studentIds),
        supabaseAdmin
            .from('assignment_progress')
            .select('student_id, is_completed, earned_points, points_disabled_by_teacher')
            .eq('assignment_id', assignmentId)
            .in('student_id', studentIds),
    ])

    const attemptsByStudent = new Map((attempts || []).map((attempt) => [attempt.student_id, attempt]))
    const progressByStudent = new Map((progressRows || []).map((progress) => [progress.student_id, progress]))

    const startedAtValues = (attempts || [])
        .map((attempt) => attempt.current_question_started_at)
        .filter((startedAt): startedAt is string => typeof startedAt === 'string')
        .sort()

    return {
        totalStudents: studentIds.length,
        startedStudents: attempts?.length || 0,
        completedStudents: attempts?.filter((attempt) => !!attempt.completed_at).length || 0,
        startedAt: startedAtValues[0] ?? null,
        students: students.map((student) => {
            const attempt = attemptsByStudent.get(student.id)
            const progress = progressByStudent.get(student.id)
            const pointsDisabled = !!progress?.points_disabled_by_teacher
            const earnedPoints = pointsDisabled
                ? 0
                : Number(progress?.earned_points ?? attempt?.earned_points ?? 0)

            return {
                id: student.id,
                firstName: student.firstName,
                lastName: student.lastName,
                hasStarted: !!attempt,
                hasCompleted: !!attempt?.completed_at || !!progress?.is_completed,
                earnedPoints: Number.isFinite(earnedPoints) ? earnedPoints : 0,
                maxPoints: SCORED_TEST_MAX_POINTS,
            }
        }),
    }
}

async function validateStudentAccess(assignmentId: string) {
    const { user } = await getSignedInUser()
    if (!user) return { ok: false as const, state: { status: 'error', message: 'Prisijunkite, kad galėtumėte laikyti testą.' } satisfies ScoredSimulationState }

    const [role, assignment] = await Promise.all([
        getProfileRole(user.id),
        getAssignmentContext(assignmentId),
    ])

    if (role !== 'student') {
        return { ok: false as const, state: { status: 'error', message: 'Šis langas skirtas mokinio testui.' } satisfies ScoredSimulationState }
    }

    if (!assignment) {
        return { ok: false as const, state: { status: 'error', message: 'Testo užduotis nerasta.' } satisfies ScoredSimulationState }
    }

    const shapeError = validateScoredAssignmentShape(assignment)
    if (shapeError) {
        return { ok: false as const, state: { status: 'error', message: shapeError } satisfies ScoredSimulationState }
    }

    if (!assignment.published) {
        return { ok: false as const, state: { status: 'locked', message: 'Testas dar nepaskelbtas.' } satisfies ScoredSimulationState }
    }

    const supabaseAdmin = createAdminClient()
    const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('classroom_id', assignment.classroom_id)
        .eq('student_id', user.id)
        .maybeSingle()

    if (!enrollment) {
        return { ok: false as const, state: { status: 'error', message: 'Neturite prieigos prie šios klasės.' } satisfies ScoredSimulationState }
    }

    return { ok: true as const, userId: user.id, assignment }
}

async function getAttempt(assignmentId: string, studentId: string) {
    const supabaseAdmin = createAdminClient()
    const { data } = await supabaseAdmin
        .from('simulation_test_attempts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .maybeSingle()

    return (data as AttemptRow | null) ?? null
}

async function mirrorProgress(
    assignment: AssignmentContext,
    studentId: string,
    order: ScoredQuestionOrderItem[],
    answers: ScoredAnswerMap,
    currentIndex: number,
    isCompleted: boolean
) {
    const supabaseAdmin = createAdminClient()
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
    const activeIndex = Math.min(Math.max(currentIndex, 0), Math.max(order.length - 1, 0))

    await supabaseAdmin
        .from('assignment_progress')
        .upsert({
            student_id: studentId,
            assignment_id: assignment.id,
            completed_question_indices: completedIndices,
            is_completed: isCompleted,
            active_question_index: activeIndex,
            revealed_question_indices: [],
            submitted_answers: buildProgressSubmittedAnswers(answers),
            earned_points_per_part: buildProgressEarnedParts(answers),
            earned_points: earnedPoints,
            points_disabled_by_teacher: !!existingProgress?.points_disabled_by_teacher,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'student_id, assignment_id',
        })

    if (assignment.collection_id) {
        revalidatePath(`/student/class/${assignment.classroom_id}/collection/${assignment.collection_id}`)
    }
}

async function updateAttempt(
    attemptId: string,
    fields: Partial<AttemptRow> & {
        question_order?: ScoredQuestionOrderItem[]
        answers?: ScoredAnswerMap
        updated_at?: string
    }
) {
    const supabaseAdmin = createAdminClient()
    const { data } = await supabaseAdmin
        .from('simulation_test_attempts')
        .update({
            ...fields,
            updated_at: fields.updated_at ?? new Date().toISOString(),
        })
        .eq('id', attemptId)
        .select('*')
        .single()

    return data as AttemptRow
}

function serializeAttemptState(assignment: AssignmentContext, attempt: AttemptRow, now = new Date()): ScoredSimulationState {
    const order = toScoredQuestionOrder(attempt.question_order)
    const answers = toScoredAnswerMap(attempt.answers)
    const assignmentTitle = getAssignmentTitle(assignment)

    if (attempt.completed_at) {
        return {
            status: 'completed',
            assignmentTitle,
            totalQuestions: order.length,
            correctCount: getCorrectAnswerCount(answers),
            earnedPoints: calculateScaledScore(answers, order.length),
            maxPoints: SCORED_TEST_MAX_POINTS,
        }
    }

    if (order.length === 0 || !attempt.current_question_started_at) {
        return {
            status: 'error',
            message: 'Nepavyko įkelti testo klausimų.',
        }
    }

    return {
        status: 'playing',
        assignmentTitle,
        totalQuestions: order.length,
        questionOrder: order,
        startedAt: attempt.current_question_started_at,
        serverNow: now.toISOString(),
        questionSeconds: SCORED_TEST_QUESTION_SECONDS,
        maxPoints: SCORED_TEST_MAX_POINTS,
    }
}

export async function getScoredSimulationContext(assignmentIdInput: string): Promise<ScoredSimulationState> {
    const parsed = AssignmentIdSchema.safeParse(assignmentIdInput)
    if (!parsed.success) {
        return { status: 'error', message: 'Neteisinga testo nuoroda.' }
    }

    const assignmentId = parsed.data
    const { user } = await getSignedInUser()
    if (!user) {
        return { status: 'error', message: 'Prisijunkite, kad galėtumėte atidaryti testą.' }
    }

    const [role, assignment] = await Promise.all([
        getProfileRole(user.id),
        getAssignmentContext(assignmentId),
    ])

    if (!assignment) {
        return { status: 'error', message: 'Testo užduotis nerasta.' }
    }

    const shapeError = validateScoredAssignmentShape(assignment)
    if (shapeError) {
        return { status: 'error', message: shapeError }
    }

    const collection = getActiveCollection(assignment)
    const classroom = getClassroom(assignment)

    if (role === 'teacher' && classroom?.teacher_id === user.id && collection) {
        const summary = await getTeacherStartSummary(assignment.id, assignment.classroom_id)
        return {
            status: 'teacher',
            assignmentId: assignment.id,
            assignmentTitle: getAssignmentTitle(assignment),
            classroomId: assignment.classroom_id,
            collectionId: collection.id,
            collectionTitle: collection.title?.trim() || 'Rinkinys',
            ...summary,
        }
    }

    const access = await validateStudentAccess(assignmentId)
    if (!access.ok) return access.state

    const attempt = await getAttempt(assignmentId, access.userId)
    if (!attempt) {
        return {
            status: 'locked',
            message: 'Palaukite, kol mokytojas pradės testą.',
        }
    }

    return serializeAttemptState(access.assignment, attempt)
}

export async function startScoredSimulationForClass(input: { assignmentId: string, studentIds: string[] }): Promise<ScoredSimulationState> {
    const parsed = StartClassTestSchema.safeParse(input)
    if (!parsed.success) {
        return { status: 'error', message: 'Pasirinkite bent vieną mokinį.' }
    }

    const { user } = await getSignedInUser()
    if (!user) {
        return { status: 'error', message: 'Prisijunkite, kad galėtumėte pradėti testą.' }
    }

    const [role, assignment] = await Promise.all([
        getProfileRole(user.id),
        getAssignmentContext(parsed.data.assignmentId),
    ])

    if (role !== 'teacher' || !assignment) {
        return { status: 'error', message: 'Testą gali pradėti tik mokytojas.' }
    }

    const classroom = getClassroom(assignment)
    const collection = getActiveCollection(assignment)

    if (!classroom || classroom.teacher_id !== user.id || !collection) {
        return { status: 'error', message: 'Neturite teisės pradėti šio testo.' }
    }

    const shapeError = validateScoredAssignmentShape(assignment)
    if (shapeError) {
        return { status: 'error', message: shapeError }
    }

    const supabaseAdmin = createAdminClient()
    const enrolledStudentIds = await getEnrolledStudentIds(assignment.classroom_id)
    const enrolledStudentIdSet = new Set(enrolledStudentIds)
    const selectedStudentIds = Array.from(new Set(parsed.data.studentIds))
        .filter((studentId) => enrolledStudentIdSet.has(studentId))

    if (selectedStudentIds.length === 0) {
        return { status: 'error', message: 'Pasirinkite bent vieną mokinį iš šios klasės.' }
    }

    const startedAt = new Date()
    const startedAtIso = startedAt.toISOString()

    const rows = selectedStudentIds.map((studentId) => {
        const order = buildScoredQuestionOrder()
        return {
            assignment_id: parsed.data.assignmentId,
            student_id: studentId,
            simulation_id: SCORED_TEST_SIMULATION_ID,
            question_order: order,
            answers: {},
            current_index: 0,
            current_question_started_at: startedAtIso,
            current_question_deadline_at: addQuestionSeconds(startedAt).toISOString(),
            earned_points: 0,
        }
    })

    const { data: restartResults, error } = await supabaseAdmin
        .rpc('restart_scored_simulation_attempts', {
            p_assignment_id: parsed.data.assignmentId,
            p_student_ids: selectedStudentIds,
            p_attempt_rows: rows,
        })

    if (error) {
        console.error('Scored simulation class start error:', {
            assignmentId: parsed.data.assignmentId,
            selectedStudentCount: selectedStudentIds.length,
            error,
        })
        return { status: 'error', message: 'Nepavyko pradėti testo.' }
    }

    const restartResult = Array.isArray(restartResults) ? restartResults[0] : null
    const insertedAttempts = Number(restartResult?.inserted_attempts ?? 0)

    if (insertedAttempts !== selectedStudentIds.length) {
        console.error('Scored simulation class start count mismatch:', {
            assignmentId: parsed.data.assignmentId,
            selectedStudentCount: selectedStudentIds.length,
            restartResult,
        })
        return { status: 'error', message: 'Nepavyko pradėti testo.' }
    }

    console.info('Scored simulation class started:', {
        assignmentId: parsed.data.assignmentId,
        selectedStudentCount: selectedStudentIds.length,
        deletedAttempts: Number(restartResult?.deleted_attempts ?? 0),
        deletedProgress: Number(restartResult?.deleted_progress ?? 0),
        insertedAttempts,
    })

    revalidatePath(`/teacher/class/${assignment.classroom_id}/collection/${collection.id}`)
    revalidatePath(`/student/class/${assignment.classroom_id}/collection/${collection.id}`)

    const summary = await getTeacherStartSummary(assignment.id, assignment.classroom_id)
    return {
        status: 'teacher',
        assignmentId: assignment.id,
        assignmentTitle: getAssignmentTitle(assignment),
        classroomId: assignment.classroom_id,
        collectionId: collection.id,
        collectionTitle: collection.title?.trim() || 'Rinkinys',
        ...summary,
    }
}

export async function completeScoredSimulationAttempt(input: { assignmentId: string, answers: Record<string, string> }): Promise<ScoredSimulationState> {
    const parsed = CompleteAttemptSchema.safeParse(input)
    if (!parsed.success) {
        return { status: 'error', message: 'Neteisingas testo užbaigimas.' }
    }

    const access = await validateStudentAccess(parsed.data.assignmentId)
    if (!access.ok) return access.state

    const attempt = await getAttempt(parsed.data.assignmentId, access.userId)
    if (!attempt) {
        return { status: 'error', message: 'Testas dar nepradėtas.' }
    }

    if (attempt.completed_at) {
        return serializeAttemptState(access.assignment, attempt)
    }

    const order = toScoredQuestionOrder(attempt.question_order)
    if (order.length === 0) {
        return { status: 'error', message: 'Nepavyko įkelti testo klausimų.' }
    }

    if (!attempt.current_question_started_at) {
        return { status: 'error', message: 'Nepavyko nustatyti testo pradžios.' }
    }

    const now = new Date()
    if (now.getTime() < getScoredTestEndAt(attempt.current_question_started_at, order.length).getTime()) {
        return serializeAttemptState(access.assignment, attempt, now)
    }

    const completedAt = new Date().toISOString()
    const answers = buildScoredAnswerMapFromSubmittedAnswers(order, parsed.data.answers, completedAt)
    const earnedPoints = calculateScaledScore(answers, order.length)

    const updatedAttempt = await updateAttempt(attempt.id, {
        answers,
        current_index: order.length,
        current_question_started_at: null,
        current_question_deadline_at: null,
        completed_at: completedAt,
        earned_points: earnedPoints,
    })

    await mirrorProgress(access.assignment, access.userId, order, answers, order.length, true)

    return serializeAttemptState(access.assignment, updatedAttempt)
}
