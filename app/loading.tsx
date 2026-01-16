import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <LoadingSpinner size={48} />
        </div>
    );
}
