"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock, RotateCcw, Trophy, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    NINTH_GRADE_TESTS_SIMULATION_ID,
    getSimulationCompletionKey,
    getSimulationTopicProgressKey,
} from "@/lib/simulation-completion"
import { QUIZ_TOPICS, type QuizQuestion, type QuizTopicSet } from "./quiz-data"

const ANSWER_SECONDS = 15
const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

type QuizScreen = 'intro' | 'playing' | 'lost' | 'completed'
type LossReason = 'incorrect' | 'timeout'

interface AnswerOption {
    label: (typeof OPTION_LABELS)[number]
    value: string
}

interface LossInfo {
    reason: LossReason
    correctAnswer: string
}

interface CorrectFeedback {
    answer: string
    burstId: number
}

const FIREWORK_PARTICLES = [
    { x: -28, y: -18, color: 'bg-amber-400', delay: 0 },
    { x: 26, y: -20, color: 'bg-sky-400', delay: 20 },
    { x: -22, y: 18, color: 'bg-emerald-400', delay: 35 },
    { x: 24, y: 16, color: 'bg-pink-400', delay: 50 },
    { x: 0, y: -30, color: 'bg-violet-400', delay: 65 },
    { x: 2, y: 26, color: 'bg-orange-400', delay: 80 },
]

const BACKGROUND_SPARKLES = [
    { top: '15%', left: '3%', size: 'text-lg', color: 'text-white' },
    { top: '29%', left: '5%', size: 'text-2xl', color: 'text-white' },
    { top: '41%', left: '93%', size: 'text-4xl', color: 'text-white' },
    { top: '82%', left: '90%', size: 'text-4xl', color: 'text-white' },
    { top: '23%', left: '97%', size: 'text-base', color: 'text-white' },
    { top: '68%', left: '97%', size: 'text-lg', color: 'text-white' },
    { top: '38%', left: '90%', size: 'text-sm', color: 'text-white' },
    { top: '72%', left: '8%', size: 'text-sm', color: 'text-white' },
    { top: '42%', left: '3%', size: 'text-xl', color: 'text-amber-200' },
    { top: '42%', left: '93%', size: 'text-xl', color: 'text-amber-200' },
]

function shuffleArray<T>(items: T[]) {
    const shuffled = [...items]

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1))
        const originalValue = shuffled[index]
        shuffled[index] = shuffled[swapIndex]
        shuffled[swapIndex] = originalValue
    }

    return shuffled
}

function buildAnswerOptions(question: QuizQuestion, allAnswers: string[]): AnswerOption[] {
    const uniqueAnswers = Array.from(new Set(allAnswers))
    const distractors = shuffleArray(uniqueAnswers.filter((answer) => answer !== question.answer)).slice(0, 3)

    return shuffleArray([question.answer, ...distractors]).map((value, index) => ({
        label: OPTION_LABELS[index],
        value,
    }))
}

function buildAttemptQuestions(topic: QuizTopicSet) {
    const attemptQuestions: QuizQuestion[] = []
    const groupedQuestions = new Map<string, QuizQuestion[]>()

    for (const question of topic.questions) {
        if (!question.randomGroupId) {
            attemptQuestions.push(question)
            continue
        }

        const groupQuestions = groupedQuestions.get(question.randomGroupId) ?? []
        groupQuestions.push(question)
        groupedQuestions.set(question.randomGroupId, groupQuestions)
    }

    for (const groupQuestions of groupedQuestions.values()) {
        const selectedQuestion = shuffleArray(groupQuestions)[0]

        if (selectedQuestion) {
            attemptQuestions.push(selectedQuestion)
        }
    }

    return shuffleArray(attemptQuestions)
}

function getAnswerPool(topic: QuizTopicSet) {
    return Array.from(new Set(topic.answerOptions ?? topic.questions.map((question) => question.answer)))
}

function getCurrentAssignmentId() {
    return new URLSearchParams(window.location.search).get('assignmentId')
}

