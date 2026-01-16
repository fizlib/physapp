import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function DashboardLoading() {
    return (
        <div className="flex h-full w-full items-center justify-center min-h-[50vh]">
            <LoadingSpinner size={32} />
        </div>
    );
}
