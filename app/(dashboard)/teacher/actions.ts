'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { headers } from 'next/headers'
import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { generateContentWithFallback } from '@/lib/gemini'

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

import { getClientIp } from '@/lib/ip'

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

    const ip = await getClientIp()

    const { error } = await supabase.from('classrooms').insert({
        teacher_id: user.id,
        name: name,
        type: validated.data.type,
        lesson_schedule: validated.data.lessonSchedule || null,
        allowed_ip: ip,
        ip_check_enabled: true
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
            show_all_questions: data.show_all_questions || false,
            points_enabled: data.points_enabled || false,
            points: data.points_enabled ? (data.points || 1) : null
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
        diagram_image_url: index === 0 ? (q.diagram_image_url || null) : null,
        solution_text: q.solution_text || null,
        points: q.points || 1
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
    diagram_image_url: z.string().nullable().optional(),
    solution_text: z.string().nullable().optional(),
    points: z.number().min(1).default(1).optional()
})

const ExerciseSchema = z.object({
    title: z.string(),
    // Category is now handled at the collection level, but keeping optional for backward compat if needed, or just removing.
    // We'll default to 'homework' for the DB constraint but it won't be used for logic.
    category: z.enum(['homework', 'classwork']).default('homework').optional(),
    questions: z.array(QuestionSchema),
    show_all_questions: z.boolean().default(false).optional(),
    required_variations_count: z.number().nullable().optional(),
    points_enabled: z.boolean().default(false).optional(),
    points: z.number().min(1).default(1).optional()
})

