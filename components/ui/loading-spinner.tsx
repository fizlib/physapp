import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
}

export function LoadingSpinner({
    className,
    size = 24,
    ...props
}: LoadingSpinnerProps) {
    return (
        <div
            className={cn("flex items-center justify-center", className)}
            {...props}
        >
            <Loader2
                className="animate-spin text-primary"
                size={size}
            />
        </div>
    );
}
