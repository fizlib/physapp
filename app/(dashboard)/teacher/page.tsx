import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "@/components/logout-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClassroom } from "./actions"

export default async function TeacherDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return <div>Please log in</div>

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    const { data: classrooms } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
                        {profile?.is_admin && (
                            <Button variant="outline" asChild>
                                <Link href="/admin">Admin Panel</Link>
                            </Button>
                        )}
                        <LogoutButton />
                    </div>
                    <p className="text-muted-foreground mt-1">Manage your classrooms and assignments.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Classroom
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <form action={createClassroom}>
                            <DialogHeader>
                                <DialogTitle>Create New Classroom</DialogTitle>
                                <DialogDescription>
                                    Give your classroom a name. A join code will be generated automatically.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Classroom Name</Label>
                                    <Input id="name" name="name" placeholder="Physics 101" required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit">Create Classroom</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classrooms?.map((classroom) => (
                    <Link href={`/teacher/class/${classroom.id}`} key={classroom.id}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                            <CardHeader>
                                <CardTitle>{classroom.name}</CardTitle>
                                <CardDescription>Code: <span className="font-mono font-bold">{classroom.join_code}</span></CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Future: Show student count, assignments due */}
                                <div className="text-sm text-muted-foreground">
                                    Click to manage
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {classrooms?.length === 0 && (
                    <div className="col-span-full text-center py-12 border rounded-lg bg-muted/10 border-dashed">
                        <h3 className="text-lg font-semibold">No classrooms yet</h3>
                        <p className="text-muted-foreground">Create your first classroom to get started.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
