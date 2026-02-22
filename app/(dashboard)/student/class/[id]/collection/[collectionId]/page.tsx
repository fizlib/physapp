import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CollectionPlayer } from "./CollectionPlayer"
import { getClientIp } from "@/lib/ip"
import { getSiteSettings } from "@/app/(dashboard)/admin/settings/actions"
import { ShieldAlert, ArrowLeft, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface CollectionData {
    id: string
    classroom_id: string
    title: string
    category: string | null
    slides_url: string | null
    scheduled_end_at: string | null
    test_mode_ends_at: string | null
}

interface AssignmentMetaRow {
    id: string
    title: string
    published: boolean
    order_index: number | null
    points_enabled: boolean | null
}

interface AssignmentQuestionRow {
    id: string
    created_at: string
    latex_text: string
    question_type: string
    correct_value: number | null
    tolerance_percent: number | null
    options: string[] | null
    correct_answer: string | null
    points: number | null
    solution_text: string | null
    diagram_type: string | null
    diagram_latex: string | null
    diagram_svg: string | null
    diagram_image_url: string | null
}

interface PublishedAssignmentRow extends AssignmentMetaRow {
    points: number | null
    required_variations_count: number | null
    show_all_questions: boolean | null
    questions: AssignmentQuestionRow[] | null
}

export default async function StudentCollectionPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const { id, collectionId } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    const studentIp = await getClientIp()
    const nowIso = new Date().toISOString()

    // Fetch collection plus assignment data in two shapes:
    // - metadata for all assignments (including unpublished)
    // - full assignment+question payload for published assignments only
    const [collectionResult, allAssignmentsResult, publishedAssignmentsResult] = await Promise.all([
        supabase
            .from('collections')
            .select(`
                id,
                classroom_id,
                title,
                category,
                slides_url,
                scheduled_end_at,
                test_mode_ends_at
            `)
            .eq('id', collectionId)
            .eq('classroom_id', id)
            .single(),
        supabase
            .from('assignments')
            .select('id, title, published, order_index, points_enabled')
            .eq('collection_id', collectionId)
            .order('order_index', { ascending: true }),
        supabase
            .from('assignments')
            .select('*, questions(*)')
            .eq('collection_id', collectionId)
            .eq('published', true)
            .order('order_index', { ascending: true }),
    ])

    const collection = collectionResult.data as CollectionData | null

    if (!collection) notFound()

    let allAssignmentsRows = (allAssignmentsResult.data || []) as AssignmentMetaRow[]
    let publishedAssignments = (publishedAssignmentsResult.data || []) as PublishedAssignmentRow[]
    let assignmentLoadError: string | null = null

    if (allAssignmentsResult.error) {
        console.error('Collection assignment metadata query failed', {
            classroomId: id,
            collectionId,
            error: allAssignmentsResult.error.message,
        })
    }

    if (publishedAssignmentsResult.error) {
        console.error('Collection published assignments query failed', {
            classroomId: id,
            collectionId,
            error: publishedAssignmentsResult.error.message,
        })
    }

    const publishedMetaCount = allAssignmentsRows.filter((assignment) => !!assignment.published).length
    const shouldRunFallback =
        !!allAssignmentsResult.error ||
        !!publishedAssignmentsResult.error ||
        (publishedMetaCount > 0 && publishedAssignments.length === 0)

    if (shouldRunFallback) {
        if (!allAssignmentsResult.error && !publishedAssignmentsResult.error && publishedMetaCount > 0 && publishedAssignments.length === 0) {
            console.warn('Collection assignment query mismatch detected', {
                classroomId: id,
                collectionId,
                publishedMetaCount,
                publishedAssignmentsPayloadCount: publishedAssignments.length,
            })
        }

        const fallbackResult = await supabase
            .from('collections')
            .select(`
                id,
                assignments (
                    *,
                    questions (*)
                )
            `)
            .eq('id', collectionId)
            .eq('classroom_id', id)
            .single()

        if (fallbackResult.error || !fallbackResult.data) {
            console.error('Collection assignments fallback query failed', {
                classroomId: id,
                collectionId,
                error: fallbackResult.error?.message || 'No fallback data',
            })

            const shouldShowLoadError =
                !!publishedAssignmentsResult.error ||
                (!!allAssignmentsResult.error && publishedAssignments.length === 0)

            if (shouldShowLoadError) {
                assignmentLoadError = 'Nepavyko įkelti rinkinio užduočių.'
            }
        } else {
            const fallbackAssignments = ((fallbackResult.data as { assignments?: PublishedAssignmentRow[] }).assignments || [])
            const fallbackPublishedAssignments = fallbackAssignments.filter((assignment) => !!assignment.published)

            if (allAssignmentsResult.error || allAssignmentsRows.length === 0) {
                allAssignmentsRows = fallbackAssignments.map((assignment) => ({
                    id: assignment.id,
                    title: assignment.title,
                    published: !!assignment.published,
                    order_index: assignment.order_index,
                    points_enabled: assignment.points_enabled,
                }))
            }

            if (publishedAssignmentsResult.error || publishedAssignments.length === 0) {
                publishedAssignments = fallbackPublishedAssignments
            }

            console.warn('Collection loader recovered with fallback assignments query', {
                classroomId: id,
                collectionId,
                totalAssignments: fallbackAssignments.length,
                publishedAssignments: fallbackPublishedAssignments.length,
            })
        }
    }

    // Published assignments are the only ones rendered in player state.
    publishedAssignments = publishedAssignments
        .map((assignment) => ({
            ...assignment,
            questions: assignment.questions
                ? [...assignment.questions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                : assignment.questions,
        }))
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

    if (allAssignmentsRows.length === 0 && publishedAssignments.length > 0) {
        allAssignmentsRows = publishedAssignments.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            published: !!assignment.published,
            order_index: assignment.order_index,
            points_enabled: assignment.points_enabled,
        }))
    }

    const allAssignmentsMeta = allAssignmentsRows
        .map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            order_index: assignment.order_index,
            published: !!assignment.published,
            points_enabled: !!assignment.points_enabled,
        }))
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

    if (!assignmentLoadError && allAssignmentsRows.length > 0 && publishedAssignments.length === 0) {
        console.info('Collection has assignments but none are currently published', {
            classroomId: id,
            collectionId,
            totalAssignments: allAssignmentsRows.length,
        })
    }

    const assignmentIds = publishedAssignments.map((assignment) => assignment.id)
    const progressPromise = assignmentIds.length > 0
        ? supabase
            .from('assignment_progress')
            .select('assignment_id, completed_question_indices, revealed_question_indices, is_completed, active_question_index, submitted_answers, earned_points_per_part')
            .eq('student_id', user.id)
            .in('assignment_id', assignmentIds)
        : Promise.resolve({
            data: null as {
                assignment_id: string
                completed_question_indices: number[] | null
                revealed_question_indices: number[] | null
                is_completed: boolean
                active_question_index: number | null
                submitted_answers: Record<string, string> | null
                earned_points_per_part: Record<string, number> | null
            }[] | null
        })

    const [classroomResult, bypassResult, progressResult, settings, participationResult] = await Promise.all([
        supabase
            .from('classrooms')
            .select('allowed_ip, ip_check_enabled')
            .eq('id', id)
            .single(),
        createAdminClient()
            .from('ip_bypasses')
            .select('id')
            .eq('user_id', user.id)
            .eq('collection_id', collectionId)
            .gt('expires_at', nowIso)
            .maybeSingle(),
        progressPromise,
        getSiteSettings(['test_mode_polling_enabled', 'virtual_keyboard_toggle_enabled']),
        // Check if student is a test participant
        supabase
            .from('collection_test_participants')
            .select('student_id')
            .eq('collection_id', collectionId)
            .eq('student_id', user.id)
            .maybeSingle(),
    ])

    const { data: classroom } = classroomResult
    const { data: bypass } = bypassResult
    const progressData = progressResult.data || []

    // Determine if student is a test participant
    // If no participant rows exist at all for this collection, treat everyone as participant (backward compat)
    // IMPORTANT: Use admin client for counting because RLS only exposes own rows to students
    let initialIsTestParticipant = true
    if (collection.test_mode_ends_at && new Date(collection.test_mode_ends_at) > new Date()) {
        const { count } = await createAdminClient()
            .from('collection_test_participants')
            .select('student_id', { count: 'exact', head: true })
            .eq('collection_id', collectionId)

        if (count && count > 0) {
            initialIsTestParticipant = !!participationResult.data
        }
    }

    const collectionForPlayer = {
        ...collection,
        assignments: publishedAssignments,
    }

    const isRestricted = collection.category === 'classwork' &&
        classroom?.ip_check_enabled &&
        classroom?.allowed_ip &&
        studentIp !== classroom.allowed_ip &&
        !bypass

    const isTimeUp = collection.category === 'classwork' &&
        collection.scheduled_end_at &&
        new Date() > new Date(collection.scheduled_end_at)

    if (isRestricted) {

        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldAlert className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
                        <p className="text-muted-foreground">
                            This classwork collection is restricted to the classroom network only.
                            You are currently connected from <span className="font-mono text-red-500">{studentIp}</span>.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/student/class/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Classroom
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (isTimeUp) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                        <Lock className="h-10 w-10 text-amber-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Pamokos laikas baigėsi</h1>
                        <p className="text-muted-foreground">
                            Pamokos laikas baigėsi.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/student/class/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Grįžti į klasę
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (assignmentLoadError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Nepavyko įkelti rinkinio</h1>
                        <p className="text-muted-foreground">
                            {assignmentLoadError} Bandykite dar kartą.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/student/class/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Grįžti į klasę
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }


    const testModePollingEnabled = (settings.test_mode_polling_enabled ?? 'true').toLowerCase() === 'true'
    const virtualKeyboardToggleEnabled = (settings.virtual_keyboard_toggle_enabled ?? 'true').toLowerCase() === 'true'

    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CollectionPlayer
                collection={collectionForPlayer}
                classroomId={id}
                progressData={progressData}
                allAssignmentsMeta={allAssignmentsMeta}
                testModePollingEnabled={testModePollingEnabled}
                showVirtualKeyboardToggle={virtualKeyboardToggleEnabled}
                initialIsTestParticipant={initialIsTestParticipant}
            />
        </Suspense>
    )
}
