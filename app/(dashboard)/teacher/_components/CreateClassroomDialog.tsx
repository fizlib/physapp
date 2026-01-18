'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
import { createClassroom } from "../actions"

export function CreateClassroomDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsPending(true)
        try {
            const result = await createClassroom(formData)
            if (result.success) {
                setOpen(false)
            } else {
                // handle error if needed
                console.error(result.error)
            }
        } finally {
            setIsPending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-sm">
                    <Plus className="h-4 w-4" />
                    New Classroom
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Create Classroom</DialogTitle>
                        <DialogDescription>
                            Enter the name for your new class.
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
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
