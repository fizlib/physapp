'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

export type AdminUser = {
    id: string
    email: string | undefined
    first_name: string | null
    last_name: string | null
    role: string | null
    is_admin: boolean | null
    email_confirmed_at: string | null
    approved: boolean | null
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

export async function adminGetAllUsers(page: number = 1, perPage: number = 30, search?: string): Promise<{ users: AdminUser[], totalCount: number, error: string | null }> {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        if (search) {
            // Search profiles first because auth.admin.listUsers doesn't support filtering by name
            // and has limited search capabilities.
            const { data: profiles, count, error: profilesError } = await supabaseAdmin
                .from('profiles')
                .select('*', { count: 'exact' })
                .or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
                .order('created_at', { ascending: false })
                .range((page - 1) * perPage, page * perPage - 1)

            if (profilesError) {
                console.error('Error searching profiles:', profilesError)
                return { users: [], totalCount: 0, error: 'Failed to search users' }
            }

            if (!profiles || profiles.length === 0) {
                return { users: [], totalCount: count || 0, error: null }
            }

            // Fetch corresponding auth users to get email_confirmed_at
            const userIds = profiles.map(p => p.id)
            const authUsersResults = await Promise.all(userIds.map(id => supabaseAdmin.auth.admin.getUserById(id)))

            const users: AdminUser[] = profiles.map(profile => {
                const authUser = authUsersResults.find(r => r.data.user?.id === profile.id)?.data.user
                return {
                    id: profile.id,
                    email: authUser?.email || profile.email || undefined,
                    first_name: profile.first_name || null,
                    last_name: profile.last_name || null,
                    role: profile.role || null,
                    is_admin: profile.is_admin || false,
                    email_confirmed_at: authUser?.email_confirmed_at || null,
                    approved: profile.approved || false,
                    created_at: authUser?.created_at || profile.created_at
                }
            })

            return { users, totalCount: count || 0, error: null }
        }

        // Get total count first
        const { count, error: countError } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })

        if (countError) {
            console.error('Error fetching user count:', countError)
            return { users: [], totalCount: 0, error: 'Failed to fetch user count' }
        }

        // Fetch paginated auth users
        const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({
            page: page,
            perPage: perPage
        })

        if (authError) {
            console.error('Error fetching auth users:', authError)
            return { users: [], totalCount: count || 0, error: 'Failed to fetch users' }
        }

        // Fetch profiles only for these users to be efficient
        const userIds = authUsers.map(u => u.id)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .in('id', userIds)

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
            return { users: [], totalCount: count || 0, error: 'Failed to fetch profiles' }
        }

        // Merge data
        const users: AdminUser[] = authUsers.map(authUser => {
            const profile = profiles?.find(p => p.id === authUser.id)
            return {
                id: authUser.id,
                email: authUser.email,
                first_name: profile?.first_name || null,
                last_name: profile?.last_name || null,
                role: profile?.role || null,
                is_admin: profile?.is_admin || false,
                email_confirmed_at: authUser.email_confirmed_at || null,
                approved: profile?.approved || false,
                created_at: authUser.created_at
            }
        })

        return { users, totalCount: count || 0, error: null }

    } catch (error) {
        console.error('Unexpected error in adminGetAllUsers:', error)
        return { users: [], totalCount: 0, error: 'Internal server error' }
    }
}

