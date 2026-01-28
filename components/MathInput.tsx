"use client"

import React, { useEffect, useRef, useState } from "react"


interface MathInputProps {
    value: string;
    onChange: (value: string, asciiValue?: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    placeholder?: string;
    className?: string;
}

export default function MathInput({ value, onChange, onKeyDown, placeholder, className }: MathInputProps) {
    const mfe = useRef<any>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Import mathlive only on the client
        import("mathlive").then(() => {
            setMounted(true);
        });
    }, []);

    useEffect(() => {
        if (mounted && mfe.current && mfe.current.value !== value) {
            mfe.current.value = value;
        }
    }, [value, mounted]);

    // Apply styles to match shadcn input as much as possible
    useEffect(() => {
        if (mounted && mfe.current) {
            mfe.current.style.width = "100%";
            mfe.current.style.border = "1px solid var(--input)";
            mfe.current.style.borderRadius = "var(--radius)";
            mfe.current.style.padding = "12px 16px";
            mfe.current.style.fontSize = "1.2rem";
            mfe.current.style.backgroundColor = "transparent";
            mfe.current.style.color = "inherit";

            // Fix selection color
            mfe.current.style.setProperty("--selection-background-color", "var(--primary)");
            mfe.current.style.setProperty("--selection-color", "var(--primary-foreground)");
            mfe.current.style.setProperty("--contains-highlight-background-color", "oklch(0.48 0.22 260 / 0.1)");

            // Set placeholder if needed
            if (placeholder) {
                mfe.current.placeholder = placeholder;
            }
        }
    }, [mounted, placeholder]);

    if (!mounted) {
        return <div className={`h-10 w-full rounded-md border border-input bg-background px-3 py-2 ${className}`}>Loading editor...</div>;
    }

    return (
        // @ts-ignore
        <math-field
            ref={mfe}
            onInput={(e: any) => {
                const latex = e.target.value;
                const ascii = e.target.getValue("ascii-math");
                onChange(latex, ascii);
            }}
            onKeyDown={(e: any) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                }
                if (onKeyDown) onKeyDown(e);
            }}
            className={className}
        >
            {value}
            {/* @ts-ignore */}
        </math-field>
    );
}
