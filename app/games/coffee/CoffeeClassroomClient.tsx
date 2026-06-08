"use client"

import { useEffect, useMemo, useState } from "react"
import {
    Check,
    CircleAlert,
    Coffee,
    Leaf,
    Plus,
    Search,
    Users,
    Wifi,
    WifiOff,
    X,
} from "lucide-react"
import { io, type Socket } from "socket.io-client"
import { CLASSROOM_GAMES_SERVER_URL } from "@/lib/classroom-games"
import { createClient } from "@/lib/supabase/client"

type UserRole = "teacher" | "student"
type CoffeeStatus = "waiting" | "running" | "won" | "dead_end"

interface Classroom {
    id: string
    name: string
}

interface ConnectedStudent {
    id: string
    name: string
    participant: boolean
}

interface TeacherParticipant {
    id: string
    name: string
    connected: boolean
    filledSlots: number
    totalSlots: number
}

interface StudentChoice {
    id: string
    name: string
}

interface CalendarSlot {
    slotIndex: number
    label: string
    partner: StudentChoice | null
    pending: {
        targetId: string
        targetName: string
        expiresAt: number
    } | null
}

interface CoffeeState {
    classroomId: string
    status: CoffeeStatus
    slotCount: number
    slotLabels: string[]
    confirmedMeetings: number
    totalMeetings: number
    remainingMeetings: number
    connectedStudents?: ConnectedStudent[]
    participants: TeacherParticipant[] | StudentChoice[]
    isParticipant?: boolean
    calendar?: CalendarSlot[]
    filledSlots?: number
}

interface CoffeeError {
    code: string
    message: string
}

interface Props {
    userId: string
    role: UserRole
    displayName: string
    classrooms: Classroom[]
}

const COFFEE_SERVER_URL = `${CLASSROOM_GAMES_SERVER_URL}/coffee`

export function CoffeeClassroomClient({ userId, role, displayName, classrooms }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [connected, setConnected] = useState(false)
    const [state, setState] = useState<CoffeeState | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedClassroomId, setSelectedClassroomId] = useState(classrooms[0]?.id || "")
    const [slotCount, setSlotCount] = useState(6)

    useEffect(() => {
        const supabase = createClient()
        let activeSocket: Socket | null = null
        let cancelled = false

        const connect = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (cancelled) return

            if (!session?.access_token) {
                setError("Autentifikavimo sesija nepasiekiama. Prisijunkite dar kartą.")
                return
            }

            activeSocket = io(COFFEE_SERVER_URL, {
                transports: ["websocket", "polling"],
                auth: async callback => {
                    const { data: { session: latestSession } } = await supabase.auth.getSession()
                    callback({ accessToken: latestSession?.access_token || session.access_token })
                },
            })

            activeSocket.on("connect", () => {
                setConnected(true)
                setError(null)
            })
            activeSocket.on("disconnect", () => setConnected(false))
            activeSocket.on("connect_error", socketError => {
                setConnected(false)
                setError(socketError.message || "Nepavyko prisijungti prie žaidimo serverio.")
            })
            activeSocket.on("coffee_state", (nextState: CoffeeState) => {
                setState(nextState)
            })
            activeSocket.on("coffee_error", (coffeeError: CoffeeError) => {
                setError(coffeeError.message)
            })
            activeSocket.on("coffee_session_replaced", (message: string) => {
                setError(message)
                activeSocket?.disconnect()
            })

            setSocket(activeSocket)
        }

        connect()

        return () => {
            cancelled = true
            activeSocket?.disconnect()
        }
    }, [])

    useEffect(() => {
        if (!socket || !connected || role !== "teacher" || !selectedClassroomId) return
        socket.emit("coffee_teacher_watch", { classroomId: selectedClassroomId })
    }, [connected, role, selectedClassroomId, socket])

    if (role === "teacher") {
        return (
            <TeacherCoffeeView
                classrooms={classrooms}
                connected={connected}
                error={error}
                selectedClassroomId={selectedClassroomId}
                setSelectedClassroomId={classroomId => {
                    setState(null)
                    setError(null)
                    setSelectedClassroomId(classroomId)
                }}
                slotCount={slotCount}
                setSlotCount={setSlotCount}
                socket={socket}
                state={state}
            />
        )
    }

    return (
        <StudentCoffeeView
            displayName={displayName}
            error={error}
            setError={setError}
            socket={socket}
            state={state}
            userId={userId}
        />
    )
}

