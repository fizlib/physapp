'use client'

import { AdminUser, adminApproveUser, adminBulkApproveUsers, adminBulkDeleteUsers, adminCreateUser, adminDeleteUser, adminGenerateMagicLink, adminResetUserProgress, adminGetUserCollections, adminSetIpBypass, adminGetActiveBypass, adminResetPassword, adminSendMessage, adminGetStudentMessages } from "./actions"
import { MarkdownEditor } from "@/components/ui/markdown-editor"
import { CopyButton } from "@/components/ui/copy-button"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Check, Loader2, Plus, Trash2, ArrowLeft, User, Copy, X, ChevronLeft, ChevronRight, Search, Mail, Send } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"

export function UserList({
    initialUsers,
    selectedUserId,
    totalCount,
    currentPage,
    perPage,
    searchQuery
}: {
    initialUsers: AdminUser[],
    selectedUserId?: string,
    totalCount: number,
    currentPage: number,
    perPage: number,
    searchQuery?: string
}) {
    const [users, setUsers] = useState<AdminUser[]>(initialUsers)
    const [search, setSearch] = useState(searchQuery || "")
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [generatedPassword, setGeneratedPassword] = useState<string>("")

    // New state for details view
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(
        selectedUserId ? initialUsers.find(u => u.id === selectedUserId) || null : null
    )
    const [isLoadingLink, setIsLoadingLink] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [userToReset, setUserToReset] = useState<AdminUser | null>(null)
    const [isResetting, setIsResetting] = useState(false)
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
    const [activeLink, setActiveLink] = useState<string>("")
    const [forcePasswordReset, setForcePasswordReset] = useState(false)
    const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
    const [generatedResetPassword, setGeneratedResetPassword] = useState<string | null>(null)
    const [isResettingPassword, setIsResettingPassword] = useState(false)

    // Bulk selection state
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [isBulkApproving, setIsBulkApproving] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
    const [isBulkApproveDialogOpen, setIsBulkApproveDialogOpen] = useState(false)
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

    // IP Bypass state
    const [userCollections, setUserCollections] = useState<any[]>([])
    const [activeBypasses, setActiveBypasses] = useState<any[]>([])
    const [isSettingBypass, setIsSettingBypass] = useState(false)
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("")
    const [isLoadingCollections, setIsLoadingCollections] = useState(false)

    // Messaging state
    const [messageTitle, setMessageTitle] = useState("")
    const [messageContent, setMessageContent] = useState("")
    const [isSendingMessage, setIsSendingMessage] = useState(false)
    const [studentMessages, setStudentMessages] = useState<any[]>([])
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)

    useEffect(() => {
        if (selectedUser && selectedUser.role === 'student') {
            fetchUserCollections(selectedUser.id)
            fetchActiveBypasses(selectedUser.id)
            fetchStudentMessages(selectedUser.id)
        }
    }, [selectedUser])

    const fetchUserCollections = async (userId: string) => {
        setIsLoadingCollections(true)
        try {
            const result = await adminGetUserCollections(userId)
            if (result.collections) {
                setUserCollections(result.collections)
                if (result.collections.length > 0) {
                    setSelectedCollectionId(result.collections[0].id)
                }
            }
        } finally {
            setIsLoadingCollections(false)
        }
    }

    const fetchActiveBypasses = async (userId: string) => {
        const result = await adminGetActiveBypass(userId)
        if (result.bypasses) {
            setActiveBypasses(result.bypasses)
        }
    }

    const handleSetIpBypass = async () => {
        if (!selectedUser || !selectedCollectionId) return

        setIsSettingBypass(true)
        try {
            const result = await adminSetIpBypass(selectedUser.id, selectedCollectionId)
            if (result.success) {
                toast.success('IP access control disabled for 45 minutes')
                fetchActiveBypasses(selectedUser.id)
            } else {
                toast.error(result.error || 'Failed to set IP bypass')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSettingBypass(false)
        }
    }

    const fetchStudentMessages = async (userId: string) => {
        setIsLoadingMessages(true)
        try {
            const result = await adminGetStudentMessages(userId)
            if (result.messages) {
                setStudentMessages(result.messages)
            }
        } finally {
            setIsLoadingMessages(false)
        }
    }

    const handleSendMessage = async () => {
        if (!selectedUser || !messageTitle.trim() || !messageContent.trim()) return

        setIsSendingMessage(true)
        try {
            const result = await adminSendMessage(selectedUser.id, messageTitle, messageContent)
            if (result.success) {
                toast.success('Message sent successfully')
                setMessageTitle("")
                setMessageContent("")
                fetchStudentMessages(selectedUser.id)
            } else {
                toast.error(result.error || 'Failed to send message')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsSendingMessage(false)
        }
    }

    useEffect(() => {
        if (selectedUserId) {
            const user = users.find(u => u.id === selectedUserId)
            if (user) {
                setSelectedUser(user)
            }
        }
    }, [selectedUserId, users])

    useEffect(() => {
        setUsers(initialUsers)
        setSelectedUserIds([])
        setLastSelectedIndex(null)
    }, [initialUsers])

    useEffect(() => {
        setSearch(searchQuery || "")
    }, [searchQuery])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams(window.location.search)
        if (search) {
            params.set('search', search)
            params.set('page', '1')
        } else {
            params.delete('search')
        }
        router.push(`/admin/users?${params.toString()}`)
    }

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
            const result = await adminApproveUser(userId)
            if (result.success) {
                setUsers(users.map(u =>
                    u.id === userId
                        ? { ...u, approved: true }
                        : u
                ))
                if (selectedUser?.id === userId) {
                    setSelectedUser(prev => prev ? { ...prev, approved: true } : null)
                }
                toast.success('User approved successfully')
                router.refresh()
            } else {
                toast.error('Failed to approve user: ' + result.error)
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

    const handleCopyMagicLink = async (userId: string, forceReset: boolean = forcePasswordReset) => {
        setIsLoadingLink(true)
        try {
            const result = await adminGenerateMagicLink(userId, forceReset)
            if (result.success && result.link) {
                setActiveLink(result.link)
                setIsLinkDialogOpen(true)
            } else {
                toast.error(result.error || 'Failed to generate login link')
            }
        } catch (error) {
            toast.error('Failed to copy link')
        } finally {
            setIsLoadingLink(false)
        }
    }

    useEffect(() => {
        if (isLinkDialogOpen && selectedUser) {
            handleCopyMagicLink(selectedUser.id)
        }
    }, [forcePasswordReset])

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

    const handleResetPassword = async () => {
        if (!selectedUser) return

        setIsResettingPassword(true)
        try {
            const result = await adminResetPassword(selectedUser.id)
            if (result.success && result.password) {
                setGeneratedResetPassword(result.password)
                toast.success('Password reset successfully')
            } else {
                toast.error('Failed to reset password: ' + result.error)
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsResettingPassword(false)
        }
    }

    const toggleUserSelection = (userId: string, checked: boolean, index: number, isShiftKey: boolean) => {
        if (isShiftKey && lastSelectedIndex !== null) {
            const start = Math.min(lastSelectedIndex, index)
            const end = Math.max(lastSelectedIndex, index)
            const rangeIds = users.slice(start, end + 1).map(u => u.id)

            if (checked) {
                // When selecting a range, we add all users in the range
                setSelectedUserIds(prev => {
                    const next = new Set([...prev, ...rangeIds])
                    return Array.from(next)
                })
            } else {
                // When deselecting a range, we remove all users in the range
                setSelectedUserIds(prev => prev.filter(id => !rangeIds.includes(id)))
            }
        } else {
            if (checked) {
                setSelectedUserIds(prev => [...prev, userId])
            } else {
                setSelectedUserIds(prev => prev.filter(id => id !== userId))
            }
        }
        setLastSelectedIndex(index)
    }

    const toggleAllSelection = (checked: boolean) => {
        if (checked) {
            setSelectedUserIds(users.map(u => u.id))
        } else {
            setSelectedUserIds([])
        }
        setLastSelectedIndex(null)
    }

    const handleBulkApprove = async () => {
        setIsBulkApproving(true)
        try {
            const result = await adminBulkApproveUsers(selectedUserIds)
            if (result.success) {
                setUsers(users.map(u =>
                    selectedUserIds.includes(u.id)
                        ? { ...u, approved: true }
                        : u
                ))
                toast.success(`${selectedUserIds.length} users approved successfully`)
                setSelectedUserIds([])
                setIsBulkApproveDialogOpen(false)
                router.refresh()
            } else {
                toast.error('Failed to approve users: ' + result.error)
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsBulkApproving(false)
        }
    }

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true)
        try {
            const result = await adminBulkDeleteUsers(selectedUserIds)
            if (result.success) {
                setUsers(users.filter(u => !selectedUserIds.includes(u.id)))
                toast.success(`${selectedUserIds.length} users deleted successfully`)
                setSelectedUserIds([])
                setIsBulkDeleteDialogOpen(false)
                router.refresh()
            } else {
                toast.error('Failed to delete users: ' + result.error)
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setIsBulkDeleting(false)
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
                                <Badge variant={selectedUser.approved ? "outline" : "secondary"}
                                    className={selectedUser.approved ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}>
                                    {selectedUser.approved ? "Approved" : "Pending Approval"}
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
                                        {!selectedUser.approved && (
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
                                                Approve User
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => handleCopyMagicLink(selectedUser.id)}
                                            disabled={isLoadingLink}
                                        >
                                            {isLoadingLink ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                            ) : (
                                                <Copy className="h-4 w-4 mr-1" />
                                            )}
                                            Login Link
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
                                        <Button
                                            variant="outline"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                            onClick={() => {
                                                setGeneratedResetPassword(null)
                                                setIsResetPasswordDialogOpen(true)
                                            }}
                                        >
                                            <Plus className="h-4 w-4 mr-1 rotate-45" /> {/* Use as a refresh-like icon or just Key if imported */}
                                            Generate New Password
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {selectedUser.role === 'student' && (


                                <div className="border-t pt-6 mt-6">
                                    <h3 className="text-lg font-semibold mb-4">IP Access Control</h3>
                                    <div className="space-y-4">
                                        {activeBypasses.length > 0 && (
                                            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                                                <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                                                    <Check className="h-5 w-5" />
                                                    Active IP Bypasses
                                                </div>
                                                <ul className="space-y-1">
                                                    {activeBypasses.map((bypass) => {
                                                        const collection = userCollections.find(c => c.id === bypass.collection_id)
                                                        const timeLeft = Math.max(0, Math.floor((new Date(bypass.expires_at).getTime() - Date.now()) / 60000))
                                                        return (
                                                            <li key={bypass.id} className="text-sm text-green-700">
                                                                <span className="font-semibold">{collection?.title || 'Unknown Collection'}</span>: {timeLeft} minutes remaining
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row items-end gap-4">
                                            <div className="space-y-2 flex-1 w-full">
                                                <Label htmlFor="collection-select">Select Collection</Label>
                                                <select
                                                    id="collection-select"
                                                    value={selectedCollectionId}
                                                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                                                    disabled={isLoadingCollections || userCollections.length === 0}
                                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none transition-colors"
                                                >
                                                    {isLoadingCollections ? (
                                                        <option>Kraunama...</option>
                                                    ) : userCollections.length === 0 ? (
                                                        <option>Nėra priskirtų klasių darbų</option>
                                                    ) : (
                                                        userCollections.map((col) => (
                                                            <option key={col.id} value={col.id}>
                                                                {col.title}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                            <Button
                                                onClick={handleSetIpBypass}
                                                disabled={isSettingBypass || userCollections.length === 0}
                                                className="w-full sm:w-auto"
                                            >
                                                {isSettingBypass ? (
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                    <X className="h-4 w-4 mr-2 rotate-45" />
                                                )}
                                                Disable IP Access Control (45m)
                                            </Button>
                                        </div>
                                        {userCollections.length === 0 && !isLoadingCollections && (
                                            <p className="text-xs text-muted-foreground">
                                                This student is not enrolled in any classrooms with classwork collections.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedUser.role === 'student' && (
                                <div className="border-t pt-6 mt-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Mail className="h-5 w-5" />
                                        Send Message
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="message-title">Title</Label>
                                            <Input
                                                id="message-title"
                                                value={messageTitle}
                                                onChange={(e) => setMessageTitle(e.target.value)}
                                                placeholder="Message title..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Content (Markdown)</Label>
                                            <MarkdownEditor
                                                value={messageContent}
                                                onChange={setMessageContent}
                                                placeholder="Write your message in markdown..."
                                                minHeight="150px"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={isSendingMessage || !messageTitle.trim() || !messageContent.trim()}
                                        >
                                            {isSendingMessage ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <Send className="h-4 w-4 mr-2" />
                                            )}
                                            Send Message
                                        </Button>
                                    </div>

                                    {/* Previously sent messages */}
                                    {studentMessages.length > 0 && (
                                        <div className="mt-6 space-y-3">
                                            <h4 className="text-sm font-medium text-muted-foreground">Sent Messages</h4>
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                {studentMessages.map((msg) => (
                                                    <div
                                                        key={msg.id}
                                                        className={`rounded-md border p-3 text-sm ${
                                                            msg.is_read
                                                                ? 'bg-muted/30 border-border/50'
                                                                : 'bg-violet-50 border-violet-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-medium truncate">{msg.title}</span>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {msg.is_read ? (
                                                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">Read</Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-600 border-violet-200">Unread</Badge>
                                                                )}
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {new Date(msg.created_at).toLocaleDateString('lt-LT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {isLoadingMessages && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading messages...
                                        </div>
                                    )}
                                </div>
                            )}
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

                <Dialog open={isLinkDialogOpen} onOpenChange={(open) => {
                    setIsLinkDialogOpen(open)
                    if (!open) setForcePasswordReset(false)
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Login Link</DialogTitle>
                            <DialogDescription>
                                Copy the link or scan the QR code to log in as this user.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center space-y-4 py-4">
                            <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeLink)}`}
                                    alt="Login QR Code"
                                    className="w-48 h-48"
                                />
                            </div>
                            <div className="flex items-center space-x-2 w-full px-1">
                                <Checkbox
                                    id="forceReset"
                                    checked={forcePasswordReset}
                                    onCheckedChange={(checked) => setForcePasswordReset(!!checked)}
                                />
                                <Label
                                    htmlFor="forceReset"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    New password on login
                                </Label>
                            </div>
                            <div className="flex w-full items-center space-x-2">
                                <div className="grid flex-1 gap-2">
                                    <Label htmlFor="link" className="sr-only">
                                        Link
                                    </Label>
                                    <Input
                                        id="link"
                                        defaultValue={activeLink}
                                        readOnly
                                        className="h-9"
                                    />
                                </div>
                                <CopyButton
                                    value={activeLink}
                                    successMessage="Link copied to clipboard"
                                    variant="secondary"
                                    className="shrink-0"
                                />
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-start">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsLinkDialogOpen(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={isResetPasswordDialogOpen} onOpenChange={(open) => {
                    setIsResetPasswordDialogOpen(open)
                    if (!open) setGeneratedResetPassword(null)
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Reset User Password</DialogTitle>
                            <DialogDescription>
                                This will generate a new random password for {selectedUser?.email}.
                                The user will be required to change this password on their next login.
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedResetPassword ? (
                            <div className="py-4 flex justify-center">
                                <Button
                                    onClick={handleResetPassword}
                                    disabled={isResettingPassword}
                                >
                                    {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Generate Password
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="new-password"
                                            value={generatedResetPassword}
                                            readOnly
                                            className="bg-muted"
                                        />
                                        <CopyButton
                                            value={generatedResetPassword}
                                            successMessage="Password copied"
                                            variant="outline"
                                            size="icon"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Copy this password and give it to the user. This is the only time it will be shown.
                                    </p>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="sm:justify-start">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsResetPasswordDialogOpen(false)}
                            >
                                Close
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
                <CardContent className="space-y-4">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Ieškoti pagal el. paštą, vardą arba pavardę..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button type="submit" variant="outline">
                            Ieškoti
                        </Button>
                        {searchQuery && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setSearch("")
                                    router.push("/admin/users")
                                }}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Išvalyti
                            </Button>
                        )}
                    </form>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={selectedUserIds.length === users.length && users.length > 0}
                                            onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user, index) => (
                                    <TableRow
                                        key={user.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedUserIds.includes(user.id)}
                                                onCheckedChange={(checked) => {
                                                    // We can't easily get the shift key from onCheckedChange
                                                    // So we use the native event if available or a workaround.
                                                    // However, standard mouse events bubble through Checkbox.
                                                }}
                                                onClick={(e) => {
                                                    // Checkbox click event
                                                    const isChecked = !selectedUserIds.includes(user.id)
                                                    toggleUserSelection(user.id, isChecked, index, e.shiftKey)
                                                }}
                                                aria-label={`Select ${user.email}`}
                                            />
                                        </TableCell>
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
                                            {user.approved ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Approved
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
                                            {!user.approved && (
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
                                                    Approve
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

                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t py-4">
                    <div className="text-sm text-muted-foreground">
                        Rodoma {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, totalCount)} iš {totalCount} naudotojų
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            disabled={currentPage === 1}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        >
                            <Link href={`/admin/users?page=${currentPage - 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}>
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Ankstesnis
                            </Link>
                        </Button>
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.ceil(totalCount / perPage) }, (_, i) => i + 1)
                                .filter(p => {
                                    // Show first, last, and pages around current
                                    const totalPages = Math.ceil(totalCount / perPage)
                                    return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                                })
                                .map((p, i, arr) => (
                                    <div key={p} className="flex items-center">
                                        {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-muted-foreground">...</span>}
                                        <Button
                                            variant={currentPage === p ? "default" : "outline"}
                                            size="sm"
                                            asChild
                                            className="w-8 h-8 p-0"
                                        >
                                            <Link href={`/admin/users?page=${p}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}>
                                                {p}
                                            </Link>
                                        </Button>
                                    </div>
                                ))
                            }
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            disabled={currentPage >= Math.ceil(totalCount / perPage)}
                            className={currentPage >= Math.ceil(totalCount / perPage) ? "pointer-events-none opacity-50" : ""}
                        >
                            <Link href={`/admin/users?page=${currentPage + 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}>
                                Kitas
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </Button>
                    </div>
                </CardFooter>

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

            {/* Bulk Action Toolbar */}
            {selectedUserIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                        <CardContent className="py-3 px-6 flex items-center gap-6">
                            <div className="flex items-center gap-2 border-r pr-6">
                                <Badge variant="secondary" className="px-2 py-0.5">
                                    {selectedUserIds.length}
                                </Badge>
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                    Users selected
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsBulkApproveDialogOpen(true)}
                                    className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve All
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete All
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setSelectedUserIds([])}
                                    className="h-8 w-8 ml-2"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Bulk Actions Confirmation Dialogs */}
            <Dialog open={isBulkApproveDialogOpen} onOpenChange={setIsBulkApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Multiple Users</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve {selectedUserIds.length} selected users?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsBulkApproveDialogOpen(false)}
                            disabled={isBulkApproving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkApprove}
                            disabled={isBulkApproving}
                        >
                            {isBulkApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Approve {selectedUserIds.length} Users
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Multiple Users</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedUserIds.length} selected users? This action cannot be undone and will delete all their data.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsBulkDeleteDialogOpen(false)}
                            disabled={isBulkDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                        >
                            {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete {selectedUserIds.length} Users
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
