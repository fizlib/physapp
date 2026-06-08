const DEFAULT_CLASSROOM_GAMES_SERVER_URL =
    "https://http--vampires-classroom-backend--k46wscvdzqkf.code.run"

export const CLASSROOM_GAME_IDS = ["coffee", "vampires"] as const

export type ClassroomGameId = (typeof CLASSROOM_GAME_IDS)[number]

export const CLASSROOM_GAMES: Record<ClassroomGameId, {
    id: ClassroomGameId
    name: string
    path: `/games/${string}`
}> = {
    coffee: {
        id: "coffee",
        name: "Kavos susitikimų iššūkis",
        path: "/games/coffee",
    },
    vampires: {
        id: "vampires",
        name: "Vampyrai",
        path: "/games/vampires",
    },
}

export function isClassroomGameId(value: unknown): value is ClassroomGameId {
    return typeof value === "string"
        && CLASSROOM_GAME_IDS.includes(value as ClassroomGameId)
}

export const CLASSROOM_GAMES_SERVER_URL = (
    process.env.NEXT_PUBLIC_CLASSROOM_GAMES_SERVER_URL
    || process.env.NEXT_PUBLIC_VAMPIRES_SERVER_URL
    || DEFAULT_CLASSROOM_GAMES_SERVER_URL
).replace(/\/$/, "")
