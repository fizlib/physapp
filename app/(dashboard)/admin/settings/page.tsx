import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getSiteSetting, getGeminiKeys } from "./actions"
import { SettingsForm } from "./SettingsForm"
import { GeminiKeysManager } from "./GeminiKeysManager"

export default async function AdminSettingsPage() {
    const registrationEnabledStr = await getSiteSetting('registration_enabled')
    const registrationEnabled = registrationEnabledStr === 'true' // Default to true if not set or string 'true'

    const testModePollingEnabledStr = await getSiteSetting('test_mode_polling_enabled')
    const testModePollingEnabled = (testModePollingEnabledStr ?? 'true').toLowerCase() === 'true'

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/admin">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">Site Settings</h1>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                <SettingsForm
                    initialRegistrationEnabled={registrationEnabled}
                    initialTestModePollingEnabled={testModePollingEnabled}
                />
                <GeminiKeysManager initialKeys={await getGeminiKeys()} />
            </div>
        </div>
    )
}
