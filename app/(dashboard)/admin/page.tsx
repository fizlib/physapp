import { adminGetAllUsers } from "./actions"
import { UserList } from "./UserList"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AdminDashboard() {
    const { users, error } = await adminGetAllUsers()

    if (error) {
        return (
            <div className="p-8 text-red-500">
                Error loading users: {error}
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/teacher">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">Manage users and platform settings.</p>
                </div>
            </div>

            <UserList initialUsers={users} />
        </div>
    )
}
