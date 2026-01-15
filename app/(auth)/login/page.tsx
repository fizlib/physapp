'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { login, signup } from "./actions"
import { useState } from "react"
import { useFormStatus } from "react-dom"
import { Atom } from "lucide-react"

function SubmitButton({ text }: { text: string }) {
    const { pending } = useFormStatus()
    return (
        <Button disabled={pending} type="submit" className="w-full font-medium tracking-wide">
            {pending ? 'Processing...' : text}
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="mb-8 flex flex-col items-center gap-2 text-center">
                <div className="rounded-full bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                    <Atom className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">
                    Physapp
                </h1>
                <p className="text-muted-foreground text-sm">
                    Master the universe, one equation at a time.
                </p>
            </div>

            <Card className="w-full max-w-[400px] border-border/60 shadow-xl shadow-primary/5">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-xl font-medium">
                        {isLogin ? 'Welcome back' : 'Create an account'}
                    </CardTitle>
                    <CardDescription>
                        {isLogin ? 'Enter your credentials to access your lab.' : 'Start your journey into physics today.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="flex flex-col gap-5">
                        {!isLogin && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="firstName" className="text-xs uppercase tracking-wider text-muted-foreground">First Name</Label>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        placeholder="John"
                                        required
                                        className="bg-muted/30"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lastName" className="text-xs uppercase tracking-wider text-muted-foreground">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        placeholder="Doe"
                                        required
                                        className="bg-muted/30"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                className="bg-muted/30"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="bg-muted/30"
                            />
                        </div>

                        {isLogin && (
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="remember" name="remember" className="h-4 w-4 accent-primary rounded border-input focus:ring-primary" />
                                <label
                                    htmlFor="remember"
                                    className="text-sm font-medium leading-none text-muted-foreground"
                                >
                                    Remember me
                                </label>
                            </div>
                        )}



                        {error && (
                            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive text-center">
                                {error}
                            </div>
                        )}

                        <div className="pt-2">
                            <SubmitButton text={isLogin ? 'Sign In' : 'Create Account'} />
                        </div>

                        <div className="text-center text-sm">
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                            >
                                {isLogin ? "New to Physapp? Create an account" : "Have an account? Sign in"}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
