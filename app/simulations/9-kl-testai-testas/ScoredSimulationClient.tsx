"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Award, CheckCircle2, Clock, Loader2, Lock, Trophy, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    NINTH_GRADE_TESTS_SCORED_SIMULATION_ID,
    getSimulationCompletionKey,
} from "@/lib/simulation-completion"
import {
    completeScoredSimulationAttempt,
    getScoredSimulationContext,
    startScoredSimulationForClass,
    type ScoredSimulationState,
} from "./actions"
import type { ScoredQuestionOrderItem } from "@/lib/ninth-grade-scored-test"

function SymbolBase({ symbol, showVector = true }: { symbol: string, showVector?: boolean }) {
    if (!showVector) {
        return <span className="font-serif italic">{symbol.replaceAll('⃗', '')}</span>
    }

    if (symbol.endsWith('⃗')) {
        const base = symbol.replaceAll('⃗', '')

        return (
            <span className="relative inline-block whitespace-nowrap px-0.5 font-serif italic" aria-label={`${base} vektorius`}>
                <span>{base}</span>
                <span aria-hidden="true" className="absolute -top-[0.28em] left-1/2 -translate-x-1/2 text-[0.65em] leading-none not-italic">
                    →
                </span>
            </span>
        )
    }

    return <span className="font-serif italic">{symbol}</span>
}

function QuantitySymbol({ symbol, showVector = true }: { symbol: string, showVector?: boolean }) {
    if (symbol.startsWith('|') && symbol.endsWith('|')) {
        const innerSymbol = symbol.slice(1, -1)

        return (
            <span className="inline-flex items-center whitespace-nowrap">
                <span className="font-sans not-italic">|</span>
                <QuantitySymbol symbol={innerSymbol} showVector />
                <span className="font-sans not-italic">|</span>
            </span>
        )
    }

    if (symbol.includes('_')) {
        const [base, ...subscriptParts] = symbol.split('_')
        const subscript = subscriptParts.join(' ')

        return (
            <span className="inline-block whitespace-nowrap">
                <SymbolBase symbol={base} showVector={showVector} />
                <sub className="ml-0.5 text-[0.68em] leading-none">{subscript}</sub>
            </span>
        )
    }

    return <SymbolBase symbol={symbol} showVector={showVector} />
}

function AnswerText({ answer }: { answer: string }) {
    const match = answer.match(/^(.*) \((.+)\)$/)

    if (!match) return <>{answer}</>

    const [, name, symbol] = match

    return (
        <>
            <span className="font-normal">{name}</span>{' '}
            <span className="whitespace-nowrap font-semibold">( <QuantitySymbol symbol={symbol} /> )</span>
        </>
    )
}

function QuantityNameText({ value, showVector = true }: { value: string, showVector?: boolean }) {
    const match = value.match(/^(.*) \((.+)\)$/)

    if (!match) return <>{value}</>

    const [, name, symbol] = match

    return (
        <>
            <span>{name}</span>{' '}
            <span className="whitespace-nowrap">( <QuantitySymbol symbol={symbol} showVector={showVector} /> )</span>
        </>
    )
}

function UnitAnswerText({ symbol, unit }: { symbol: string, unit: string }) {
    return (
        <span className="whitespace-nowrap">
            <span className="font-semibold">
                <QuantitySymbol symbol={symbol} showVector={false} />
            </span>
            <span className="font-normal">
                {' '}= 1{unit === '1' ? '' : ` ${unit}`}
            </span>
        </span>
    )
}

function FormulaSymbol({ symbol }: { symbol: string }) {
    const symbolMap: Record<string, string> = {
        F: 'F',
        F_A: 'F_A',
        F_s: 'F_s',
        F_tr: 'F_tr',
        F_tr_max: 'F_tr_max',
        F_1_vec: 'F⃗_1',
        F_2_vec: 'F⃗_2',
        F_3_vec: 'F⃗_3',
        F_ats_vec: 'F⃗_ats',
        F_t: 'F_t',
        G: 'G',
        M: 'M',
        N: 'N',
        R: 'R',
        S: 'S',
        V: 'V',
        V_s: 'V_s',
        a: 'a',
        a_vec: 'a⃗',
        delta_l: 'Δl',
        g: 'g',
        h: 'h',
        k: 'k',
        m: 'm',
        m_1: 'm_1',
        m_2: 'm_2',
        mu: 'μ',
        mu_0: 'μ_0',
        p: 'p',
        r: 'r',
        rho: 'ρ',
        rho_s: 'ρ_s',
        s: 's',
        s_vec: 's⃗',
        s_visas: 's_visas',
        t: 't',
        t_visas: 't_visas',
        v_0: 'v_0',
        v_0_vec: 'v⃗_0',
        v_vec: 'v⃗',
        v_vid: 'v_vid',
    }

    return <QuantitySymbol symbol={symbolMap[symbol] ?? symbol} />
}

