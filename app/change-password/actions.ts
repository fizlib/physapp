'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function changeInitialPassword(formData: FormData) {
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
        return { success: false, error: 'Abu laukai yra privalomi' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Slaptažodžiai nesutampa' }
    }

    if (password.length < 6) {
        return { success: false, error: 'Slaptažodis turi būti bent 6 simbolių' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'Neprisijungta' }
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: password
    })

    if (updateError) {
        // Check for same_password error code from Supabase
        if ((updateError as any).code === 'same_password' || updateError.message?.toLowerCase().includes('same password')) {
            return { success: false, error: 'Naujas slaptažodis negali sutapti su senuoju. Sugalvokite kitą slaptažodį.' }
        }
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
        return { success: false, error: 'Nepavyko atnaujinti profilio būsenos' }
    }

    // Revalidate everything
    revalidatePath('/', 'layout')

    return { success: true, error: null }
}