function TeacherCoffeeView({
    classrooms,
    connected,
    error,
    selectedClassroomId,
    setSelectedClassroomId,
    slotCount,
    setSlotCount,
    socket,
    state,
}: {
    classrooms: Classroom[]
    connected: boolean
    error: string | null
    selectedClassroomId: string
    setSelectedClassroomId: (classroomId: string) => void
    slotCount: number
    setSlotCount: (slotCount: number) => void
    socket: Socket | null
    state: CoffeeState | null
}) {
    const connectedStudents = state?.connectedStudents || []
    const participants = (state?.participants || []) as TeacherParticipant[]
    const maximumSlots = Math.min(12, Math.max(1, connectedStudents.length - 1))
    const effectiveSlotCount = Math.min(slotCount, maximumSlots)
    const canStart = connectedStudents.length >= 2
        && connectedStudents.length % 2 === 0
        && state?.status === "waiting"

    const startAttempt = () => {
        if (!socket || !selectedClassroomId) return
        socket.emit("coffee_start", { classroomId: selectedClassroomId, slotCount: effectiveSlotCount })
    }

    const resetAttempt = (confirmFirst: boolean) => {
        if (!socket || !selectedClassroomId) return
        if (confirmFirst && !window.confirm("Baigti dabartinį bandymą? Visi susitikimai bus ištrinti.")) {
            return
        }
        socket.emit("coffee_reset", { classroomId: selectedClassroomId })
    }

    return (
        <main className="coffee-stage coffee-teacher-stage">
            <div className="coffee-teacher-shell">
                <header className="coffee-teacher-header">
                    <div>
                        <span className="coffee-kicker">„Protus“ klasės žaidimas</span>
                        <h1>Kavos susitikimų iššūkis</h1>
                        <p>Padėkite klasei užpildyti visus kalendorius skirtingais susitikimų partneriais.</p>
                    </div>
                    <ConnectionBadge connected={connected} />
                </header>

                {classrooms.length === 0 ? (
                    <section className="coffee-panel coffee-empty">
                        Prieš pradėdami žaidimą sukurkite klasę.
                    </section>
                ) : (
                    <>
                        <section className="coffee-panel coffee-classroom-bar">
                            <label>
                                Klasė
                                <select
                                    value={selectedClassroomId}
                                    disabled={Boolean(state && state.status !== "waiting")}
                                    onChange={event => setSelectedClassroomId(event.target.value)}
                                >
                                    {classrooms.map(classroom => (
                                        <option key={classroom.id} value={classroom.id}>
                                            {classroom.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="coffee-connected-count">
                                <Users size={22} aria-hidden="true" />
                                <div>
                                    <strong>{connectedStudents.length}</strong>
                                    <span>prisijungusių mokinių</span>
                                </div>
                            </div>
                        </section>

                        {error && <div className="coffee-error"><CircleAlert size={18} />{error}</div>}

                        {state?.status === "waiting" ? (
                            <div className="coffee-teacher-grid">
                                <section className="coffee-panel">
                                    <div className="coffee-section-heading">
                                        <span>1 žingsnis</span>
                                        <h2>Prisijungę mokiniai</h2>
                                    </div>
                                    <div className="coffee-roster">
                                        {connectedStudents.length > 0 ? connectedStudents.map(student => (
                                            <div key={student.id}>
                                                <span className="coffee-avatar">{initials(student.name)}</span>
                                                <strong>{student.name}</strong>
                                                <small>pasiruošęs</small>
                                            </div>
                                        )) : (
                                            <p>Mokiniai čia pasirodys atidarę <code>/games/coffee</code>.</p>
                                        )}
                                    </div>
                                </section>

                                <section className="coffee-panel coffee-settings-panel">
                                    <div className="coffee-section-heading">
                                        <span>2 žingsnis</span>
                                        <h2>Žaidimo nustatymai</h2>
                                    </div>
                                    <label className="coffee-number-field">
                                        Susitikimų laikų skaičius
                                        <input
                                            type="number"
                                            min={1}
                                            max={maximumSlots}
                                            value={effectiveSlotCount}
                                            onChange={event => {
                                                const nextValue = Number(event.target.value) || 1
                                                setSlotCount(Math.min(maximumSlots, Math.max(1, nextValue)))
                                            }}
                                        />
                                        <small>Laikai prasidės 09:00 ir kartosis kas 30 minučių.</small>
                                    </label>
                                    <div className="coffee-slot-preview">
                                        {createSlotLabels(effectiveSlotCount).map(label => <span key={label}>{label}</span>)}
                                    </div>
                                </section>

                                <section className="coffee-panel coffee-launch-panel">
                                    <div className="coffee-section-heading">
                                        <span>3 žingsnis</span>
                                        <h2>Pradėti bandymą</h2>
                                    </div>
                                    <p>Bus įtraukti visi šiuo metu prisijungę mokiniai. Prasidėjus bandymui sąrašas bus užrakintas.</p>
                                    {connectedStudents.length % 2 !== 0 && connectedStudents.length > 0 && (
                                        <div className="coffee-warning">
                                            Reikia lyginio mokinių skaičiaus. Dabar prisijungė {connectedStudents.length}.
                                        </div>
                                    )}
                                    <button className="coffee-primary-button" disabled={!canStart} onClick={startAttempt}>
                                        Pradėti žaidimą
                                    </button>
                                </section>
                            </div>
                        ) : state ? (
                            <>
                                <ResultBanner status={state.status} />
                                <ProgressCard state={state} />
                                <section className="coffee-panel">
                                    <div className="coffee-runtime-heading">
                                        <div>
                                            <span className="coffee-kicker">Dalyvių būsena</span>
                                            <h2>Kalendorių pildymas</h2>
                                        </div>
                                        {state.status === "running" ? (
                                            <button className="coffee-danger-button" onClick={() => resetAttempt(true)}>
                                                Baigti bandymą
                                            </button>
                                        ) : (
                                            <button className="coffee-primary-button compact" onClick={() => resetAttempt(false)}>
                                                Naujas bandymas
                                            </button>
                                        )}
                                    </div>
                                    <div className="coffee-participant-grid">
                                        {participants.map(participant => (
                                            <article key={participant.id}>
                                                <div className="coffee-participant-name">
                                                    <span className="coffee-avatar">{initials(participant.name)}</span>
                                                    <div>
                                                        <strong>{participant.name}</strong>
                                                        <small className={participant.connected ? "online" : "offline"}>
                                                            {participant.connected ? "prisijungęs" : "atsijungęs"}
                                                        </small>
                                                    </div>
                                                </div>
                                                <strong className="coffee-filled-count">
                                                    {participant.filledSlots}/{participant.totalSlots}
                                                </strong>
                                            </article>
                                        ))}
                                    </div>
                                    {connectedStudents.some(student => !student.participant) && (
                                        <div className="coffee-late-students">
                                            <strong>Laukia kito bandymo</strong>
                                            <span>
                                                {connectedStudents
                                                    .filter(student => !student.participant)
                                                    .map(student => student.name)
                                                    .join(", ")}
                                            </span>
                                        </div>
                                    )}
                                </section>
                            </>
                        ) : (
                            <section className="coffee-panel coffee-empty">Kraunama klasės būsena...</section>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}

function StudentCoffeeView({
    displayName,
    error,
    setError,
    socket,
    state,
    userId,
}: {
    displayName: string
    error: string | null
    setError: (error: string | null) => void
    socket: Socket | null
    state: CoffeeState | null
    userId: string
}) {
    const [pickerSlot, setPickerSlot] = useState<number | null>(null)
    const [search, setSearch] = useState("")
    const [now, setNow] = useState(0)
    const calendar = useMemo(() => state?.calendar || [], [state?.calendar])
    const pendingSlot = calendar.find(slot => slot.pending)

    useEffect(() => {
        if (!pendingSlot) return
        const interval = window.setInterval(() => setNow(Date.now()), 1_000)
        return () => window.clearInterval(interval)
    }, [pendingSlot])

    const usedPartnerIds = useMemo(
        () => new Set(calendar.flatMap(slot => slot.partner ? [slot.partner.id] : [])),
        [calendar]
    )
    const choices = ((state?.participants || []) as StudentChoice[])
        .filter(participant => participant.id !== userId)
        .filter(participant => !usedPartnerIds.has(participant.id))
        .filter(participant => participant.name.toLocaleLowerCase("lt").includes(search.toLocaleLowerCase("lt")))

    if (!state || state.status === "waiting" || !state.isParticipant) {
        const lateJoiner = Boolean(state && state.status !== "waiting" && !state.isParticipant)

        return (
            <main className="coffee-stage coffee-student-stage coffee-waiting-stage">
                <section className="coffee-waiting-card">
                    <div className="coffee-waiting-spinner" aria-hidden="true" />
                    <h1>Kavos susitikimų iššūkis</h1>
                    <p>
                        {lateJoiner
                            ? "Šis bandymas jau prasidėjo. Likite čia ir laukite kito bandymo."
                            : "Laukiama, kol mokytojas pradės žaidimą."}
                    </p>
                    {error && <div className="coffee-error"><CircleAlert size={18} />{error}</div>}
                </section>
            </main>
        )
    }

    const canChoose = state.status === "running" && !pendingSlot

    return (
        <main className="coffee-stage coffee-student-stage">
            <div className="coffee-student-shell">
                <header className="coffee-student-header">
                    <div>
                        <h1>Kavos susitikimų<br />iššūkis</h1>
                        <strong>{displayName}</strong>
                    </div>
                    <Coffee size={66} strokeWidth={1.5} aria-hidden="true" />
                </header>

                {state.status !== "running" && <ResultBanner status={state.status} />}
                {state.status === "running" && state.filledSlots === state.slotCount && (
                    <div className="coffee-full-banner">
                        <span><Check size={28} strokeWidth={3} /></span>
                        <div>
                            <h2>Jūsų kalendorius užpildytas</h2>
                            <p>Klasė vis dar dirba.</p>
                        </div>
                    </div>
                )}

                <ProgressCard state={state} />

                {error && (
                    <button className="coffee-error coffee-student-error" onClick={() => setError(null)}>
                        <CircleAlert size={18} />
                        <span>{error}</span>
                        <X size={16} />
                    </button>
                )}

                <section className="coffee-calendar">
                    <h2>Jūsų kalendorius</h2>
                    <div className="coffee-calendar-list">
                        {calendar.map(slot => {
                            const remainingSeconds = slot.pending
                                ? now === 0
                                    ? 60
                                    : Math.max(0, Math.ceil((slot.pending.expiresAt - now) / 1_000))
                                : 0

                            return (
                                <article
                                    key={slot.slotIndex}
                                    className={[
                                        "coffee-calendar-row",
                                        slot.partner ? "confirmed" : "",
                                        slot.pending ? "pending" : "",
                                    ].filter(Boolean).join(" ")}
                                >
                                    <strong className="coffee-slot-time">{slot.label}</strong>
                                    {slot.partner ? (
                                        <>
                                            <strong className="coffee-partner-name">{slot.partner.name}</strong>
                                            <span className="coffee-check"><Check size={20} strokeWidth={3} /></span>
                                        </>
                                    ) : slot.pending ? (
                                        <>
                                            <div className="coffee-pending-copy">
                                                <strong>{slot.pending.targetName}</strong>
                                                <small>Laukiama patvirtinimo · {remainingSeconds} s</small>
                                            </div>
                                            <button
                                                className="coffee-cancel"
                                                onClick={() => socket?.emit("coffee_cancel_pending")}
                                            >
                                                Atšaukti
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="coffee-find-button"
                                            disabled={!canChoose}
                                            onClick={() => {
                                                setError(null)
                                                setSearch("")
                                                setPickerSlot(slot.slotIndex)
                                            }}
                                        >
                                            <span><Plus size={17} /> Rasti klasės draugą</span>
                                            <i><Plus size={20} /></i>
                                        </button>
                                    )}
                                </article>
                            )
                        })}
                    </div>
                </section>

                <footer className="coffee-instructions">
                    <Leaf size={28} aria-hidden="true" />
                    <p>Susitikite su klasės draugu, susitarkite dėl laisvo laiko ir abu pasirinkite vienas kitą.</p>
                </footer>
            </div>

            {pickerSlot !== null && (
                <div className="coffee-picker-overlay" role="presentation" onMouseDown={() => setPickerSlot(null)}>
                    <section
                        className="coffee-picker"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="coffee-picker-title"
                        onMouseDown={event => event.stopPropagation()}
                    >
                        <div className="coffee-picker-head">
                            <div>
                                <span>{calendar[pickerSlot]?.label}</span>
                                <h2 id="coffee-picker-title">Pasirinkite klasės draugą</h2>
                            </div>
                            <button aria-label="Uždaryti" onClick={() => setPickerSlot(null)}><X /></button>
                        </div>
                        <label className="coffee-search">
                            <Search size={19} />
                            <input
                                autoFocus
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Ieškoti pagal vardą"
                            />
                        </label>
                        <div className="coffee-choice-list">
                            {choices.length > 0 ? choices.map(participant => (
                                <button
                                    key={participant.id}
                                    onClick={() => {
                                        socket?.emit("coffee_select", {
                                            slotIndex: pickerSlot,
                                            targetId: participant.id,
                                        })
                                        setPickerSlot(null)
                                    }}
                                >
                                    <span className="coffee-avatar">{initials(participant.name)}</span>
                                    <strong>{participant.name}</strong>
                                </button>
                            )) : (
                                <p>Atitinkančių klasės draugų nerasta.</p>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </main>
    )
}

function ProgressCard({ state }: { state: CoffeeState }) {
    const progress = state.totalMeetings > 0
        ? Math.round((state.confirmedMeetings / state.totalMeetings) * 100)
        : 0

    return (
        <section className="coffee-progress-card">
            <h2>Klasės pažanga</h2>
            <p><strong>{state.confirmedMeetings}</strong> iš {state.totalMeetings} susitikimų patvirtinta</p>
            <div
                className="coffee-progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={state.totalMeetings}
                aria-valuenow={state.confirmedMeetings}
            >
                <span style={{ width: `${progress}%` }} />
            </div>
            <p>{state.remainingMeetings} susitikimų liko</p>
        </section>
    )
}

function ResultBanner({ status }: { status: CoffeeStatus }) {
    if (status === "running" || status === "waiting") return null

    const won = status === "won"

    return (
        <section className={`coffee-result-banner ${won ? "won" : "dead-end"}`}>
            <span>{won ? <Check size={28} strokeWidth={3} /> : <CircleAlert size={28} />}</span>
            <div>
                <h2>{won ? "Klasė laimėjo!" : "Klasė pateko į aklavietę"}</h2>
                <p>
                    {won
                        ? "Visų mokinių kalendoriai užpildyti."
                        : "Likusių susitikimų nebeįmanoma teisėtai suderinti."}
                </p>
            </div>
        </section>
    )
}

function ConnectionBadge({ connected }: { connected: boolean }) {
    return (
        <div className={`coffee-connection ${connected ? "online" : ""}`}>
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {connected ? "Prisijungta prie serverio" : "Jungiamasi"}
        </div>
    )
}

function createSlotLabels(slotCount: number) {
    return Array.from({ length: slotCount }, (_, index) => {
        const totalMinutes = (9 * 60) + (index * 30)
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    })
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toLocaleUpperCase("lt"))
        .join("")
}
