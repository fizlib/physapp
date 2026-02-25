// Shared simulation data used by both the simulations page and CreateExerciseDialog
export interface SimulationInfo {
    id: string
    title: string
    description: string
    href: string
    available: boolean
}

export const SIMULATIONS: SimulationInfo[] = [
    {
        id: 'center-of-mass',
        title: 'Masės centras',
        description: 'Tyrinėkite masės pasiskirstymą ir jo įtaką objekto svorio centrui bei pusiausvyrai.',
        href: '/simulations/center-of-mass',
        available: true
    }
]
