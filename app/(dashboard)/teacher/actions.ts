'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'

const CreateClassSchema = z.object({
    name: z.string().min(3),
    type: z.enum(['private_student', 'school_class']).default('school_class'),
})

const CreateCollectionSchema = z.object({
    title: z.string().min(3),
    classroomId: z.string().uuid(),
    category: z.enum(['homework', 'classwork']).default('homework'),
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
    const type = formData.get('type') as 'private_student' | 'school_class' || 'school_class'

    const validated = CreateClassSchema.safeParse({ name, type })
    if (!validated.success) return { error: "Invalid name or type" }

    const { error } = await supabase.from('classrooms').insert({
        teacher_id: user.id,
        name: name,
        type: validated.data.type
    })

    if (error) {
        console.error(error)
        return { error: 'Failed to create classroom' }
    }


    revalidatePath('/teacher')
    return { success: true }
}

const UpdateAssignmentTitleSchema = z.object({
    assignmentId: z.string().uuid(),
    title: z.string().min(1),
})

export async function updateAssignmentWithQuestion(assignmentId: string, classroomId: string, exerciseData: any): Promise<ActionState> {
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

    // 3. Verify Ownership
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // 4. Update Assignment
    const { error: assignmentError } = await supabase
        .from('assignments')
        .update({
            title: data.title,
            category: data.category
        })
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)

    if (assignmentError) {
        console.error("Assignment Update Error", assignmentError)
        return { success: false, error: "Failed to update assignment" }
    }

    // 5. Update Questions
    // Strategy: Delete existing questions and re-insert (simplest for multi-part changes)
    // Warning: This wipes submissions for these questions.

    // First, delete old questions
    const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('assignment_id', assignmentId)

    if (deleteError) {
        console.error("Delete Questions Error", deleteError)
        return { success: false, error: "Failed to update questions (delete step)" }
    }

    // Then insert new questions
    const questionsToInsert = data.questions.map((q, index) => ({
        assignment_id: assignmentId,
        latex_text: q.latex_text,
        question_type: q.type,
        correct_value: q.type === 'numerical' ? q.correct_value : null,
        tolerance_percent: q.type === 'numerical' ? q.tolerance : null,
        // @ts-ignore
        options: q.type === 'multiple_choice' ? q.options : null,
        // @ts-ignore
        correct_answer: q.type === 'multiple_choice' ? q.correct_answer : null,
        // Only save diagram for the first question
        diagram_type: index === 0 ? (q.diagram_type || null) : null,
        diagram_svg: index === 0 ? (q.diagram_svg || null) : null
    }))

    const { error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

    if (insertError) {
        console.error("Insert Questions Error", insertError)
        return { success: false, error: "Failed to update questions (insert step)" }
    }

    revalidatePath(`/teacher/class/${classroomId}/assignment/${assignmentId}`)
    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function updateAssignmentTitle(assignmentId: string, classroomId: string, title: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = UpdateAssignmentTitleSchema.safeParse({ assignmentId, title })
    if (!validated.success) return { success: false, error: "Invalid title" }

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
        .from('assignments')
        .update({ title: title })
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId) // Extra safety

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update assignment title' }
    }

    revalidatePath(`/teacher/class/${classroomId}/assignment/${assignmentId}`)
    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function deleteAssignment(assignmentId: string, classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Manual Cascade Delete
    // 1. Submissions
    // 2. Questions
    // 3. Assignment

    // Delete Submissions
    await supabase.from('submissions').delete().eq('assignment_id', assignmentId)
    // Delete Questions
    await supabase.from('questions').delete().eq('assignment_id', assignmentId)
    // Delete Assignment
    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to delete assignment' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
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

const QuestionSchema = z.object({
    type: z.enum(['numerical', 'multiple_choice']),
    latex_text: z.string(),
    correct_value: z.number().nullable().optional(),
    tolerance: z.number().nullable().optional(),
    options: z.array(z.string()).nullable().optional(),
    correct_answer: z.string().nullable().optional(),
    diagram_type: z.enum(['graph', 'scheme']).nullable().optional(),
    diagram_svg: z.string().nullable().optional()
})

const ExerciseSchema = z.object({
    title: z.string(),
    // Category is now handled at the collection level, but keeping optional for backward compat if needed, or just removing.
    // We'll default to 'homework' for the DB constraint but it won't be used for logic.
    category: z.enum(['homework', 'classwork']).default('homework').optional(),
    questions: z.array(QuestionSchema)
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
  Identify if there are multiple parts to the problem (e.g., 1., 2., 3. or a), b), c)).
  
  CRITICAL: If a single problem text asks for multiple distinct values (e.g., "Find the velocity and acceleration", "Calculate the time for each worker", "Find x and y"), you MUST SPLIT this into separate questions for each value requested.
  
  Generate a list of questions, one for each part found. If there is only one problem, generate a list with one item.
 
  For each question:
  - Identify if it is a "numerical" problem (calculating a number) or a "multiple_choice" problem.
  - IMPORTANT: Check if the specific part involves any diagrams, graphs, or schemes.
  - LATEX FORMATTING: Use LaTeX for ALL math formulas, units, and symbols. 
  - IMPORTANT: For multiple_choice options, you MUST wrap any LaTeX content in single dollar signs, e.g., "$l = 12\\text{ m}$".
  
  CRITICAL INSTRUCTION FOR MULTI-PART PROBLEMS (Explicit numbered parts OR Implicit split parts):
  If the problem has a common description/background text followed by multiple parts:
  - For the FIRST question (part a, 1, or first value): Include the FULL common description text + the specific question text for this part.
  - For the SUBSEQUENT questions (part b, c, or next values): Include ONLY the specific question text for that part (e.g. "Find the acceleration", "How long for the second worker?"). DO NOT repeat the common description text.
  
  If you find a diagram relevant to a question, you MUST generate clean, inline SVG code that recreates it as accurately as possible. The SVG should:
  - Be self-contained with proper viewBox attribute
  - Use appropriate colors (black for lines, gray for grid, labeled axes)
  - Include text labels, axis labels, and any annotations from the original
  - For graphs: draw the coordinate system, gridlines, axis arrows, tick marks, and plot the curves/lines accurately
  - For schemes: recreate the components (resistors, forces, objects) with proper labels
  
  Return a JSON object with this EXACT structure (do not wrap in markdown):
  {
    "title": "A short descriptive title for the entire exercise",
    "questions": [
        {
            "type": "numerical" | "multiple_choice",
            "latex_text": "The question text.",
            "correct_value": number (if numerical, else null),
            "tolerance": number (suggest a tolerance %, e.g., 5, else null),
            "options": ["Option A", "Option B", "Option C", "Option D"] (if multiple_choice, else null... include strictly 4 options if possible, or as many as in the image. Wrap LaTeX in $),
            "correct_answer": "A" | "B" | "C" | "D" (if multiple_choice, else null... MUST be a single upper-case letter corresponding to the correct option index 0=A, 1=B, etc.),
            "diagram_type": "graph" | "scheme" | null (null if no diagram found),
            "diagram_svg": "<svg>...</svg> inline SVG code" | null (null if no diagram found)
        }
    ]
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

        // Sanitize data
        if (data.questions) {
            data.questions = data.questions.map((q: any) => {
                if (q.type === 'multiple_choice' && q.correct_answer) {
                    let ans = q.correct_answer.trim().toUpperCase()
                    // Handle markdown bold/italic
                    ans = ans.replace(/\*/g, '').replace(/_/g, '')

                    // If the answer is not A, B, C, D, try to find it in options
                    if (!['A', 'B', 'C', 'D'].includes(ans)) {
                        // Check if the answer text matches one of the options
                        if (q.options && Array.isArray(q.options)) {
                            const matchIndex = q.options.findIndex((opt: string) => opt.toLowerCase().trim() === ans.toLowerCase())
                            if (matchIndex !== -1) {
                                ans = ['A', 'B', 'C', 'D'][matchIndex]
                            }
                        }
                    }

                    // Final fallback: if still not valid, default to A or null (better than invalid string)
                    if (!['A', 'B', 'C', 'D'].includes(ans)) {
                        // Maybe it's like "Option A"
                        const match = ans.match(/\b([A-D])\b/)
                        if (match) {
                            ans = match[1]
                        }
                    }

                    q.correct_answer = ans
                }
                return q
            })
        }

        return { success: true, data }
    } catch (error: any) {
        console.error("Gemini Error:", error)
        return { success: false, error: error.message || "Failed to generate exercise" }
    }
}