export async function uploadIllustration(formData: FormData): Promise<{ success: boolean, url?: string, error?: string }> {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const file = formData.get('image') as File
    if (!file) {
        return { success: false, error: "No image file provided" }
    }

    console.log("Uploading illustration to Supabase Storage...")
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `illustrations/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('illustrations')
        .upload(filePath, file)

    if (uploadError) {
        console.error("Storage upload error:", uploadError)
        return { success: false, error: "Failed to upload illustration" }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('illustrations')
        .getPublicUrl(filePath)

    return { success: true, url: publicUrl }
}

export async function generateExerciseFromImage(formData: FormData) {
    console.log("Starting generateExerciseFromImage...")

    const variationCount = parseInt(formData.get('variationCount') as string || '1')
    const generationType = formData.get('generationType') as 'exact' | 'similar' || 'exact'
    const isVariationMode = variationCount > 1
    const variationType = formData.get('variationType') as 'numbers' | 'descriptions' || 'numbers'
    const exerciseType = formData.get('exerciseType') as 'auto' | 'numerical' | 'multiple_choice' || 'auto'
    const answersInSvg = formData.get('answersInSvg') === 'true'
    const generateSolution = formData.get('generateSolution') === 'true'
    const useImageAsIllustration = formData.get('useImageAsIllustration') === 'true'

    const file = formData.get('image') as File
    if (!file) {
        console.error("No image file provided")
        return { error: "No image file provided" }
    }
    console.log("File received:", file.name, file.size, file.type)

    let diagramImageUrl = null
    const illustrationFile = formData.get('illustration') as File
    const fileToUpload = illustrationFile || (useImageAsIllustration ? file : null)

    if (useImageAsIllustration && fileToUpload) {
        console.log("Uploading image to Supabase Storage...")
        const supabase = await createClient()
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
        const filePath = `illustrations/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('illustrations')
            .upload(filePath, fileToUpload)

        if (uploadError) {
            console.error("Storage upload error:", uploadError)
            return { success: false, error: "Failed to upload illustration" }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('illustrations')
            .getPublicUrl(filePath)

        diagramImageUrl = publicUrl
        console.log("Image uploaded successfully:", diagramImageUrl)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    console.log("Image length (base64):", base64Image.length)

    const prompt = `
  Analyze this physics/math problem image.
  Identify if there are multiple parts to the problem (e.g., 1., 2., 3. or a), b), c)).

  CRITICAL: All generated output text (title, question_text, options, solution) MUST be in the Lithuanian language, regardless of the language found in the image.

  Generate a list of questions, one for each part found${isVariationMode ? ` (multiplied by ${variationCount} variations)` : ''}. If there is only one problem, generate a list with one item${isVariationMode ? ` (which means ${variationCount} items total due to variations)` : ''}.

  EXERCISE TYPE RULES (CRITICAL):
  ${exerciseType === 'numerical' ? `
  - FORCED TYPE: Numerical calculation.
  - You MUST generate "numerical" type questions only.
  - If the image contains a multiple-choice question, IGNORE the options and transform it into a direct calculation/numerical question.
  ` : exerciseType === 'multiple_choice' ? `
  - FORCED TYPE: Multiple choice.
  - You MUST generate "multiple_choice" type questions only.
  - If the image is a numerical problem, you MUST create 4 plausible multiple-choice options (A, B, C, D) based on common mistakes or likely outcomes.
  ${answersInSvg ? `
  - ANSWERS AS ILLUSTRATIONS: Each of the 4 multiple-choice options MUST be a clean, self-contained SVG illustration recreate the physical situation, graph, or scheme for that option.
  - DO NOT provide text labels in Lithuanian as the primary option text; instead, the SVG itself MUST show the information (e.g., if option is 5m, the SVG shows a vector or object with "5m" label).
  - Each option in the "options" array MUST be the full <svg>... </svg> code string.
  ` : ''}
  ` : `
  - TYPE DETECTION: Auto-detect.
  - Determine if the question is naturally "numerical" or "multiple_choice" based on the image content.
  `}

  ${generateSolution ? `
  SOLUTION MANUAL MODE:
  For each question variation, you MUST also generate a concise, step-by-step solution in the Lithuanian language.
  - The solution should explain the physics principles used.
  - Show the substituted values into the formula.
  - Provide the final calculation steps.
  - Use newlines or bullet points to separate distinct steps.
  - Keep it professional and educational.
  ` : ''}

  ${(isVariationMode || (generationType === 'similar' && !isVariationMode)) ? `
  GENERATION MODE: ${isVariationMode ? `VARIATIONS (${variationType === 'descriptions' ? 'DIFFERENT DESCRIPTIONS' : 'ONLY NUMBERS'})` : 'SIMILAR EXERCISE (DIFFERENT DESCRIPTION/NUMBERS)'}
  You are requested to generate ${isVariationMode ? variationCount : 1} DISTINCT variation(s) of the problem shown in the image.
  - The variations must be NEW problems based on the one in the image.
  - DO NOT include an exact copy of the problem from the image, even as the first variation.
  
  VARIATION RULES:
  ${variationType === 'numbers' ? `
  - Keep the EXACT same context / story / description / structure as the original problem from the image.
  - FORMATTING CLEANUP: Explicitly REMOVE any part labels like "a)", "b)", "1.", "2.", "c)" from the text. The question should stand on its own.
  - ONLY change the specific numerical values within the description and calculation.
  - DO NOT invent new objects or scenarios.
  ` : `
  - You MUST change the context / story of the problem (e.g. if the original is about a car, make the next one about a train, a runner, a rocket, etc.).
  `}
  - ALWAYS USE LITHUANIAN LANGUAGE for all generated content. Translate carefully if the input is in another language.
  - Keep the exact same physics/math LOGIC and FORMULA types.
  ${variationType === 'descriptions' ? '- You can change the numerical values as needed to fit the new context.' : ''}
  - Ensure the difficulty level remains consistent.
  - Calculate the new correct values based on your new numbers.
  ` : ''}
  For each question:
  - Identify if it is a "numerical" problem (calculating a number) or a "multiple_choice" problem.
  - IMPORTANT: Check if the specific part involves any diagrams, graphs, or schemes.
  - LATEX FORMATTING: Use LaTeX for ALL math formulas, units, and symbols. 
  - IMPORTANT: For multiple_choice options, you MUST wrap any LaTeX content in single dollar signs, e.g., "$l = 12\\text{ m}$".

  NUMERICAL ANSWER UNITS (CRITICAL FOR NUMERICAL QUESTIONS):
  - The question text MUST explicitly state what SI units the answer should be given in (e.g., "Raskite greitį (m/s)", "Apskaičiuokite atstumą metrais").
  - The correct_value MUST always be in SI standard units (meters, seconds, kilograms, m/s, m/s², N, J, W, Pa, etc.).
  - You may use non-SI units (km/h, cm, g, etc.) in the exercise description/story, but the final answer and correct_value must be converted to SI.
  - Example: If the problem uses km/h for speed, convert the correct_value to m/s and ask for the answer in m/s.
  
  CRITICAL INSTRUCTION FOR MULTI-PART PROBLEMS (Explicit numbered parts OR Implicit split parts):
  If the problem has a common description/background text followed by multiple parts:
  - For the FIRST question (part a, 1, or first value): Include the FULL common description text + the specific question text for this part.
  - For the SUBSEQUENT questions (part b, c, or next values): Include ONLY the specific question text for that part (e.g. "Find the acceleration", "How long for the second worker?"). DO NOT repeat the common description text.
  - STRIP LABELS: In all cases, strip the labels like "a)", "1.", "c)" from the final "latex_text".
  
  If you fine-grained diagram detection is needed:
  ${useImageAsIllustration ? `
  - DO NOT generate diagram_svg or diagram_type. The teacher has provided an image illustration already.
  ` : `
  - If you find a diagram relevant to a question, you MUST generate clean, inline SVG code that recreates it as accurately as possible. The SVG should:
    - Be self-contained with proper viewBox attribute
    - Use appropriate colors (black for lines, gray for grid, labeled axes)
    - Include text labels, axis labels, and any annotations from the original
    - For graphs: draw the coordinate system, gridlines, axis arrows, tick marks, and plot the curves/lines accurately
    - For schemes: recreate the components (resistors, forces, objects) with proper labels
  `}
  
  Return a JSON object with this EXACT structure (do not wrap in markdown):
  {
    "title": "A short descriptive title for the entire exercise",
    "questions": [
        {
            "type": "numerical" | "multiple_choice",
            "latex_text": "The question text.",
            "correct_value": number (if numerical, else null),
            "tolerance": number (suggest a tolerance %, e.g., 5, else null),
            "options": ["Option A contents", "Option B contents", "Option C contents", "Option D contents"] (if multiple_choice, else null... include strictly 4 options. If Answers as Illustrations mode is ON, these MUST be full <svg> strings),
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
        console.log("Calling Gemini API with key pool...")
        const result = await generateContentWithFallback("gemini-3-flash-preview", [prompt, imagePart])
        console.log("Gemini API call complete. Resolving response...")
        const response = await result.response
        const text = response.text()
        console.log("Gemini Raw Response:", text)

        // Clean up markdown code blocks if present
        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim()

        // Fix common JSON issues from Gemini output
        // Replace literal newlines inside strings with escaped newlines
        // This regex finds strings and replaces unescaped newlines within them
        jsonStr = jsonStr.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
            // Replace actual newlines with escaped ones inside the string
            return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
        })

        const data = JSON.parse(jsonStr)
        console.log("Parsed Data:", data)

        const sanitizeOptionSvg = (opt: string) => {
            if (opt && opt.trim().startsWith('<svg')) {
                let svg = opt.trim()
                svg = svg.replace(/&lt;/g, '<')
                svg = svg.replace(/&gt;/g, '>')
                svg = svg.replace(/&amp;/g, '&')
                svg = svg.replace(/&quot;/g, '"')
                svg = svg.replace(/&#39;/g, "'")
                svg = svg.replace(/&#x27;/g, "'")
                svg = svg.replace(/&#x2F;/g, '/')
                svg = svg.replace(/\\n/g, '\n')
                svg = svg.replace(/\\r/g, '')
                // Strip hardcoded width/height to make it responsive
                svg = svg.replace(/<svg([^>]*)width="[^"]*"/i, '<svg$1')
                svg = svg.replace(/<svg([^>]*)height="[^"]*"/i, '<svg$1')
                return svg.trim()
            }
            return opt
        }

        // Sanitize data
        if (data.questions) {
            data.questions = data.questions.map((q: any, index: number) => {
                // Sanitize options if they contain SVG
                if (q.type === 'multiple_choice' && q.options && Array.isArray(q.options)) {
                    q.options = q.options.map((opt: string) => sanitizeOptionSvg(opt))
                }

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

                // Randomize multiple choice options
                if (q.type === 'multiple_choice' && q.options && Array.isArray(q.options) && q.options.length > 0) {
                    const options = [...q.options]
                    const correctLetter = q.correct_answer || 'A'
                    const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctLetter)

                    if (correctIndex !== -1 && correctIndex < options.length) {
                        const correctValue = options[correctIndex]

                        // Shuffle using Fisher-Yates
                        for (let i = options.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [options[i], options[j]] = [options[j], options[i]];
                        }

                        // Find new index of the correct value
                        const newCorrectIndex = options.indexOf(correctValue)
                        if (newCorrectIndex !== -1) {
                            q.options = options
                            q.correct_answer = ['A', 'B', 'C', 'D'][newCorrectIndex]
                        }
                    } else {
                        // If something is wrong with index, still shuffle but keep correct_answer if possible or default safely
                        for (let i = options.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [options[i], options[j]] = [options[j], options[i]];
                        }
                        q.options = options
                    }
                }

                // Inject diagram_image_url if we uploaded one (apply to all questions/variations)
                if (diagramImageUrl) {
                    q.diagram_image_url = diagramImageUrl
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

    // Calculate order_index
    let nextOrderIndex = 0
    if (collectionId) {
        const { data: maxOrderData } = await supabase
            .from('assignments')
            .select('order_index')
            .eq('collection_id', collectionId)
            .order('order_index', { ascending: false })
            .limit(1)

        if (maxOrderData && maxOrderData.length > 0) {
            nextOrderIndex = (maxOrderData[0].order_index || 0) + 1
        }
    }

    // 3. Create Assignment

    const { data: assignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert({
            classroom_id: classroomId,
            title: data.title,
            // category: data.category, // We let it default or set to 'homework' as placeholder since it's now generic
            published: true,
            collection_id: collectionId || null,
            order_index: nextOrderIndex,
            show_all_questions: data.show_all_questions || false,
            required_variations_count: data.required_variations_count || null,
            points_enabled: data.points_enabled || false,
            points: data.points_enabled ? (data.points || 1) : null
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
        diagram_image_url: index === 0 ? (q.diagram_image_url || null) : null,
        solution_text: q.solution_text || null,
        points: q.points || 1
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

export async function batchUpdateAssignments(
    assignmentIds: string[],
    classroomId: string,
    updates: any
): Promise<ActionState> {
    const supabase = await createClient()

    // Verify Auth
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
        .update(updates)
        .in('id', assignmentIds)
        .eq('classroom_id', classroomId)

    if (error) {
        console.error("Batch update error:", error)
        return { success: false, error: "Failed to perform bulk update" }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
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

export async function updateCollection(classroomId: string, collectionId: string, title: string, category: 'homework' | 'classwork', scheduledDate?: string, slidesUrl?: string | null): Promise<ActionState> {
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

    const updateData: any = {
        title: title,
        category: category,
        scheduled_date: scheduledDate || null
    }

    if (slidesUrl !== undefined) {
        updateData.slides_url = slidesUrl
    }

    const { error } = await supabase
        .from('collections')
        .update(updateData)
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

export async function uploadCollectionSlides(formData: FormData): Promise<{ success: boolean, url?: string, error?: string }> {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: "No file provided" }
    }

    console.log("Uploading collection slides to Supabase Storage...")
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
    const filePath = `slides/${fileName}`

    // Use a try-catch for storage interaction
    try {
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('collection_slides')
            .upload(filePath, file, {
                cacheControl: '31536000',
                upsert: false
            })

        if (uploadError) {
            console.error("Storage upload error:", uploadError)
            return { success: false, error: "Failed to upload slides" }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('collection_slides')
            .getPublicUrl(filePath)

        return { success: true, url: publicUrl }
    } catch (err) {
        console.error("Upload exception:", err)
        return { success: false, error: "An error occurred during upload" }
    }
}

export async function listCollectionSlides(): Promise<{ success: boolean, files?: { name: string, url: string }[], error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const { data, error } = await supabase.storage
            .from('collection_slides')
            .list('slides', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'desc' },
            })

        if (error) {
            console.error("Storage list error:", error)
            return { success: false, error: "Failed to list slides" }
        }

        const filesWithUrls = data.map(file => {
            const { data: { publicUrl } } = supabase.storage
                .from('collection_slides')
                .getPublicUrl(`slides/${file.name}`)

            return {
                name: file.name,
                url: publicUrl
            }
        })

        return { success: true, files: filesWithUrls }
    } catch (err) {
        console.error("List exception:", err)
        return { success: false, error: "An error occurred while fetching slides library" }
    }
}


export async function addExerciseToCollection(targetClassroomId: string, targetCollectionId: string, sourceAssignmentId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        // 1. Fetch Source Assignment and Questions
        const { data: sourceAss, error: assError } = await supabase
            .from('assignments')
            .select('*, questions(*)')
            .eq('id', sourceAssignmentId)
            .single()

        if (assError || !sourceAss) {
            console.error("Error fetching source assignment:", assError)
            return { success: false, error: "Source exercise not found" }
        }

        // 2. Verify teacher owns BOTH classrooms (the target and possibly the source)
        // We definitely need to check the target classroom ownership
        const { data: targetClassroom } = await supabase
            .from('classrooms')
            .select('teacher_id')
            .eq('id', targetClassroomId)
            .single()

        if (!targetClassroom || targetClassroom.teacher_id !== user.id) {
            return { success: false, error: "Unauthorized to manage the target classroom" }
        }

        // 3. Calculate order_index for the new assignment in the target collection
        let nextOrderIndex = 0
        const { data: maxOrderData } = await supabase
            .from('assignments')
            .select('order_index')
            .eq('collection_id', targetCollectionId)
            .order('order_index', { ascending: false })
            .limit(1)

        if (maxOrderData && maxOrderData.length > 0) {
            nextOrderIndex = (maxOrderData[0].order_index || 0) + 1
        }

        // 4. Create New Assignment (Copy)
        const { data: newAss, error: newAssError } = await supabase
            .from('assignments')
            .insert({
                classroom_id: targetClassroomId,
                collection_id: targetCollectionId,
                title: sourceAss.title,
                published: false, // Default to unpublished in the new home
                order_index: nextOrderIndex,
                show_all_questions: sourceAss.show_all_questions,
                required_variations_count: sourceAss.required_variations_count,
                points_enabled: sourceAss.points_enabled,
                points: sourceAss.points
            })
            .select()
            .single()

        if (newAssError || !newAss) {
            console.error("Error copying assignment:", newAssError)
            return { success: false, error: "Failed to create copied exercise" }
        }

        // 5. Copy Questions
        if (sourceAss.questions && sourceAss.questions.length > 0) {
            const questionsToInsert = sourceAss.questions.map((q: any) => ({
                assignment_id: newAss.id,
                latex_text: q.latex_text,
                question_type: q.question_type,
                correct_value: q.correct_value,
                tolerance_percent: q.tolerance_percent,
                options: q.options,
                correct_answer: q.correct_answer,
                diagram_type: q.diagram_type,
                diagram_svg: q.diagram_svg,
                diagram_image_url: q.diagram_image_url,
                solution_text: q.solution_text,
                points: q.points
            }))

            const { error: newQuestError } = await supabase
                .from('questions')
                .insert(questionsToInsert)

            if (newQuestError) {
                console.error("Error copying questions:", newQuestError)
            }
        }

        revalidatePath(`/teacher/class/${targetClassroomId}/collection/${targetCollectionId}`)
        return { success: true }
    } catch (err) {
        console.error("Deep copy import error:", err)
        return { success: false, error: "An unexpected error occurred during import" }
    }
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
        .select('*, assignments(id, points, points_enabled, published)')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

    if (!collections) return []

    // 2. Fetch Progress for this student
    const allAssignmentIds = collections.flatMap((c: any) => c.assignments.map((a: any) => a.id))

    // Use Admin Client to bypass RLS for reading other users' progress
    const supabaseAdmin = createAdminClient()

    let completedAssignmentIds = new Set<string>()
    let earnedPointsMap = new Map<string, number>()
    let submittedAnswersMap = new Map<string, any>()

    if (allAssignmentIds.length > 0) {
        const { data: progressData } = await supabaseAdmin
            .from('assignment_progress')
            .select('assignment_id, is_completed, earned_points, submitted_answers')
            .in('assignment_id', allAssignmentIds)
            .eq('student_id', studentId)

        if (progressData) {
            progressData.forEach((p: any) => {
                if (p.is_completed) completedAssignmentIds.add(p.assignment_id)
                if (p.earned_points != null) earnedPointsMap.set(p.assignment_id, p.earned_points)
                if (p.submitted_answers) submittedAnswersMap.set(p.assignment_id, p.submitted_answers)
            })
        }
    }

    // 3. calculate progress and points
    let classroomTotalPoints = 0
    let classroomEarnedPoints = 0

    const collectionsWithProgress = collections.map((collection: any) => {
        const total = collection.assignments.length
        const completed = collection.assignments.filter((a: any) => completedAssignmentIds.has(a.id)).length
        const progress = total === 0 ? 0 : (completed / total) * 100

        // Map assignments to status objects
        const assignmentStatuses = collection.assignments
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            .map((a: any) => {
                const earned = earnedPointsMap.get(a.id)
                const submitted = submittedAnswersMap.get(a.id)
                const totalPts = a.points || 0

                let status: 'correct' | 'incorrect' | 'unsubmitted' = 'unsubmitted'

                // If submitted answers exists and is not empty
                if (submitted && Object.keys(submitted).length > 0) {
                    if (earned != null && earned >= totalPts && totalPts > 0) {
                        status = 'correct'
                    } else {
                        status = 'incorrect'
                    }
                }

                return {
                    id: a.id,
                    status,
                    points: totalPts,
                    earned: earned || 0
                }
            })

        // Calculate points for this collection
        collection.assignments.forEach((a: any) => {
            if (a.points_enabled && a.published) {
                classroomTotalPoints += (a.points || 0)
                classroomEarnedPoints += (earnedPointsMap.get(a.id) || 0)
            }
        })

        return {
            ...collection,
            progress,
            totalAssignments: total,
            completedAssignments: completed,
            assignmentStatuses
        }
    })

    return {
        collections: collectionsWithProgress,
        totalPoints: classroomTotalPoints,
        earnedPoints: classroomEarnedPoints
    }
}



export async function deleteCollection(collectionId: string, classroomId: string, deleteExercises: boolean = false): Promise<ActionState> {
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

    if (deleteExercises) {
        // 1. Get all assignment IDs in this collection
        const { data: assignments } = await supabase
            .from('assignments')
            .select('id')
            .eq('collection_id', collectionId)

        const assignmentIds = assignments?.map(a => a.id) || []

        if (assignmentIds.length > 0) {
            // 2. Delete Submissions
            await supabase.from('submissions').delete().in('assignment_id', assignmentIds)
            // 3. Delete Questions
            await supabase.from('questions').delete().in('assignment_id', assignmentIds)
            // 4. Delete Assignments
            const { error: deleteAssError } = await supabase.from('assignments').delete().in('id', assignmentIds)
            if (deleteAssError) {
                console.error("Delete Assignments Error", deleteAssError)
                return { success: false, error: 'Failed to delete exercises' }
            }
        }
    } else {
        // Unlink assignments (set collection_id to null)
        const { error: unlinkError } = await supabase
            .from('assignments')
            .update({ collection_id: null })
            .eq('collection_id', collectionId)

        if (unlinkError) {
            console.error("Unlink Error", unlinkError)
            return { success: false, error: 'Failed to unlink exercises from collection' }
        }
    }

    // Finally, delete the collection
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

export async function updateClassroomIpSettings(
    classroomId: string,
    allowedIp: string,
    enabled: boolean
): Promise<ActionState> {
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
        .update({
            allowed_ip: allowedIp,
            ip_check_enabled: enabled
        })
        .eq('id', classroomId)

    if (error) {
        console.error(error)
        return { success: false, error: 'Failed to update IP settings' }
    }

    revalidatePath(`/teacher/class/${classroomId}`)
    return { success: true }
}

export async function getCurrentIp(): Promise<{ ip: string }> {
    const ip = await getClientIp()
    return { ip }
}

export async function syncClassroomIp(classroomId: string): Promise<ActionState> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    // Get current IP
    const currentIp = await getClientIp()

    // 1. Check if teacher owns the classroom and if IP restriction is enabled
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('teacher_id, allowed_ip, ip_check_enabled')
        .eq('id', classroomId)
        .single()

    if (!classroom || classroom.teacher_id !== user.id) {
        return { success: false, error: "Unauthorized" }
    }

    // 2. Only update if enabled and IF it actually changed
    if (classroom.ip_check_enabled && classroom.allowed_ip !== currentIp) {
        const { error } = await supabase
            .from('classrooms')
            .update({ allowed_ip: currentIp })
            .eq('id', classroomId)

        if (error) {
            console.error('IP Sync Error:', error)
            return { success: false, error: "Failed to sync IP" }
        }
    }

    return { success: true }
}


export async function updateAssignmentOrder(
    classroomId: string,
    collectionId: string,
    items: { id: string, order_index: number }[]
): Promise<ActionState> {
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
        return { success: false, error: "Unauthorized" }
    }

    // Perform updates in a loop (Supabase doesn't easily support bulk updates with different values for different rows in JS without RPC)
    // However, for small lists (exercises in a collection), individual updates are acceptable.
    // A better way would be an RPC but let's stick to this for simplicity if it's not too many.

    for (const item of items) {
        const { error } = await supabase
            .from('assignments')
            .update({ order_index: item.order_index })
            .eq('id', item.id)
            .eq('collection_id', collectionId)
            .eq('classroom_id', classroomId)

        if (error) {
            console.error(`Error updating order for ${item.id}:`, error)
        }
    }

    revalidatePath(`/teacher/class/${classroomId}/collection/${collectionId}`)
    return { success: true }
}

export async function getTeacherClassrooms(excludeClassroomId?: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
        .from('classrooms')
        .select('id, name')
        .eq('teacher_id', user.id)

    if (excludeClassroomId) {
        query = query.neq('id', excludeClassroomId)
    }

    const { data, error } = await query.order('name')

    if (error) {
        console.error('Error fetching teacher classrooms:', error)
        return []
    }

    return data
}

export async function getClassroomCollections(classroomId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('collections')
        .select('id, title, category')
        .eq('classroom_id', classroomId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching classroom collections:', error)
        return []
    }

    return data
}

export async function importCollection(targetClassroomId: string, sourceCollectionId: string): Promise<ActionState> {
    const supabase = await createClient()

    // 1. Verify Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        // 2. Fetch Source Collection
        const { data: sourceCollection, error: colError } = await supabase
            .from('collections')
            .select('*')
            .eq('id', sourceCollectionId)
            .single()

        if (colError || !sourceCollection) {
            return { success: false, error: "Source collection not found" }
        }

        // 3. Fetch Source Assignments and their Questions
        const { data: sourceAssignments, error: assError } = await supabase
            .from('assignments')
            .select('*, questions(*)')
            .eq('collection_id', sourceCollectionId)
            .order('order_index', { ascending: true })

        if (assError) {
            console.error("Error fetching source assignments:", assError)
            return { success: false, error: "Failed to fetch source exercises" }
        }

        // 4. Create New Collection in Target Classroom
        const { data: newCollection, error: newColError } = await supabase
            .from('collections')
            .insert({
                classroom_id: targetClassroomId,
                title: sourceCollection.title,
                category: sourceCollection.category,
                slides_url: sourceCollection.slides_url,
                scheduled_date: null // Don't copy schedule
            })
            .select()
            .single()

        if (newColError || !newCollection) {
            console.error("Error creating new collection:", newColError)
            return { success: false, error: "Failed to create new collection" }
        }

        // 5. Copy Assignments and Questions
        if (sourceAssignments && sourceAssignments.length > 0) {
            for (const sourceAss of sourceAssignments) {
                // Copy Assignment
                const { data: newAss, error: newAssError } = await supabase
                    .from('assignments')
                    .insert({
                        classroom_id: targetClassroomId,
                        collection_id: newCollection.id,
                        title: sourceAss.title,
                        published: false, // Default to unpublished
                        order_index: sourceAss.order_index,
                        show_all_questions: sourceAss.show_all_questions,
                        required_variations_count: sourceAss.required_variations_count,
                        points_enabled: sourceAss.points_enabled,
                        points: sourceAss.points
                    })
                    .select()
                    .single()

                if (newAssError || !newAss) {
                    console.error("Error copying assignment:", newAssError)
                    continue // Skip this assignment if it fails
                }

                // Copy Questions
                if (sourceAss.questions && sourceAss.questions.length > 0) {
                    const questionsToInsert = sourceAss.questions.map((q: any) => ({
                        assignment_id: newAss.id,
                        latex_text: q.latex_text,
                        question_type: q.question_type,
                        correct_value: q.correct_value,
                        tolerance_percent: q.tolerance_percent,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        diagram_type: q.diagram_type,
                        diagram_svg: q.diagram_svg,
                        diagram_image_url: q.diagram_image_url,
                        solution_text: q.solution_text,
                        points: q.points
                    }))

                    const { error: newQuestError } = await supabase
                        .from('questions')
                        .insert(questionsToInsert)

                    if (newQuestError) {
                        console.error("Error copying questions:", newQuestError)
                    }
                }
            }
        }

        revalidatePath(`/teacher/class/${targetClassroomId}`)
        return { success: true }
    } catch (err) {
        console.error("Import error:", err)
        return { success: false, error: "An unexpected error occurred during import" }
    }
}

export async function getCollectionExercises(collectionId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('assignments')
        .select('id, title')
        .eq('collection_id', collectionId)
        .order('order_index', { ascending: true })

    if (error) {
        console.error('Error fetching collection exercises:', error)
        return []
    }

    return data
}
