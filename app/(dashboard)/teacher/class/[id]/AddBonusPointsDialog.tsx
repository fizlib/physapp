"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Gift, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import { addBonusPointsToStudents, getClassroomStudents } from "../../actions"

interface AddBonusPointsDialogProps {
    classroomId: string
}

interface BonusStudent {
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
}

export function AddBonusPointsDialog({ classroomId }: AddBonusPointsDialogProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState("1")
    const [isPending, setIsPending] = useState(false)
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [students, setStudents] = useState<BonusStudent[]>([])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const router = useRouter()

    const loadStudents = async () => {
        setLoadingStudents(true)
        setStudents([])
        setSelectedIds(new Set())
        try {
            const data = await getClassroomStudents(classroomId)
            setStudents(data)
            setSelectedIds(new Set(data.map((student) => student.id)))
        } catch (error) {
            console.error("Failed to load students for bonus points:", error)
            toast.error("Failed to load students")
        } finally {
            setLoadingStudents(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) {
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
        const trimmedAmount = amount.trim()
        if (!/^\d+$/.test(trimmedAmount)) {
            toast.error("Please enter a valid whole number (minimum 1)")
            return
        }

        const numAmount = Number(trimmedAmount)
        if (!Number.isInteger(numAmount) || numAmount < 1) {
            toast.error("Please enter a valid whole number (minimum 1)")
            return
        }

        if (selectedIds.size === 0) {
            toast.error("Please select at least one student")
            return
        }

        setIsPending(true)
        try {
            const result = await addBonusPointsToStudents(classroomId, numAmount, Array.from(selectedIds))
            if (result.success) {
                toast.success(`Added ${numAmount} bonus point${numAmount > 1 ? 's' : ''} to ${selectedIds.size} student${selectedIds.size === 1 ? '' : 's'}`)
                setOpen(false)
                setAmount("1")
                setSelectedIds(new Set())
                router.refresh()
            } else {
                toast.error(result.error || "Failed to add bonus points")
            }
        } catch (error) {
            console.error("Failed to add bonus points:", error)
            toast.error("An error occurred")
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Gift className="mr-2 h-4 w-4" />
                    Bonus Points
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-amber-600" />
                        Add Bonus Points
                    </DialogTitle>
                    <DialogDescription>
                        Add bonus points to selected enrolled students. These points will be added to their earned total without increasing the maximum points available.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
                    <div className="space-y-2">
                        <Label htmlFor="bonus-amount">Points to add</Label>
                        <Input
                            id="bonus-amount"
                            type="number"
                            min="1"
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="1"
                            className="font-mono"
                            disabled={isPending}
                        />
                        <p className="text-xs text-muted-foreground">
                            This amount will be added to each selected student&apos;s current bonus points.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                Mokiniai ({selectedIds.size}/{students.length})
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
                                    const name = [student.first_name, student.last_name].filter(Boolean).join(' ') || student.email || 'Unnamed'
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
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending || loadingStudents || selectedIds.size === 0}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Gift className="mr-2 h-4 w-4" />
                                Add ({selectedIds.size})
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
