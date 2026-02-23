'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toggleTabMonitoring } from '../../actions'

interface TabMonitoringToggleProps {
    classroomId: string
    collectionId: string
    initialEnabled: boolean
}

export function TabMonitoringToggle({ classroomId, collectionId, initialEnabled }: TabMonitoringToggleProps) {
    const [enabled, setEnabled] = useState(initialEnabled)
    const [loading, setLoading] = useState(false)

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const newValue = !enabled
        setEnabled(newValue) // Optimistic update
        setLoading(true)

        try {
            const result = await toggleTabMonitoring(classroomId, collectionId, newValue)
            if (!result.success) {
                setEnabled(!newValue) // Revert on failure
            }
        } catch {
            setEnabled(!newValue) // Revert on error
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            title={enabled ? 'Skirtukų stebėjimas įjungtas' : 'Skirtukų stebėjimas išjungtas'}
            className={`
                pointer-events-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                transition-colors duration-150 cursor-pointer
                ${loading ? 'opacity-50' : ''}
                ${enabled
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }
            `}
        >
            {enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {enabled ? 'Stebėjimas' : 'Stebėjimas'}
        </button>
    )
}
