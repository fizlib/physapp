"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus } from "lucide-react"
import { createCollection } from "../../actions"
import { toast } from "sonner"

export function CreateCollectionDialog({ classroomId, classroomType = 'school_class' }: { classroomId: string, classroomType?: string }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [category, setCategory] = useState<'homework' | 'classwork'>('homework')

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setLoading(true)
        try {
            const result = await createCollection(classroomId, title, category)
            if (result.success) {
                toast.success("Collection created successfully!")
                setOpen(false)
                setTitle("")
                setCategory('homework')
            } else {
                toast.error(result.error || "Failed to create collection")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    New Collection
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Exercise Collection</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="collection-title">Collection Title</Label>
                        <Input
                            id="collection-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Kinematics Chapter 1"
                            disabled={loading}
                        />
                    </div>

                    {classroomType === 'school_class' && (
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="category"
                                        value="classwork"
                                        checked={category === 'classwork'}
                                        onChange={() => setCategory('classwork')}
                                        className="accent-primary"
                                    />
                                    Classwork
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="category"
                                        value="homework"
                                        checked={category === 'homework'}
                                        onChange={() => setCategory('homework')}
                                        className="accent-primary"
                                    />
                                    Homework
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading || !title.trim()}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Collection
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

