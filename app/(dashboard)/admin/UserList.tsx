'use client'

import { AdminUser, adminConfirmUserEmail, adminCreateUser, adminDeleteUser, adminGenerateMagicLink, adminResetUserProgress } from "./actions"
import { CopyButton } from "@/components/ui/copy-button"
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Check, Loader2, Plus, Trash2, ArrowLeft, User, Copy } from "lucide-react"
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
    const [generatedPassword, setGeneratedPassword] = useState<string>("")

    // New state for details view
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
    const [isLoadingLink, setIsLoadingLink] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [userToReset, setUserToReset] = useState<AdminUser | null>(null)
    const [isResetting, setIsResetting] = useState(false)

    const router = useRouter()

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
        let password = ''
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setGeneratedPassword(password)
    }

    const openCreateDialog = () => {
        generatePassword()
        setIsDialogOpen(true)
    }

    const handleConfirm = async (userId: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent row click
        setIsLoading(userId)
        try {
            const result = await adminConfirmUserEmail(userId)
            if (result.success) {
                setUsers(users.map(u =>
                    u.id === userId
                        ? { ...u, email_confirmed_at: new Date().toISOString() }
                        : u
                ))
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => prev ? { ...prev, email_confirmed_at: new Date().toISOString() } : null)
                }
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
                if (selectedUser?.id === userToDelete.id) {
                    setSelectedUser(null)
                }
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

    const handleCopyMagicLink = async (userId: string) => {
        setIsLoadingLink(true)
        try {
            const result = await adminGenerateMagicLink(userId)
            if (result.success && result.link) {
                await navigator.clipboard.writeText(result.link)
                setCopiedId(`link-${userId}`)
                setTimeout(() => setCopiedId(null), 2000)
                toast.success('Login link copied to clipboard')
            } else {
                toast.error(result.error || 'Failed to generate login link')
            }
        } catch (error) {
            toast.error('Failed to copy link')
        } finally {
            setIsLoadingLink(false)
        }
    }

    const handleResetProgress = async () => {
        if (!userToReset) return

        setIsResetting(true)
        try {
            const result = await adminResetUserProgress(userToReset.id)
            if (result.success) {
                toast.success('User progress reset successfully')
                setUserToReset(null)
                router.refresh()
            } else {
                toast.error('Failed to reset progress: ' + result.error)
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsResetting(false)
        }
    }

    if (selectedUser) {
        return (
            <>
                <div className="space-y-6">
                    <Button variant="ghost" className="pl-0" onClick={() => {
                        setSelectedUser(null)
                    }}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Users
                    </Button>

                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl flex items-center gap-2">
                                        <User className="h-6 w-6" />
                                        {selectedUser.first_name && selectedUser.last_name
                                            ? `${selectedUser.first_name} ${selectedUser.last_name}`
                                            : selectedUser.email}
                                    </CardTitle>
                                    <CardDescription className="mt-2">
                                        User ID: {selectedUser.id}
                                    </CardDescription>
                                </div>
                                <Badge variant={selectedUser.email_confirmed_at ? "outline" : "secondary"}
                                    className={selectedUser.email_confirmed_at ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
                                    {selectedUser.email_confirmed_at ? "Confirmed" : "Pending Confirmation"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">First Name</Label>
                                    <div className="font-medium">{selectedUser.first_name || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Last Name</Label>
                                    <div className="font-medium">{selectedUser.last_name || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Email</Label>
                                    <div className="font-medium">{selectedUser.email}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Role</Label>
                                    <div className="font-medium capitalize">{selectedUser.role || 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Joined At</Label>
                                    <div className="font-medium">{new Date(selectedUser.created_at).toLocaleString()}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Admin Status</Label>
                                    <div className="font-medium">{selectedUser.is_admin ? 'Yes' : 'No'}</div>
                                </div>
                            </div>

                            <div className="border-t pt-6 mt-6">
                                <h3 className="text-lg font-semibold mb-4">Actions</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        {!selectedUser.email_confirmed_at && (
                                            <Button
                                                variant="outline"
                                                onClick={(e) => handleConfirm(selectedUser.id, e)}
                                                disabled={isLoading === selectedUser.id}
                                            >
                                                {isLoading === selectedUser.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Check className="h-4 w-4 mr-1" />
                                                )}
                                                Confirm Email
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => handleCopyMagicLink(selectedUser.id)}
                                            disabled={isLoadingLink}
                                        >
                                            {isLoadingLink ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                            ) : copiedId === `link-${selectedUser.id}` ? (
                                                <Check className="h-4 w-4 mr-1" />
                                            ) : (
                                                <Copy className="h-4 w-4 mr-1" />
                                            )}
                                            {copiedId === `link-${selectedUser.id}` ? "Copied!" : "Copy Login Link"}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => setUserToDelete(selectedUser)}
                                        >
                                            Delete User
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                            onClick={() => setUserToReset(selectedUser)}
                                        >
                                            <Loader2 className="mr-2 h-4 w-4 hidden" /> {/* Hidden loader to maintain import usage/consistent type if needed, or just use RefreshCcw */}
                                            Reset Progress
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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
                </div>

                <Dialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset User Progress</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to reset progress for {userToReset?.email}?
                                This will delete all submissions and assignment progress.
                                This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setUserToReset(null)}
                                disabled={isResetting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                className="bg-orange-600 hover:bg-orange-700"
                                onClick={handleResetProgress}
                                disabled={isResetting}
                            >
                                {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Reset Progress
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle>Registered Users</CardTitle>
                        <CardDescription>Manage all users in the system</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog}>
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
                                    <Label htmlFor="password">Generated Password</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="password"
                                            name="password"
                                            value={generatedPassword}
                                            readOnly
                                            className="bg-muted"
                                        />
                                        <CopyButton
                                            value={generatedPassword}
                                            successMessage="Password copied"
                                            variant="outline"
                                            size="icon"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={generatePassword}
                                        >
                                            <Loader2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">This password will be required for the first login.</p>
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
                                    <TableRow
                                        key={user.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setSelectedUser(user)}
                                    >
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
                                                    onClick={(e) => handleConfirm(user.id, e)}
                                                    disabled={isLoading === user.id}
                                                    className="mr-2"
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
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserToDelete(user);
                                                }}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserToReset(user);
                                                }}
                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                title="Reset Progress"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-ccw h-4 w-4"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74-2.74L3 12" /><path d="M3 3v9h9" /></svg>
                                                <span className="sr-only">Reset Progress</span>
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

            <Dialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset User Progress</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reset progress for {userToReset?.email}?
                            This will delete all submissions and assignment progress.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setUserToReset(null)}
                            disabled={isResetting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={handleResetProgress}
                            disabled={isResetting}
                        >
                            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reset Progress
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
