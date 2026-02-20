import { Loader2 } from "lucide-react"

export default function StudentClassroomLoading() {
    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/10 py-16">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading classroom...</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
