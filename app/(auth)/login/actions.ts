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

    revalidatePath('/', 'layout')
    redirect('/teacher') // Default redirect, can be logic based in future
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
    redirect('/teacher') // Default redirect
}
