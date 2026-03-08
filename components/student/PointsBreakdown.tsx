'use client'

import { useState } from 'react'
import { ChevronDown, Gift, Layers } from 'lucide-react'

interface CollectionBreakdown {
    id: string
    title: string
    totalPoints: number
    earnedPoints: number
}

interface PointsBreakdownProps {
    bonusPoints: number
    collections: CollectionBreakdown[]
}

export function PointsBreakdown({ bonusPoints, collections }: PointsBreakdownProps) {
    const [expanded, setExpanded] = useState(false)

    const hasCollections = collections.length > 0
    const hasBonus = bonusPoints > 0

    if (!hasCollections && !hasBonus) return null

    return (
        <div className="w-full mt-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="mx-auto flex items-center justify-center rounded-full p-1 text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-expanded={expanded}
                aria-label="Expand points breakdown"
            >
                <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            <div
                className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="space-y-1 pt-2 border-t border-border/30">
                        {collections.map((col) => (
                            <div
                                key={col.id}
                                className="flex items-center justify-between gap-3 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted/30"
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <Layers className="h-3 w-3 shrink-0 text-primary/50" />
                                    <span className="truncate text-foreground/70">{col.title}</span>
                                </div>
                                <div className="shrink-0 font-mono text-[11px] tabular-nums">
                                    <span className="font-semibold text-foreground">{col.earnedPoints}</span>
                                    <span className="text-muted-foreground"> / {col.totalPoints}</span>
                                </div>
                            </div>
                        ))}

                        {hasBonus && (
                            <div className="flex items-center justify-between gap-3 rounded-md border-t border-border/20 px-2 py-1 pt-2 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <Gift className="h-3 w-3 shrink-0 text-amber-500" />
                                    <span className="text-foreground/70">Bonus taškai</span>
                                </div>
                                <div className="shrink-0 font-mono text-[11px] tabular-nums">
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">+{bonusPoints}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
