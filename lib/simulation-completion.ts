export const NINTH_GRADE_TESTS_SIMULATION_ID = '9-kl-testai'
export const NINTH_GRADE_TESTS_SIMULATION_PATH = '/simulations/9-kl-testai'
export const NINTH_GRADE_TESTS_SCORED_SIMULATION_ID = '9-kl-testai-testas'
export const NINTH_GRADE_TESTS_SCORED_SIMULATION_PATH = '/simulations/9-kl-testai-testas'
export const NINTH_GRADE_TESTS_SCORED_MAX_POINTS = 10
export const NINTH_GRADE_TESTS_SCORED_QUESTION_SECONDS = 15

const SIMULATION_COMPLETION_VERSION = 'sets-v4'

export function getSimulationCompletionKey(simulationId: string, assignmentId: string) {
    return `simulation-completion:${simulationId}:${assignmentId}:${SIMULATION_COMPLETION_VERSION}`
}

export function getSimulationTopicProgressKey(simulationId: string, assignmentId: string | null) {
    return assignmentId
        ? `simulation-topic-progress:${simulationId}:${assignmentId}`
        : `simulation-topic-progress:${simulationId}`
}
