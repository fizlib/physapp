"use client"

import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'

interface MathDisplayProps {
    content: string
    // inline?: boolean // This prop is no longer needed
}

export default function MathDisplay({ content }: { content: string }) {
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
