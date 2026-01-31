import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { CollectionPlayer } from "./CollectionPlayer"
import { getClientIp } from "@/lib/ip"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function StudentCollectionPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const { id, collectionId } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    const studentIp = await getClientIp()

    // Fetch collection with assignments and their questions
    // This deep fetch is important
    const { data: collection } = await supabase
        .from('collections')
        .select(`
            *,
            assignments (
                *,
                questions (*)
            )
        `)
        .eq('id', collectionId)
        .eq('classroom_id', id)
        .single()

    if (!collection) notFound()

    // 2. IP Restriction Check
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('allowed_ip, ip_check_enabled')
        .eq('id', id)
        .single()

    const isRestricted = collection.category === 'classwork' &&
        classroom?.ip_check_enabled &&
        classroom?.allowed_ip &&
        studentIp !== classroom.allowed_ip

    if (isRestricted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-background">
                <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldAlert className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight">Access Restricted</h1>
                        <p className="text-muted-foreground">
                            This classwork collection is restricted to the classroom network only.
                            You are currently connected from <span className="font-mono text-red-500">{studentIp}</span>.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/student/class/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Classroom
                        </Link>
                    </Button>
                </div>
            </div>
        )
    }

    // Key Step: Sort assignments by order_index
    if (collection.assignments) {
        collection.assignments.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))

        // Also sort questions for each assignment just in case
        collection.assignments.forEach((assign: any) => {
            if (assign.questions) {
                // Assuming creation order is fine for questions, but if we had question index, use it.
                // Database usually returns in insertion order or arbitrary.
                // Ideally add .order() to the query, but nested order in Supabase JS is tricky.
                // Simple sort by created_at
                assign.questions.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            }
        })
    }

    // Fetch progress
    const assignmentIds = collection.assignments?.map((a: any) => a.id) || []
    let progressData: any[] = []

    if (assignmentIds.length > 0) {
        const { data: progress } = await supabase
            .from('assignment_progress')
            .select('*')
            .in('assignment_id', assignmentIds)

        if (progress) {
            progressData = progress
        }
    }

    return (
        <CollectionPlayer collection={collection} classroomId={id} progressData={progressData} />
    )
}
