import { Atom, BookOpen, Home, Shield, User } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { getCachedUser, getCachedProfile, getCachedStudentClassroom } from "@/lib/data-service";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const user = await getCachedUser();

    let isAdmin = false;
    let studentClassroomId = null;

    if (user) {
        const profile = await getCachedProfile(user.id);
        isAdmin = !!profile?.is_admin;
        if (!isAdmin) {
            studentClassroomId = await getCachedStudentClassroom(user.id);
        }
    }

    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-background">
            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r border-border/40 bg-sidebar p-6 md:flex">
                <div className="mb-8 px-2">
                    <Logo />
                </div>

                <nav className="flex flex-1 flex-col gap-2">
                    <NavItem href="/student" icon={Home} label="Dashboard" />
                    <NavItem href={studentClassroomId ? `/student/class/${studentClassroomId}` : "/student"} icon={BookOpen} label="Class" />
                    <NavItem href="/profile" icon={User} label="Profile" />
                    {isAdmin && <NavItem href="/admin" icon={Shield} label="Admin" />}
                </nav>

                <div className="mt-auto">
                    {/* User profile snippet could go here */}
                </div>
            </aside>

            {/* Mobile Header (optional, or just rely on page headers) */}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border/40 bg-background/80 px-4 backdrop-blur-md md:hidden">
                <MobileNavItem href="/student" icon={Home} label="Home" />
                <MobileNavItem href={studentClassroomId ? `/student/class/${studentClassroomId}` : "/student"} icon={BookOpen} label="Class" />
                <MobileNavItem href="/profile" icon={User} label="Profile" />
                {isAdmin && <MobileNavItem href="/admin" icon={Shield} label="Admin" />}
            </nav>
        </div>
    );
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
}

function MobileNavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
        </Link>
    );
}
