'use client'

import React, { useEffect, useState } from 'react'

interface CircularGradeDisplayProps {
    earnedPoints: number
    maxPoints: number
    size?: number
    strokeWidth?: number
}

export function CircularGradeDisplay({
    earnedPoints,
    maxPoints,
    size = 120,
    strokeWidth = 10,
}: CircularGradeDisplayProps) {
    const [currentProgress, setCurrentProgress] = useState(0)
    const [displayGrade, setDisplayGrade] = useState(0)

    const targetPercentage = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : 0
    const targetGrade = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 10) : 0

    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI

    useEffect(() => {
        // Small timeout to ensure browser has painted and transition will trigger
        const timer = setTimeout(() => {
            setCurrentProgress(targetPercentage)

            // Animate the grade counter
            if (targetGrade > 0) {
                let start = 0
                const duration = 1000 // match transition duration
                const stepTime = Math.abs(Math.floor(duration / targetGrade))

                const counter = setInterval(() => {
                    start += 1
                    setDisplayGrade(start)
                    if (start >= targetGrade) clearInterval(counter)
                }, stepTime)
                return () => clearInterval(counter) // Cleanup for setInterval
            } else {
                setDisplayGrade(0) // If targetGrade is 0, set immediately
            }
        }, 100)

        return () => clearTimeout(timer) // Cleanup for setTimeout
    }, [targetPercentage, targetGrade])

    const offset = circumference - (currentProgress / 100) * circumference

    // Gradient colors based on grade
    const getGradeColor = (g: number) => {
        if (g >= 9) return 'text-emerald-500' // Excellent
        if (g >= 7) return 'text-blue-500'    // Good
        if (g >= 5) return 'text-amber-500'   // Passing
        return 'text-rose-500'                // Low
    }

    const getStrokeColor = (g: number) => {
        if (g >= 9) return 'stroke-emerald-500'
        if (g >= 7) return 'stroke-blue-500'
        if (g >= 5) return 'stroke-amber-500'
        return 'stroke-rose-500'
    }

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm transition-all hover:shadow-md animate-fade-in-up">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background Circle */}
                <svg className="h-full w-full -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-muted/20"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        style={{
                            strokeDashoffset: offset,
                            transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        strokeLinecap="round"
                        className={getStrokeColor(targetGrade)}
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-bold tracking-tight tabular-nums ${getGradeColor(targetGrade)}`}>
                        {displayGrade}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                        Grade
                    </span>
                </div>
            </div>

            <div className="mt-4 text-center space-y-1">
                <div className="text-sm font-semibold text-foreground">
                    {earnedPoints} / {maxPoints}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Total Points Earned
                </div>
            </div>
        </div>
    )
}
