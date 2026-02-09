'use client'

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { updateSiteSetting } from "./actions"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SettingsFormProps {
    initialRegistrationEnabled: boolean
    initialTestModePollingEnabled: boolean
}

export function SettingsForm({ initialRegistrationEnabled, initialTestModePollingEnabled }: SettingsFormProps) {
    const [registrationEnabled, setRegistrationEnabled] = useState(initialRegistrationEnabled)
    const [testModePollingEnabled, setTestModePollingEnabled] = useState(initialTestModePollingEnabled)
    const [isLoading, setIsLoading] = useState(false)

    const handleRegistrationToggle = async (checked: boolean) => {
        setIsLoading(true)
        setRegistrationEnabled(checked)

        const result = await updateSiteSetting('registration_enabled', String(checked))

        if (result?.error) {
            setRegistrationEnabled(!checked)
            toast.error("Error", { description: "Failed to update setting." })
        } else {
            toast.success("Success", { description: `Registration is now ${checked ? 'enabled' : 'disabled'}.` })
        }
        setIsLoading(false)
    }

    const handlePollingToggle = async (checked: boolean) => {
        setIsLoading(true)
        setTestModePollingEnabled(checked)

        const result = await updateSiteSetting('test_mode_polling_enabled', String(checked))

        if (result?.error) {
            setTestModePollingEnabled(!checked)
            toast.error("Error", { description: "Failed to update setting." })
        } else {
            toast.success("Success", { description: `Test mode polling is now ${checked ? 'enabled' : 'disabled'}.` })
        }
        setIsLoading(false)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Registration</CardTitle>
                    <CardDescription>Control whether new users can sign up for the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="registration-mode"
                            checked={registrationEnabled}
                            onCheckedChange={handleRegistrationToggle}
                            disabled={isLoading}
                        />
                        <Label htmlFor="registration-mode">Enable Registration</Label>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Test Mode Polling</CardTitle>
                    <CardDescription>
                        When enabled, students automatically detect when a teacher starts a test and are redirected to the first exercise.
                        Disable this if server load is a concern.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="polling-mode"
                            checked={testModePollingEnabled}
                            onCheckedChange={handlePollingToggle}
                            disabled={isLoading}
                        />
                        <Label htmlFor="polling-mode">Enable Test Mode Polling</Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
