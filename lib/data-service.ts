import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Cached User Fetcher
// Deduplicates requests for the user object within a single render pass
export const getCachedUser = cache(async () => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return user
})

// Cached Student Classroom Fetcher
// Returns the first classroom ID the student is enrolled in
export const getCachedStudentClassroom = cache(async (userId: string) => {
    const supabase = await createClient()
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('classroom_id')
        .eq('student_id', userId)
        .single()
    return enrollment?.classroom_id
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
