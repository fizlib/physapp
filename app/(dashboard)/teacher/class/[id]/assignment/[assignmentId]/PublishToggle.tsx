"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch" // Need to check if this exists, usually does in shadcn
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { toggleAssignmentPublish } from "../../../../actions"
import { Loader2 } from "lucide-react"

export function PublishToggle({ assignmentId, classroomId, initialPublished }: { assignmentId: string, classroomId: string, initialPublished: boolean }) {
    const [published, setPublished] = useState(initialPublished)
    const [loading, setLoading] = useState(false)

    const handleToggle = async (checked: boolean) => {
        setPublished(checked) // Optimistic update
        setLoading(true)
        try {
            const result = await toggleAssignmentPublish(assignmentId, classroomId, checked)
            if (!result.success) {
                setPublished(!checked) // Revert
                toast.error("Failed to update status")
            } else {
                toast.success(checked ? "Assignment Published" : "Assignment Unrealized (Draft)")
            }
        } catch (err) {
            setPublished(!checked)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center space-x-2">
            {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <Label htmlFor="publish-mode" className="text-sm font-medium">
                {published ? "Published" : "Draft Mode"}
            </Label>
            {/* If Switch doesn't exist, we might need a fallback, checking ui components next */}
            <input
                type="checkbox"
                id="publish-mode"
                checked={published}
                onChange={(e) => handleToggle(e.target.checked)}
                className="toggle"
            />
        </div>
    )
}
