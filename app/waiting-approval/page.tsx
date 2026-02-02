'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkApprovalStatus } from "./actions"
import { Logo } from "@/components/logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ShieldCheck, Clock } from "lucide-react"

export default function WaitingApprovalPage() {
    const [status, setStatus] = useState<'pending' | 'approved' | 'error'>('pending')
    const router = useRouter()

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const result = await checkApprovalStatus()
                if (result.approved) {
                    setStatus('approved')
                    router.push(result.role === 'teacher' ? '/teacher' : '/student')
                } else if (result.error) {
                    setStatus('error')
                    router.push('/login')
                }
            } catch (error) {
                console.error("Failed to check approval status:", error)
            }
        }

        // Check immediately
        checkStatus()

        // Poll every 5 seconds
        const interval = setInterval(checkStatus, 5000)

        return () => clearInterval(interval)
    }, [router])

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="mb-8 flex flex-col items-center gap-2 text-center">
                <Logo size="xl" />
            </div>

            <Card className="w-full max-w-[450px] border-border/60 shadow-xl shadow-primary/5">
                <CardHeader className="space-y-1 text-center pb-2">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock className="h-6 w-6 animate-pulse" />
                    </div>
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                        Laukiama patvirtinimo
                    </CardTitle>
                    <CardDescription className="text-base">
                        Jūsų registracija sėkmingai gauta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 text-center">
                    <div className="space-y-4">
                        <p className="text-muted-foreground text-sm">
                            Administratorius turi patvirtinti jūsų paskyrą, kad galėtumėte pradėti mokslus.
                            Šis puslapis automatiškai atsinaujins, kai būsite patvirtinti.
                        </p>

                        <div className="flex flex-col items-center gap-3 pt-2">
                            <div className="flex items-center gap-2 text-primary font-medium">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Tikrinama būsena...</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-4 py-1 bg-muted rounded-full">
                                Neuždarykite šio lango
                            </p>
                        </div>
                    </div>

                    <div className="w-full border-t border-border/40 pt-6">
                        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                                Saugome jūsų paskyrą
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
