'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteCollection } from '@/app/(dashboard)/teacher/actions'

interface DeleteCollectionButtonProps {
    collectionId: string
    classroomId: string
    title: string
}

export function DeleteCollectionButton({ collectionId, classroomId, title }: DeleteCollectionButtonProps) {
    const [open, setOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async (e: React.MouseEvent) => {
        // Prevent event propagation to the card link
        e.preventDefault()
        e.stopPropagation()

        setIsDeleting(true)
        try {
            const result = await deleteCollection(collectionId, classroomId)
            if (!result.success) {
                // Ideally show toast error here
                console.error(result.error)
                alert("Failed to delete collection")
            }
            setOpen(false)
        } catch (error) {
            console.error(error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 relative"
                    onClick={(e) => {
                        e.stopPropagation()
                        // Open implicitly via trigger
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete collection</span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove the collection. All exercises in this collection will remain in your library but will be unlinked from this collection.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
