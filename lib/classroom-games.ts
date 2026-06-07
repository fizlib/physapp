const DEFAULT_CLASSROOM_GAMES_SERVER_URL =
    "https://http--vampires-classroom-backend--k46wscvdzqkf.code.run"

export const CLASSROOM_GAMES_SERVER_URL = (
    process.env.NEXT_PUBLIC_CLASSROOM_GAMES_SERVER_URL
    || process.env.NEXT_PUBLIC_VAMPIRES_SERVER_URL
    || DEFAULT_CLASSROOM_GAMES_SERVER_URL
).replace(/\/$/, "")
