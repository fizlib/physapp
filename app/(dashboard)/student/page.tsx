import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "@/components/logout-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function StudentDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    // RLS policy "Students can view enrolled classrooms" ensures this returns
    // only classrooms the student is enrolled in.
    const { data: classrooms } = await supabase
        .from('classrooms')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
                        <LogoutButton />
                    </div>
                    <p className="text-muted-foreground mt-1">View your enrolled classrooms and assignments.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classrooms?.map((classroom) => (
                    <Link href={`/student/class/${classroom.id}`} key={classroom.id}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <CardTitle>{classroom.name}</CardTitle>
                                <CardDescription>Code: <span className="font-mono font-bold">{classroom.join_code}</span></CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-muted-foreground">
                                    Click to view assignments
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {classrooms?.length === 0 && (
                    <div className="col-span-full text-center py-12 border rounded-lg bg-muted/10 border-dashed">
                        <h3 className="text-lg font-semibold">You are not enrolled in any classes</h3>
                        <p className="text-muted-foreground">Ask your teacher for a join code to get started.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
