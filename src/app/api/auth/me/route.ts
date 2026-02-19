import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            console.log('[API /auth/me-v2] No token found in cookies');
            return errorResponse('Token missing', 401);
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'findworkers-secret';
        let payload: any;

        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (err: any) {
            console.error('[API /auth/me-v2] Token verification failed:', err.message);
            // DO NOT DELETE COOKIE HERE YET, JUST RETURN 401
            // cookieStore.delete('token'); 
            return errorResponse('Invalid token', 401);
        }

        if (!payload || !payload.userId) {
            console.error('[API /auth/me-v2] Invalid payload structure:', payload);
            return errorResponse('Invalid payload', 401);
        }

        // 1. Fetch User with Relations (Safely)
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                candidateProfile: {
                    select: { id: true, fullName: true }
                },
                employerProfile: {
                    select: { id: true, businessName: true, logoUrl: true }
                } as any
            },
        });

        if (!user) {
            console.error('[API /auth/me-v2] User not found in DB:', payload.userId);
            // Optionally clear cookie here if user is truly gone
            // cookieStore.delete('token');
            return errorResponse('User not found', 401);
        }

        console.log(`[API /auth/me-v2] User found: ${user.id} (isActive: ${user.isActive})`);

        // 2. Construct Response Object Explicitly (No destructuring magic)
        // 2. Construct Response Object Explicitly (No destructuring magic)
        const userAny = user as any;
        const userData = {
            id: user.id,
            email: user.email,
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatarUrl,
            phoneVerified: (user as any).phoneVerified,
            emailVerified: (user as any).emailVerified,
            firebaseUid: (user as any).firebaseUid,
            isActive: user.isActive,
            isVerified: user.isVerified,
            // Check relations safely
            hasProfile: user.role === 'CANDIDATE'
                ? !!userAny.candidateProfile
                : user.role === 'EMPLOYER'
                    ? !!userAny.employerProfile
                    : true, // ADMIN always has profile
            candidateProfile: userAny.candidateProfile || null,
            employerProfile: userAny.employerProfile || null,
        };

        return successResponse({ user: userData });
    } catch (error: any) {
        console.error('[API /auth/me-v2] Internal Error:', error);
        return errorResponse('Internal Error', 500);
    }
}
