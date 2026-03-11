import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Lightweight endpoint for fast test-mode detection polling.
// Only checks test_mode_ends_at + participant status — no IP/tab logic.
// Designed to respond quickly even on Vercel cold starts.
export async function GET(request: NextRequest) {
    const collectionId = request.nextUrl.searchParams.get('collectionId')
    if (!collectionId) {
        return NextResponse.json({ error: 'Missing collectionId' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Single query: just get the test end time
    const { data: collection } = await supabase
        .from('collections')
        .select('test_mode_ends_at')
        .eq('id', collectionId)
        .single()

    const testModeEndsAt = collection?.test_mode_ends_at || null

    // Only check participation if there's an active test
    let isParticipant = true
    if (testModeEndsAt) {
        const endTime = new Date(testModeEndsAt).getTime()
        if (endTime > Date.now()) {
            // Run both queries in parallel
            const [participationResult, countResult] = await Promise.all([
                supabase
                    .from('collection_test_participants')
                    .select('student_id')
                    .eq('collection_id', collectionId)
                    .eq('student_id', user.id)
                    .maybeSingle(),
                createAdminClient()
                    .from('collection_test_participants')
                    .select('student_id', { count: 'exact', head: true })
                    .eq('collection_id', collectionId)
            ])

            if (countResult.count && countResult.count > 0) {
                isParticipant = !!participationResult.data
            }
        }
    }

    return NextResponse.json({
        testModeEndsAt,
        isParticipant,
    })
}