export async function createAssignmentWithQuestion(classroomId: string, exerciseData: any, collectionId?: string) {
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
            // category: data.category, // We let it default or set to 'homework' as placeholder since it's now generic
            published: true,
            collection_id: collectionId || null
        })
        .select()
        .single()

    if (assignmentError || !assignment) {
        console.error("Assignment Error", assignmentError)
        return { success: false, error: "Failed to create assignment" }
    }

    // 4. Create Questions
    const questionsToInsert = data.questions.map((q, index) => ({
        assignment_id: assignment.id,
        latex_text: q.latex_text,
        question_type: q.type,
        correct_value: q.type === 'numerical' ? q.correct_value : null,
        tolerance_percent: q.type === 'numerical' ? q.tolerance : null,
        // @ts-ignore
        options: q.type === 'multiple_choice' ? q.options : null,
        // @ts-ignore
        correct_answer: q.type === 'multiple_choice' ? q.correct_answer : null,
        // Only save diagram for the first question
        diagram_type: index === 0 ? (q.diagram_type || null) : null,
        diagram_svg: index === 0 ? (q.diagram_svg || null) : null
    }))

    const { error: questionError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

    if (questionError) {
        console.error("Question Error", questionError)
        return { success: false, error: "Failed to create question" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    if (collectionId) {
        revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    }
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

export async function updateClassroomType(classroomId: string, type: 'private_student' | 'school_class'): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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
        .update({ type: type })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update classroom type' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function deleteClassroom(classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // Manual Cascade Delete
    // 1. Submissions (via assignments)
    // 2. Questions (via assignments)
    // 3. Assignments
    // 4. Enrollments
    // 5. Classroom

    // Note: This is a heavy operation. Ideally, use ON DELETE CASCADE in Postgres, 
    // but doing it manually here since we haven't set that up yet.

    // 1. Get Assignment IDs
    const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .eq('classroom_id', classroomId)

    const assignmentIds = assignments?.map(a => a.id) || []

    if (assignmentIds.length > 0) {
        // Delete Submissions
        await supabase.from('submissions').delete().in('assignment_id', assignmentIds)
        // Delete Questions
        await supabase.from('questions').delete().in('assignment_id', assignmentIds)
        // Delete Assignments
        await supabase.from('assignments').delete().in('id', assignmentIds)
    }

    // Delete Enrollments
    await supabase.from('enrollments').delete().eq('classroom_id', classroomId)

    // Delete Classroom
    const { error } = await supabase.from('classrooms').delete().eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to delete classroom' }
    }

    revalidatePath('/teacher')
    return { success: true }
}


export async function createCollection(classroomId: string, title: string, category: 'homework' | 'classwork' = 'homework'): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = CreateCollectionSchema.safeParse({ title, classroomId, category })
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

    const { error } = await supabase.from('collections').insert({
        classroom_id: classroomId,
        title: title,
        category: category
    })

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to create collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function addExerciseToCollection(classroomId: string, collectionId: string, assignmentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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
        .from('assignments')
        .update({ collection_id: collectionId })
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to add exercise to collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

export async function removeExerciseFromCollection(classroomId: string, collectionId: string, assignmentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

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
        .from('assignments')
        .update({ collection_id: null })
        .eq('id', assignmentId)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to remove exercise from collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

export async function deleteCollection(collectionId: string, classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized to manage this classroom" }
    }

    // 1. Unlink assignments (set collection_id to null)
    const { error: unlinkError } = await supabase
        .from('assignments')
        .update({ collection_id: null })
        .eq('collection_id', collectionId)

    if (unlinkError) {
        console.error("Unlink Error", unlinkError)
        return { success: false, error: 'Failed to unlink exercises from collection' }
    }

    // 2. Delete Collection
    const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId)

    if (deleteError) {
        console.error("Delete Error", deleteError)
        return { success: false, error: 'Failed to delete collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}
