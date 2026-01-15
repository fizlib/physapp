import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "@/components/logout-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { BookOpen } from "lucide-react"

export default async function StudentDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return (
        <div className="flex h-screen items-center justify-center text-muted-foreground">
            Please log in to view this page.
        </div>
    )

    // RLS policy "Students can view enrolled classrooms" ensures this returns
    // only classrooms the student is enrolled in.
    const { data: classrooms } = await supabase
        .from('classrooms')
        .select('*')
        .order('created_at', { ascending: false })

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-5xl space-y-8 animate-fade-in-up">
                <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                            My Physics Lab
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Welcome back. Continue your exploration of the universe.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <LogoutButton />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classrooms?.map((classroom) => (
                        <Link href={`/student/class/${classroom.id}`} key={classroom.id} className="group h-full">
                            <Card className="h-full border-border/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                                <CardHeader className="space-y-1">
                                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <BookOpen className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="font-medium tracking-tight group-hover:text-primary">
                                        {classroom.name}
                                    </CardTitle>
                                    <CardDescription className="font-mono text-xs tracking-wider opacity-70">
                                        CODE: {classroom.join_code}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground group-hover:text-foreground/80">
                                        View modules & assignments &rarr;
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {classrooms?.length === 0 && (
                        <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-border/60 bg-muted/5 p-8 text-center text-muted-foreground">
                            <div className="rounded-full bg-muted/30 p-4">
                                <BookOpen className="h-8 w-8 opacity-40" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-medium text-foreground">No classrooms found</h3>
                                <p className="text-sm">You aren't enrolled in any physics courses yet.</p>
                            </div>
                            <p className="max-w-xs text-xs opacity-70">
                                Ask your instructor for a unique class code to join their laboratory.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
