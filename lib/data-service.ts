import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Cached User Fetcher
// Deduplicates requests for the user object within a single render pass
export const getCachedUser = cache(async () => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return user
})

// Cached Profile Fetcher
// Deduplicates requests for the profile object
export const getCachedProfile = cache(async (userId: string) => {
    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    return profile
})
