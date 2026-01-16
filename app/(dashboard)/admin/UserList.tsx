'use client'

import { AdminUser, adminConfirmUserEmail, adminCreateUser, adminDeleteUser } from "./actions"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Check, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function UserList({ initialUsers }: { initialUsers: AdminUser[] }) {
    const [users, setUsers] = useState<AdminUser[]>(initialUsers)
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleConfirm = async (userId: string) => {
        setIsLoading(userId)
        try {
            const result = await adminConfirmUserEmail(userId)
            if (result.success) {
                setUsers(users.map(u =>
                    u.id === userId
                        ? { ...u, email_confirmed_at: new Date().toISOString() }
                        : u
                ))
                toast.success('User confirmed successfully')
                router.refresh()
            } else {
                toast.error('Failed to confirm user: ' + result.error)
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsLoading(null)
        }
    }

    const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsCreating(true)

        const formData = new FormData(e.currentTarget)

        try {
            const result = await adminCreateUser(formData)

            if (result.success && result.user) {
                toast.success('User created successfully')
                setIsDialogOpen(false)
                setUsers([result.user, ...users])
                router.refresh()
                // You might want to refetch users here to update the list immediately
                // but router.refresh() should handle it if this is a server component parent
            } else {
                toast.error(result.error || 'Failed to create user')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteUser = async () => {
        if (!userToDelete) return

        setIsDeleting(true)
        try {
            const result = await adminDeleteUser(userToDelete.id)
            if (result.success) {
                setUsers(users.filter(u => u.id !== userToDelete.id))
                toast.success('User deleted successfully')
                setUserToDelete(null)
                router.refresh()
            } else {
                toast.error('Failed to delete user: ' + result.error)
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                    <CardTitle>Registered Users</CardTitle>
                    <CardDescription>Manage all users in the system</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                            <DialogDescription>
                                Add a new user to the system. They will be automatically confirmed.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input id="firstName" name="firstName" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input id="lastName" name="lastName" required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" name="password" type="password" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <div className="relative">
                                    <select
                                        id="role"
                                        name="role"
                                        required
                                        defaultValue="student"
                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                    >
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down h-4 w-4 opacity-50"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create User
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
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
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="ml-2"
                                            onClick={() => setUserToDelete(user)}
                                            disabled={isLoading === user.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {userToDelete?.email}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setUserToDelete(null)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteUser}
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
