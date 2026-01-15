'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const AuthSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const validated = AuthSchema.safeParse(data)

    if (!validated.success) {
        return { error: 'Invalid email or password format.' }
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return { error: error.message }
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'student') {
            revalidatePath('/', 'layout')
            redirect('/student')
        } else if (profile?.role === 'teacher') {
            revalidatePath('/', 'layout')
            redirect('/teacher')
        }
    }

    revalidatePath('/', 'layout')
    redirect('/teacher') // Fallback
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        role: formData.get('role') as string || 'student', // Capture role
    }

    const validated = AuthSchema.safeParse({ email: data.email, password: data.password })

    if (!validated.success) {
        return { error: 'Invalid email or password format.' }
    }

    const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            data: {
                role: data.role, // Pass to Supabase Auth Metadata
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')

    if (data.role === 'student') {
        redirect('/student')
    } else {
        redirect('/teacher')
    }
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