function clampTopicIndex(topicIndex: number) {
    if (!Number.isFinite(topicIndex)) return 0

    return Math.min(Math.max(0, Math.floor(topicIndex)), QUIZ_TOPICS.length - 1)
}

function clampTopicProgress(topicIndex: number) {
    if (!Number.isFinite(topicIndex)) return 0

    return Math.min(Math.max(0, Math.floor(topicIndex)), QUIZ_TOPICS.length)
}

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
        F_t_vec: 'F⃗_t',
        G: 'G',
        M: 'M',
        N: 'N',
        R: 'R',
        S: 'S',
        V: 'V',
        V_s: 'V_s',
        a: 'a',
        a_vec: 'a⃗',
        delta_l_vec: 'Δl⃗',
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
        'F_s=mg': (
            <>
                {symbol('F_s')} = {symbol('m')}{symbol('g')}
            </>
        ),
        'v_vec=s_vec/t': (
            <>
                {symbol('v_vec')} = <FormulaFraction numerator={symbol('s_vec')} denominator={symbol('t')} />
            </>
        ),
        'v_vid=s_visas/t_visas': (
            <>
                {symbol('v_vid')} = <FormulaFraction numerator={symbol('s_visas')} denominator={symbol('t_visas')} />
            </>
        ),
        'a_vec=(v_vec-v_0_vec)/t': (
            <>
                {symbol('a_vec')} = <FormulaFraction
                    numerator={(
                        <>
                            {symbol('v_vec')} - {symbol('v_0_vec')}
                        </>
                    )}
                    denominator={symbol('t')}
                />
            </>
        ),
        's=v_0*t+(a*t^2)/2': (
            <>
                {symbol('s')} = {symbol('v_0')} · {symbol('t')} + <FormulaFraction
                    numerator={(
                        <>
                            {symbol('a')} · {symbol('t')}<sup className="text-[0.68em] leading-none">2</sup>
                        </>
                    )}
                    denominator="2"
                />
            </>
        ),
        'a_vec=F_ats_vec/m': (
            <>
                {symbol('a_vec')} = <FormulaFraction numerator={symbol('F_ats_vec')} denominator={symbol('m')} />
            </>
        ),
        'F_ats_vec=F_1_vec+F_2_vec+F_3_vec+...': (
            <>
                {symbol('F_ats_vec')} = {symbol('F_1_vec')} + {symbol('F_2_vec')} + {symbol('F_3_vec')} + ...
            </>
        ),
        'F=G*(m_1*m_2)/R^2': (
            <>
                {symbol('F')} = {symbol('G')}<FormulaFraction
                    numerator={(
                        <>
                            {symbol('m_1')}{symbol('m_2')}
                        </>
                    )}
                    denominator={(
                        <>
                            {symbol('R')}<sup className="text-[0.68em] leading-none">2</sup>
                        </>
                    )}
                />
            </>
        ),
        'g=G*M/(R+r)^2': (
            <>
                {symbol('g')} = {symbol('G')}<FormulaFraction
                    numerator={symbol('M')}
                    denominator={(
                        <>
                            ({symbol('R')} + {symbol('r')})<sup className="text-[0.68em] leading-none">2</sup>
                        </>
                    )}
                />
            </>
        ),
        'F_1_vec=-F_2_vec': (
            <>
                {symbol('F_1_vec')} = -{symbol('F_2_vec')}
            </>
        ),
        'F_t=k*delta_l': (
            <>
                {symbol('F_t')} = {symbol('k')}{symbol('delta_l')}
            </>
        ),
        'F_tr=mu*N': (
            <>
                {symbol('F_tr')} = {symbol('mu')}{symbol('N')}
            </>
        ),
        'F_tr_max=mu_0*N': (
            <>
                {symbol('F_tr_max')} = {symbol('mu_0')}{symbol('N')}
            </>
        ),
        'p=F/S': (
            <>
                {symbol('p')} = <FormulaFraction numerator={symbol('F')} denominator={symbol('S')} />
            </>
        ),
        'rho=m/V': (
            <>
                {symbol('rho')} = <FormulaFraction numerator={symbol('m')} denominator={symbol('V')} />
            </>
        ),
        'p=rho*g*h': (
            <>
                {symbol('p')} = {symbol('rho')}{symbol('g')}{symbol('h')}
            </>
        ),
        'F_A=rho_s*g*V_s': (
            <>
                {symbol('F_A')} = {symbol('rho_s')}{symbol('g')}{symbol('V_s')}
            </>
        ),
    }

    return (
        <span className="inline-flex items-center whitespace-nowrap font-serif italic leading-none">
            {formulas[formula] ?? formula}
        </span>
    )
}

