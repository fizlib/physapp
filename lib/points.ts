/**
 * Shared utility for calculating the maximum points an assignment is worth.
 * 
 * This centralises the logic that was previously duplicated across 7 call-sites
 * in student/actions.ts, teacher/actions.ts, and teacher/class/[id]/page.tsx.
 */

export function calculateAssignmentMaxPoints(assignment: {
    points?: number | null
    required_variations_count?: number | null
    questions?: Array<{ points?: number | null }> | null
}): number {
    const requiredCount = Number(assignment.required_variations_count) || 0
    const isVariation = requiredCount > 0
    let max = Number(assignment.points) || 0

    if (isVariation && assignment.questions?.[0]) {
        const pointsPerVariation = Number(assignment.questions[0].points) || 1
        max = pointsPerVariation * requiredCount
    }

    return max
}
