'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const CreateClassSchema = z.object({
    name: z.string().min(3),
})

const AddStudentSchema = z.object({
    email: z.string().email(),
    classroomId: z.string().uuid(),
})

export async function createClassroom(formData: FormData) {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized" }

    const name = formData.get('name') as string
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase() // Simple random code

    const validated = CreateClassSchema.safeParse({ name })
    if (!validated.success) return { error: "Invalid name" }

    const { error } = await supabase.from('classrooms').insert({
        teacher_id: user.id,
        name: name,
        join_code: joinCode
    })

    if (error) {
        console.error(error)
        return { error: 'Failed to create classroom' }
    }

    revalidatePath('/teacher')
    return { success: true }
}


export type ActionState = {
    success: boolean
    message?: string
    error?: string
}

export async function addStudent(prevState: any, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const classroomId = formData.get('classroomId') as string

    const validated = AddStudentSchema.safeParse({ email, classroomId })
    if (!validated.success) return { success: false, error: "Invalid email" }

    // Call the RPC function
    const { data, error } = await supabase.rpc('add_student_by_email', {
        p_course_id: classroomId,
        p_email: email
    })

    if (error) return { success: false, error: error.message }

    // RPC returns a table/array, usually the first item tells us the result
    // Based on my SQL: RETURNS TABLE (success BOOLEAN, message TEXT)
    const result = data && data[0]

    if (result && !result.success) {
        return { success: false, error: result.message }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true, message: result?.message }
}

const RemoveStudentSchema = z.object({
    studentId: z.string().uuid(),
    classroomId: z.string().uuid(),
})

export async function removeStudent(prevState: any, formData: FormData): Promise<ActionState> {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const studentId = formData.get('studentId') as string
    const classroomId = formData.get('classroomId') as string

    const validated = RemoveStudentSchema.safeParse({ studentId, classroomId })
    if (!validated.success) return { success: false, error: "Invalid data" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Remove enrollment
    const { error } = await supabase
        .from('enrollments')
        .delete()
        .match({ student_id: studentId, classroom_id: classroomId })

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to remove student' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

const EnrollStudentSchema = z.object({
    studentId: z.string().uuid(),
    classroomId: z.string().uuid(),
})

export async function enrollStudent(studentId: string, classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = EnrollStudentSchema.safeParse({ studentId, classroomId })
    if (!validated.success) return { success: false, error: "Invalid data" }

    const { data, error } = await supabase.rpc('enroll_student', {
        p_student_id: studentId,
        p_classroom_id: classroomId
    })

    if (error) return { success: false, error: error.message }

    const result = data && data[0]

    if (result && !result.success) {
        return { success: false, error: result.message }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true, message: result?.message }
}

export async function getUnassignedStudents() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase.rpc('get_unassigned_students')

    if (error) {
        console.error('Error fetching unassigned students:', error)
        return []
    }

    return data
}
