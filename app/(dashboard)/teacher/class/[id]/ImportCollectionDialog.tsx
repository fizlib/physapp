"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Download } from "lucide-react"
import { getTeacherClassrooms, getClassroomCollections, importCollection } from "../../actions"
import { toast } from "sonner"

interface ImportCollectionDialogProps {
    classroomId: string
}

export function ImportCollectionDialog({ classroomId }: ImportCollectionDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fetchingClasses, setFetchingClasses] = useState(false)
    const [fetchingCollections, setFetchingCollections] = useState(false)

    const [classrooms, setClassrooms] = useState<{ id: string, name: string }[]>([])
    const [selectedSourceClassId, setSelectedSourceClassId] = useState<string>("")

    const [collections, setCollections] = useState<{ id: string, title: string, category: string }[]>([])
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")
    const [importAsPublished, setImportAsPublished] = useState<boolean>(true)

    useEffect(() => {
        if (open) {
            loadClassrooms()
        }
    }, [open])

    useEffect(() => {
        if (selectedSourceClassId) {
            loadCollections(selectedSourceClassId)
        } else {
            setCollections([])
            setSelectedCollectionId("")
        }
    }, [selectedSourceClassId])

    const loadClassrooms = async () => {
        setFetchingClasses(true)
        try {
            const data = await getTeacherClassrooms(classroomId)
            setClassrooms(data)
        } catch (err) {
            console.error(err)
            toast.error("Failed to load classes")
        } finally {
            setFetchingClasses(false)
        }
    }

    const loadCollections = async (sourceClassId: string) => {
        setFetchingCollections(true)
        try {
            const data = await getClassroomCollections(sourceClassId)
            setCollections(data)
            if (data.length > 0) {
                setSelectedCollectionId(data[0].id)
            } else {
                setSelectedCollectionId("")
            }
        } catch (err) {
            console.error(err)
            toast.error("Failed to load collections")
        } finally {
            setFetchingCollections(false)
        }
    }

    const handleImport = async () => {
        if (!selectedCollectionId) return

        setLoading(true)
        try {
            const result = await importCollection(classroomId, selectedCollectionId, importAsPublished)
            if (result.success) {
                toast.success("Collection imported successfully!")
                setOpen(false)
                resetForm()
            } else {
                toast.error(result.error || "Failed to import collection")
            }
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setSelectedSourceClassId("")
        setSelectedCollectionId("")
        setCollections([])
        setImportAsPublished(true)
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Import Collection
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Import Collection</DialogTitle>
                    <DialogDescription>
                        Select a collection from another class to import into this class.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="source-class">Source Class</Label>
                        {fetchingClasses ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading classes...
                            </div>
                        ) : classrooms.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No other classes found.</p>
                        ) : (
                            <select
                                id="source-class"
                                value={selectedSourceClassId}
                                onChange={(e) => setSelectedSourceClassId(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={loading}
                            >
                                <option value="">Select a class...</option>
                                {classrooms.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {selectedSourceClassId && (
                        <div className="space-y-2">
                            <Label htmlFor="source-collection">Collection</Label>
                            {fetchingCollections ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading collections...
                                </div>
                            ) : collections.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">No collections found in this class.</p>
                            ) : (
                                <select
                                    id="source-collection"
                                    value={selectedCollectionId}
                                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {collections.map((col) => (
                                        <option key={col.id} value={col.id}>
                                            {col.title} ({col.category})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {selectedCollectionId && (
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="import-published"
                                checked={importAsPublished}
                                onCheckedChange={(checked) => setImportAsPublished(checked as boolean)}
                            />
                            <Label
                                htmlFor="import-published"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Import all exercises as published (except pointed exercises)
                            </Label>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleImport}
                            disabled={loading || !selectedCollectionId}
                            className="w-full sm:w-auto"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Import Collection
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
