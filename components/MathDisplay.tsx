"use client"

import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'

interface MathDisplayProps {
    content: string
    // inline?: boolean // This prop is no longer needed
}

// Greek letters and math commands that are invalid inside \text{} in KaTeX
const MATH_COMMANDS_IN_TEXT = /\\text\{([^}]*)\}/g

function preprocessLatex(latex: string): string {
    // Fix math-mode commands (like \mu, \alpha, \Omega, \cdot, \dots) used inside \text{} blocks
    // e.g. \text{ \mu s} → \text{ }\mu\text{s}
    return latex.replace(MATH_COMMANDS_IN_TEXT, (_match, inner: string) => {
        // Split the inner text around any backslash commands
        const parts = inner.split(/(\\[a-zA-Z]+)/g)
        if (parts.every(p => !p.startsWith('\\'))) {
            // No commands found, return as-is
            return `\\text{${inner}}`
        }
        return parts
            .map((p, i) => {
                if (p.startsWith('\\')) {
                    // This is a math command — output it directly (outside \text{})
                    return p
                } else if (p.length > 0) {
                    // If previous part was a math command, trim the leading space
                    // (in LaTeX, the space after \mu is a command terminator, not visible whitespace)
                    const prev = i > 0 ? parts[i - 1] : ''
                    const text = prev.startsWith('\\') ? p.replace(/^ /, '') : p
                    return text.length > 0 ? `\\text{${text}}` : ''
                }
                return ''
            })
            .join('')
    })
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
        return <InlineMath math={preprocessLatex(content)} />
    }

    // Split by $$...$$ or $...$
    const parts = content.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g)

    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    return <BlockMath key={index} math={preprocessLatex(part.slice(2, -2))} />
                } else if (part.startsWith('$') && part.endsWith('$')) {
                    return <InlineMath key={index} math={preprocessLatex(part.slice(1, -1))} />
                } else {
                    return <span key={index}>{renderMarkdown(part)}</span>
                }
            })}
        </span>
    )
}
