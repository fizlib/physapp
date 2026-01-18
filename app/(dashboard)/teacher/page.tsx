import { createClient } from "@/lib/supabase/server"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Settings } from "lucide-react"
import Link from "next/link"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClassroom } from "./actions"

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
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="gap-2 shadow-sm">
                                    <Plus className="h-4 w-4" />
                                    New Classroom
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <form action={async (formData) => {
                                    "use server"
                                    await createClassroom(formData)
                                }}>
                                    <DialogHeader>
                                        <DialogTitle className="font-serif text-2xl">Create Classroom</DialogTitle>
                                        <DialogDescription>
                                            Enter the name for your new class. A unique join code will be generated.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Classroom Name</Label>
                                            <Input id="name" name="name" placeholder="e.g. Advanced Quantum Mechanics" required className="bg-muted/30" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Classroom Type</Label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input type="radio" name="type" value="school_class" defaultChecked className="accent-primary" />
                                                    School Class
                                                </label>
                                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input type="radio" name="type" value="private_student" className="accent-primary" />
                                                    Private Student
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                School Classes have Classwork/Homework. Private Students only have Homework.
                                            </p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit">Create Laboratory</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classrooms?.map((classroom) => (
                        <Link href={`/teacher/class/${classroom.id}`} key={classroom.id} className="group h-full">
                            <Card className="h-full border-border/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                                <CardHeader className="space-y-1">
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="font-medium tracking-tight group-hover:text-primary">
                                            {classroom.name}
                                        </CardTitle>
                                        <Settings className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>

                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>Manage Students</span>
                                        </span>
                                        <span className="text-xs opacity-50 group-hover:opacity-100 transition-opacity">
                                            Enter Class &rarr;
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
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
