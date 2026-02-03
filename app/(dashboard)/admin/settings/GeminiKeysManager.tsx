'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trash2, Plus, Key, Loader2 } from "lucide-react"
import { addGeminiKey, deleteGeminiKey } from "./actions"
import { toast } from "sonner"

interface GeminiKey {
    id: string
    label: string
    api_key: string
    created_at: string
}

export function GeminiKeysManager({ initialKeys }: { initialKeys: GeminiKey[] }) {
    const [keys, setKeys] = useState<GeminiKey[]>(initialKeys)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newKey, setNewKey] = useState("")
    const [newLabel, setNewLabel] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleAddKey = async () => {
        if (!newKey || !newLabel) {
            toast.error("Error", { description: "Both key and label are required." })
            return
        }

        setIsAdding(true)
        const result = await addGeminiKey(newKey, newLabel)

        if (result.success) {
            toast.success("Success", { description: "API key added successfully." })
            const addedKey: GeminiKey = {
                id: result.id as string,
                label: newLabel,
                api_key: newKey,
                created_at: new Date().toISOString()
            }
            setKeys([addedKey, ...keys])
            setIsAddDialogOpen(false)
            setNewKey("")
            setNewLabel("")
        } else {
            toast.error("Error", { description: result.error || "Failed to add key." })
        }
        setIsAdding(false)
    }

    const handleDeleteKey = async (id: string) => {
        setDeletingId(id)
        const result = await deleteGeminiKey(id)

        if (result.success) {
            setKeys(keys.filter(k => k.id !== id))
            toast.success("Success", { description: "API key removed." })
        } else {
            toast.error("Error", { description: result.error || "Failed to delete key." })
        }
        setDeletingId(null)
    }

    const maskKey = (key: string) => {
        if (!key) return "********"
        if (key.length <= 8) return "********"
        return `${key.slice(0, 4)}...${key.slice(-4)}`
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gemini API Keys</CardTitle>
                    <CardDescription>Manage the pool of API keys used for AI features.</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Key
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Gemini API Key</DialogTitle>
                            <DialogDescription>
                                The key will be stored securely in Supabase Vault.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label htmlFor="label" className="text-sm font-medium">Label</label>
                                <Input
                                    id="label"
                                    placeholder="e.g. Primary Key, Backup 1"
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="key" className="text-sm font-medium">API Key</label>
                                <Input
                                    id="key"
                                    type="password"
                                    placeholder="AIza..."
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddKey} disabled={isAdding}>
                                {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Key
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {keys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Key className="h-12 w-12 mb-4 opacity-20" />
                        <p>No Gemini API keys configured.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Label</TableHead>
                                    <TableHead>API Key</TableHead>
                                    <TableHead>Added At</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.map((key) => (
                                    <TableRow key={key.id}>
                                        <TableCell className="font-medium">{key.label}</TableCell>
                                        <TableCell className="font-mono text-xs">{maskKey(key.api_key)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(key.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteKey(key.id)}
                                                disabled={deletingId === key.id}
                                            >
                                                {deletingId === key.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
