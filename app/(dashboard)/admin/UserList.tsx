'use client'

import { AdminUser, adminConfirmUserEmail } from "./actions"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, ShieldAlert, Loader2 } from "lucide-react"

export function UserList({ initialUsers }: { initialUsers: AdminUser[] }) {
    const [users, setUsers] = useState<AdminUser[]>(initialUsers)
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const router = useRouter()

    const handleConfirm = async (userId: string) => {
        setIsLoading(userId)
        try {
            const result = await adminConfirmUserEmail(userId)
            if (result.success) {
                // Optimistic update
                setUsers(users.map(u =>
                    u.id === userId
                        ? { ...u, email_confirmed_at: new Date().toISOString() }
                        : u
                ))
                router.refresh()
            } else {
                alert('Failed to confirm user: ' + result.error)
            }
        } catch (error) {
            alert('An error occurred')
        } finally {
            setIsLoading(null)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registered Users</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {user.email}
                                        {user.is_admin && (
                                            <Badge variant="secondary" className="ml-2 text-xs">
                                                Admin
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="capitalize">{user.role || 'N/A'}</TableCell>
                                    <TableCell>
                                        {user.email_confirmed_at ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Confirmed
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                Pending
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!user.email_confirmed_at && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleConfirm(user.id)}
                                                disabled={isLoading === user.id}
                                            >
                                                {isLoading === user.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Check className="h-4 w-4 mr-1" />
                                                )}
                                                Confirm
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
