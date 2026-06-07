import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VampiresClassroomClient } from "./VampiresClassroomClient"
import "./vampires.css"

export const metadata: Metadata = {
    title: "Vampyrai | Protus",
    description: "Mokytojo valdomas klasės žaidimas",
}

export default async function VampiresPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name, email, approved")
        .eq("id", user.id)
        .single()

    if (!profile?.approved) redirect("/waiting-approval")
    if (profile.role !== "teacher" && profile.role !== "student") redirect("/")

    const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ")
        || profile.email
        || user.email
        || (profile.role === "teacher" ? "Mokytojas" : "Mokinys")

    const { data: classrooms } = profile.role === "teacher"
        ? await supabase
            .from("classrooms")
            .select("id, name")
            .eq("teacher_id", user.id)
            .order("name")
        : { data: [] }

    return (
        <VampiresClassroomClient
            userId={user.id}
            role={profile.role}
            displayName={displayName}
            classrooms={classrooms || []}
        />
    )
}
