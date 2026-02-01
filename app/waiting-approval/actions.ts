'use server'

import { createClient } from "@/lib/supabase/server"

export async function checkApprovalStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { approved: false, error: 'Not authenticated' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('approved, role')
        .eq('id', user.id)
        .single()

    const isApproved = !!profile?.approved

    return {
        approved: isApproved,
        role: profile?.role || 'student'
    }
}
