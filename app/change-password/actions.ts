'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function changeInitialPassword(formData: FormData) {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        return { success: false, error: 'Both fields are required' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' }
    }

    if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Not authenticated' }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: password
    })

    if (updateError) {
        return { success: false, error: updateError.message }
    }

    // Update profile flag
    // We need admin client to bypass any potential RLS issues or just to be safe, 
    // although user should be able to update their own profile usually. 
    // But let's check the schema. "Users can update own profile".
    // So we can use the regular client if we want, but using admin client is safer for system flags like this.
    const supabaseAdmin = createAdminClient()
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', user.id)

    if (profileError) {
        console.error('Error updating profile:', profileError)
        return { success: false, error: 'Failed to update profile status' }
    }

    // Revalidate everything
    revalidatePath('/', 'layout')

    return { success: true, error: null }
}
