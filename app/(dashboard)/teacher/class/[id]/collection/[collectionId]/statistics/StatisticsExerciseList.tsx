"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { ExerciseSubmissionsPanel } from "./ExerciseSubmissionsPanel"

interface ExerciseStat {
    id: string
    title: string
    submittedCount: number
    hasVariations: boolean
}

interface StatisticsExerciseListProps {
    classroomId: string
    stats: ExerciseStat[]
    studentCount: number
}

export function StatisticsExerciseList({ classroomId, stats, studentCount }: StatisticsExerciseListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    return (
        <div className="divide-y divide-border/50">
            {stats.map((stat) => {
                const isExpanded = expandedId === stat.id

                return (
                    <div key={stat.id}>
                        <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : stat.id)}
                            className="w-full py-6 flex items-center justify-between group hover:bg-muted/30 transition-colors px-2 rounded-lg cursor-pointer text-left"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{stat.title}</h3>
                                    {stat.hasVariations && (
                                        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                                            Variations
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${(stat.submittedCount / (studentCount || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {Math.round((stat.submittedCount / (studentCount || 1)) * 100)}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-3xl font-bold text-primary">{stat.submittedCount}</span>
                                        <span className="text-muted-foreground text-sm">/ {studentCount || 0}</span>
                                    </div>
                                    <p className="text-[10px] uppercase tracking-tighter text-muted-foreground font-medium">Students Submitted</p>
                                </div>
                                <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </div>
                        </button>

                        {/* Expanded Panel */}
                        {isExpanded && (
                            <div className="px-2 pb-6">
                                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <ExerciseSubmissionsPanel
                                        classroomId={classroomId}
                                        assignmentId={stat.id}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
