import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Layers, CheckCircle2, ShieldAlert } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { getClientIp } from "@/lib/ip"
import { FileText } from "lucide-react"
import { InfoCollectionButton } from "@/components/student/InfoCollectionButton"

export default async function StudentClassroomPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params
    const { data: { user } } = await supabase.auth.getUser()

    const studentIp = await getClientIp()

    if (!user) return <div>Prašome prisijungti</div>

    const nowIso = new Date().toISOString()

    // 1. Fetch classroom and collections (standalone assignments are hidden in UI)
    const [classroomResult, collectionsResult, bypassesResult] = await Promise.all([
        supabase
            .from('classrooms')
            .select('id, name, allowed_ip, ip_check_enabled')
            .eq('id', id)
            .single(),
        supabase
            .from('collections')
            .select(`
                id,
                title,
                category,
                created_at,
                scheduled_date,
                slides_url,
                theory_content,
                info_content,
                info_button_color,
                info_pdf_url,
                assignments (
                    id,
                    published
                )
            `)
            .eq('classroom_id', id)
            .order('created_at', { ascending: false }),
        createAdminClient()
            .from('ip_bypasses')
            .select('collection_id')
            .eq('user_id', user.id)
            .gt('expires_at', nowIso)
    ])

    const { data: classroom } = classroomResult
    let { data: collections } = collectionsResult
    const { data: activeBypasses } = bypassesResult


    // Store total assignment counts (including unpublished) before filtering - for classwork cards
    const totalAssignmentCounts = new Map<string, number>()
    if (collections) {
        collections.forEach((c: any) => {
            totalAssignmentCounts.set(c.id, c.assignments?.length || 0)
        })
    }

    // Filter out unpublished assignments within collections
    if (collections) {
        collections = collections.map((c: any) => ({
            ...c,
            assignments: c.assignments?.filter((a: any) => a.published) || []
        }))
    }

    // Fetch progress for all assignments in collections
    const allCollectionAssignmentIds = collections?.flatMap((c: any) => c.assignments.map((a: any) => a.id)) || []

    const completedAssignmentIds = new Set<string>()
    if (allCollectionAssignmentIds.length > 0) {
        const { data: progressData } = await supabase
            .from('assignment_progress')
            .select('assignment_id, is_completed')
            .in('assignment_id', allCollectionAssignmentIds)
            .eq('student_id', user.id)
            .eq('is_completed', true)

        if (progressData) {
            progressData.forEach((p: any) => completedAssignmentIds.add(p.assignment_id))
        }
    }

    const getCollectionProgress = (collection: any) => {
        if (!collection.assignments || collection.assignments.length === 0) return 0
        const completedCount = collection.assignments.filter((a: any) => completedAssignmentIds.has(a.id)).length
        return (completedCount / collection.assignments.length) * 100
    }

    if (!classroom) notFound()

    const isIpRestricted = classroom.ip_check_enabled && classroom.allowed_ip && studentIp !== classroom.allowed_ip





    return (
        <div className="min-h-screen bg-background p-8 font-sans text-foreground">
            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button variant="ghost" size="sm" asChild className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href="/student">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Grįžti į pagrindinį
                        </Link>
                    </Button>
                    <div className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                {classroom.name}
                            </h1>

                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Main Content (Assignments) */}
                    <div className="space-y-6">


                        {/* Collections grouped by Category */}
                        {collections && collections.length > 0 ? (
                            <div className="space-y-8 mb-8">
                                {/* Information Page Buttons */}
                                {collections.some((c: any) => c.category === 'information') && (
                                    <div className="space-y-3">
                                        {collections.filter((c: any) => c.category === 'information').map((collection: any) => {
                                            const isRed = collection.info_button_color === 'red'
                                            return (
                                                <InfoCollectionButton
                                                    key={collection.id}
                                                    collectionId={collection.id}
                                                    classroomId={id}
                                                    title={collection.title}
                                                    isRed={isRed}
                                                    infoPdfUrl={collection.info_pdf_url}
                                                    hasContent={!!collection.info_content}
                                                />
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Classwork Section */}
                                {collections.some((c: any) => c.category === 'classwork') && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-foreground/80 flex items-center gap-2 text-primary">
                                            <Layers className="h-4 w-4" />
                                            Darbas klasėje
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {collections.filter((c: any) => c.category === 'classwork').map((collection: any) => {
                                                const hasBypass = activeBypasses?.some((b: any) => b.collection_id === collection.id)
                                                const isRestrictedByIp = isIpRestricted && !hasBypass
                                                const displayDate = collection.scheduled_date || collection.created_at

                                                return (
                                                    <Card key={collection.id} className={`group relative transition-all bg-secondary/10 ${isRestrictedByIp ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}>
                                                        {!isRestrictedByIp && (
                                                            <Link
                                                                href={`/student/class/${id}/collection/${collection.id}`}
                                                                aria-label={`Open collection: ${collection.title}`}
                                                                className="absolute inset-0 z-10 rounded-xl touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:bg-primary/10"
                                                            />
                                                        )}
                                                        <CardContent className="p-6 space-y-4 relative z-20 pointer-events-none">
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-1.5 flex-1 pr-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <h3 className="font-semibold leading-none">{collection.title}</h3>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                        <span>{totalAssignmentCounts.get(collection.id) || 0} Užduotys</span>
                                                                        <span>•</span>
                                                                        <span>Paskelbta {new Date(displayDate).toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' })}</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">Darbas klasėje</span>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="flex-1">
                                                                    {(collection.slides_url || collection.theory_content) && (
                                                                        <div className="pointer-events-auto relative z-30 inline-flex">
                                                                            <Link href={`/student/class/${id}/collection/${collection.id}/theory`}>
                                                                                <Button
                                                                                    variant="secondary"
                                                                                    size="sm"
                                                                                    className="h-8 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-none"
                                                                                >
                                                                                    <FileText className="w-4 h-4 mr-2" />
                                                                                    Teorija
                                                                                </Button>
                                                                            </Link>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* IP restriction message */}
                                                            {isRestrictedByIp && (
                                                                <div className="flex items-center gap-2 text-red-600 bg-red-50/50 px-3 py-2 rounded-md border border-red-100/50">
                                                                    <ShieldAlert className="h-3.5 w-3.5" />
                                                                    <span className="text-[10px] font-medium leading-tight">Prieiga ribojama tik klasės tinklui</span>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })}

                                        </div>
                                    </div>
                                )}

                                {/* Homework Section */}
                                {collections.some((c: any) => c.category === 'homework' || !c.category) && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium text-foreground/80 flex items-center gap-2 text-indigo-500">
                                            <Layers className="h-4 w-4" />
                                            Namų darbai
                                        </h3>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {collections.filter((c: any) => c.category === 'homework' || !c.category).map((collection: any) => {
                                                const progress = getCollectionProgress(collection)
                                                return (
                                                    <Card key={collection.id} className="group relative cursor-pointer hover:border-primary/50 transition-all bg-secondary/10">
                                                        <Link
                                                            href={`/student/class/${id}/collection/${collection.id}`}
                                                            aria-label={`Open collection: ${collection.title}`}
                                                            className="absolute inset-0 z-10 rounded-xl touch-manipulation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:bg-primary/10"
                                                        />
                                                        <CardContent className="p-6 space-y-4 relative z-20 pointer-events-none">
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-1.5 flex-1 pr-4">
                                                                    <h3 className="font-semibold leading-none">{collection.title}</h3>
                                                                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                                        <span>{collection.assignments?.length || 0} Užduotys</span>
                                                                        <span>•</span>
                                                                        <span>Paskelbta {new Date(collection.scheduled_date || collection.created_at).toLocaleDateString('lt-LT', { month: 'short', day: 'numeric' })}</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full shrink-0">Namų darbai</span>
                                                            </div>

                                                            {(collection.slides_url || collection.theory_content) && (
                                                                <div className="pt-1 pointer-events-auto relative z-30">
                                                                    <Link href={`/student/class/${id}/collection/${collection.id}/theory`}>
                                                                        <Button
                                                                            variant="secondary"
                                                                            size="sm"
                                                                            className="h-8 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none"
                                                                        >
                                                                            <FileText className="w-4 h-4 mr-2" />
                                                                            Teorija
                                                                        </Button>
                                                                    </Link>
                                                                </div>
                                                            )}

                                                            {/* Progress Section */}
                                                            <div className="space-y-2">
                                                                {progress > 0 && progress < 100 && (
                                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                                        <span>{Math.round(progress)}% Atlikta</span>
                                                                    </div>
                                                                )}

                                                                {progress === 100 ? (
                                                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md">
                                                                        <CheckCircle2 className="h-4 w-4" />
                                                                        <span className="text-xs font-medium">Atlikta</span>
                                                                    </div>
                                                                ) : (
                                                                    <Progress value={progress} className="h-1.5" />
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mb-8">
                                <p className="text-sm text-muted-foreground italic">Kolekcijų dar nepaskirta.</p>
                            </div>
                        )}

                        {/* 
                        Hide Individual Exercises
                        <h3 className="text-lg font-medium text-foreground/80">Individual Exercises</h3>

                        {assignments && assignments.length > 0 ? (
                            <div className="grid gap-4">
                                {assignments.map((assignment) => (
                                    <Link key={assignment.id} href={`/student/class/${id}/assignment/${assignment.id}`}>
                                        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                                            <CardContent className="p-6 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold">{assignment.title}</h3>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Clock className="h-3 w-3" />
                                                        <span>Posted {new Date(assignment.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs font-medium bg-secondary px-2.5 py-1 rounded-full">
                                                    Start
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed border-border/60 bg-muted/5 shadow-none">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                    <div className="rounded-full bg-muted/30 p-4 mb-4">
                                        <BookOpen className="h-8 w-8 opacity-40" />
                                    </div>
                                    <p className="text-sm font-medium">No exercises assigned yet.</p>
                                    <p className="text-xs opacity-70">Check back later for new modules.</p>
                                </CardContent>
                            </Card>
                        )}
                        */}
                    </div>

                    {/* Sidebar (Stats/Info) removed */}
                </div>
            </div>
        </div>
    )
}
