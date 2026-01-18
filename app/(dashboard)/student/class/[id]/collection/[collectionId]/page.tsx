import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { CollectionPlayer } from "./CollectionPlayer"

export default async function StudentCollectionPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const { id, collectionId } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

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

    return (
        <CollectionPlayer collection={collection} classroomId={id} />
    )
}
