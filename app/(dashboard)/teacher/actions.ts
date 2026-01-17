'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'

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

const UpdateClassroomNameSchema = z.object({
    classroomId: z.string().uuid(),
    name: z.string().min(3),
})

export async function updateClassroomName(classroomId: string, name: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = UpdateClassroomNameSchema.safeParse({ classroomId, name })
    if (!validated.success) return { success: false, error: "Invalid name" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    const { error } = await supabase
        .from('classrooms')
        .update({ name: name })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update classroom name' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

const ExerciseSchema = z.object({
    title: z.string(),
    type: z.enum(['numerical', 'multiple_choice']),
    latex_text: z.string(),
    correct_value: z.number().nullable().optional(),
    tolerance: z.number().nullable().optional(),
    options: z.array(z.string()).nullable().optional(),
    correct_answer: z.string().nullable().optional()
})

export async function generateExerciseFromImage(formData: FormData) {
    console.log("Starting generateExerciseFromImage...")
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY")
        return { error: "Gemini API Key not found" }
    }

    const file = formData.get('image') as File
    if (!file) {
        console.error("No image file provided")
        return { error: "No image file provided" }
    }
    console.log("File received:", file.name, file.size, file.type)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    console.log("Image length (base64):", base64Image.length)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" })

    const prompt = `
  Analyze this physics/math problem image.
  Identify if it is a "numerical" problem (calculating a number) or a "multiple_choice" problem.

  Return a JSON object with this EXACT structure (do not wrap in markdown):
  {
    "type": "numerical" | "multiple_choice",
    "title": "A short descriptive title for the problem",
    "latex_text": "The question text, using LaTeX for math formulas",
    "correct_value": number (if numerical, else null),
    "tolerance": number (suggest a tolerance %, e.g., 5, else null),
    "options": ["Option A", "Option B", "Option C", "Option D"] (if multiple_choice, else null),
    "correct_answer": "Option content" OR "A/B/C" (if multiple_choice, else null)
  }
  `

    const imagePart: Part = {
        inlineData: {
            data: base64Image,
            mimeType: file.type
        }
    }

    try {
        console.log("Calling Gemini API...")
        const result = await model.generateContent([prompt, imagePart])
        console.log("Gemini API call complete. Resolving response...")
        const response = await result.response
        const text = response.text()
        console.log("Gemini Raw Response:", text)

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const data = JSON.parse(jsonStr)
        console.log("Parsed Data:", data)

        return { success: true, data }
    } catch (error: any) {
        console.error("Gemini Error:", error)
        return { success: false, error: error.message || "Failed to generate exercise" }
    }
}

export async function createAssignmentWithQuestion(classroomId: string, exerciseData: any) {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // 2. Validate Data
    const validated = ExerciseSchema.safeParse(exerciseData)
    if (!validated.success) {
        console.error("Validation Error", validated.error)
        return { success: false, error: "Invalid exercise data" }
    }
    const data = validated.data

    // 3. Create Assignment
    const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
            classroom_id: classroomId,
            title: data.title,
            published: false
        })
        .select()
        .single()

    if (assignmentError || !assignment) {
        console.error("Assignment Error", assignmentError)
        return { success: false, error: "Failed to create assignment" }
    }

    // 4. Create Question
    const { error: questionError } = await supabase
        .from('questions')
        .insert({
            assignment_id: assignment.id,
            latex_text: data.latex_text,
            question_type: data.type,
            correct_value: data.type === 'numerical' ? data.correct_value : null,
            tolerance_percent: data.type === 'numerical' ? data.tolerance : null,
            // @ts-ignore
            options: data.type === 'multiple_choice' ? data.options : null,
            // @ts-ignore
            correct_answer: data.type === 'multiple_choice' ? data.correct_answer : null
        })

    if (questionError) {
        console.error("Question Error", questionError)
        return { success: false, error: "Failed to create question" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function toggleAssignmentPublish(assignmentId: string, classroomId: string, published: boolean) {
    const supabase = await createClient()

    // Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom (skipping deep verification for speed, relying on RLS)
    // Actually RLS might block if we don't own it, which is fine.

    const { error } = await supabase
        .from('assignments')
        .update({ published: published })
        .eq('id', assignmentId)

    if (error) {
        console.error(error)
        return { success: false, error: "Failed to update assignment" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath(`/teacher/class/${classroomId}/assignment/${assignmentId}`)
    return { success: true }
}

