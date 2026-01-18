"use client"

import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'

interface MathDisplayProps {
    content: string
    // inline?: boolean // This prop is no longer needed
}

export default function MathDisplay({ content }: { content: string }) {
    if (!content) return null

    // If the content contains LaTeX but no delimiters ($ or $$), wrap the whole thing in InlineMath
    // Common LaTeX hints: \text, \frac, \sqrt, \alpha, \beta, etc. or just a backslash
    const hasDelimiters = content.includes('$') || content.includes('$$')
    const hasLatexHints = /\\/.test(content)

    if (!hasDelimiters && hasLatexHints) {
        return <InlineMath math={content} />
    }

    // Split by $$...$$ or $...$
    const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g)

    return (
        <span>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    return <BlockMath key={index} math={part.slice(2, -2)} />
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    return <InlineMath key={index} math={part.slice(1, -1)} />
                } else {
                    return <span key={index}>{part}</span>
                }
            })}
        </span>
    )
}