function FormulaFraction({ numerator, denominator }: { numerator: ReactNode, denominator: ReactNode }) {
    return (
        <span className="mx-1 inline-flex flex-col items-center align-middle leading-none">
            <span className="border-b-2 border-current px-1 pb-0.5">
                {numerator}
            </span>
            <span className="px-1 pt-0.5">
                {denominator}
            </span>
        </span>
    )
}

function FormulaText({ formula }: { formula: string }) {
    const symbol = (value: string) => <FormulaSymbol symbol={value} />

    const formulas: Record<string, ReactNode> = {
        'F_s=mg': <>{symbol('F_s')} = {symbol('m')}{symbol('g')}</>,
        'v_vec=s_vec/t': <>{symbol('v_vec')} = <FormulaFraction numerator={symbol('s_vec')} denominator={symbol('t')} /></>,
        'v_vid=s_visas/t_visas': <>{symbol('v_vid')} = <FormulaFraction numerator={symbol('s_visas')} denominator={symbol('t_visas')} /></>,
        'a_vec=(v_vec-v_0_vec)/t': (
            <>
                {symbol('a_vec')} = <FormulaFraction numerator={<>{symbol('v_vec')} - {symbol('v_0_vec')}</>} denominator={symbol('t')} />
            </>
        ),
        's=v_0*t+(a*t^2)/2': (
            <>
                {symbol('s')} = {symbol('v_0')} · {symbol('t')} + <FormulaFraction
                    numerator={<>{symbol('a')} · {symbol('t')}<sup className="text-[0.68em] leading-none">2</sup></>}
                    denominator="2"
                />
            </>
        ),
        'a_vec=F_ats_vec/m': <>{symbol('a_vec')} = <FormulaFraction numerator={symbol('F_ats_vec')} denominator={symbol('m')} /></>,
        'F_ats_vec=F_1_vec+F_2_vec+F_3_vec+...': <>{symbol('F_ats_vec')} = {symbol('F_1_vec')} + {symbol('F_2_vec')} + {symbol('F_3_vec')} + ...</>,
        'F=G*(m_1*m_2)/R^2': (
            <>
                {symbol('F')} = {symbol('G')}<FormulaFraction
                    numerator={<>{symbol('m_1')}{symbol('m_2')}</>}
                    denominator={<>{symbol('R')}<sup className="text-[0.68em] leading-none">2</sup></>}
                />
            </>
        ),
        'g=G*M/(R+r)^2': (
            <>
                {symbol('g')} = {symbol('G')}<FormulaFraction
                    numerator={symbol('M')}
                    denominator={<>({symbol('R')} + {symbol('r')})<sup className="text-[0.68em] leading-none">2</sup></>}
                />
            </>
        ),
        'F_1_vec=-F_2_vec': <>{symbol('F_1_vec')} = -{symbol('F_2_vec')}</>,
        'F_t=k*delta_l': <>{symbol('F_t')} = {symbol('k')}{symbol('delta_l')}</>,
        'F_tr=mu*N': <>{symbol('F_tr')} = {symbol('mu')}{symbol('N')}</>,
        'F_tr_max=mu_0*N': <>{symbol('F_tr_max')} = {symbol('mu_0')}{symbol('N')}</>,
        'p=F/S': <>{symbol('p')} = <FormulaFraction numerator={symbol('F')} denominator={symbol('S')} /></>,
        'rho=m/V': <>{symbol('rho')} = <FormulaFraction numerator={symbol('m')} denominator={symbol('V')} /></>,
        'p=rho*g*h': <>{symbol('p')} = {symbol('rho')}{symbol('g')}{symbol('h')}</>,
        'F_A=rho_s*g*V_s': <>{symbol('F_A')} = {symbol('rho_s')}{symbol('g')}{symbol('V_s')}</>,
    }

    return (
        <span className="inline-flex items-center whitespace-nowrap font-serif italic leading-none">
            {formulas[formula] ?? formula}
        </span>
    )
}

