import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function StudentDashboardLoading() {
    return (
        <div className="flex h-full w-full min-h-[50vh] items-center justify-center">
            <LoadingSpinner size={32} />
        </div>
    );
}
