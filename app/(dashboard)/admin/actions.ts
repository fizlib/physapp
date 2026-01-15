'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export type AdminUser = {
    id: string
    email: string | undefined
    role: string | null
    is_admin: boolean | null
    email_confirmed_at: string | null
    created_at: string
}

async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_admin) {
        redirect('/')
    }

    return user
}

export async function adminGetAllUsers(): Promise<{ users: AdminUser[], error: string | null }> {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        // Fetch all auth users
        const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers()

        if (authError) {
            console.error('Error fetching auth users:', authError)
            return { users: [], error: 'Failed to fetch users' }
        }

        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*')

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
            return { users: [], error: 'Failed to fetch profiles' }
        }

        // Merge data
        const users: AdminUser[] = authUsers.map(authUser => {
            const profile = profiles?.find(p => p.id === authUser.id)
            return {
                id: authUser.id,
                email: authUser.email,
                role: profile?.role || null,
                is_admin: profile?.is_admin || false,
                email_confirmed_at: authUser.email_confirmed_at || null,
                created_at: authUser.created_at
            }
        })

        return { users, error: null }

    } catch (error) {
        console.error('Unexpected error in adminGetAllUsers:', error)
        return { users: [], error: 'Internal server error' }
    }
}

export async function adminConfirmUserEmail(userId: string) {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { email_confirm: true }
        )

        if (error) {
            console.error('Error confirming user:', error)
            return { success: false, error: 'Failed to confirm user' }
        }

        revalidatePath('/admin')
        return { success: true, error: null }

    } catch (error) {
        console.error('Unexpected error in adminConfirmUserEmail:', error)
        return { success: false, error: 'Internal server error' }
    }
}
