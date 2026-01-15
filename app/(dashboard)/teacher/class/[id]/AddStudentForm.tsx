"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ActionState, addStudent } from "../../actions"

const initialState: ActionState = {
    success: false,
    message: "",
    error: ""
}

export function AddStudentForm({ classroomId }: { classroomId: string }) {
    const [state, formAction, isPending] = useActionState(addStudent, initialState)

    return (
        <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="classroomId" value={classroomId} />
            <div className="grid gap-2">
                <Label htmlFor="email">Student Email</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="student@example.com"
                    required
                />
            </div>
            {state?.error && (
                <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state?.message && (
                <p className="text-sm text-green-600">{state.message}</p>
            )}
            <Button type="submit" disabled={isPending}>
                {isPending ? "Adding..." : "Add Student"}
            </Button>
        </form>
    )
}
