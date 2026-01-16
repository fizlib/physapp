import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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
    const isTeacherRoute = request.nextUrl.pathname.startsWith('/teacher')
    const isStudentRoute = request.nextUrl.pathname.startsWith('/student')
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
    const isRootRoute = request.nextUrl.pathname === '/'

    // 1. If user is NOT logged in and tries to access a protected route -> Redirect to Login
    if (!user && (isTeacherRoute || isStudentRoute)) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If user IS logged in
    if (user) {
        // Fetch user profile with role and must_change_password
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, must_change_password')
            .eq('id', user.id)
            .single()

        const role = profile?.role
        const mustChangePassword = profile?.must_change_password

        // 2x. Forced Password Change Check
        const isChangePasswordRoute = request.nextUrl.pathname === '/change-password'

        if (mustChangePassword && !isChangePasswordRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/change-password'
            return NextResponse.redirect(url)
        }

        if (!mustChangePassword && isChangePasswordRoute) {
            // If they don't need to change it, redirect to dashboard
            const url = request.nextUrl.clone()
            url.pathname = role === 'teacher' ? '/teacher' : '/student'
            return NextResponse.redirect(url)
        }

        // 2a. If user tries to access login page -> Redirect to their Dashboard
        if (isAuthRoute) {
            const url = request.nextUrl.clone()
            url.pathname = role === 'teacher' ? '/teacher' : '/student'
            return NextResponse.redirect(url)
        }

        // 2b. Root Path Redirect
        if (isRootRoute) {
            const url = request.nextUrl.clone()
            url.pathname = role === 'teacher' ? '/teacher' : '/student'
            return NextResponse.redirect(url)
        }

        // 2c. Role-based protection
        if (role === 'student' && isTeacherRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/student'
            return NextResponse.redirect(url)
        }

        if (role === 'teacher' && isStudentRoute) {
            const url = request.nextUrl.clone()
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
