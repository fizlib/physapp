'use client'

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { updateSiteSetting } from "./actions"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SettingsFormProps {
    initialMaintenanceModeEnabled: boolean
    initialRegistrationEnabled: boolean
    initialTestModePollingEnabled: boolean
    initialVirtualKeyboardToggleEnabled: boolean
    initialTabBlockPollingEnabled: boolean
}

export function SettingsForm({
    initialMaintenanceModeEnabled,
    initialRegistrationEnabled,
    initialTestModePollingEnabled,
    initialVirtualKeyboardToggleEnabled,
    initialTabBlockPollingEnabled
}: SettingsFormProps) {
    const [maintenanceModeEnabled, setMaintenanceModeEnabled] = useState(initialMaintenanceModeEnabled)
    const [registrationEnabled, setRegistrationEnabled] = useState(initialRegistrationEnabled)
    const [testModePollingEnabled, setTestModePollingEnabled] = useState(initialTestModePollingEnabled)
    const [virtualKeyboardToggleEnabled, setVirtualKeyboardToggleEnabled] = useState(initialVirtualKeyboardToggleEnabled)
    const [tabBlockPollingEnabled, setTabBlockPollingEnabled] = useState(initialTabBlockPollingEnabled)
    const [isLoading, setIsLoading] = useState(false)

    const handleMaintenanceModeToggle = async (checked: boolean) => {
        setIsLoading(true)
        setMaintenanceModeEnabled(checked)

        const result = await updateSiteSetting('maintenance_mode_enabled', String(checked))

        if (result?.error) {
            setMaintenanceModeEnabled(!checked)
            toast.error("Error", { description: "Failed to update maintenance mode." })
        } else {
            toast.success("Success", {
                description: checked
                    ? "The site is now available only to admins."
                    : "The site is now available to everyone."
            })
        }
        setIsLoading(false)
    }

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

    const handleTabBlockPollingToggle = async (checked: boolean) => {
        setIsLoading(true)
        setTabBlockPollingEnabled(checked)

        const result = await updateSiteSetting('tab_block_polling_enabled', String(checked))

        if (result?.error) {
            setTabBlockPollingEnabled(!checked)
            toast.error("Error", { description: "Failed to update setting." })
        } else {
            toast.success("Success", { description: `Tab block polling is now ${checked ? 'enabled' : 'disabled'}.` })
        }
        setIsLoading(false)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Maintenance Mode</CardTitle>
                    <CardDescription>
                        When enabled, only admins can use the site. Everyone else sees the site update screen.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="maintenance-mode"
                            checked={maintenanceModeEnabled}
                            onCheckedChange={handleMaintenanceModeToggle}
                            disabled={isLoading}
                        />
                        <Label htmlFor="maintenance-mode">Enable Maintenance Mode</Label>
                    </div>
                </CardContent>
            </Card>

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

            <Card>
                <CardHeader>
                    <CardTitle>Tab Block Polling</CardTitle>
                    <CardDescription>
                        When enabled, blocked students automatically poll for unblock status.
                        When disabled, students must refresh the page after being unblocked.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="tab-block-polling"
                            checked={tabBlockPollingEnabled}
                            onCheckedChange={handleTabBlockPollingToggle}
                            disabled={isLoading}
                        />
                        <Label htmlFor="tab-block-polling">Enable Tab Block Polling</Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
