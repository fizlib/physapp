import { getSiteSetting } from "@/app/(dashboard)/admin/settings/actions"
import { Logo } from "@/components/logo"
import { redirect } from "next/navigation"

export default async function MaintenancePage() {
    const maintenanceModeEnabled = (
        (await getSiteSetting('maintenance_mode_enabled')) ?? 'false'
    ).toLowerCase() === 'true'

    if (!maintenanceModeEnabled) {
        redirect('/')
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center">
            <Logo size="xl" />
            <h1 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                Svetainė atnaujinama
            </h1>
        </main>
    )
}
