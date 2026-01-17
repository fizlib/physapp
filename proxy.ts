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
                    cookiesToSet.forEach(({ name, value, options }) => {
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

    const { data: { user } } = await supabase.auth.getUser()

    // Protected routes pattern
    const nextUrl = request.nextUrl
    const isTeacherRoute = nextUrl.pathname.startsWith('/teacher')
    const isStudentRoute = nextUrl.pathname.startsWith('/student')
    const isAuthRoute = nextUrl.pathname.startsWith('/login')
    const isChangePasswordRoute = nextUrl.pathname === '/change-password'
    const isRootRoute = nextUrl.pathname === '/'

    // 1. If user is NOT logged in and tries to access a protected route -> Redirect to Login
    if (!user && (isTeacherRoute || isStudentRoute)) {
        const url = nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If user IS logged in
    if (user) {
        // Optimization: Only fetch profile if we absolutely need to check roles or password status
        // We need role for: Root Redirect, Auth Redirect, Cross-Role Access Check
        // We need password status for: Global Password Check

        let role = null
        let mustChangePassword = false

        // Fetch profile only if we are on a relevant route to save DB calls on static assets/other routes
        if (isTeacherRoute || isStudentRoute || isAuthRoute || isRootRoute || isChangePasswordRoute) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role, must_change_password')
                .eq('id', user.id)
                .single()

            if (profile) {
                role = profile.role
                mustChangePassword = profile.must_change_password
            }
        }

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
