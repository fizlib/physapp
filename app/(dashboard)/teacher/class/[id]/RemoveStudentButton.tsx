"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { removeStudent, ActionState } from "../../actions"

const initialState: ActionState = {
    success: false,
    message: "",
    error: ""
}

export function RemoveStudentButton({ studentId, classroomId }: { studentId: string, classroomId: string }) {
    const [state, formAction, isPending] = useActionState(removeStudent, initialState)

    return (
        <form action={formAction}>
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="classroomId" value={classroomId} />
            <Button
                variant="ghost"
                size="icon"
                type="submit"
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                title="Remove Student"
            >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove</span>
            </Button>
            {state?.error && (
                <p className="sr-only" role="alert">{state.error}</p>
            )}
        </form>
    )
}
