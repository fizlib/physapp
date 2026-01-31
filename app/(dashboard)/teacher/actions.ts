'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'

// ... (keep existing code) ...


const LessonSlotSchema = z.object({
    day: z.number().min(0).max(6),
    time: z.string().regex(/^\d{2}:\d{2}$/)
})

const CreateClassSchema = z.object({
    name: z.string().min(1),
    type: z.enum(['private_student', 'school_class']).default('school_class'),
    lessonSchedule: z.array(LessonSlotSchema).optional(),
})

const CreateCollectionSchema = z.object({
    title: z.string().min(1),
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
    const lessonScheduleRaw = formData.get('lessonSchedule') as string | null

    let lessonSchedule = undefined
    if (lessonScheduleRaw && type === 'school_class') {
        try {
            lessonSchedule = JSON.parse(lessonScheduleRaw)
        } catch (e) {
            console.error('Failed to parse lesson schedule', e)
        }
    }

    const validated = CreateClassSchema.safeParse({ name, type, lessonSchedule })
    if (!validated.success) return { error: "Invalid name or type" }

    const { error } = await supabase.from('classrooms').insert({
        teacher_id: user.id,
        name: name,
        type: validated.data.type,
        lesson_schedule: validated.data.lessonSchedule || null
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
            category: data.category,
            show_all_questions: data.show_all_questions || false
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
        diagram_svg: index === 0 ? (q.diagram_svg || null) : null,
        solution_text: q.solution_text || null
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
    name: z.string().min(1),
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
    diagram_svg: z.string().nullable().optional(),
    solution_text: z.string().nullable().optional()
})

const ExerciseSchema = z.object({
    title: z.string(),
    // Category is now handled at the collection level, but keeping optional for backward compat if needed, or just removing.
    // We'll default to 'homework' for the DB constraint but it won't be used for logic.
    category: z.enum(['homework', 'classwork']).default('homework').optional(),
    questions: z.array(QuestionSchema),
    show_all_questions: z.boolean().default(false).optional(),
    required_variations_count: z.number().nullable().optional()
})

export async function generateExerciseFromImage(formData: FormData) {
    console.log("Starting generateExerciseFromImage...")
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY")
        return { error: "Gemini API Key not found" }
    }

    const variationCount = parseInt(formData.get('variationCount') as string || '1')
    const isVariationMode = variationCount > 1
    const variationType = formData.get('variationType') as 'numbers' | 'descriptions' || 'numbers'
    const generateSolution = formData.get('generateSolution') === 'true'

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
  
  Generate a list of questions, one for each part found${isVariationMode ? ` (multiplied by ${variationCount} variations)` : ''}. If there is only one problem, generate a list with one item${isVariationMode ? ` (which means ${variationCount} items total due to variations)` : ''}.

  ${generateSolution ? `
  SOLUTION MANUAL MODE:
  For each question variation, you MUST also generate a concise, step-by-step solution.
  - The solution should explain the physics principles used.
  - Show the substituted values into the formula.
  - Provide the final calculation steps.
  - Use newlines or bullet points to separate distinct steps.
  - Keep it professional and educational.
  ` : ''}

  ${isVariationMode ? `
  GENERATION MODE: VARIATIONS (${variationType === 'descriptions' ? 'DIFFERENT DESCRIPTIONS' : 'ONLY NUMBERS'})
  You are requested to generate ${variationCount} DISTINCT variations of the problem shown in the image.
  - ALL ${variationCount} variations must be NEW problems based on the one in the image.
  - DO NOT include an exact copy of the problem from the image, even as the first variation.
  
  ${variationType === 'descriptions' ? `
  VARIATION RULES (DIFFERENT DESCRIPTIONS):
  - You MUST change the context / story of the problem for each variation (e.g. if the original is about a car, make the next one about a train, a runner, a rocket, etc.).
  - LEAVE THE LANGUAGE EXCATLY THE SAME AS IN THE PICTURE.
  - Keep the exact same physics/math LOGIC and FORMULA types.
  - You can change the numerical values as needed to fit the new context.
  - Ensure the difficulty level remains consistent.
  ` : `
  VARIATION RULES (ONLY NUMBERS):
  - Keep the same context/story if possible, just different numbers.
  - Change the numerical values / inputs.
  - Keep the same physics/math logic and difficulty.
  `}
  - Calculate the new correct values based on your new numbers.
  ` : ''}
 
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
            "diagram_svg": "<svg>...</svg> inline SVG code" | null (null if no diagram found),
            "solution": "Concise step-by-step solution in LaTeX format" | null (Only if SOLUTION MANUAL MODE is active)
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
                // Sanitize SVG content - unescape any escaped characters
                if (q.diagram_svg && typeof q.diagram_svg === 'string') {
                    // Unescape common HTML entities that might be in the SVG
                    let svg = q.diagram_svg
                    svg = svg.replace(/&lt;/g, '<')
                    svg = svg.replace(/&gt;/g, '>')
                    svg = svg.replace(/&amp;/g, '&')
                    svg = svg.replace(/&quot;/g, '"')
                    svg = svg.replace(/&#39;/g, "'")
                    svg = svg.replace(/&#x27;/g, "'")
                    svg = svg.replace(/&#x2F;/g, '/')
                    // Remove any escaped newlines that might break rendering
                    svg = svg.replace(/\\n/g, '\n')
                    svg = svg.replace(/\\r/g, '')
                    // Ensure the SVG is trimmed
                    svg = svg.trim()
                    q.diagram_svg = svg
                }

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

                // Map Gemini 'solution' field to our 'solution_text'
                if (q.solution) {
                    q.solution_text = q.solution
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
            collection_id: collectionId || null,
            show_all_questions: data.show_all_questions || false,
            required_variations_count: data.required_variations_count || null
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
        diagram_svg: index === 0 ? (q.diagram_svg || null) : null,
        solution_text: q.solution_text || null
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

export async function updateLessonSchedule(classroomId: string, schedule: { day: number, time: string }[]): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Validate schedule
    const validatedSchedule = z.array(LessonSlotSchema).safeParse(schedule)
    if (!validatedSchedule.success) {
        return { success: false, error: "Invalid schedule format" }
    }

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
        .update({ lesson_schedule: schedule.length > 0 ? schedule : null })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update lesson schedule' }
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


export async function createCollection(classroomId: string, title: string, category: 'homework' | 'classwork' = 'homework', scheduledDate?: string): Promise<ActionState> {
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
        category: category,
        scheduled_date: scheduledDate || null
    })

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to create collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function updateCollection(classroomId: string, collectionId: string, title: string, category: 'homework' | 'classwork', scheduledDate?: string): Promise<ActionState> {
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

    const { error } = await supabase
        .from('collections')
        .update({
            title: title,
            category: category,
            scheduled_date: scheduledDate || null
        })
        .eq('id', collectionId)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update collection' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
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

export async function getStudentClassroomProgress(classroomId: string, studentId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Verify teacher owns the classroom (optional but good practice)
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return null
    }

    // 1. Fetch Collections
    const { data: collections } = await supabase
        .from('collections')
        .select('*, assignments(id)')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

    if (!collections) return []

    // 2. Fetch Progress for this student
    const allAssignmentIds = collections.flatMap((c: any) => c.assignments.map((a: any) => a.id))

    // Use Admin Client to bypass RLS for reading other users' progress
    const supabaseAdmin = createAdminClient()

    let completedAssignmentIds = new Set<string>()
    if (allAssignmentIds.length > 0) {
        const { data: progressData } = await supabaseAdmin
            .from('assignment_progress')
            .select('assignment_id, is_completed')
            .in('assignment_id', allAssignmentIds)
            .eq('student_id', studentId)
            .eq('is_completed', true)
        if (progressData) {
            progressData.forEach((p: any) => completedAssignmentIds.add(p.assignment_id))
        }
    }

    // 3. calculate progress
    const collectionsWithProgress = collections.map((collection: any) => {
        const total = collection.assignments.length
        const completed = collection.assignments.filter((a: any) => completedAssignmentIds.has(a.id)).length
        const progress = total === 0 ? 0 : (completed / total) * 100

        return {
            ...collection,
            progress,
            totalAssignments: total,
            completedAssignments: completed
        }
    })

    return collectionsWithProgress
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
