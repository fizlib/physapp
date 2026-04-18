import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { MarkdownContent } from "@/components/ui/markdown-editor"

export default async function StudentMessagePage({ params }: { params: Promise<{ messageId: string }> }) {
    const supabase = await createClient()
    const { messageId } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Prašome prisijungti</div>

    const adminClient = createAdminClient()

    // Fetch the message using admin client (bypasses RLS) but filter by student_id for security
    const { data: message, error } = await adminClient
        .from('student_messages')
        .select('*')
        .eq('id', messageId)
        .eq('student_id', user.id)
        .single()

    if (error || !message) notFound()

    // Mark as read using admin client
    if (!message.is_read) {
        await adminClient
            .from('student_messages')
            .update({ is_read: true })
            .eq('id', messageId)
            .eq('student_id', user.id)
    }

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-3xl space-y-6">
                <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                    <Link href="/student">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Grįžti į pagrindinį
                    </Link>
                </Button>
                <div className="border-b pb-4">
                    <h1 className="text-2xl font-serif font-bold tracking-tight">{message.title}</h1>
                    <p className="text-xs text-muted-foreground mt-2">
                        {new Date(message.created_at).toLocaleDateString('lt-LT', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>
                <div className="bg-card rounded-lg border p-6">
                    <MarkdownContent content={message.content} />
                </div>
            </div>
        </div>
    )
}
