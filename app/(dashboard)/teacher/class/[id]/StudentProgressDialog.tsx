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
import { CircularGradeDisplay } from "@/components/student/CircularGradeDisplay"

interface StudentProgressDialogProps {
    classroomId: string
    student: { id: string, name: string } | null
    onClose: () => void
}

export function StudentProgressDialog({ classroomId, student, onClose }: StudentProgressDialogProps) {
    const [collections, setCollections] = useState<any[]>([])
    const [stats, setStats] = useState<{ totalPoints: number, earnedPoints: number } | null>(null)
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
            if (data && 'collections' in data) {
                setCollections(data.collections || [])
                setStats({
                    totalPoints: data.totalPoints || 0,
                    earnedPoints: data.earnedPoints || 0
                })
            }
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
                        {/* Summary Stats */}
                        {stats && stats.totalPoints > 0 && (
                            <div className="flex justify-center border-b border-border/40 pb-6 mb-6">
                                <CircularGradeDisplay
                                    earnedPoints={stats.earnedPoints}
                                    maxPoints={stats.totalPoints}
                                    size={140}
                                />
                            </div>
                        )}

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
        <div className="rounded-lg border border-border/40 p-4 space-y-4 bg-background/50 backdrop-blur-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-medium text-sm">{collection.title}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                        {collection.completedAssignments} / {collection.totalAssignments} pratimai užbaigti
                    </p>
                </div>
                {isComplete && (
                    <div className="bg-green-500/10 p-1 rounded-full">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {collection.assignmentStatuses?.map((as: any, idx: number) => {
                    let bgColor = 'bg-muted'
                    let borderColor = 'border-border/40'
                    let textColor = 'text-muted-foreground'
                    const frameColor = as.pointsEnabled ? 'ring-1 ring-amber-300/80 border-amber-400' : ''
                    let style: React.CSSProperties = {}

                    if (as.status === 'correct') {
                        bgColor = 'bg-green-500 shadow-sm shadow-green-500/20'
                        borderColor = as.pointsEnabled ? 'border-amber-400' : 'border-green-600'
                        textColor = 'text-white'
                    } else if (as.status === 'incorrect') {
                        if (as.earned > 0 && as.points > 0) {
                            const percent = (as.earned / as.points) * 100
                            // Green for earned, Red for missed
                            style = {
                                background: `linear-gradient(90deg, #22c55e ${percent}%, #f43f5e ${percent}%)`
                            }
                            bgColor = 'shadow-sm shadow-orange-500/20'
                            borderColor = as.pointsEnabled ? 'border-amber-400' : 'border-orange-600/50'
                            textColor = 'text-white'
                        } else {
                            bgColor = 'bg-rose-500 shadow-sm shadow-rose-500/20'
                            borderColor = as.pointsEnabled ? 'border-amber-400' : 'border-rose-600'
                            textColor = 'text-white'
                        }
                    }

                    return (
                        <div
                            key={as.id}
                            className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-bold transition-all ${bgColor} ${borderColor} ${frameColor} ${textColor}`}
                            style={style}
                            title={`${as.earned} / ${as.points} tasku`}
                        >
                            {idx + 1}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

