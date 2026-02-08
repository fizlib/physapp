"use client"

import { useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Eye, EyeOff, Award } from "lucide-react"
import { toast } from "sonner"
import { batchUpdateAssignments } from "../../../../actions"

interface CollectionBatchActionsProps {
    assignments: any[]
    classroomId: string
}

export function CollectionBatchActions({ assignments, classroomId }: CollectionBatchActionsProps) {
    const [loading, setLoading] = useState(false)

    const handleBatchUpdate = async (type: 'publish_all' | 'unpublish_all' | 'publish_graded' | 'unpublish_graded' | 'enable_points' | 'disable_points') => {
        setLoading(true)
        try {
            let targetIds: string[] = []
            let updates: any = {}
            let message = ""

            switch (type) {
                case 'publish_all':
                    targetIds = assignments.map(a => a.id)
                    updates = { published: true }
                    message = "Published all exercises"
                    break
                case 'unpublish_all':
                    targetIds = assignments.map(a => a.id)
                    updates = { published: false }
                    message = "Unpublished all exercises"
                    break
                case 'publish_graded':
                    targetIds = assignments.filter(a => a.points_enabled).map(a => a.id)
                    updates = { published: true }
                    message = "Published all graded exercises"
                    break
                case 'unpublish_graded':
                    targetIds = assignments.filter(a => a.points_enabled).map(a => a.id)
                    updates = { published: false }
                    message = "Unpublished all graded exercises"
                    break
                case 'enable_points':
                    targetIds = assignments.map(a => a.id)
                    updates = { points_enabled: true, points: 1 } // Default to 1 point if enabled batch
                    message = "Enabled points for all exercises"
                    break
                case 'disable_points':
                    targetIds = assignments.map(a => a.id)
                    updates = { points_enabled: false }
                    message = "Disabled points for all exercises"
                    break
            }

            if (targetIds.length === 0) {
                toast.info("No exercises to update")
                return
            }

            const result = await batchUpdateAssignments(targetIds, classroomId, updates)
            if (result.success) {
                toast.success(message)
            } else {
                toast.error(result.error || "Batch update failed")
            }
        } catch (err) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading || assignments.length === 0}>
                    Batch Actions
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visibility</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleBatchUpdate('publish_all')}>
                    <Eye className="mr-2 h-4 w-4" />
                    Publish all
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchUpdate('unpublish_all')}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Unpublish all
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Graded Exercises</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleBatchUpdate('publish_graded')}>
                    <Eye className="mr-2 h-4 w-4" />
                    Publish all graded
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchUpdate('unpublish_graded')}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Unpublish all graded
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Point Transformation</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleBatchUpdate('enable_points')}>
                    <Award className="mr-2 h-4 w-4 text-amber-500" />
                    Transform all to graded
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBatchUpdate('disable_points')}>
                    <Award className="mr-2 h-4 w-4 text-muted-foreground" />
                    Transform all to non-graded
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