function QuestionText({ question }: { question: ScoredQuestionOrderItem }) {
    if (question.mode === 'unit') {
        return <QuantityNameText value={question.definition} showVector={false} />
    }

    return <>{question.definition}</>
}

function OptionText({
    question,
    answer,
}: {
    question: ScoredQuestionOrderItem
    answer: string
}) {
    if (question.mode === 'unit' && question.symbol) {
        return <UnitAnswerText symbol={question.symbol} unit={answer} />
    }

    if (question.mode === 'formula') {
        return <FormulaText formula={answer} />
    }

    return <AnswerText answer={answer} />
}

function CenterShell({ children }: { children: ReactNode }) {
    return (
        <main className="relative min-h-[100dvh] overflow-hidden bg-[#eef4ff] text-[#07122d]">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[linear-gradient(132deg,#ffffff_0%,#f4f8ff_20%,#dfe9ff_48%,#b8cffd_74%,#78a8ff_100%)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_20%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(ellipse_at_86%_24%,rgba(176,198,255,0.9),transparent_40%),radial-gradient(ellipse_at_50%_94%,rgba(255,214,143,0.56),transparent_34%)]" />
                <div className="absolute bottom-[4%] -left-[12%] h-40 w-[125%] bg-[linear-gradient(100deg,transparent_0%,rgba(255,188,118,0.72)_34%,rgba(255,255,255,0.86)_51%,rgba(105,155,255,0.22)_70%,transparent_100%)] blur-sm" />
            </div>
            <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1540px] flex-col px-4 py-3 sm:px-8 lg:px-10">
                <header className="flex items-center justify-between pb-2">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 h-9 rounded-full px-3 text-sm font-bold text-[#07122d] hover:bg-white/55 sm:text-base">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Pagrindinis
                        </Link>
                    </Button>
                    <div className="text-sm font-bold text-[#102451] sm:text-base">
                        9 kl. Testai (testas)
                    </div>
                </header>
                <section className="flex min-h-0 flex-1 items-start justify-center pb-3 pt-2 sm:pt-3">
                    {children}
                </section>
            </div>
        </main>
    )
}

type PlayingSimulationState = Extract<ScoredSimulationState, { status: 'playing' }>
type LocalAnswerMap = Record<string, string>

function getAnswerStorageKey(assignmentId: string, startedAt: string) {
    return `9-kl-testai-testas-answers:${assignmentId}:${startedAt}`
}

function readStoredAnswers(assignmentId: string, playingState: PlayingSimulationState): LocalAnswerMap {
    try {
        const raw = window.localStorage.getItem(getAnswerStorageKey(assignmentId, playingState.startedAt))
        if (!raw) return {}

        const parsed = JSON.parse(raw) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

        const allowedKeys = new Set(playingState.questionOrder.map((question) => question.key))
        return Object.entries(parsed).reduce<LocalAnswerMap>((answers, [key, answer]) => {
            if (allowedKeys.has(key) && typeof answer === 'string') {
                answers[key] = answer
            }
            return answers
        }, {})
    } catch {
        return {}
    }
}

function getCurrentQuestionIndex(playingState: PlayingSimulationState, serverOffsetMs: number) {
    const startedAtMs = new Date(playingState.startedAt).getTime()
    const elapsedMs = Date.now() + serverOffsetMs - startedAtMs
    return Math.min(
        playingState.totalQuestions,
        Math.max(0, Math.floor(elapsedMs / (playingState.questionSeconds * 1000)))
    )
}

function getRemainingSecondsForIndex(playingState: PlayingSimulationState, currentIndex: number, serverOffsetMs: number) {
    if (currentIndex >= playingState.totalQuestions) return 0

    const startedAtMs = new Date(playingState.startedAt).getTime()
    const deadlineMs = startedAtMs + (currentIndex + 1) * playingState.questionSeconds * 1000
    return Math.max(0, Math.ceil((deadlineMs - (Date.now() + serverOffsetMs)) / 1000))
}

export function ScoredSimulationClient({ assignmentId }: { assignmentId: string | null }) {
    const [state, setState] = useState<ScoredSimulationState | null>(null)
    const [remainingSeconds, setRemainingSeconds] = useState(15)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [serverOffsetMs, setServerOffsetMs] = useState(0)
    const [localAnswers, setLocalAnswers] = useState<LocalAnswerMap>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isTeacherStarting, setIsTeacherStarting] = useState(false)
    const [isSavingResult, setIsSavingResult] = useState(false)
    const [teacherStartError, setTeacherStartError] = useState<string | null>(null)
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
    const savingInFlightRef = useRef(false)
    const localAnswersRef = useRef<LocalAnswerMap>({})

    useEffect(() => {
        localAnswersRef.current = localAnswers
    }, [localAnswers])

    const applyState = useCallback((result: ScoredSimulationState) => {
        setState(result)

        if (result.status === 'playing') {
            const nextOffset = new Date(result.serverNow).getTime() - Date.now()
            setServerOffsetMs(nextOffset)
            const nextIndex = getCurrentQuestionIndex(result, nextOffset)
            setCurrentIndex(nextIndex)
            setRemainingSeconds(getRemainingSecondsForIndex(result, nextIndex, nextOffset))

            if (assignmentId) {
                const restoredAnswers = readStoredAnswers(assignmentId, result)
                setLocalAnswers(restoredAnswers)
            }
        } else if (result.status === 'teacher') {
            const defaultSelected = result.startedStudents > 0
                ? result.students.filter((student) => student.hasStarted).map((student) => student.id)
                : result.students.map((student) => student.id)
            setSelectedStudentIds(new Set(defaultSelected))
        }
    }, [assignmentId])

    const loadState = useCallback(async () => {
        if (!assignmentId) {
            setState({
                status: 'error',
                message: 'Šį vertinamą testą atidarykite per mokytojo priskirtą simuliacijos užduotį.',
            })
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const result = await getScoredSimulationContext(assignmentId)
            applyState(result)
        } finally {
            setIsLoading(false)
        }
    }, [applyState, assignmentId])

    useEffect(() => {
        void loadState()
    }, [loadState])

    useEffect(() => {
        if (!assignmentId || state?.status !== 'locked') return

        const interval = window.setInterval(async () => {
            const result = await getScoredSimulationContext(assignmentId)
            if (result.status !== 'locked') {
                applyState(result)
            }
        }, 2000)

        return () => window.clearInterval(interval)
    }, [applyState, assignmentId, state])

    useEffect(() => {
        if (!assignmentId || state?.status !== 'completed') return

        try {
            const completionKey = getSimulationCompletionKey(NINTH_GRADE_TESTS_SCORED_SIMULATION_ID, assignmentId)
            window.localStorage.setItem(completionKey, 'completed')
            window.opener?.postMessage(
                {
                    type: 'simulation-completed',
                    simulationId: NINTH_GRADE_TESTS_SCORED_SIMULATION_ID,
                    assignmentId,
                },
                window.location.origin
            )
        } catch (error) {
            console.error('Failed to record scored simulation completion:', error)
        }
    }, [assignmentId, state])

    const playingState = state?.status === 'playing' ? state : null

    const finishTest = useCallback(async () => {
        if (!assignmentId || !playingState || savingInFlightRef.current) return

        savingInFlightRef.current = true
        setIsSavingResult(true)
        try {
            const result = await completeScoredSimulationAttempt({
                assignmentId,
                answers: localAnswersRef.current,
            })
            applyState(result)

            if (result.status === 'completed') {
                window.localStorage.removeItem(getAnswerStorageKey(assignmentId, playingState.startedAt))
            }
        } finally {
            setIsSavingResult(false)
            savingInFlightRef.current = false
        }
    }, [applyState, assignmentId, playingState])

    useEffect(() => {
        if (!playingState) return

        const tick = () => {
            const nextIndex = getCurrentQuestionIndex(playingState, serverOffsetMs)
            setCurrentIndex(nextIndex)
            setRemainingSeconds(getRemainingSecondsForIndex(playingState, nextIndex, serverOffsetMs))

            if (nextIndex >= playingState.totalQuestions) {
                void finishTest()
            }
        }

        tick()
        const interval = window.setInterval(tick, 250)
        return () => window.clearInterval(interval)
    }, [finishTest, playingState, serverOffsetMs])

    const currentQuestion = playingState && currentIndex < playingState.totalQuestions
        ? playingState.questionOrder[currentIndex]
        : null
    const selectedAnswer = currentQuestion ? localAnswers[currentQuestion.key] ?? null : null
    const questionNumber = currentQuestion ? currentIndex + 1 : playingState?.totalQuestions ?? 0
    const isAnswerLocked = remainingSeconds <= 0 || isSavingResult

    const handleTeacherStart = useCallback(async () => {
        if (!assignmentId || isTeacherStarting || selectedStudentIds.size === 0) return

        setTeacherStartError(null)
        setIsTeacherStarting(true)
        try {
            const result = await startScoredSimulationForClass({
                assignmentId,
                studentIds: Array.from(selectedStudentIds),
            })
            if (result.status === 'error' || result.status === 'locked') {
                setTeacherStartError(result.message)
            } else {
                applyState(result)
            }
        } finally {
            setIsTeacherStarting(false)
        }
    }, [applyState, assignmentId, isTeacherStarting, selectedStudentIds])

    const toggleStudent = useCallback((studentId: string) => {
        setSelectedStudentIds((previous) => {
            const next = new Set(previous)
            if (next.has(studentId)) {
                next.delete(studentId)
            } else {
                next.add(studentId)
            }
            return next
        })
    }, [])

    const toggleAllStudents = useCallback((students: Array<{ id: string }>) => {
        setSelectedStudentIds((previous) => {
            if (students.length > 0 && previous.size === students.length) {
                return new Set()
            }
            return new Set(students.map((student) => student.id))
        })
    }, [])

    const handleAnswer = useCallback((answer: string) => {
        if (!assignmentId || !playingState || !currentQuestion || isAnswerLocked) return

        setLocalAnswers((previousAnswers) => {
            const nextAnswers = {
                ...previousAnswers,
                [currentQuestion.key]: answer,
            }

            try {
                window.localStorage.setItem(getAnswerStorageKey(assignmentId, playingState.startedAt), JSON.stringify(nextAnswers))
            } catch {
                // Local storage is only a resilience layer; final in-memory state is still submitted.
            }

            return nextAnswers
        })
    }, [assignmentId, currentQuestion, isAnswerLocked, playingState])

    const content = useMemo(() => {
        if (isLoading || !state) {
            return (
                <div className="w-full max-w-md rounded-[1.2rem] border border-white/80 bg-white/82 p-8 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#0959f5]" />
                    <p className="font-semibold text-[#26467e]">Įkeliamas testas...</p>
                </div>
            )
        }

        if (state.status === 'teacher') {
            const hasStarted = state.startedStudents > 0
            const selectedWithPriorResults = state.students.filter((student) => selectedStudentIds.has(student.id) && student.hasCompleted)
            return (
                <div className="w-full max-w-2xl rounded-[1.3rem] border border-white/80 bg-white/85 p-6 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl sm:p-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 shadow-inner">
                        <Clock className="h-7 w-7" />
                    </div>
                    <h1 className="mb-2 text-3xl font-black tracking-tight text-[#050814]">
                        {state.assignmentTitle}
                    </h1>
                    <p className="mb-6 text-sm font-semibold text-[#26467e]">
                        {state.collectionTitle}
                    </p>
                    <div className="mb-6 grid gap-3 text-sm font-bold text-[#102451] sm:grid-cols-3">
                        <div className="rounded-xl border border-[#cbd6fb] bg-white/70 px-4 py-3">
                            Mokiniai<br />{state.totalStudents}
                        </div>
                        <div className="rounded-xl border border-[#cbd6fb] bg-white/70 px-4 py-3">
                            Pradėta<br />{state.startedStudents}
                        </div>
                        <div className="rounded-xl border border-[#cbd6fb] bg-white/70 px-4 py-3">
                            Baigė<br />{state.completedStudents}
                        </div>
                    </div>
                    {state.startedAt ? (
                        <p className="mb-4 text-xs font-semibold text-[#46608f]">
                            Testas pradėtas: {new Date(state.startedAt).toLocaleString('lt-LT')}
                        </p>
                    ) : null}
                    {teacherStartError ? (
                        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                            {teacherStartError}
                        </p>
                    ) : null}
                    <div className="mb-6 rounded-xl border border-[#cbd6fb] bg-white/70 text-left">
                        <div className="flex items-center justify-between border-b border-[#dce5ff] px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-black text-[#102451]">
                                <Users className="h-4 w-4 text-[#0959f5]" />
                                Mokiniai ({selectedStudentIds.size}/{state.students.length})
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#46608f]">
                                Visi
                                <Checkbox
                                    checked={state.students.length > 0 && selectedStudentIds.size === state.students.length}
                                    onCheckedChange={() => toggleAllStudents(state.students)}
                                    disabled={isTeacherStarting || state.students.length === 0}
                                />
                            </label>
                        </div>
                        {state.students.length === 0 ? (
                            <p className="px-4 py-5 text-center text-sm font-semibold text-[#46608f]">
                                Klasėje nėra mokinių.
                            </p>
                        ) : (
                            <div className="max-h-64 divide-y divide-[#e3eaff] overflow-y-auto">
                                {state.students.map((student) => {
                                    const name = [student.firstName, student.lastName].filter(Boolean).join(' ') || 'Unnamed'
                                    const isSelected = selectedStudentIds.has(student.id)

                                    return (
                                        <label
                                            key={student.id}
                                            className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition hover:bg-blue-50/70 ${isSelected ? '' : 'opacity-60'}`}
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleStudent(student.id)}
                                                    disabled={isTeacherStarting}
                                                />
                                                <span className="truncate text-sm font-bold text-[#102451]">{name}</span>
                                            </div>
                                            {student.hasCompleted ? (
                                                <span className="inline-flex flex-none items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    {student.earnedPoints}/{student.maxPoints}
                                                </span>
                                            ) : student.hasStarted ? (
                                                <span className="inline-flex flex-none items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                                                    <Award className="h-3.5 w-3.5" />
                                                    Pradėta
                                                </span>
                                            ) : null}
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    {selectedWithPriorResults.length > 0 ? (
                        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                            {selectedWithPriorResults.length} mokinių ankstesni rezultatai bus ištrinti pradėjus testą iš naujo.
                        </p>
                    ) : null}
                    <Button
                        size="lg"
                        onClick={handleTeacherStart}
                        disabled={isTeacherStarting || selectedStudentIds.size === 0}
                        className="min-w-44 rounded-xl bg-[#0959f5] px-8 text-base font-bold shadow-[0_10px_25px_rgba(9,89,245,0.28)] hover:bg-[#074ddd]"
                    >
                        {isTeacherStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {hasStarted ? `Pradėti iš naujo (${selectedStudentIds.size})` : `Pradėti testą (${selectedStudentIds.size})`}
                    </Button>
                </div>
            )
        }

        if (state.status === 'locked') {
            return (
                <div className="w-full max-w-md rounded-[1.2rem] border border-white/80 bg-white/82 p-8 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl">
                    <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-[#0959f5]" />
                    <h1 className="mb-3 text-2xl font-black tracking-tight text-[#050814]">
                        Laukiama testo pradžios
                    </h1>
                    <p className="text-sm font-semibold leading-relaxed text-[#26467e]">
                        {state.message}
                    </p>
                </div>
            )
        }

        if (state.status === 'error') {
            return (
                <div className="w-full max-w-md rounded-[1.2rem] border border-white/80 bg-white/82 p-8 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-inner">
                        <Lock className="h-7 w-7" />
                    </div>
                    <h1 className="mb-3 text-2xl font-black tracking-tight text-[#050814]">
                        Testas neprieinamas
                    </h1>
                    <p className="text-sm font-semibold leading-relaxed text-[#26467e]">
                        {state.message}
                    </p>
                </div>
            )
        }

        if (state.status === 'ready') {
            return (
                <div className="w-full max-w-xl rounded-[1.3rem] border border-white/80 bg-white/85 p-6 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl sm:p-8">
                    <h1 className="mb-3 text-3xl font-black tracking-tight text-[#050814]">
                        {state.assignmentTitle}
                    </h1>
                    <p className="mb-6 text-sm font-semibold leading-relaxed text-[#26467e]">
                        Klausimai bus pateikti atsitiktine tvarka. Kiekvienam klausimui skiriama 15 s.
                    </p>
                    <div className="mb-6 rounded-xl border border-[#cbd6fb] bg-white/70 px-4 py-3 text-sm font-bold text-[#102451]">
                        {state.totalQuestions} klausimai · {state.maxPoints} taškų
                    </div>
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#0959f5]" />
                </div>
            )
        }

        if (state.status === 'completed') {
            return (
                <div className="w-full max-w-xl rounded-[1.3rem] border border-white/80 bg-white/85 p-6 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl sm:p-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 shadow-inner">
                        <Trophy className="h-7 w-7" />
                    </div>
                    <h1 className="mb-3 text-3xl font-black tracking-tight text-[#050814]">
                        Testas baigtas
                    </h1>
                    <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
                        <p className="text-3xl font-black text-green-800">
                            {state.earnedPoints} / {state.maxPoints}
                        </p>
                        <p className="mt-1 text-sm font-bold text-green-700">
                            Teisingi atsakymai: {state.correctCount} iš {state.totalQuestions}
                        </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#26467e]">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Rezultatas išsaugotas
                    </div>
                </div>
            )
        }

        if (!playingState || !currentQuestion) {
            return (
                <div className="w-full max-w-md rounded-[1.2rem] border border-white/80 bg-white/82 p-8 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#0959f5]" />
                    <p className="font-semibold text-[#26467e]">
                        {isSavingResult ? 'Saugomas rezultatas...' : 'Ruošiamas rezultatas...'}
                    </p>
                </div>
            )
        }

        return (
            <div className="w-full max-w-[1290px] overflow-hidden rounded-[1.4rem] border border-[#c9d6ff]/80 bg-white/84 p-4 shadow-[0_30px_90px_rgba(55,96,180,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl sm:p-5 lg:p-6">
                <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-[#26467e] sm:text-base">
                                {currentQuestion.topicTitle}
                            </p>
                            <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#050814] sm:text-3xl">
                                Klausimas {questionNumber} iš {playingState.totalQuestions}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-[#cbd6fb] bg-white/76 px-4 py-2 text-base font-black text-[#050814] shadow-[0_12px_28px_rgba(100,124,190,0.18)] sm:text-lg">
                            <Clock className="h-5 w-5 text-[#ff8500]" />
                            {remainingSeconds.toString().padStart(2, '0')} s
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                    <div className="rounded-[1.1rem] border border-[#cbd6f8] bg-white/62 px-4 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-6 sm:py-6">
                        <p className="mx-auto max-w-4xl text-lg font-black leading-relaxed text-[#050814] sm:text-2xl lg:text-[1.7rem] lg:leading-[1.42]">
                            <QuestionText question={currentQuestion} />
                        </p>
                    </div>

                    <div className="grid gap-3 min-[520px]:grid-cols-2">
                        {currentQuestion.options.map((option) => {
                            const isSelected = selectedAnswer === option.value

                            return (
                                <button
                                     key={`${currentQuestion.key}-${option.label}-${option.value}`}
                                     type="button"
                                     onClick={() => handleAnswer(option.value)}
                                    disabled={isAnswerLocked}
                                    className={`relative flex min-h-16 items-center gap-3 overflow-visible rounded-[0.9rem] border p-3 text-left shadow-[0_10px_20px_rgba(77,104,170,0.11)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5cff] disabled:cursor-default disabled:opacity-100 sm:min-h-[4.5rem] sm:gap-4 sm:p-4 ${isSelected
                                        ? 'border-[#0959f5] bg-blue-50 text-[#102451] shadow-[0_14px_30px_rgba(42,95,190,0.18)]'
                                        : 'border-[#d1daf8] bg-white/78 text-[#102451] hover:-translate-y-0.5 hover:border-[#8aa8ff] hover:bg-white hover:shadow-[0_18px_34px_rgba(57,94,178,0.18)]'
                                        }`}
                                >
                                    <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-base font-black shadow-[0_8px_18px_rgba(9,89,245,0.22)] sm:h-11 sm:w-11 sm:text-lg ${isSelected ? 'bg-[#07122d] text-white' : 'bg-[#0959f5] text-white'}`}>
                                        {option.label}
                                    </span>
                                    <span className="min-w-0 text-base leading-snug sm:text-lg lg:text-xl">
                                        <OptionText question={currentQuestion} answer={option.value} />
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="flex min-h-7 items-center justify-center text-sm font-semibold text-[#26467e]">
                        {selectedAnswer ? 'Atsakymas pasirinktas. Jį galite pakeisti, kol nesibaigė laikas.' : null}
                        {!selectedAnswer && remainingSeconds <= 0 ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Įkeliamas kitas klausimas...
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>
        )
    }, [
        handleAnswer,
        handleTeacherStart,
        currentQuestion,
        isAnswerLocked,
        isLoading,
        isSavingResult,
        isTeacherStarting,
        playingState,
        questionNumber,
        remainingSeconds,
        selectedAnswer,
        selectedStudentIds,
        state,
        teacherStartError,
        toggleAllStudents,
        toggleStudent,
    ])

    return <CenterShell>{content}</CenterShell>
}