export async function adminApproveUser(userId: string) {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ approved: true })
            .eq('id', userId)

        if (error) {
            console.error('Error approving user:', error)
            return { success: false, error: 'Failed to approve user' }
        }

        revalidatePath('/admin')
        return { success: true, error: null }

    } catch (error) {
        console.error('Unexpected error in adminApproveUser:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminCreateUser(formData: FormData) {
    try {
        await checkAdmin()

        const email = formData.get('email') as string
        const password = formData.get('password') as string
        const firstName = formData.get('firstName') as string
        const lastName = formData.get('lastName') as string
        const role = formData.get('role') as string

        if (!email || !password || !firstName || !lastName || !role) {
            return { success: false, error: 'All fields are required' }
        }

        const supabaseAdmin = createAdminClient()

        const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                role
            }
        })

        if (error) {
            console.error('Error creating user:', error)
            return { success: false, error: error.message }
        }

        // Set must_change_password = true
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ must_change_password: true })
            .eq('id', user.user!.id)

        if (profileError) {
            console.error('Error updating profile for must_change_password:', profileError)
            // We don't fail the whole request, but log it. 
            // Ideally we should probably transaction this or ensure it happens.
        }

        revalidatePath('/admin')

        // Construct the AdminUser object to return
        const newUser: AdminUser = {
            id: user.user!.id,
            email: user.user!.email,
            first_name: firstName,
            last_name: lastName,
            role: role,
            is_admin: false, // Default to false for new users
            email_confirmed_at: new Date().toISOString(), // We set email_confirm: true
            approved: true, // Admin-created users are auto-approved
            created_at: user.user!.created_at
        }

        return { success: true, error: null, user: newUser }

    } catch (error) {
        console.error('Unexpected error in adminCreateUser:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminDeleteUser(userId: string) {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        // 1. Fetch profile to determine role
        const { data: profile, error: profileFetchError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single()

        if (profileFetchError && profileFetchError.code !== 'PGRST116') { // Ignore not found error
            console.error('Error fetching profile for deletion:', profileFetchError)
            return { success: false, error: 'Failed to fetch user profile' }
        }

        if (profile) {
            if (profile.role === 'student') {
                // Delete student data
                await supabaseAdmin.from('submissions').delete().eq('student_id', userId)
                await supabaseAdmin.from('enrollments').delete().eq('student_id', userId)
            } else if (profile.role === 'teacher') {
                // Delete teacher data (Cascading down to classrooms -> assignments -> questions/submissions)

                // Get all classrooms
                const { data: classrooms } = await supabaseAdmin
                    .from('classrooms')
                    .select('id')
                    .eq('teacher_id', userId)

                if (classrooms && classrooms.length > 0) {
                    const classroomIds = classrooms.map(c => c.id)

                    // Get all assignments for these classrooms
                    const { data: assignments } = await supabaseAdmin
                        .from('assignments')
                        .select('id')
                        .in('classroom_id', classroomIds)

                    if (assignments && assignments.length > 0) {
                        const assignmentIds = assignments.map(a => a.id)

                        // Delete submissions for these assignments
                        await supabaseAdmin.from('submissions').delete().in('assignment_id', assignmentIds)

                        // Delete questions for these assignments
                        await supabaseAdmin.from('questions').delete().in('assignment_id', assignmentIds)

                        // Delete assignments
                        await supabaseAdmin.from('assignments').delete().in('id', assignmentIds)
                    }

                    // Delete enrollments for these classrooms
                    await supabaseAdmin.from('enrollments').delete().in('classroom_id', classroomIds)

                    // Delete classrooms
                    await supabaseAdmin.from('classrooms').delete().in('id', classroomIds)
                }
            }

            // Delete the profile itself
            const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
            if (profileDeleteError) {
                console.error('Error deleting profile:', profileDeleteError)
                return { success: false, error: 'Failed to delete user profile' }
            }
        }

        // 2. Finally delete from auth.users
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) {
            console.error('Error deleting user:', error)
            return { success: false, error: error.message }
        }

        revalidatePath('/admin')
        return { success: true, error: null }

    } catch (error) {
        console.error('Unexpected error in adminDeleteUser:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminGenerateMagicLink(userId: string, forcePasswordReset: boolean = false) {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        // 1. Get user email
        const { data: { user }, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId)

        if (getError || !user?.email) {
            console.error('Error fetching user for magic link:', getError)
            return { success: false, error: 'Failed to fetch user email' }
        }

        // 2. If forcePasswordReset is true, update the profile
        if (forcePasswordReset) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ must_change_password: true })
                .eq('id', userId)

            if (profileError) {
                console.error('Error updating profile for must_change_password:', profileError)
                return { success: false, error: 'Failed to update password reset status' }
            }
        }

        // 3. Generate magic link
        const headersList = await headers()
        const host = headersList.get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const redirectTo = `${protocol}://${host}/auth/callback`

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: user.email,
            options: {
                redirectTo
            }
        })

        if (error) {
            console.error('Error generating magic link:', error)
            return { success: false, error: 'Failed to generate magic link' }
        }

        // Manually construct the link to avoid double-consumption issues
        const directLink = `${protocol}://${host}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`

        return { success: true, link: directLink, error: null }

    } catch (error) {
        console.error('Unexpected error in adminGenerateMagicLink:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminResetUserProgress(userId: string) {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        // Delete from assignment_progress
        const { error: progressError } = await supabaseAdmin
            .from('assignment_progress')
            .delete()
            .eq('student_id', userId)

        if (progressError) {
            console.error('Error resetting assignment progress:', progressError)
            return { success: false, error: 'Failed to reset assignment progress' }
        }

        // Delete from submissions
        const { error: submissionsError } = await supabaseAdmin
            .from('submissions')
            .delete()
            .eq('student_id', userId)

        if (submissionsError) {
            console.error('Error resetting submissions:', submissionsError)
            return { success: false, error: 'Failed to reset submissions' }
        }

        revalidatePath('/admin')
        return { success: true, error: null }

    } catch (error) {
        console.error('Unexpected error in adminResetUserProgress:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminBulkApproveUsers(userIds: string[]) {
    try {
        await checkAdmin()
        const supabaseAdmin = createAdminClient()

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ approved: true })
            .in('id', userIds)

        if (error) {
            console.error('Error bulk approving users:', error)
            return { success: false, error: 'Failed to approve users' }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in adminBulkApproveUsers:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminBulkDeleteUsers(userIds: string[]) {
    try {
        await checkAdmin()

        // We call the individual delete function for each user to ensure all related data is cleaned up
        // This handles cases where some users are students and some are teachers correctly
        const results = await Promise.all(userIds.map(id => adminDeleteUser(id)))

        const failures = results.filter(r => !r.success)
        if (failures.length > 0) {
            return {
                success: false,
                error: `Failed to delete ${failures.length} users. ${failures[0].error}`
            }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Unexpected error in adminBulkDeleteUsers:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminGetUserById(userId: string): Promise<{ user: AdminUser | null, error: string | null }> {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        // Fetch profile
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (profileError) {
            console.error('Error fetching profile:', profileError)
            return { user: null, error: 'Failed to fetch user profile' }
        }

        // Fetch auth user
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

        if (authError || !authUser) {
            console.error('Error fetching auth user:', authError)
            return { user: null, error: 'Failed to fetch auth user' }
        }

        const adminUser: AdminUser = {
            id: authUser.id,
            email: authUser.email,
            first_name: profile.first_name || null,
            last_name: profile.last_name || null,
            role: profile.role || null,
            is_admin: profile.is_admin || false,
            email_confirmed_at: authUser.email_confirmed_at || null,
            approved: profile.approved || false,
            created_at: authUser.created_at
        }

        return { user: adminUser, error: null }
    } catch (error) {
        console.error('Unexpected error in adminGetUserById:', error)
        return { user: null, error: 'Internal server error' }
    }
}

export async function adminResetPassword(userId: string) {
    try {
        await checkAdmin()

        const supabaseAdmin = createAdminClient()

        // 1. Generate a random password
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
        let newPassword = ''
        for (let i = 0; i < 10; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        // 2. Update auth user password
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        )

        if (authError) {
            console.error('Error resetting password in auth:', authError)
            return { success: false, error: authError.message }
        }

        // 3. Set must_change_password = true in profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ must_change_password: true })
            .eq('id', userId)

        if (profileError) {
            console.error('Error updating profile for must_change_password:', profileError)
            return { success: false, error: 'Failed to set password change requirement' }
        }

        revalidatePath('/admin')
        return { success: true, password: newPassword, error: null }

    } catch (error) {
        console.error('Unexpected error in adminResetPassword:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminGetUserCollections(userId: string) {
    try {
        await checkAdmin()
        const supabaseAdmin = createAdminClient()

        // 1. Get classrooms the user is enrolled in
        const { data: enrollments, error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .select('classroom_id')
            .eq('student_id', userId)

        if (enrollError) throw enrollError
        if (!enrollments || enrollments.length === 0) return { collections: [] }

        const classroomIds = enrollments.map(e => e.classroom_id)

        // 2. Get classwork collections for these classrooms
        const { data: collections, error: collError } = await supabaseAdmin
            .from('collections')
            .select('id, title, classroom_id, category')
            .in('classroom_id', classroomIds)
            .eq('category', 'classwork')

        if (collError) throw collError

        return { collections: collections || [] }
    } catch (error) {
        console.error('Error in adminGetUserCollections:', error)
        return { collections: [], error: 'Failed to fetch user collections' }
    }
}

export async function adminSetIpBypass(userId: string, collectionId: string, durationMinutes: number = 45) {
    try {
        await checkAdmin()
        const supabaseAdmin = createAdminClient()

        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString()

        const { error } = await supabaseAdmin
            .from('ip_bypasses')
            .upsert({
                user_id: userId,
                collection_id: collectionId,
                expires_at: expiresAt
            }, {
                onConflict: 'user_id,collection_id'
            })

        if (error) throw error

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Error in adminSetIpBypass:', error)
        return { success: false, error: 'Failed to set IP bypass' }
    }
}

export async function adminGetActiveBypass(userId: string) {
    try {
        await checkAdmin()
        const supabaseAdmin = createAdminClient()

        const { data, error } = await supabaseAdmin
            .from('ip_bypasses')
            .select('*')
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())

        if (error) throw error

        return { bypasses: data || [] }
    } catch (error) {
        console.error('Error in adminGetActiveBypass:', error)
        return { bypasses: [], error: 'Failed to fetch active bypasses' }
    }
}

export async function adminSendMessage(studentId: string, title: string, content: string) {
    try {
        const admin = await checkAdmin()
        const supabaseAdmin = createAdminClient()

        if (!title.trim() || !content.trim()) {
            return { success: false, error: 'Title and content are required' }
        }

        const { data, error } = await supabaseAdmin
            .from('student_messages')
            .insert({
                student_id: studentId,
                sender_id: admin.id,
                title: title.trim(),
                content: content.trim(),
            })
            .select()
            .single()

        if (error) {
            console.error('Error sending message:', error)
            return { success: false, error: 'Failed to send message' }
        }

        return { success: true, message: data }
    } catch (error) {
        console.error('Unexpected error in adminSendMessage:', error)
        return { success: false, error: 'Internal server error' }
    }
}

export async function adminGetStudentMessages(studentId: string) {
    try {
        await checkAdmin()
        const supabaseAdmin = createAdminClient()

        const { data, error } = await supabaseAdmin
            .from('student_messages')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching student messages:', error)
            return { messages: [], error: 'Failed to fetch messages' }
        }

        return { messages: data || [] }
    } catch (error) {
        console.error('Unexpected error in adminGetStudentMessages:', error)
        return { messages: [], error: 'Internal server error' }
    }
}

