'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getSiteSetting(key: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle() // Use maybeSingle to return null if key doesn't exist

    if (error) {
        console.error(`Error fetching setting ${key}:`, error)
        return null
    }

    return data?.value ?? null
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
    if (key === 'test_mode_polling_enabled') {
        revalidatePath('/student/class/[id]/collection/[collectionId]', 'page')
    }
    return { success: true }
}

export async function addGeminiKey(key: string, label: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('add_gemini_key', {
        key_text: key,
        label_text: label
    })
    if (error) return { error: error.message }
    revalidatePath('/admin/settings')
    return { success: true, id: data }
}

export async function deleteGeminiKey(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.rpc('delete_gemini_key', {
        key_id: id
    })
    if (error) return { error: error.message }
    revalidatePath('/admin/settings')
    return { success: true }
}

export async function getGeminiKeys() {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_gemini_keys')
    if (error) {
        console.error('Error fetching Gemini keys:', error)
        return []
    }
    return data || []
}
