"use client"

import { useRef, useCallback } from "react"
import { Bold, Italic, List, ListOrdered, Table, Heading2, Minus, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownEditorProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    minHeight?: string
}

type FormatAction = {
    icon: React.ReactNode
    label: string
    action: (textarea: HTMLTextAreaElement, value: string) => { newValue: string, selectionStart: number, selectionEnd: number }
}

export function MarkdownEditor({ value, onChange, placeholder, disabled, minHeight = "200px" }: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [preview, setPreview] = useState(false)

    const applyFormat = useCallback((action: FormatAction["action"]) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const result = action(textarea, value)
        onChange(result.newValue)

        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
            textarea.focus()
            textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
        })
    }, [value, onChange])

    const wrapSelection = (prefix: string, suffix: string) => (textarea: HTMLTextAreaElement, val: string) => {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selected = val.substring(start, end)
        const before = val.substring(0, start)
        const after = val.substring(end)

        if (selected) {
            const newValue = before + prefix + selected + suffix + after
            return { newValue, selectionStart: start + prefix.length, selectionEnd: end + prefix.length }
        } else {
            const placeholder = "text"
            const newValue = before + prefix + placeholder + suffix + after
            return { newValue, selectionStart: start + prefix.length, selectionEnd: start + prefix.length + placeholder.length }
        }
    }

    const insertAtLineStart = (prefix: string) => (textarea: HTMLTextAreaElement, val: string) => {
        const start = textarea.selectionStart
        const lineStart = val.lastIndexOf('\n', start - 1) + 1
        const before = val.substring(0, lineStart)
        const after = val.substring(lineStart)
        const newValue = before + prefix + after
        return { newValue, selectionStart: start + prefix.length, selectionEnd: start + prefix.length }
    }

    const insertText = (text: string) => (textarea: HTMLTextAreaElement, val: string) => {
        const start = textarea.selectionStart
        const before = val.substring(0, start)
        const after = val.substring(start)
        const newValue = before + text + after
        const cursorPos = start + text.length
        return { newValue, selectionStart: cursorPos, selectionEnd: cursorPos }
    }

    const formatActions: { icon: React.ReactNode; label: string; action: FormatAction["action"] }[] = [
        { icon: <Bold className="h-3.5 w-3.5" />, label: "Bold", action: wrapSelection("**", "**") },
        { icon: <Italic className="h-3.5 w-3.5" />, label: "Italic", action: wrapSelection("*", "*") },
        { icon: <Heading2 className="h-3.5 w-3.5" />, label: "Heading", action: insertAtLineStart("## ") },
        { icon: <List className="h-3.5 w-3.5" />, label: "Bullet List", action: insertAtLineStart("- ") },
        { icon: <ListOrdered className="h-3.5 w-3.5" />, label: "Numbered List", action: insertAtLineStart("1. ") },
        { icon: <Minus className="h-3.5 w-3.5" />, label: "Divider", action: insertText("\n---\n") },
        {
            icon: <Table className="h-3.5 w-3.5" />, label: "Table",
            action: insertText("\n| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n")
        },
    ]

    return (
        <div className="rounded-md border border-input overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 bg-muted/40 border-b">
                {formatActions.map((action, idx) => (
                    <Button
                        key={idx}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => applyFormat(action.action)}
                        disabled={disabled || preview}
                        title={action.label}
                    >
                        {action.icon}
                    </Button>
                ))}
                <div className="flex-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => setPreview(!preview)}
                    disabled={disabled}
                >
                    {preview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {preview ? "Edit" : "Preview"}
                </Button>
            </div>

            {/* Editor / Preview */}
            {preview ? (
                <div className="px-3 py-3 prose prose-sm max-w-none" style={{ minHeight }}>
                    {value ? (
                        <MarkdownContent content={value} />
                    ) : (
                        <p className="text-muted-foreground italic">Nothing to preview</p>
                    )}
                </div>
            ) : (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    style={{ minHeight }}
                    disabled={disabled}
                />
            )}
        </div>
    )
}

type MarkdownNode = {
    type: string
    value?: string
    children?: MarkdownNode[]
}

function remarkHtmlLineBreaks() {
    return (tree: MarkdownNode) => {
        replaceHtmlLineBreaks(tree)
    }
}

function replaceHtmlLineBreaks(node: MarkdownNode) {
    if (!node.children) return

    node.children = node.children.map((child) => {
        if (child.type === "html" && child.value && /^<br\s*\/?>$/i.test(child.value.trim())) {
            return { type: "break" }
        }

        replaceHtmlLineBreaks(child)
        return child
    })
}

/** Renders markdown content with GFM support (tables, strikethrough, etc.) */
export function MarkdownContent({ content, className }: { content: string; className?: string }) {
    return (
        <div className={`prose prose-sm max-w-none dark:prose-invert
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h2:text-lg prose-h3:text-base
            prose-p:leading-relaxed
            prose-table:border prose-table:border-border
            prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold
            prose-td:px-3 prose-td:py-2 prose-td:text-sm prose-td:border-t prose-td:border-border
            prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
            prose-hr:my-4
            ${className || ""}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkHtmlLineBreaks]}>
                {content}
            </ReactMarkdown>
        </div>
    )
}
