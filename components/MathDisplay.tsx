"use client"

import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'

interface MathDisplayProps {
    content: string
    // inline?: boolean // This prop is no longer needed
}

export default function MathDisplay({ content }: { content: string }) {
    if (!content) return null

    // Function to render simple markdown (bold, italic)
    const renderMarkdown = (text: string) => {
        // Handle bold (**text**)
        const boldParts = text.split(/(\*\*[^*]+?\*\*)/g)
        return boldParts.map((bPart, bIndex) => {
            if (bPart.startsWith('**') && bPart.endsWith('**')) {
                const italicText = bPart.slice(2, -2)
                return <strong key={`b-${bIndex}`}>{renderItalic(italicText)}</strong>
            }
            return renderItalic(bPart)
        })
    }

    const renderItalic = (text: string) => {
        // Handle italic (*text* or _text_)
        const italicParts = text.split(/(\*[^*]+?\*|_[^_]+?_)/g)
        return italicParts.map((iPart, iIndex) => {
            if ((iPart.startsWith('*') && iPart.endsWith('*')) || (iPart.startsWith('_') && iPart.endsWith('_'))) {
                return <em key={`i-${iIndex}`}>{iPart.slice(1, -1)}</em>
            }
            return iPart
        })
    }

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
        <span className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    return <BlockMath key={index} math={part.slice(2, -2)} />
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    return <InlineMath key={index} math={part.slice(1, -1)} />
                } else {
                    return <span key={index}>{renderMarkdown(part)}</span>
                }
            })}
        </span>
    )
}
