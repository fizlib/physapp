import { cn } from "@/lib/utils";

interface LogoProps {
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    iconOnly?: boolean;
}

export function Logo({ className, size = "md", iconOnly = false }: LogoProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
    };

    const textSizeClasses = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl",
        xl: "text-4xl",
    };

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <div className={cn("relative flex items-center justify-center text-primary", sizeClasses[size])}>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-full w-full"
                >
                    {/* Folded Ribbon - Original */}
                    <path d="M18 4h-6L8 8v8l4 4h6l4-4V8l-4-4z" fill="currentColor" fillOpacity="0.1" />
                    <path d="M18 4l-6 6v10l6-6V4z" fill="currentColor" fillOpacity="0.8" />
                    <path d="M6 10l6-6v10l-6 6V10z" fill="currentColor" fillOpacity="0.5" />
                </svg>
            </div>
            {!iconOnly && (
                <span
                    className={cn(
                        "font-sans font-bold tracking-tight text-foreground",
                        textSizeClasses[size]
                    )}
                >
                    Protus
                </span>
            )}
        </div>
    );
}
