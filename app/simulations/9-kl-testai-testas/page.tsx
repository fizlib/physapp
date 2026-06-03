import { ScoredSimulationClient } from "./ScoredSimulationClient"

interface NinthGradeScoredTestPageProps {
    searchParams?: Promise<{
        assignmentId?: string | string[]
    }>
}

export default async function NinthGradeScoredTestPage({ searchParams }: NinthGradeScoredTestPageProps) {
    const params = await searchParams
    const rawAssignmentId = params?.assignmentId
    const assignmentId = Array.isArray(rawAssignmentId) ? rawAssignmentId[0] : rawAssignmentId ?? null

    return <ScoredSimulationClient assignmentId={assignmentId} />
}
