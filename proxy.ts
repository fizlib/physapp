import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Use getUser() for routing decisions to avoid stale-cookie loops:
    // getSession() can treat an expired/stale cookie as authenticated in some cases,
    // while server components/layouts use getUser() and may reject the same session.
    // Using getUser() here keeps proxy auth decisions consistent with page auth checks.
    const { data, error: userError } = await supabase.auth.getUser()
    const user = userError ? null : data.user

    // Fail open if this setting cannot be read so a transient database error does
    // not make the whole application unavailable.
    const { data: maintenanceSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'maintenance_mode_enabled')
        .maybeSingle()
    const maintenanceModeEnabled = maintenanceSetting?.value?.toLowerCase() === 'true'

    // Protected routes pattern
    const nextUrl = request.nextUrl
    const isTeacherRoute = nextUrl.pathname.startsWith('/teacher')
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isGamesRoute = nextUrl.pathname === '/games' || nextUrl.pathname.startsWith('/games/')
    const isAuthRoute = nextUrl.pathname.startsWith('/login')
    const isChangePasswordRoute = nextUrl.pathname === '/change-password'
    const isRootRoute = nextUrl.pathname === '/'
    const isMaintenanceRoute = nextUrl.pathname === '/maintenance'

    let role = null
    let mustChangePassword = false
    let isAdmin = false

    // Maintenance mode needs the admin flag on every route. Outside maintenance
    // mode, keep the existing optimization and only load profiles where routing
    // decisions need them.
    const needsProfile = !!user && (
        maintenanceModeEnabled ||
        isTeacherRoute ||
        isStudentRoute ||
        isGamesRoute ||
        isAuthRoute ||
        isRootRoute ||
        isChangePasswordRoute
    )

    if (user && needsProfile) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, must_change_password, is_admin')
            .eq('id', user.id)
            .single()

        if (profile) {
            role = profile.role
            mustChangePassword = profile.must_change_password
            isAdmin = !!profile.is_admin
        }
    }

    // Authenticated admins keep full access. Everyone else is sent to the single
    // maintenance page before any normal authentication redirects are applied.
    if (maintenanceModeEnabled && !isAdmin && !isMaintenanceRoute) {
        const url = nextUrl.clone()
        url.pathname = '/maintenance'
        url.search = ''
        return NextResponse.redirect(url)
    }

    // 1. If user is NOT logged in and tries to access a protected route -> Redirect to Login
    if (!user && (isTeacherRoute || isStudentRoute || isGamesRoute)) {
        const url = nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If user IS logged in
    if (user) {
        // 2x. Forced Password Change Check
        if (mustChangePassword && !isChangePasswordRoute) {
            const url = nextUrl.clone()
            url.pathname = '/change-password'
            return NextResponse.redirect(url)
        }

        if (!mustChangePassword && isChangePasswordRoute) {
            // If they don't need to change it, redirect to dashboard
            const url = nextUrl.clone()
            url.pathname = role === 'teacher' ? '/teacher' : '/student'
            if (role) return NextResponse.redirect(url) // Only redirect if we effectively resolved the role
        }

        // 2a. If user tries to access login page -> Redirect to their Dashboard
        if (isAuthRoute) {
            const url = nextUrl.clone()
            url.pathname = role === 'teacher' ? '/teacher' : '/student'
            if (role) return NextResponse.redirect(url)
        }

        // 2b. Root Path Redirect
        if (isRootRoute) {
            const url = nextUrl.clone()
            url.pathname = role === 'teacher' ? '/teacher' : '/student'
            if (role) return NextResponse.redirect(url)
        }

        // 2c. Role-based protection
        if (role === 'student' && isTeacherRoute) {
            const url = nextUrl.clone()
            url.pathname = '/student'
            return NextResponse.redirect(url)
        }

        if (role === 'teacher' && isStudentRoute) {
            const url = nextUrl.clone()
            url.pathname = '/teacher'
            return NextResponse.redirect(url)
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
