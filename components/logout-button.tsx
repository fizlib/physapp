'use client'

import { Button } from "@/components/ui/button"
import { logout } from "@/app/(auth)/login/actions"
import { LogOut } from "lucide-react"

export function LogoutButton() {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-muted-foreground hover:text-black gap-2"
        >
            <LogOut className="h-4 w-4" />
            Logout
        </Button>
    )
}
