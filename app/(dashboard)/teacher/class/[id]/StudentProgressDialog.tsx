"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2 } from "lucide-react"
import { getStudentClassroomProgress } from "../../actions"

interface StudentProgressDialogProps {
    classroomId: string
    student: { id: string, name: string } | null
    onClose: () => void
}

export function StudentProgressDialog({ classroomId, student, onClose }: StudentProgressDialogProps) {
    const [collections, setCollections] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (student) {
            fetchProgress()
        }
    }, [student])

    const fetchProgress = async () => {
        if (!student) return
        setLoading(true)
        try {
            const data = await getStudentClassroomProgress(classroomId, student.id)
            setCollections(data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const homeworkCollections = collections.filter(c => c.category === 'homework' || !c.category)
    const classworkCollections = collections.filter(c => c.category === 'classwork')

    return (
        <Dialog open={!!student} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{student?.name}&apos;s Progress</DialogTitle>
                    <DialogDescription>
                        Overview of exercise completion.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">

                        {/* Classwork */}
                        {classworkCollections.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    Classwork
                                </h3>
                                <div className="space-y-3">
                                    {classworkCollections.map(collection => (
                                        <CollectionProgressRow key={collection.id} collection={collection} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Homework */}
                        {homeworkCollections.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    Homework
                                </h3>
                                <div className="space-y-3">
                                    {homeworkCollections.map(collection => (
                                        <CollectionProgressRow key={collection.id} collection={collection} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {collections.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">
                                No collections found in this class.
                            </p>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CollectionProgressRow({ collection }: { collection: any }) {
    const isComplete = collection.progress === 100

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-medium">{collection.title}</h4>
                    <p className="text-xs text-muted-foreground">
                        {collection.completedAssignments} / {collection.totalAssignments} exercises completed
                    </p>
                </div>
                {isComplete && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
            </div>

            <div className="flex items-center gap-4">
                <Progress value={collection.progress} className="h-2 flex-1" />
                <span className="text-xs font-mono font-medium w-10 text-right">
                    {Math.round(collection.progress || 0)}%
                </span>
            </div>
        </div>
    )
}
