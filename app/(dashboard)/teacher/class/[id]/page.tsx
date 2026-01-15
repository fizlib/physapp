import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AddStudentForm } from "./AddStudentForm"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function ClassroomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

    // 1. Fetch Classroom
    const { data: classroom } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', id)
        .single()

    if (!classroom) notFound()

    // 2. Fetch Students (joined via enrollments)
    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('*, profiles:student_id(id, role, created_at)')
        .eq('classroom_id', id)

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/teacher">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <div className="flex justify-between items-start flex-1">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{classroom.name}</h1>
                        <p className="text-muted-foreground mt-1">Join Code: <span className="font-mono font-bold text-primary">{classroom.join_code}</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Assignments, etc - Placeholder) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Assignments</CardTitle>
                            <CardDescription>Manage assignments for this class.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground italic">No assignments created yet.</p>
                            <Button variant="outline" className="mt-4" disabled>Create Assignment (Coming Soon)</Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar (Students) */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Add Student</CardTitle>
                            <CardDescription>Add an existing student by email.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AddStudentForm classroomId={classroom.id} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Enrolled Students</CardTitle>
                            <CardDescription>Total: {enrollments?.length || 0}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {enrollments?.map((enrollment: any) => (
                                    <li key={enrollment.id} className="text-sm p-2 bg-muted rounded-md flex justify-between items-center group">
                                        <span className="font-mono text-xs text-muted-foreground truncate w-full">
                                            {enrollment.student_id}
                                        </span>
                                    </li>
                                ))}
                                {enrollments?.length === 0 && (
                                    <li className="text-sm text-muted-foreground">No students enrolled.</li>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
