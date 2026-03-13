import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SlidesButton } from "@/components/student/SlidesButton"
import { MarkdownContent } from "@/components/ui/markdown-editor"

export default async function TheoryPage({ params }: { params: Promise<{ id: string, collectionId: string }> }) {
    const supabase = await createClient()
    const { id, collectionId } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Prašome prisijungti</div>

    const { data: collection } = await supabase
        .from('collections')
        .select('id, title, slides_url, theory_content')
        .eq('id', collectionId)
        .eq('classroom_id', id)
        .single()

    if (!collection) notFound()

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-3xl space-y-6">
                <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                    <Link href={`/student/class/${id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Grįžti į klasę
                    </Link>
                </Button>
                <div className="border-b pb-4">
                    <h1 className="text-2xl font-serif font-bold tracking-tight">{collection.title} – Teorija</h1>
                </div>

                {collection.slides_url && (
                    <div>
                        <SlidesButton
                            url={collection.slides_url}
                            title={collection.title}
                            variant="default"
                            className="h-10"
                        />
                    </div>
                )}

                {collection.theory_content && (
                    <div className="bg-card rounded-lg border p-6">
                        <MarkdownContent content={collection.theory_content} />
                    </div>
                )}

                {!collection.slides_url && !collection.theory_content && (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">Teorijos medžiaga dar nepateikta.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
