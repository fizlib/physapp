import { createClient } from "@/lib/supabase/server"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateClassroomDialog } from "./_components/CreateClassroomDialog"
import { ClassroomCard } from "./_components/ClassroomCard"

import { getCachedUser, getCachedProfile } from "@/lib/data-service"

export default async function TeacherDashboard() {
    const supabase = await createClient()
    const user = await getCachedUser()

    if (!user) return (
        <div className="flex h-screen items-center justify-center text-muted-foreground">
            Please log in to view this page.
        </div>
    )

    const [profile, { data: classrooms }] = await Promise.all([
        getCachedProfile(user.id),
        supabase
            .from('classrooms')
            .select('*')
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false })
    ])

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-6xl space-y-8 animate-fade-in-up">
                {/* Header Section */}
                <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                Instructor Hub
                            </h1>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Manage your classrooms, assignments, and students.
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4">
                            <CreateClassroomDialog />
                        </div>
                    </div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classrooms?.map((classroom) => (
                        <ClassroomCard key={classroom.id} classroom={classroom} />
                    ))}

                    {classrooms?.length === 0 && (
                        <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-border/60 bg-muted/5 p-8 text-center text-muted-foreground">
                            <div className="rounded-full bg-muted/30 p-4">
                                <Plus className="h-8 w-8 opacity-40" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-medium text-foreground">No classrooms yet</h3>
                                <p className="text-sm">Create your first class to get started.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
