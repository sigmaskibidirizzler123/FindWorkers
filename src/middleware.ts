import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================
// PROTECTED ROUTES — Require valid token to access
// ============================================================
const PROTECTED_ROUTES = [
    '/candidate/profile',
    '/candidate/applications',
    '/candidate/saved',
    '/employer/dashboard',
    '/employer/profile',
    '/employer/jobs',
    '/admin',
];

interface TokenPayload {
    userId: string;
    email: string;
    role: string;
    exp?: number;
}

/**
 * Decode JWT payload WITHOUT signature verification.
 * 
 * WHY: Middleware runs in Edge Runtime where crypto behavior varies.
 * Signature verification happens in API routes (Node.js runtime) via lib/auth.ts.
 * Middleware only needs to read the role for routing decisions.
 */
function decodeTokenPayload(token: string): TokenPayload | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payloadB64 = parts[1];

        // Base64url → Base64
        let base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) base64 += '=';

        // Decode
        const payloadJSON = atob(base64);
        const payload = JSON.parse(payloadJSON);

        // Check expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return null;
        }

        return payload as TokenPayload;
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;

    // ── AUTH PAGES: Redirect away if already logged in ──
    if (pathname.startsWith('/auth/')) {
        if (!token) return NextResponse.next();

        const payload = decodeTokenPayload(token);
        if (!payload) return NextResponse.next(); // bad token — let page handle

        // Already logged in → redirect to appropriate dashboard
        const redirectTo = request.nextUrl.searchParams.get('redirect');
        if (redirectTo && redirectTo.startsWith('/')) {
            return NextResponse.redirect(new URL(redirectTo, request.url));
        }

        switch (payload.role) {
            case 'ADMIN':
                return NextResponse.redirect(new URL('/admin', request.url));
            case 'EMPLOYER':
                return NextResponse.redirect(new URL('/employer/dashboard', request.url));
            default:
                return NextResponse.redirect(new URL('/jobs', request.url));
        }
    }

    // ── PROTECTED ROUTES: Require token ──
    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    if (isProtected && !token) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // ── ROLE-BASED ACCESS CONTROL ──
    if (token) {
        const payload = decodeTokenPayload(token);

        if (!payload) {
            // Token expired/malformed on protected route → send to login
            if (isProtected) {
                const loginUrl = new URL('/auth/login', request.url);
                loginUrl.searchParams.set('redirect', pathname);
                return NextResponse.redirect(loginUrl);
            }
            return NextResponse.next();
        }

        const { role } = payload;

        // Candidate can't access employer routes
        if (role === 'CANDIDATE' && pathname.startsWith('/employer/')) {
            return NextResponse.redirect(new URL('/jobs', request.url));
        }

        // Employer can't access candidate routes
        if (role === 'EMPLOYER' && pathname.startsWith('/candidate/')) {
            return NextResponse.redirect(new URL('/employer/dashboard', request.url));
        }

        // Non-admin can't access admin routes
        if (role !== 'ADMIN' && pathname.startsWith('/admin')) {
            const redirectUrl = role === 'EMPLOYER' ? '/employer/dashboard' : '/jobs';
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
    }

    return NextResponse.next();
}

// ============================================================
// MATCHER — ONLY run middleware on PAGE routes, NEVER on API
// ============================================================
// CRITICAL: Do NOT add /api/* here. Middleware must NEVER
// intercept API routes because:
// 1. API routes have their own auth via verifyToken()
// 2. Adding /api/* causes deadlock if middleware fetches APIs
// 3. API responses would become HTML redirects instead of JSON
// ============================================================
export const config = {
    matcher: [
        '/candidate/:path*',
        '/employer/:path*',
        '/admin/:path*',
        '/auth/:path*',
    ],
};
