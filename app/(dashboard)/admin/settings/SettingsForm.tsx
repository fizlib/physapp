'use client'

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { updateSiteSetting } from "./actions"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SettingsForm({ initialRegistrationEnabled }: { initialRegistrationEnabled: boolean }) {
    const [registrationEnabled, setRegistrationEnabled] = useState(initialRegistrationEnabled)
    const [isLoading, setIsLoading] = useState(false)

    const handleToggle = async (checked: boolean) => {
        setIsLoading(true)
        // Optimistic update
        setRegistrationEnabled(checked)

        const result = await updateSiteSetting('registration_enabled', String(checked))

        if (result?.error) {
            setRegistrationEnabled(!checked) // Revert
            toast.error("Error", {
                description: "Failed to update setting."
            })
        } else {
            toast.success("Success", {
                description: `Registration is now ${checked ? 'enabled' : 'disabled'}.`
            })
        }
        setIsLoading(false)
    }

    return (
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
                        onCheckedChange={handleToggle}
                        disabled={isLoading}
                    />
                    <Label htmlFor="registration-mode">Enable Registration</Label>
                </div>
            </CardContent>
        </Card>
    )
}
