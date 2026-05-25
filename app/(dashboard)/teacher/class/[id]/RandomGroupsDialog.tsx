"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Shuffle, Users } from "lucide-react"
import { toast } from "sonner"
import { assignRandomGroupsToStudents, getClassroomStudents } from "../../actions"

type LeftoverStrategy = "smaller_group" | "distribute"

interface RandomGroupsDialogProps {
    classroomId: string
}

interface RandomGroupStudent {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
}

interface RandomGroupResultMember {
    id: string
    name: string
    email: string | null
}

interface RandomGroupResultGroup {
    groupNumber: number
    members: RandomGroupResultMember[]
}

function getStudentName(student: RandomGroupStudent): string {
    return [student.first_name, student.last_name].filter(Boolean).join(' ') || student.email || 'Unnamed'
}

function buildGroupSizePreview(selectedCount: number, groupSize: number, strategy: LeftoverStrategy): number[] {
    if (!Number.isInteger(groupSize) || groupSize < 2 || selectedCount < groupSize) return []

    const remainder = selectedCount % groupSize
    if (remainder === 0 || strategy === "smaller_group") {
        const sizes: number[] = []
        for (let remaining = selectedCount; remaining > 0; remaining -= groupSize) {
            sizes.push(Math.min(groupSize, remaining))
        }
        return sizes
    }

    const fullGroupCount = Math.floor(selectedCount / groupSize)
    const sizes = Array.from({ length: fullGroupCount }, () => groupSize)
    for (let i = 0; i < remainder; i++) {
        sizes[i % sizes.length] += 1
    }
    return sizes
}

