'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { changeInitialPassword } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ChangePasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        const result = await changeInitialPassword(formData)

        if (result.success) {
            // Force a hard refresh to re-run middleware/layout checks
            window.location.href = '/'
        } else {
            setError(result.error || 'Nepavyko pakeisti slaptažodžio')
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Slaptažodžio keitimas</CardTitle>
                    <CardDescription>
                        Prieš tęsiant, turite pasikeisti slaptažodį.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Naujas slaptažodis</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Pakartokite naują slaptažodį</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Pakeisti slaptažodį
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
