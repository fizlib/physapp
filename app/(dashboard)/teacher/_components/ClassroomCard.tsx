'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { ClassSettingsDialog } from "../class/[id]/ClassSettingsDialog"
import { Button } from "@/components/ui/button"

interface ClassroomCardProps {
    classroom: {
        id: string
        name: string
        type: 'private_student' | 'school_class'
    }
}

export function ClassroomCard({ classroom }: ClassroomCardProps) {
    const router = useRouter()

    const handleCardClick = () => {
        router.push(`/teacher/class/${classroom.id}`)
    }

    const handleManageStudentsClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        router.push(`/teacher/class/${classroom.id}?view=students`)
    }

    return (
        <Card
            className="group h-full cursor-pointer border-border/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            onClick={handleCardClick}
        >
            <CardHeader className="space-y-1">
                <div className="flex items-start justify-between">
                    <CardTitle className="font-medium tracking-tight group-hover:text-primary">
                        {classroom.name}
                    </CardTitle>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ClassSettingsDialog
                            classroomId={classroom.id}
                            currentType={classroom.type}
                            trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Settings className="h-4 w-4" />
                                    <span className="sr-only">Settings</span>
                                </Button>
                            }
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <button
                        className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0"
                        onClick={handleManageStudentsClick}
                    >
                        <Users className="h-3.5 w-3.5" />
                        <span>Manage Students</span>
                    </button>
                    <span className="text-xs opacity-50 group-hover:opacity-100 transition-opacity">
                        Enter Class &rarr;
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
