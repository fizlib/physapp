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
    },
    {
        id: 'communicating-vessels',
        title: 'Susisiekiančiųjų indų dėsniai',
        description: 'Tyrinėkite skysčių pusiausvyrą susisiekiančiuose induose, stebėkite paviršiaus horizontalumą ir skirtingų tankių skysčių balansą.',
        href: '/simulations/communicating-vessels',
        available: true
    },
    {
        id: 'riedlenciu-parkas',
        title: 'Riedlenčių parkas',
        description: 'Tyrinėkite energijos virsmus, trintį ir judėjimą riedlentininkui leidžiantis bei kylant trasa.',
        href: '/simulations/riedlenciu-parkas',
        available: true
    },
    {
        id: '9-kl-testai',
        title: '9 kl. Testai',
        description: 'Atsakykite į laiko ribojamus klausimus apie fizikinių dydžių apibrėžimus, matavimo vienetus ir formules be klaidų.',
        href: '/simulations/9-kl-testai',
        available: true
    }
]
