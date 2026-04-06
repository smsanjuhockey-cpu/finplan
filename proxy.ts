/**
 * Next.js proxy — protects all dashboard routes.
 * Renamed from middleware.ts to proxy.ts (Next.js 16 convention).
 * Unauthenticated users are redirected to /login.
 */
import { auth } from '@/server/auth/config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  // Protected routes
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/budget') ||
    pathname.startsWith('/debt') ||
    pathname.startsWith('/forecast') ||
    pathname.startsWith('/goals') ||
    pathname.startsWith('/net-worth') ||
    pathname.startsWith('/life-events') ||
    pathname.startsWith('/ai-chat') ||
    pathname.startsWith('/accounts') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/admin')

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect suspended users away from all protected pages
  if (isProtected && isLoggedIn && (req.auth?.user as { suspendedAt?: unknown })?.suspendedAt) {
    if (!pathname.startsWith('/suspended')) {
      return NextResponse.redirect(new URL('/suspended', req.nextUrl.origin))
    }
  }

  const role = (req.auth?.user as { role?: string })?.role

  // Admin-only: redirect non-admins away from /admin/*
  if (pathname.startsWith('/admin') && isLoggedIn) {
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
    }
  }

  // Redirect admin users from /dashboard to /admin/overview
  if (pathname === '/dashboard' && isLoggedIn && role === 'admin') {
    return NextResponse.redirect(new URL('/admin/overview', req.nextUrl.origin))
  }

  // Redirect logged-in users away from auth pages
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password'

  if (isAuthPage && isLoggedIn) {
    const dest = role === 'admin' ? '/admin/overview' : '/dashboard'
    return NextResponse.redirect(new URL(dest, req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
}
