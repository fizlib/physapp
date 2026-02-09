"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Timer, Loader2, Play } from "lucide-react"
import { startTestCollection } from "../../../../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface StartTestButtonProps {
    collectionId: string
    classroomId: string
    hasPointedExercises: boolean
}

export function StartTestButton({ collectionId, classroomId, hasPointedExercises }: StartTestButtonProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [duration, setDuration] = useState(5) // Default 5 minutes
    const router = useRouter()

    if (!hasPointedExercises) {
        return null
    }

    const handleStartTest = async () => {
        if (duration < 1) {
            toast.error("Trukmė turi būti bent 1 minutė")
            return
        }

        setLoading(true)
        try {
            const result = await startTestCollection(collectionId, classroomId, duration)
            if (result.success) {
                toast.success(`Testas pradėtas! Trukmė: ${duration} min.`)
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error || "Nepavyko pradėti testo")
            }
        } catch (err) {
            console.error(err)
            toast.error("Įvyko klaida")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="default" size="sm" className="bg-amber-600 hover:bg-amber-700">
                    <Play className="mr-2 h-4 w-4" />
                    Pradėti testą
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-amber-600" />
                        Pradėti testą
                    </DialogTitle>
                    <DialogDescription>
                        Nustatykite testo trukmę. Kai paspausite „Pradėti", visi mokiniai bus perkelti į pirmą užduotį su taškais, o laikmatis bus paleistas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="test-duration">Trukmė (minutėmis)</Label>
                        <Input
                            id="test-duration"
                            type="number"
                            min={1}
                            max={180}
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
                            disabled={loading}
                        />
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                        <p>• Visos užduotys su taškais bus atrakintos (paskelbtos).</p>
                        <p>• Mokiniai matys laikmatį viršuje.</p>
                        <p>• Pasibaigus laikui, tušti atsakymai bus automatiškai pateikti.</p>
                        <p>• Po testo užduotys vėl bus užrakintos.</p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        Atšaukti
                    </Button>
                    <Button onClick={handleStartTest} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pradėti
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
