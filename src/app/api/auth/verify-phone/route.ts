/**
 * Phone Verification API
 * 
 * POST /api/auth/verify-phone
 * 
 * Flow:
 * 1. Frontend uses Firebase Phone Auth to send OTP
 * 2. User enters OTP → Firebase verifies → returns ID token
 * 3. Frontend sends Firebase ID token to this endpoint
 * 4. Backend verifies token with Firebase Admin SDK
 * 5. Backend marks user's phone as verified
 * 
 * Used during:
 * - Registration (verify phone before creating account)
 * - Phone change (verify new phone)
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { verifyFirebaseToken } from '@/lib/firebase-admin';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkRateLimit } from '@/lib/rate-limiter';
import { isBlacklisted } from '@/lib/blacklist';
import { getClientIP, createRateLimiter } from '@/lib/rate-limiter';

// Strict rate limit for phone verification: 5 per hour
const phoneVerifyLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    label: 'phone-verify',
});

export async function POST(request: NextRequest) {
    // Rate limit
    const rateLimitResponse = checkRateLimit(request, phoneVerifyLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const body = await request.json();
        const { firebaseIdToken, phone, mode } = body;
        // mode: 'register' | 'verify' | 'change-phone'

        if (!firebaseIdToken) {
            return errorResponse('Thiếu Firebase token', 400);
        }

        if (!phone) {
            return errorResponse('Thiếu số điện thoại', 400);
        }

        // Normalize phone
        let normalizedPhone = phone.replace(/[\s\-().]/g, '');
        if (normalizedPhone.startsWith('+84')) normalizedPhone = '0' + normalizedPhone.slice(3);
        if (normalizedPhone.startsWith('84') && normalizedPhone.length === 11) normalizedPhone = '0' + normalizedPhone.slice(2);

        // Check blacklist
        if (await isBlacklisted('phone', normalizedPhone)) {
            return errorResponse('Số điện thoại này đã bị chặn. Liên hệ admin.', 403);
        }

        const ip = getClientIP(request);
        if (await isBlacklisted('ip', ip)) {
            return errorResponse('IP của bạn đã bị chặn. Liên hệ admin.', 403);
        }

        // Verify Firebase ID token
        const decoded = await verifyFirebaseToken(firebaseIdToken);
        if (!decoded) {
            return errorResponse('Xác thực thất bại. Vui lòng thử lại.', 401);
        }

        // Verify the phone in the token matches the claimed phone
        const tokenPhone = decoded.phone_number;
        if (!tokenPhone) {
            return errorResponse('Token không chứa số điện thoại', 400);
        }

        // Normalize Firebase phone (comes as +84xxxxxxxxx)
        let firebasePhone = tokenPhone;
        if (firebasePhone.startsWith('+84')) firebasePhone = '0' + firebasePhone.slice(3);

        if (firebasePhone !== normalizedPhone) {
            return errorResponse('Số điện thoại không khớp với OTP đã xác thực', 400);
        }

        // ── MODE: Register ──
        // Just return verification success — the registration endpoint will use this
        if (mode === 'register') {
            // Check if phone already exists
            const existing = await prisma.user.findUnique({
                where: { phone: normalizedPhone },
            });
            if (existing) {
                return errorResponse('Số điện thoại đã được đăng ký', 409);
            }

            return successResponse({
                verified: true,
                phone: normalizedPhone,
                firebaseUid: decoded.uid,
                message: 'Số điện thoại đã được xác thực thành công',
            });
        }

        // ── MODE: Verify (existing user) ──
        if (mode === 'verify') {
            const token = request.cookies.get('token')?.value;
            if (!token) return errorResponse('Chưa đăng nhập', 401);

            const payload = verifyToken(token);
            if (!payload) return errorResponse('Token không hợp lệ', 401);

            // Update user's phone verification status
            await prisma.user.update({
                where: { id: payload.userId },
                data: {
                    phoneVerified: true,
                    firebaseUid: decoded.uid,
                },
            });

            return successResponse({
                verified: true,
                message: 'Số điện thoại đã được xác thực',
            });
        }

        // ── MODE: Change Phone ──
        if (mode === 'change-phone') {
            const token = request.cookies.get('token')?.value;
            if (!token) return errorResponse('Chưa đăng nhập', 401);

            const payload = verifyToken(token);
            if (!payload) return errorResponse('Token không hợp lệ', 401);

            // Check new phone isn't already used
            const existingPhone = await prisma.user.findUnique({
                where: { phone: normalizedPhone },
            });
            if (existingPhone && existingPhone.id !== payload.userId) {
                return errorResponse('Số điện thoại mới đã được sử dụng bởi tài khoản khác', 409);
            }

            // Get current user
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
            });
            if (!user) return errorResponse('Không tìm thấy tài khoản', 404);

            const oldPhone = user.phone || '';

            // Log phone change
            await prisma.phoneChangeLog.create({
                data: {
                    userId: payload.userId,
                    oldPhone,
                    newPhone: normalizedPhone,
                    ipAddress: ip,
                    deviceInfo: request.headers.get('user-agent') || undefined,
                    reason: 'user_request',
                },
            });

            // Update phone
            await prisma.user.update({
                where: { id: payload.userId },
                data: {
                    phone: normalizedPhone,
                    phoneVerified: true,
                    firebaseUid: decoded.uid,
                },
            });

            // Also update phone in CandidateProfile if exists
            await prisma.candidateProfile.updateMany({
                where: { userId: payload.userId },
                data: { phone: normalizedPhone },
            }).catch(() => { });

            // TODO: Send email notification about phone change

            return successResponse({
                verified: true,
                oldPhone,
                newPhone: normalizedPhone,
                message: 'Đổi số điện thoại thành công',
            });
        }

        return errorResponse('Mode không hợp lệ', 400);
    } catch (error) {
        console.error('[Verify Phone] Error:', error);
        return errorResponse('Đã xảy ra lỗi khi xác thực số điện thoại', 500);
    }
}
