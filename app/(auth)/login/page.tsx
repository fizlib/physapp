import { getSiteSetting } from "@/app/(dashboard)/admin/settings/actions"
import { LoginForm } from "./LoginForm"

export default async function LoginPage() {
    const registrationEnabledStr = await getSiteSetting('registration_enabled')
    // Default to true if the setting doesn't exist or is 'true'
    const isRegistrationEnabled = registrationEnabledStr !== 'false'

    return <LoginForm isRegistrationEnabled={isRegistrationEnabled} />
}
