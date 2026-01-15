'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { login, signup } from "./actions"
import { useState } from "react"
import { useFormStatus } from "react-dom"

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus()
    return (
        <Button disabled={pending} type="submit" className="w-full">
            {pending ? 'Loading...' : text}
        </Button>
    )
}

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setError(null)
        const action = isLogin ? login : signup
        const result: any = await action(formData)

        if (result?.error) {
            setError(result.error)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>{isLogin ? 'Login' : 'Sign Up'}</CardTitle>
                    <CardDescription>
                        {isLogin ? 'Enter your email to sign in.' : 'Create an account to get started.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>

                        {!isLogin && (
                            <div className="grid gap-2">
                                <Label>I am a...</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="role" value="student" defaultChecked className="accent-primary" />
                                        <span>Student</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="role" value="teacher" className="accent-primary" />
                                        <span>Teacher</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-red-500 text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <SubmitButton text={isLogin ? 'Log In' : 'Sign Up'} />

                        <div className="text-center text-sm text-muted-foreground mt-2">
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="hover:underline hover:text-primary"
                            >
                                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
