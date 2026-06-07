"use client"

import { useEffect, useMemo, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { createClient } from "@/lib/supabase/client"
import VampireGame from "./VampireGame"

type UserRole = "teacher" | "student"

interface Classroom {
    id: string
    name: string
}

interface ConnectedStudent {
    id: string
    name: string
    assignedGameCode: string | null
    joinedAt: number
}

interface PreviewGroup {
    groupNumber: number
    students: Array<{ id: string; name: string }>
}

interface ClassroomGame {
    code: string
    groupNumber: number
    state: string
    timer: number
    winner: string | null
    players: Array<{
        id: string
        name: string
        alive: boolean
        connected: boolean
        isNPC: boolean
    }>
}

interface ClassroomSessionState {
    classroomId: string
    status: "waiting" | "running"
    targetSize: number
    connectedStudents: ConnectedStudent[]
    previewGroups: PreviewGroup[]
    games: ClassroomGame[]
}

interface GameAssignment {
    code: string
    playerId: string
    groupNumber: number
    theme?: GameTheme
}

type GameTheme = "dark" | "day" | "christmas"

interface GameSettings {
    discussionTime: number
    nightTime: number
    votingTime: number
    revealRole: boolean
    chatEnabled: boolean
    enableAI: boolean
    enableTTS: boolean
    enableSTT: boolean
    voiceInputMode: "push-to-talk" | "voice-activity"
    ttsProvider: "google" | "elevenlabs"
    sttProvider: "deepgram" | "google"
    elevenlabsModel: string
    npcNationality: "english" | "lithuanian"
    npcAllowedRoles: Record<string, boolean>
    theme: GameTheme
}

interface RoleConfig {
    useDefault: boolean
    Investigator: number
    Lookout: number
    Doctor: number
    Jailor: number
    Vampire: number
    "Vampire Framer": number
    Jester: number
}

const GAME_SERVER_URL = process.env.NEXT_PUBLIC_VAMPIRES_SERVER_URL
    || "https://http--vampires-classroom-backend--k46wscvdzqkf.code.run"

console.log("[Vampires] GAME_SERVER_URL =", GAME_SERVER_URL)

const DEFAULT_SETTINGS: GameSettings = {
    discussionTime: 120,
    nightTime: 60,
    votingTime: 15,
    revealRole: true,
    chatEnabled: true,
    enableAI: false,
    enableTTS: false,
    enableSTT: false,
    voiceInputMode: "push-to-talk",
    ttsProvider: "google",
    sttProvider: "deepgram",
    elevenlabsModel: "eleven_turbo_v2_5",
    npcNationality: "english",
    npcAllowedRoles: {
        Investigator: true,
        Lookout: true,
        Doctor: true,
        Jailor: true,
        Vampire: true,
        "Vampire Framer": true,
        Jester: true,
        Citizen: true,
    },
    theme: "dark",
}

const DEFAULT_ROLE_CONFIG: RoleConfig = {
    useDefault: true,
    Investigator: 1,
    Lookout: 1,
    Doctor: 1,
    Jailor: 0,
    Vampire: 1,
    "Vampire Framer": 0,
    Jester: 1,
}

const ROLE_NAMES = [
    "Investigator",
    "Lookout",
    "Doctor",
    "Jailor",
    "Vampire",
    "Vampire Framer",
    "Jester",
] as const

interface Props {
    userId: string
    role: UserRole
    displayName: string
    classrooms: Classroom[]
}

export function VampiresClassroomClient({ userId, role, displayName, classrooms }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [session, setSession] = useState<ClassroomSessionState | null>(null)
    const [assignment, setAssignment] = useState<GameAssignment | null>(null)
    const [selectedClassroomId, setSelectedClassroomId] = useState(classrooms[0]?.id || "")
    const [targetSize, setTargetSize] = useState(10)
    const [npcCount, setNpcCount] = useState(0)
    const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
    const [roleConfig, setRoleConfig] = useState<RoleConfig>(DEFAULT_ROLE_CONFIG)
    const [elevenlabsModels, setElevenlabsModels] = useState<Array<{ id: string; name: string }>>([])

    useEffect(() => {
        const supabase = createClient()
        let activeSocket: Socket | null = null
        let cancelled = false

        const connect = async () => {
            console.log(`[Vampires] Connecting as ${role}, userId=${userId}`)
            const { data: { session: authSession } } = await supabase.auth.getSession()
            if (cancelled) return

            if (!authSession?.access_token) {
                console.error("[Vampires] No access token available")
                setError("Authentication session is unavailable. Please sign in again.")
                return
            }
            console.log("[Vampires] Got access token, connecting to", GAME_SERVER_URL)

            activeSocket = io(GAME_SERVER_URL, {
                transports: ["websocket", "polling"],
                auth: async callback => {
                    const { data: { session: latestSession } } = await supabase.auth.getSession()
                    callback({ accessToken: latestSession?.access_token || authSession.access_token })
                },
            })

            activeSocket.on("connect", () => {
                console.log("[Vampires] Socket connected, id =", activeSocket?.id)
                setConnected(true)
                setError(null)
            })
            activeSocket.on("disconnect", (reason) => {
                console.log("[Vampires] Socket disconnected, reason =", reason)
                setConnected(false)
            })
            activeSocket.on("connect_error", (socketError) => {
                console.error("[Vampires] connect_error:", socketError.message)
                setConnected(false)
                setError(socketError.message || "Could not connect to the game server.")
            })
            activeSocket.on("classroom_error", (message: string) => {
                console.error("[Vampires] classroom_error:", message)
                setError(message)
            })
            activeSocket.on("classroom_session_state", (state: ClassroomSessionState) => {
                console.log("[Vampires] classroom_session_state:", JSON.stringify(state))
                setSession(state)
                setTargetSize(state.targetSize || 10)
                if (role === "student" && state.status !== "running") {
                    setAssignment(null)
                }
            })
            activeSocket.on("game_assigned", (nextAssignment: GameAssignment) => {
                console.log("[Vampires] game_assigned:", nextAssignment)
                setAssignment(nextAssignment)
                setError(null)
            })
            activeSocket.on("classroom_session_reset", () => {
                console.log("[Vampires] classroom_session_reset")
                setAssignment(null)
            })
            activeSocket.on("session_replaced", (message: string) => {
                console.error("[Vampires] session_replaced:", message)
                setError(message)
            })
            activeSocket.on("elevenlabs_options", (data: { models?: Array<{ id: string; name: string }> }) => {
                setElevenlabsModels(data.models || [])
            })
            activeSocket.emit("get_elevenlabs_options")
            setSocket(activeSocket)
        }

        connect()

        return () => {
            cancelled = true
            activeSocket?.disconnect()
        }
    }, [role])

    useEffect(() => {
        if (!socket || !connected || role !== "teacher" || !selectedClassroomId) {
            console.log(`[Vampires] teacher_watch skipped: socket=${!!socket}, connected=${connected}, role=${role}, classroomId=${selectedClassroomId}`)
            return
        }
        console.log(`[Vampires] Emitting teacher_watch_classroom for classroomId=${selectedClassroomId}`)
        socket.emit("teacher_watch_classroom", { classroomId: selectedClassroomId })
    }, [connected, role, selectedClassroomId, socket])

    const connectedStudents = session?.connectedStudents || []
    const unassignedStudents = connectedStudents.filter(student => !student.assignedGameCode)
    const canPrepare = connectedStudents.length >= 5 && session?.status !== "running"
    const canStart = Boolean(session?.previewGroups.length) && session?.status !== "running"
    const customRoleTotal = useMemo(
        () => ROLE_NAMES.reduce((total, roleName) => total + roleConfig[roleName], 0),
        [roleConfig]
    )

    const prepareGroups = () => {
        if (!socket || !selectedClassroomId) return
        setError(null)
        socket.emit("prepare_classroom_games", {
            classroomId: selectedClassroomId,
            targetSize,
            settings,
            roleConfig,
            npcCount,
        })
    }

    const startGames = () => {
        if (!socket || !selectedClassroomId) return
        setError(null)
        socket.emit("start_classroom_games", { classroomId: selectedClassroomId })
    }

    if (role === "student" && assignment && socket) {
        return (
            <div className="vampires-stage">
                <VampireGame
                    key={assignment.code}
                    socket={socket}
                    gameCode={assignment.code}
                    playerId={userId}
                    displayName={displayName}
                    initialTheme={assignment.theme || "dark"}
                />
            </div>
        )
    }

    if (role === "student") {
        return (
            <main className="vampires-stage vampires-waiting">
                <div className="vampires-waiting-card">
                    <div className="vampires-spinner" aria-hidden="true" />
                    <h1>Vampires</h1>
                    <p>Laukiama, kol mokytojas pradės žaidimą...</p>
                    <span>{connected ? "Prisijungta prie klasės laukiamojo" : "Jungiamasi prie žaidimo serverio"}</span>
                    {error && <div className="vampires-error">{error}</div>}
                </div>
            </main>
        )
    }

    return (
        <main className="vampires-stage vampires-teacher">
            <div className="vampires-teacher-shell">
                <header className="vampires-teacher-header">
                    <div>
                        <span className="vampires-kicker">Protus classroom game</span>
                        <h1>Vampires</h1>
                        <p>Prepare connected students, split them into games, and control the round.</p>
                    </div>
                    <div className={`vampires-connection ${connected ? "online" : ""}`}>
                        <span />
                        {connected ? "Server connected" : "Connecting"}
                    </div>
                </header>

                {classrooms.length === 0 ? (
                    <div className="vampires-empty">Create a classroom before starting a game.</div>
                ) : (
                    <>
                        <section className="vampires-panel vampires-classroom-bar">
                            <label>
                                Classroom
                                <select
                                    value={selectedClassroomId}
                                    onChange={(event) => {
                                        setSession(null)
                                        setAssignment(null)
                                        setSelectedClassroomId(event.target.value)
                                    }}
                                    disabled={session?.status === "running"}
                                >
                                    {classrooms.map(classroom => (
                                        <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                                    ))}
                                </select>
                            </label>
                            <div className="vampires-count">
                                <strong>{connectedStudents.length}</strong>
                                <span>connected students</span>
                            </div>
                            {session?.status === "running" && (
                                <button
                                    className="vampires-button danger"
                                    onClick={() => socket?.emit("teacher_end_all_games", { classroomId: selectedClassroomId })}
                                >
                                    End all and return to lobby
                                </button>
                            )}
                        </section>

                        {error && <div className="vampires-error">{error}</div>}

                        {session?.status === "running" ? (
                            <section className="vampires-runtime-grid">
                                {session.games.map(game => (
                                    <article className="vampires-panel vampires-game-control" key={game.code}>
                                        <div className="vampires-game-control-head">
                                            <div>
                                                <span>Group {game.groupNumber}</span>
                                                <h2>{game.state.replaceAll("_", " ")}</h2>
                                            </div>
                                            <strong>{game.timer}s</strong>
                                        </div>
                                        <div className="vampires-roster">
                                            {game.players.map(player => (
                                                <div key={player.id} className={!player.connected ? "offline" : ""}>
                                                    <span>{player.isNPC ? "AI" : player.name}</span>
                                                    <small>{player.alive ? "alive" : "out"}{!player.connected ? " · disconnected" : ""}</small>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="vampires-actions">
                                            <button
                                                className="vampires-button"
                                                disabled={game.state === "GAME_OVER"}
                                                onClick={() => socket?.emit("teacher_skip_game_timer", {
                                                    classroomId: selectedClassroomId,
                                                    code: game.code,
                                                })}
                                            >
                                                Skip timer
                                            </button>
                                            <button
                                                className="vampires-button danger"
                                                disabled={game.state === "GAME_OVER"}
                                                onClick={() => socket?.emit("teacher_end_game", {
                                                    classroomId: selectedClassroomId,
                                                    code: game.code,
                                                })}
                                            >
                                                End game
                                            </button>
                                        </div>
                                    </article>
                                ))}
                                {unassignedStudents.length > 0 && (
                                    <article className="vampires-panel vampires-late-students">
                                        <h2>Waiting for next round</h2>
                                        {unassignedStudents.map(student => <div key={student.id}>{student.name}</div>)}
                                    </article>
                                )}
                            </section>
                        ) : (
                            <div className="vampires-setup-grid">
                                <section className="vampires-panel">
                                    <div className="vampires-section-title">
                                        <div>
                                            <span>Step 1</span>
                                            <h2>Connected students</h2>
                                        </div>
                                        <strong>{connectedStudents.length}</strong>
                                    </div>
                                    <div className="vampires-student-list">
                                        {connectedStudents.length ? connectedStudents.map(student => (
                                            <div key={student.id}>
                                                <span>{student.name}</span>
                                                <small>ready</small>
                                            </div>
                                        )) : (
                                            <p>Students appear here after opening <code>/games/vampires</code>.</p>
                                        )}
                                    </div>
                                </section>

                                <section className="vampires-panel vampires-settings">
                                    <div className="vampires-section-title">
                                        <div>
                                            <span>Step 2</span>
                                            <h2>Game setup</h2>
                                        </div>
                                    </div>

                                    <div className="vampires-form-grid">
                                        <NumberField label="Students per game" min={5} max={50} value={targetSize} onChange={setTargetSize} />
                                        <NumberField label="AI players per game" min={0} max={20} value={npcCount} onChange={setNpcCount} />
                                        <NumberField label="Discussion time" min={10} max={600} value={settings.discussionTime} onChange={value => setSettings(current => ({ ...current, discussionTime: value }))} />
                                        <NumberField label="Night time" min={10} max={300} value={settings.nightTime} onChange={value => setSettings(current => ({ ...current, nightTime: value }))} />
                                        <NumberField label="Voting time" min={5} max={120} value={settings.votingTime} onChange={value => setSettings(current => ({ ...current, votingTime: value }))} />
                                        <label>
                                            Theme
                                            <select value={settings.theme} onChange={event => setSettings(current => ({ ...current, theme: event.target.value as GameTheme }))}>
                                                <option value="dark">Dark</option>
                                                <option value="day">Day</option>
                                                <option value="christmas">Christmas</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div className="vampires-toggle-grid">
                                        <Toggle label="Reveal eliminated roles" checked={settings.revealRole} onChange={checked => setSettings(current => ({ ...current, revealRole: checked }))} />
                                        <Toggle label="Enable chat" checked={settings.chatEnabled} onChange={checked => setSettings(current => ({ ...current, chatEnabled: checked }))} />
                                        <Toggle label="Enable AI NPCs" checked={settings.enableAI} onChange={checked => setSettings(current => ({ ...current, enableAI: checked, enableTTS: checked ? current.enableTTS : false, enableSTT: checked ? current.enableSTT : false }))} />
                                    </div>

                                    {settings.enableAI && (
                                        <div className="vampires-advanced">
                                            <div className="vampires-form-grid">
                                                <label>
                                                    NPC language
                                                    <select value={settings.npcNationality} onChange={event => setSettings(current => ({ ...current, npcNationality: event.target.value as GameSettings["npcNationality"] }))}>
                                                        <option value="english">English</option>
                                                        <option value="lithuanian">Lithuanian</option>
                                                    </select>
                                                </label>
                                                <Toggle label="NPC text-to-speech" checked={settings.enableTTS} onChange={checked => setSettings(current => ({ ...current, enableTTS: checked }))} />
                                                <Toggle label="Voice input" checked={settings.enableSTT} onChange={checked => setSettings(current => ({ ...current, enableSTT: checked }))} />
                                                {settings.enableTTS && (
                                                    <label>
                                                        TTS provider
                                                        <select value={settings.ttsProvider} onChange={event => setSettings(current => ({ ...current, ttsProvider: event.target.value as GameSettings["ttsProvider"] }))}>
                                                            <option value="google">Google</option>
                                                            <option value="elevenlabs">ElevenLabs</option>
                                                        </select>
                                                    </label>
                                                )}
                                                {settings.enableTTS && settings.ttsProvider === "elevenlabs" && (
                                                    <label>
                                                        ElevenLabs model
                                                        <select value={settings.elevenlabsModel} onChange={event => setSettings(current => ({ ...current, elevenlabsModel: event.target.value }))}>
                                                            <option value="eleven_turbo_v2_5">Turbo v2.5</option>
                                                            {elevenlabsModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
                                                        </select>
                                                    </label>
                                                )}
                                                {settings.enableSTT && (
                                                    <>
                                                        <label>
                                                            STT provider
                                                            <select value={settings.sttProvider} onChange={event => setSettings(current => ({ ...current, sttProvider: event.target.value as GameSettings["sttProvider"] }))}>
                                                                <option value="deepgram">Deepgram NOVA-3</option>
                                                                <option value="google">Google</option>
                                                            </select>
                                                        </label>
                                                        <label>
                                                            Voice mode
                                                            <select value={settings.voiceInputMode} onChange={event => setSettings(current => ({ ...current, voiceInputMode: event.target.value as GameSettings["voiceInputMode"] }))}>
                                                                <option value="push-to-talk">Push to talk</option>
                                                                <option value="voice-activity">Voice activity detection</option>
                                                            </select>
                                                        </label>
                                                    </>
                                                )}
                                            </div>
                                            <div className="vampires-role-options">
                                                <span>Roles allowed for AI players</span>
                                                {Object.keys(settings.npcAllowedRoles).map(roleName => (
                                                    <Toggle
                                                        key={roleName}
                                                        label={roleName}
                                                        checked={settings.npcAllowedRoles[roleName] !== false}
                                                        onChange={checked => setSettings(current => ({
                                                            ...current,
                                                            npcAllowedRoles: { ...current.npcAllowedRoles, [roleName]: checked },
                                                        }))}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="vampires-role-config">
                                        <div className="vampires-role-config-head">
                                            <strong>Role configuration</strong>
                                            <div>
                                                <button className={roleConfig.useDefault ? "active" : ""} onClick={() => setRoleConfig(current => ({ ...current, useDefault: true }))}>Automatic</button>
                                                <button className={!roleConfig.useDefault ? "active" : ""} onClick={() => setRoleConfig(current => ({ ...current, useDefault: false }))}>Custom</button>
                                            </div>
                                        </div>
                                        {!roleConfig.useDefault && (
                                            <div className="vampires-role-grid">
                                                {ROLE_NAMES.map(roleName => (
                                                    <NumberField
                                                        key={roleName}
                                                        label={roleName}
                                                        min={0}
                                                        max={50}
                                                        value={roleConfig[roleName]}
                                                        onChange={value => setRoleConfig(current => ({ ...current, [roleName]: value }))}
                                                    />
                                                ))}
                                                <div className="vampires-role-total">Configured special roles: {customRoleTotal}</div>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="vampires-panel vampires-preview">
                                    <div className="vampires-section-title">
                                        <div>
                                            <span>Step 3</span>
                                            <h2>Preview and start</h2>
                                        </div>
                                    </div>
                                    <div className="vampires-actions">
                                        <button className="vampires-button" disabled={!canPrepare} onClick={prepareGroups}>
                                            Prepare random groups
                                        </button>
                                        <button className="vampires-button primary" disabled={!canStart} onClick={startGames}>
                                            Start {session?.previewGroups.length || 0} game{session?.previewGroups.length === 1 ? "" : "s"}
                                        </button>
                                    </div>
                                    {!canPrepare && connectedStudents.length < 5 && (
                                        <p className="vampires-hint">At least 5 connected students are required.</p>
                                    )}
                                    <div className="vampires-preview-groups">
                                        {session?.previewGroups.map(group => (
                                            <div key={group.groupNumber}>
                                                <strong>Group {group.groupNumber}</strong>
                                                <span>{group.students.map(student => student.name).join(", ")}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}

function NumberField({
    label,
    min,
    max,
    value,
    onChange,
}: {
    label: string
    min: number
    max: number
    value: number
    onChange: (value: number) => void
}) {
    return (
        <label>
            {label}
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={event => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))}
            />
        </label>
    )
}

function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}) {
    return (
        <label className="vampires-toggle">
            <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
            <span>{label}</span>
        </label>
    )
}
