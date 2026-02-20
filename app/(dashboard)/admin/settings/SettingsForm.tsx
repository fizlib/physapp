'use client'

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { updateSiteSetting } from "./actions"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SettingsFormProps {
    initialRegistrationEnabled: boolean
    initialTestModePollingEnabled: boolean
    initialVirtualKeyboardToggleEnabled: boolean
}

export function SettingsForm({
    initialRegistrationEnabled,
    initialTestModePollingEnabled,
    initialVirtualKeyboardToggleEnabled
}: SettingsFormProps) {
    const [registrationEnabled, setRegistrationEnabled] = useState(initialRegistrationEnabled)
    const [testModePollingEnabled, setTestModePollingEnabled] = useState(initialTestModePollingEnabled)
    const [virtualKeyboardToggleEnabled, setVirtualKeyboardToggleEnabled] = useState(initialVirtualKeyboardToggleEnabled)
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

    const handleVirtualKeyboardToggle = async (checked: boolean) => {
        setIsLoading(true)
        setVirtualKeyboardToggleEnabled(checked)

        const result = await updateSiteSetting('virtual_keyboard_toggle_enabled', String(checked))

        if (result?.error) {
            setVirtualKeyboardToggleEnabled(!checked)
            toast.error("Error", { description: "Failed to update setting." })
        } else {
            toast.success("Success", { description: `Virtual keyboard toggle is now ${checked ? 'enabled' : 'disabled'} for students.` })
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
                        When enabled, students automatically poll for test start and newly unlocked exercises.
                        When disabled, students must refresh manually to see those updates.
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

            <Card>
                <CardHeader>
                    <CardTitle>Virtual Keyboard Toggle</CardTitle>
                    <CardDescription>
                        Control whether students can use the virtual keyboard toggle button in numerical answer inputs.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="virtual-keyboard-toggle"
                            checked={virtualKeyboardToggleEnabled}
                            onCheckedChange={handleVirtualKeyboardToggle}
                            disabled={isLoading}
                        />
                        <Label htmlFor="virtual-keyboard-toggle">Show Virtual Keyboard Toggle in Student Inputs</Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
