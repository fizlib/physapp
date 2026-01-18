'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSiteSetting(key: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .single()

    if (error) {
        console.error(`Error fetching setting ${key}:`, error)
        return null
    }

    return data?.value
}

export async function updateSiteSetting(key: string, value: string) {
    const supabase = await createClient()

    // Check if user is admin is handled by RLS, but double check here if needed?
    // RLS "Admins can manage site settings" should cover it.

    const { error } = await supabase
        .from('site_settings')
        .upsert({ key, value })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/admin/settings')
    return { success: true }
}
