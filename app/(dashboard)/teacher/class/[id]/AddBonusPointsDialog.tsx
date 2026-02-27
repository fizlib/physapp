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
import { Gift, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addBonusPointsToAll } from "../../actions"

interface AddBonusPointsDialogProps {
    classroomId: string
}

export function AddBonusPointsDialog({ classroomId }: AddBonusPointsDialogProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState("1")
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleSubmit = async () => {
        const numAmount = parseInt(amount, 10)
        if (!Number.isFinite(numAmount) || numAmount < 1) {
            toast.error("Please enter a valid number (minimum 1)")
            return
        }

        setIsPending(true)
        try {
            const result = await addBonusPointsToAll(classroomId, numAmount)
            if (result.success) {
                toast.success(`Added ${numAmount} bonus point${numAmount > 1 ? 's' : ''} to all students`)
                setOpen(false)
                setAmount("1")
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Gift className="mr-2 h-4 w-4" />
                    Bonus Points
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Add Bonus Points</DialogTitle>
                    <DialogDescription>
                        Add bonus points to all enrolled students. These points will be added to their earned total without increasing the maximum points available.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                            This amount will be added to every student&apos;s current bonus points.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Gift className="mr-2 h-4 w-4" />
                                Add to All
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