function QuestionText({ question }: { question: QuizQuestion }) {
    if (question.mode === 'unit') {
        return <QuantityNameText value={question.definition} showVector={false} />
    }

    return <>{question.definition}</>
}

function OptionText({ question, answer }: { question: QuizQuestion, answer: string }) {
    if (question.mode === 'unit' && question.symbol) {
        return <UnitAnswerText symbol={question.symbol} unit={answer} />
    }

    if (question.mode === 'formula') {
        return <FormulaText formula={answer} />
    }

    return <AnswerText answer={answer} />
}

function TopicProgressTrack({
    progressPercent,
    unlockedTopicIndex,
    onSelectTopic,
}: {
    progressPercent: number
    unlockedTopicIndex: number
    onSelectTopic: (topicIndex: number) => void
}) {
    return (
        <div className="relative px-5 py-3 sm:px-6">
            <div className="relative">
                <div className="relative h-2.5 rounded-full bg-[#dfe7ff]/90 shadow-[inset_0_1px_3px_rgba(61,87,154,0.16)] sm:h-3">
                    <div
                        className="relative h-full rounded-full bg-[linear-gradient(90deg,#005dff_0%,#1168ff_54%,#704dff_82%,#ffe274_100%)] shadow-[0_0_16px_rgba(12,90,245,0.35)] transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                    >
                        {progressPercent > 0 && (
                            <span className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#ffe78a] shadow-[0_0_18px_rgba(255,203,87,0.9),0_0_34px_rgba(255,133,0,0.32)]" />
                        )}
                    </div>
                </div>
                {QUIZ_TOPICS.map((topic, index) => {
                    const checkpointPercent = (index / QUIZ_TOPICS.length) * 100
                    const isUnlocked = index <= unlockedTopicIndex
                    const isReached = isUnlocked || progressPercent >= checkpointPercent - 0.1

                    return (
                        <button
                            key={topic.id}
                            type="button"
                            disabled={!isUnlocked}
                            onClick={() => onSelectTopic(index)}
                            aria-label={`Pradėti ${index + 1} rinkinį: ${topic.title}`}
                            className={`absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 appearance-none items-center justify-center rounded-full p-0 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5cff] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-100 ${isReached
                                ? 'h-12 w-12 bg-[#1267ff]/12'
                                : 'h-8 w-8'
                                } ${isUnlocked
                                    ? 'cursor-pointer hover:scale-105'
                                    : 'cursor-not-allowed'
                                }`}
                            style={{ left: `${checkpointPercent}%` }}
                            title={isUnlocked ? topic.title : `${topic.title} (užrakinta)`}
                        >
                            <span
                                className={`flex items-center justify-center rounded-full text-sm font-black transition-all ${isReached
                                    ? 'h-8 w-8 bg-[#1267ff] text-white shadow-[0_8px_18px_rgba(18,103,255,0.34)]'
                                    : 'h-8 w-8 border-2 border-[#1267ff] bg-white text-[#1267ff] shadow-[0_5px_12px_rgba(18,103,255,0.16)]'
                                    }`}
                            >
                                {index + 1}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default function NinthGradeTestsSimulationPage() {
    const [activeTopicIndex, setActiveTopicIndex] = useState(0)
    const [unlockedTopicIndex, setUnlockedTopicIndex] = useState(0)
    const activeTopic = QUIZ_TOPICS[activeTopicIndex] ?? QUIZ_TOPICS[0]
    const allAnswers = useMemo(
        () => getAnswerPool(activeTopic),
        [activeTopic]
    )
    const [screen, setScreen] = useState<QuizScreen>('intro')
    const [attemptQuestions, setAttemptQuestions] = useState<QuizQuestion[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [timeLeft, setTimeLeft] = useState(ANSWER_SECONDS)
    const [lossInfo, setLossInfo] = useState<LossInfo | null>(null)
    const [correctFeedback, setCorrectFeedback] = useState<CorrectFeedback | null>(null)
    const nextQuestionTimeoutRef = useRef<number | null>(null)
    const correctBurstIdRef = useRef(0)
    const unlockedTopicIndexRef = useRef(0)
    const restoreProgressTimeoutRef = useRef<number | null>(null)

    const currentQuestion = attemptQuestions[currentIndex]
    const isFrozenQuestionReview = screen === 'lost' && !!currentQuestion
    const answerOptions = useMemo(() => {
        if (!currentQuestion) return []
        return buildAnswerOptions(currentQuestion, allAnswers)
    }, [allAnswers, currentQuestion])

    const clearPendingAdvance = useCallback(() => {
        if (nextQuestionTimeoutRef.current !== null) {
            window.clearTimeout(nextQuestionTimeoutRef.current)
            nextQuestionTimeoutRef.current = null
        }
    }, [])

    const persistTopicProgress = useCallback((topicIndex: number, options?: { allowDecrease?: boolean }) => {
        const clampedTopicIndex = clampTopicProgress(topicIndex)
        const nextUnlockedTopicIndex = options?.allowDecrease
            ? clampedTopicIndex
            : Math.max(unlockedTopicIndexRef.current, clampedTopicIndex)

        unlockedTopicIndexRef.current = nextUnlockedTopicIndex
        setUnlockedTopicIndex(nextUnlockedTopicIndex)

        try {
            const assignmentId = getCurrentAssignmentId()
            const progressKey = getSimulationTopicProgressKey(NINTH_GRADE_TESTS_SIMULATION_ID, assignmentId)
            window.localStorage.setItem(progressKey, nextUnlockedTopicIndex.toString())
        } catch (error) {
            console.error('Failed to record simulation topic progress:', error)
        }
    }, [])

    const beginTopic = useCallback((topicIndex: number) => {
        const nextTopicIndex = clampTopicIndex(topicIndex)
        const nextTopic = QUIZ_TOPICS[nextTopicIndex] ?? QUIZ_TOPICS[0]

        clearPendingAdvance()
        setActiveTopicIndex(nextTopicIndex)
        setAttemptQuestions(buildAttemptQuestions(nextTopic))
        setCurrentIndex(0)
        setTimeLeft(ANSWER_SECONDS)
        setLossInfo(null)
        setCorrectFeedback(null)
        setScreen('playing')
    }, [clearPendingAdvance])

    const startAttempt = useCallback(() => {
        beginTopic(activeTopicIndex)
    }, [activeTopicIndex, beginTopic])

    const loseAttempt = useCallback((reason: LossReason) => {
        if (currentQuestion) {
            setLossInfo({
                reason,
                correctAnswer: currentQuestion.answer,
            })
        }

        setScreen('lost')
    }, [currentQuestion])

    const completeQuiz = useCallback(() => {
        clearPendingAdvance()
        persistTopicProgress(QUIZ_TOPICS.length)
        setScreen('completed')
    }, [clearPendingAdvance, persistTopicProgress])

    const completeTopic = useCallback(() => {
        const nextTopicIndex = activeTopicIndex + 1

        if (nextTopicIndex < QUIZ_TOPICS.length) {
            persistTopicProgress(nextTopicIndex)
            beginTopic(nextTopicIndex)
            return
        }

        completeQuiz()
    }, [activeTopicIndex, beginTopic, completeQuiz, persistTopicProgress])

    const restartQuiz = useCallback(() => {
        beginTopic(0)
    }, [beginTopic])

    const selectUnlockedTopic = useCallback((topicIndex: number) => {
        const nextTopicIndex = clampTopicIndex(topicIndex)

        if (nextTopicIndex > unlockedTopicIndexRef.current) return

        beginTopic(nextTopicIndex)
    }, [beginTopic])

    useEffect(() => {
        if (screen !== 'playing' || correctFeedback) return

        const timeout = window.setTimeout(() => {
            if (timeLeft <= 1) {
                loseAttempt('timeout')
                return
            }

            setTimeLeft(timeLeft - 1)
        }, 1000)

        return () => window.clearTimeout(timeout)
    }, [correctFeedback, loseAttempt, screen, timeLeft])

    useEffect(() => {
        return () => {
            if (nextQuestionTimeoutRef.current !== null) {
                window.clearTimeout(nextQuestionTimeoutRef.current)
            }

            if (restoreProgressTimeoutRef.current !== null) {
                window.clearTimeout(restoreProgressTimeoutRef.current)
            }
        }
    }, [])

    useEffect(() => {
        try {
            const assignmentId = getCurrentAssignmentId()
            const progressKey = getSimulationTopicProgressKey(NINTH_GRADE_TESTS_SIMULATION_ID, assignmentId)
            const storedProgress = Number(window.localStorage.getItem(progressKey))
            const restoredProgress = clampTopicProgress(storedProgress)
            const restoredTopicIndex = clampTopicIndex(restoredProgress)

            unlockedTopicIndexRef.current = restoredProgress
            restoreProgressTimeoutRef.current = window.setTimeout(() => {
                setUnlockedTopicIndex(restoredProgress)
                setActiveTopicIndex(restoredTopicIndex)
                restoreProgressTimeoutRef.current = null
            }, 0)
        } catch (error) {
            console.error('Failed to restore simulation topic progress:', error)
        }
    }, [])

    useEffect(() => {
        if (screen !== 'completed') return

        const assignmentId = getCurrentAssignmentId()

        if (!assignmentId) return

        try {
            const completionKey = getSimulationCompletionKey(NINTH_GRADE_TESTS_SIMULATION_ID, assignmentId)
            window.localStorage.setItem(completionKey, 'completed')
            window.opener?.postMessage(
                {
                    type: 'simulation-completed',
                    simulationId: NINTH_GRADE_TESTS_SIMULATION_ID,
                    assignmentId,
                },
                window.location.origin
            )
        } catch (error) {
            console.error('Failed to record simulation completion:', error)
        }
    }, [screen])

    const handleAnswer = (answer: string) => {
        if (!currentQuestion || correctFeedback) return

        if (answer !== currentQuestion.answer) {
            loseAttempt('incorrect')
            return
        }

        correctBurstIdRef.current += 1
        setCorrectFeedback({
            answer,
            burstId: correctBurstIdRef.current,
        })

        if (nextQuestionTimeoutRef.current !== null) {
            window.clearTimeout(nextQuestionTimeoutRef.current)
        }

        nextQuestionTimeoutRef.current = window.setTimeout(() => {
            setCorrectFeedback(null)

            if (currentIndex >= attemptQuestions.length - 1) {
                completeTopic()
                return
            }

            setTimeLeft(ANSWER_SECONDS)
            setCurrentIndex((value) => value + 1)
        }, 520)
    }

    const currentTopicProgress = attemptQuestions.length > 0
        ? Math.min(currentIndex + (correctFeedback ? 1 : 0), attemptQuestions.length) / attemptQuestions.length
        : 0
    const currentAttemptProgressPercent = screen === 'completed'
        ? 100
        : Math.min(100, ((activeTopicIndex + currentTopicProgress) / QUIZ_TOPICS.length) * 100)
    const unlockedProgressPercent = Math.min(100, (unlockedTopicIndex / QUIZ_TOPICS.length) * 100)
    const progressPercent = Math.max(currentAttemptProgressPercent, unlockedProgressPercent)

    return (
        <main className="relative min-h-[100dvh] overflow-hidden bg-[#eef4ff] text-[#07122d]">
            <style>
                {`
                    @keyframes quiz-firework-pop {
                        0% {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(0.35);
                        }
                        85% {
                            opacity: 1;
                        }
                        100% {
                            opacity: 0;
                            transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(1);
                        }
                    }

                    @keyframes quiz-twinkle {
                        0%, 100% {
                            opacity: 0.42;
                            transform: scale(0.82) rotate(0deg);
                        }
                        50% {
                            opacity: 1;
                            transform: scale(1.12) rotate(8deg);
                        }
                    }

                    @keyframes quiz-light-sweep {
                        0%, 100% {
                            transform: translate3d(-2%, 0, 0) rotate(-10deg);
                        }
                        50% {
                            transform: translate3d(2%, -1%, 0) rotate(-8deg);
                        }
                    }
                `}
            </style>
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[linear-gradient(132deg,#ffffff_0%,#f4f8ff_20%,#dfe9ff_46%,#b8cffd_72%,#78a8ff_100%)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_20%,rgba(255,255,255,0.95),transparent_34%),radial-gradient(ellipse_at_86%_24%,rgba(176,198,255,0.9),transparent_40%),radial-gradient(ellipse_at_50%_94%,rgba(255,214,143,0.56),transparent_34%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(255,255,255,0.45)_0%,transparent_38%,rgba(74,126,244,0.20)_100%)]" />
                <div
                    className="absolute bottom-[2%] -left-[20%] h-[52%] w-[92%] rounded-[50%] border-t-2 border-white/65"
                    style={{ transform: 'rotate(-14deg)' }}
                />
                <div
                    className="absolute bottom-[9%] -left-[30%] h-[44%] w-[85%] rounded-[50%] border-t border-white/55"
                    style={{ transform: 'rotate(-18deg)' }}
                />
                <div
                    className="absolute bottom-[6%] -right-[24%] h-[58%] w-[88%] rounded-[50%] border-t-2 border-white/60"
                    style={{ transform: 'rotate(-18deg)' }}
                />
                <div
                    className="absolute bottom-[4%] -left-[12%] h-40 w-[125%] bg-[linear-gradient(100deg,transparent_0%,rgba(255,188,118,0.78)_34%,rgba(255,255,255,0.9)_51%,rgba(105,155,255,0.24)_70%,transparent_100%)] blur-sm"
                    style={{ animation: 'quiz-light-sweep 7s ease-in-out infinite' }}
                />
                <div
                    className="absolute bottom-[29%] right-[-12%] h-32 w-[58%] bg-[linear-gradient(112deg,transparent_0%,rgba(255,203,144,0.86)_40%,rgba(255,255,255,0.95)_52%,transparent_76%)] blur-[2px]"
                    style={{ animation: 'quiz-light-sweep 8s ease-in-out infinite reverse' }}
                />
                {BACKGROUND_SPARKLES.map((sparkle, index) => (
                    <span
                        key={index}
                        aria-hidden="true"
                        className={`absolute ${sparkle.size} ${sparkle.color}`}
                        style={{
                            top: sparkle.top,
                            left: sparkle.left,
                            animation: `quiz-twinkle ${2.8 + index * 0.18}s ease-in-out infinite`,
                            animationDelay: `${index * 0.22}s`,
                        }}
                    >
                        ✦
                    </span>
                ))}
            </div>

            <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1540px] flex-col px-4 py-3 sm:px-8 lg:px-10">
                <header className="flex items-center justify-between pb-2">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 h-9 rounded-full px-3 text-sm font-bold text-[#07122d] hover:bg-white/55 sm:text-base">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-5 w-5" />
                            Pagrindinis
                        </Link>
                    </Button>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="text-sm font-bold text-[#102451] sm:text-base">
                            9 kl. Testai
                        </div>
                    </div>
                </header>

                <section className="flex min-h-0 flex-1 items-start justify-center pb-3 pt-2 sm:pt-3">
                    {screen === 'intro' && (
                        <div className="w-full max-w-2xl rounded-[1.6rem] border border-white/80 bg-white/80 p-6 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl sm:p-8">
                            <h1 className="mb-6 text-3xl font-black tracking-tight text-[#050814] sm:text-4xl">
                                9 kl. Testai
                            </h1>
                            <div className="mb-6">
                                <TopicProgressTrack
                                    progressPercent={progressPercent}
                                    unlockedTopicIndex={unlockedTopicIndex}
                                    onSelectTopic={selectUnlockedTopic}
                                />
                            </div>
                            <Button size="lg" onClick={startAttempt} className="min-w-44 rounded-xl bg-[#0959f5] px-8 text-base font-bold shadow-[0_10px_25px_rgba(9,89,245,0.28)] hover:bg-[#074ddd]">
                                Pradėti
                            </Button>
                        </div>
                    )}

                    {(screen === 'playing' || isFrozenQuestionReview) && currentQuestion && (
                        <div className="w-full max-w-[1290px] overflow-hidden rounded-[1.6rem] border border-[#c9d6ff]/80 bg-white/82 p-4 shadow-[0_30px_90px_rgba(55,96,180,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl sm:p-5 lg:p-6">
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[#26467e] sm:text-base">
                                            {activeTopic.title}
                                        </p>
                                        <h1 className="mt-0.5 text-2xl font-black tracking-tight text-[#050814] sm:text-3xl">
                                            {isFrozenQuestionReview ? 'Bandymas nepavyko' : `Klausimas ${currentIndex + 1} iš ${attemptQuestions.length}`}
                                        </h1>
                                    </div>
                                    {isFrozenQuestionReview ? (
                                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-white/80 px-4 py-2 text-sm font-black text-red-600 shadow-[0_12px_28px_rgba(100,124,190,0.16)] sm:text-base">
                                            <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                            {lossInfo?.reason === 'timeout' ? 'Laikas baigėsi' : 'Neteisingas atsakymas'}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 rounded-xl border border-[#cbd6fb] bg-white/76 px-4 py-2 text-base font-black text-[#050814] shadow-[0_12px_28px_rgba(100,124,190,0.18)] sm:text-lg">
                                            <Clock className="h-5 w-5 text-[#ff8500]" />
                                            {timeLeft.toString().padStart(2, '0')} s
                                        </div>
                                    )}
                                </div>
                                <TopicProgressTrack
                                    progressPercent={progressPercent}
                                    unlockedTopicIndex={unlockedTopicIndex}
                                    onSelectTopic={selectUnlockedTopic}
                                />
                            </div>

                            <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                                <div className="rounded-[1.1rem] border border-[#cbd6f8] bg-white/62 px-4 py-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-6 sm:py-6">
                                    <p className="mx-auto max-w-4xl text-lg font-black leading-relaxed text-[#050814] sm:text-2xl lg:text-[1.7rem] lg:leading-[1.42]">
                                        <QuestionText question={currentQuestion} />
                                    </p>
                                </div>

                                <div className="grid gap-3 min-[520px]:grid-cols-2">
                                    {answerOptions.map((option) => {
                                        const isCorrectReviewOption = isFrozenQuestionReview && option.value === currentQuestion.answer
                                        const isIncorrectReviewOption = isFrozenQuestionReview && option.value !== currentQuestion.answer
                                        const isCorrectFeedbackOption = screen === 'playing' && correctFeedback?.answer === option.value
                                        const isAnswerLocked = isFrozenQuestionReview || !!correctFeedback

                                        return (
                                            <button
                                                key={`${currentQuestion.id}-${option.label}-${option.value}`}
                                                type="button"
                                                onClick={() => handleAnswer(option.value)}
                                                disabled={isAnswerLocked}
                                                className={`relative flex min-h-16 items-center gap-3 overflow-visible rounded-[0.9rem] border p-3 text-left shadow-[0_10px_20px_rgba(77,104,170,0.11)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5cff] disabled:cursor-default disabled:opacity-100 sm:min-h-[4.5rem] sm:gap-4 sm:p-4 ${isCorrectReviewOption || isCorrectFeedbackOption
                                                    ? 'border-green-500 bg-green-50 text-green-900 shadow-[0_14px_30px_rgba(42,142,83,0.18)]'
                                                    : isIncorrectReviewOption
                                                        ? 'border-zinc-200 bg-zinc-100 text-zinc-400'
                                                        : 'border-[#d1daf8] bg-white/78 text-[#102451] hover:-translate-y-0.5 hover:border-[#8aa8ff] hover:bg-white hover:shadow-[0_18px_34px_rgba(57,94,178,0.18)]'
                                                    }`}
                                            >
                                                <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-base font-black shadow-[0_8px_18px_rgba(9,89,245,0.22)] sm:h-11 sm:w-11 sm:text-lg ${isCorrectReviewOption || isCorrectFeedbackOption
                                                    ? 'bg-green-600 text-white'
                                                    : isIncorrectReviewOption
                                                        ? 'bg-zinc-300 text-zinc-600'
                                                        : 'bg-[#0959f5] text-white'
                                                    }`}>
                                                    {option.label}
                                                </span>
                                                <span className="min-w-0 text-base leading-snug sm:text-lg lg:text-xl">
                                                    <OptionText question={currentQuestion} answer={option.value} />
                                                </span>
                                                {isCorrectFeedbackOption && (
                                                    <span
                                                        key={correctFeedback.burstId}
                                                        aria-hidden="true"
                                                        className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
                                                    >
                                                        {FIREWORK_PARTICLES.map((particle, particleIndex) => (
                                                            <span
                                                                key={particleIndex}
                                                                className={`absolute h-2 w-2 rounded-full ${particle.color}`}
                                                                style={{
                                                                    '--spark-x': `${particle.x}px`,
                                                                    '--spark-y': `${particle.y}px`,
                                                                    animation: 'quiz-firework-pop 520ms ease-out forwards',
                                                                    animationDelay: `${particle.delay}ms`,
                                                                } as React.CSSProperties}
                                                            />
                                                        ))}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>

                                {isFrozenQuestionReview && (
                                    <div className="flex justify-center border-t border-[#d5def8] pt-3 sm:pt-4">
                                        <Button onClick={startAttempt} className="min-w-44 gap-2 rounded-xl bg-[#0959f5] px-6 text-sm font-bold shadow-[0_10px_25px_rgba(9,89,245,0.28)] hover:bg-[#074ddd] sm:text-base">
                                            <RotateCcw className="h-4 w-4" />
                                            Bandyti dar kartą
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {screen === 'completed' && (
                        <div className="w-full max-w-xl rounded-[1.6rem] border border-white/80 bg-white/82 p-6 text-center shadow-[0_28px_80px_rgba(56,101,190,0.24)] backdrop-blur-xl sm:p-8">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 shadow-inner">
                                <Trophy className="h-7 w-7" />
                            </div>
                            <h1 className="mb-3 text-3xl font-black tracking-tight text-[#050814]">
                                Tema įveikta
                            </h1>
                            <p className="mb-6 flex items-center justify-center gap-2 text-base font-semibold text-[#26467e]">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                {activeTopic.title}
                            </p>
                            <div className="mb-6">
                                <TopicProgressTrack
                                    progressPercent={progressPercent}
                                    unlockedTopicIndex={unlockedTopicIndex}
                                    onSelectTopic={selectUnlockedTopic}
                                />
                            </div>
                            <Button size="lg" variant="outline" onClick={restartQuiz} className="min-w-40 rounded-xl border-[#cbd6fb] bg-white/75 px-8 text-base font-bold text-[#102451] shadow-[0_10px_25px_rgba(87,112,170,0.16)] hover:bg-white">
                                Kartoti
                            </Button>
                        </div>
                    )}
                </section>
            </div>
        </main>
    )
}
