import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "@/components/logout-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Shield } from "lucide-react"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return (
            <div className="flex h-screen items-center justify-center text-muted-foreground">
                Unable to load profile.
            </div>
        )
    }

    const roleMap: Record<string, string> = {
        'student': 'Mokinys',
        'teacher': 'Mokytojas',
        'admin': 'Admin'
    }

    const displayRole = roleMap[profile.role?.toLowerCase()] || profile.role

    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-2xl animate-fade-in-up space-y-8">
                <div>
                    <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                        Profilis
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Valdykite savo paskyros nustatymus.
                    </p>
                </div>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/40 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-8 w-8" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold tracking-tight">
                                    {profile.first_name} {profile.last_name}
                                </CardTitle>
                                <CardDescription className="font-mono text-sm opacity-80">
                                    {displayRole?.toUpperCase()}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">El. pašto adresas</span>
                                    <span className="text-foreground">{profile.email}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Shield className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paskyros tipas</span>
                                    <span className="text-foreground capitalize">{displayRole}</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border/40 pt-6">
                            <h3 className="mb-4 text-sm font-medium text-foreground">Paskyros veiksmai</h3>
                            <div className="flex justify-start">
                                <LogoutButton />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
