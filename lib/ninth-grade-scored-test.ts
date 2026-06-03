import { QUIZ_TOPICS, type QuizQuestion, type QuizTopicSet } from "@/app/simulations/9-kl-testai/quiz-data"
import {
    NINTH_GRADE_TESTS_SCORED_MAX_POINTS,
    NINTH_GRADE_TESTS_SCORED_QUESTION_SECONDS,
    NINTH_GRADE_TESTS_SCORED_SIMULATION_ID,
    NINTH_GRADE_TESTS_SCORED_SIMULATION_PATH,
} from "@/lib/simulation-completion"

export const SCORED_TEST_SIMULATION_ID = NINTH_GRADE_TESTS_SCORED_SIMULATION_ID
export const SCORED_TEST_SIMULATION_PATH = NINTH_GRADE_TESTS_SCORED_SIMULATION_PATH
export const SCORED_TEST_MAX_POINTS = NINTH_GRADE_TESTS_SCORED_MAX_POINTS
export const SCORED_TEST_QUESTION_SECONDS = NINTH_GRADE_TESTS_SCORED_QUESTION_SECONDS

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

export interface ScoredAnswerOption {
    label: (typeof OPTION_LABELS)[number]
    value: string
}

export interface ScoredQuestionOrderItem {
    key: string
    topicId: string
    topicTitle: string
    questionId: string
    definition: string
    mode?: 'quantity' | 'unit' | 'formula'
    symbol?: string
    options: ScoredAnswerOption[]
}

export interface ScoredStoredAnswer {
    selectedAnswer: string
    isCorrect: boolean
    timedOut: boolean
    answeredAt: string
}

export type ScoredAnswerMap = Record<string, ScoredStoredAnswer>

interface ScoredQuestionLookupItem {
    key: string
    topic: QuizTopicSet
    question: QuizQuestion
}

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

function getAnswerPool(topic: QuizTopicSet) {
    return Array.from(new Set(topic.answerOptions ?? topic.questions.map((question) => question.answer)))
}

function buildAnswerOptions(question: QuizQuestion, topic: QuizTopicSet): ScoredAnswerOption[] {
    const uniqueAnswers = getAnswerPool(topic)
    const distractors = shuffleArray(uniqueAnswers.filter((answer) => answer !== question.answer)).slice(0, 3)

    return shuffleArray([question.answer, ...distractors]).map((value, index) => ({
        label: OPTION_LABELS[index],
        value,
    }))
}

export function getAllScoredQuestions(): ScoredQuestionLookupItem[] {
    return QUIZ_TOPICS.flatMap((topic) => topic.questions.map((question) => ({
        key: `${topic.id}:${question.id}`,
        topic,
        question,
    })))
}

export function buildScoredQuestionOrder(): ScoredQuestionOrderItem[] {
    return shuffleArray(getAllScoredQuestions()).map(({ key, topic, question }) => ({
        key,
        topicId: topic.id,
        topicTitle: topic.title,
        questionId: question.id,
        definition: question.definition,
        mode: question.mode,
        symbol: question.symbol,
        options: buildAnswerOptions(question, topic),
    }))
}

export function getScoredQuestionByKey(key: string) {
    return getAllScoredQuestions().find((item) => item.key === key) ?? null
}

export function isScoredSimulationUrl(value: string | null | undefined) {
    if (!value) return false
    return value.split('?')[0] === SCORED_TEST_SIMULATION_PATH
}

export function addQuestionSeconds(date: Date) {
    return new Date(date.getTime() + SCORED_TEST_QUESTION_SECONDS * 1000)
}

export function getScoredTestEndAt(startedAt: string | Date, totalQuestions: number) {
    const startedAtDate = typeof startedAt === 'string' ? new Date(startedAt) : startedAt
    return new Date(startedAtDate.getTime() + totalQuestions * SCORED_TEST_QUESTION_SECONDS * 1000)
}

export function toScoredQuestionOrder(value: unknown): ScoredQuestionOrderItem[] {
    if (!Array.isArray(value)) return []

    return value.filter((item): item is ScoredQuestionOrderItem => {
        if (!item || typeof item !== 'object') return false
        const record = item as Partial<ScoredQuestionOrderItem>
        return typeof record.key === 'string'
            && typeof record.definition === 'string'
            && Array.isArray(record.options)
    })
}

export function toScoredAnswerMap(value: unknown): ScoredAnswerMap {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

    return Object.entries(value).reduce<ScoredAnswerMap>((answers, [key, answer]) => {
        if (!key || !answer || typeof answer !== 'object' || Array.isArray(answer)) return answers
        const record = answer as Partial<ScoredStoredAnswer>
        answers[key] = {
            selectedAnswer: typeof record.selectedAnswer === 'string' ? record.selectedAnswer : '',
            isCorrect: !!record.isCorrect,
            timedOut: !!record.timedOut,
            answeredAt: typeof record.answeredAt === 'string' ? record.answeredAt : new Date(0).toISOString(),
        }
        return answers
    }, {})
}

export function getCorrectAnswerCount(answers: ScoredAnswerMap) {
    return Object.values(answers).filter((answer) => answer.isCorrect).length
}

export function calculateScaledScore(answers: ScoredAnswerMap, totalQuestions: number) {
    if (totalQuestions <= 0) return 0
    return Math.round((getCorrectAnswerCount(answers) / totalQuestions) * SCORED_TEST_MAX_POINTS)
}

export function buildProgressSubmittedAnswers(answers: ScoredAnswerMap) {
    return Object.entries(answers).reduce<Record<string, string>>((result, [key, answer]) => {
        result[key] = answer.selectedAnswer
        return result
    }, {})
}

export function buildProgressEarnedParts(answers: ScoredAnswerMap) {
    return Object.entries(answers).reduce<Record<string, number>>((result, [key, answer]) => {
        result[key] = answer.isCorrect ? 1 : 0
        return result
    }, {})
}

export function buildScoredAnswerMapFromSubmittedAnswers(
    order: ScoredQuestionOrderItem[],
    submittedAnswers: Record<string, string>,
    answeredAt: string
) {
    return order.reduce<ScoredAnswerMap>((answers, item) => {
        const selectedAnswer = submittedAnswers[item.key]
        const isValidOption = item.options.some((option) => option.value === selectedAnswer)
        const sourceQuestion = getScoredQuestionByKey(item.key)

        if (!selectedAnswer || !isValidOption || !sourceQuestion) {
            answers[item.key] = {
                selectedAnswer: '',
                isCorrect: false,
                timedOut: true,
                answeredAt,
            }
            return answers
        }

        answers[item.key] = {
            selectedAnswer,
            isCorrect: selectedAnswer === sourceQuestion.question.answer,
            timedOut: false,
            answeredAt,
        }
        return answers
    }, {})
}

export function fillTimedOutAnswers(
    order: ScoredQuestionOrderItem[],
    answers: ScoredAnswerMap,
    answeredAt: string
) {
    const nextAnswers = { ...answers }

    for (const item of order) {
        if (!nextAnswers[item.key]) {
            nextAnswers[item.key] = {
                selectedAnswer: '',
                isCorrect: false,
                timedOut: true,
                answeredAt,
            }
        }
    }

    return nextAnswers
}