export function RandomGroupsDialog({ classroomId }: RandomGroupsDialogProps) {
    const [open, setOpen] = useState(false)
    const [groupSize, setGroupSize] = useState("2")
    const [leftoverStrategy, setLeftoverStrategy] = useState<LeftoverStrategy>("smaller_group")
    const [isPending, setIsPending] = useState(false)
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [students, setStudents] = useState<RandomGroupStudent[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [resultGroups, setResultGroups] = useState<RandomGroupResultGroup[] | null>(null)

    const parsedGroupSize = Number(groupSize.trim())
    const isValidGroupSize = Number.isInteger(parsedGroupSize) && parsedGroupSize >= 2
    const selectedCount = selectedIds.size
    const remainder = isValidGroupSize && selectedCount >= parsedGroupSize ? selectedCount % parsedGroupSize : 0
    const needsLeftoverChoice = remainder > 0
    const canSubmit = isValidGroupSize && selectedCount >= parsedGroupSize && !isPending && !loadingStudents

    const groupSizePreview = useMemo(
        () => buildGroupSizePreview(selectedCount, parsedGroupSize, leftoverStrategy),
        [leftoverStrategy, parsedGroupSize, selectedCount]
    )

    useEffect(() => {
        if (!needsLeftoverChoice) return
        setLeftoverStrategy(remainder === 1 ? "distribute" : "smaller_group")
    }, [needsLeftoverChoice, remainder])

    const loadStudents = async () => {
        setLoadingStudents(true)
        setStudents([])
        setSelectedIds(new Set())
        try {
            const data = await getClassroomStudents(classroomId)
            setStudents(data)
            setSelectedIds(new Set(data.map((student) => student.id)))
        } catch (error) {
            console.error("Failed to load students for random groups:", error)
            toast.error("Failed to load students")
        } finally {
            setLoadingStudents(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) {
            setGroupSize("2")
            setLeftoverStrategy("smaller_group")
            setResultGroups(null)
            loadStudents()
        }
    }

    const toggleStudent = (studentId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(studentId)) {
                next.delete(studentId)
            } else {
                next.add(studentId)
            }
            return next
        })
    }

    const toggleAll = () => {
        if (selectedIds.size === students.length && students.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(students.map((student) => student.id)))
        }
    }

    const handleSubmit = async () => {
        if (!isValidGroupSize) {
            toast.error("Group size must be a whole number of at least 2")
            return
        }

        if (selectedCount < parsedGroupSize) {
            toast.error(`Select at least ${parsedGroupSize} students`)
            return
        }

        setIsPending(true)
        try {
            const result = await assignRandomGroupsToStudents(
                classroomId,
                parsedGroupSize,
                needsLeftoverChoice ? leftoverStrategy : "smaller_group",
                Array.from(selectedIds)
            )

            if (result.success && result.groups) {
                setResultGroups(result.groups)
                toast.success("Random groups created")
            } else {
                toast.error(result.error || "Failed to create random groups")
            }
        } catch (error) {
            console.error("Failed to create random groups:", error)
            toast.error("An error occurred")
        } finally {
            setIsPending(false)
        }
    }

    const handleCreateAnother = () => {
        setResultGroups(null)
        setGroupSize("2")
        setLeftoverStrategy("smaller_group")
        loadStudents()
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Shuffle className="mr-2 h-4 w-4" />
                    Random Groups
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shuffle className="h-5 w-5 text-primary" />
                        Random Groups
                    </DialogTitle>
                    <DialogDescription>
                        Select enrolled students and split them into random groups.
                    </DialogDescription>
                </DialogHeader>

                {resultGroups ? (
                    <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
                        <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                            Groups were saved and selected students will see a popup after refreshing or navigating inside the app.
                        </div>
                        <div className="space-y-3">
                            {resultGroups.map((group) => (
                                <div key={group.groupNumber} className="rounded-md border bg-background p-3">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <h3 className="text-sm font-semibold">Group {group.groupNumber}</h3>
                                        <span className="text-xs text-muted-foreground">{group.members.length} students</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {group.members.map((member) => (
                                            <div key={member.id} className="flex min-w-0 flex-col rounded-md bg-muted/30 px-2 py-1.5">
                                                <span className="truncate text-sm font-medium">{member.name}</span>
                                                {member.email && (
                                                    <span className="truncate font-mono text-[10px] text-muted-foreground">{member.email}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
                        <div className="space-y-2">
                            <Label htmlFor="random-group-size">Students per group</Label>
                            <Input
                                id="random-group-size"
                                type="number"
                                min="2"
                                step="1"
                                value={groupSize}
                                onChange={(e) => setGroupSize(e.target.value)}
                                placeholder="2"
                                className="font-mono"
                                disabled={isPending}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1.5">
                                    <Users className="h-4 w-4" />
                                    Mokiniai ({selectedCount}/{students.length})
                                </Label>
                                <div className="flex items-center gap-2 pr-1">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Visi</span>
                                    <Checkbox
                                        checked={students.length > 0 && selectedIds.size === students.length}
                                        onCheckedChange={toggleAll}
                                        disabled={isPending || loadingStudents || students.length === 0}
                                    />
                                </div>
                            </div>

                            {loadingStudents ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : students.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-4 text-center">
                                    No students enrolled yet.
                                </p>
                            ) : (
                                <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                                    {students.map((student) => {
                                        const name = getStudentName(student)
                                        const isSelected = selectedIds.has(student.id)
                                        return (
                                            <label
                                                key={student.id}
                                                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors ${isSelected ? '' : 'opacity-60'}`}
                                            >
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleStudent(student.id)}
                                                        disabled={isPending}
                                                    />
                                                    <span className="truncate text-sm font-medium">{name}</span>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {isValidGroupSize && selectedCount > 0 && selectedCount < parsedGroupSize && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                                Select at least {parsedGroupSize} students to create groups of this size.
                            </div>
                        )}

                        {needsLeftoverChoice && (
                            <div className="space-y-2">
                                <Label>Leftover students</Label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => setLeftoverStrategy("smaller_group")}
                                        disabled={isPending}
                                        className={`rounded-md border p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50 ${leftoverStrategy === "smaller_group" ? "border-primary bg-primary/5" : "border-border"}`}
                                    >
                                        <span className="block text-sm font-semibold">Smaller final group</span>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            Keep full-size groups and make the last group smaller.
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLeftoverStrategy("distribute")}
                                        disabled={isPending}
                                        className={`rounded-md border p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50 ${leftoverStrategy === "distribute" ? "border-primary bg-primary/5" : "border-border"}`}
                                    >
                                        <span className="block text-sm font-semibold">Make groups bigger</span>
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            Add leftover students to existing groups.
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {groupSizePreview.length > 0 && (
                            <div className="rounded-md border bg-muted/20 p-2.5 text-xs text-muted-foreground">
                                Preview: {groupSizePreview.map((size) => `${size}`).join(', ')} students per group
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {resultGroups ? (
                        <>
                            <Button variant="ghost" onClick={handleCreateAnother} disabled={isPending || loadingStudents}>
                                Create Another
                            </Button>
                            <Button onClick={() => setOpen(false)}>
                                Done
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={!canSubmit}>
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Shuffle className="mr-2 h-4 w-4" />
                                        Create ({selectedCount})
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
