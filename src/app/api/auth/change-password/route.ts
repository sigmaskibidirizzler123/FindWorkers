/**
 * Change Password API (for logged-in users)
 * POST /api/auth/change-password
 * 
 * Body: { currentPassword, newPassword }
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, hashPassword, comparePassword } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createRateLimiter, checkRateLimit } from '@/lib/rate-limiter';

const changePasswordLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    label: 'change-password',
});

export async function POST(request: NextRequest) {
    const rateLimitResponse = checkRateLimit(request, changePasswordLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        // Auth check
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload) return errorResponse('Token không hợp lệ', 401);

        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword) {
            return errorResponse('Vui lòng nhập mật khẩu hiện tại', 400);
        }
        if (!newPassword) {
            return errorResponse('Vui lòng nhập mật khẩu mới', 400);
        }
        if (newPassword.length < 6) {
            return errorResponse('Mật khẩu mới phải có ít nhất 6 ký tự', 400);
        }
        if (currentPassword === newPassword) {
            return errorResponse('Mật khẩu mới phải khác mật khẩu hiện tại', 400);
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) return errorResponse('Không tìm thấy tài khoản', 404);

        // Verify current password
        const isValid = await comparePassword(currentPassword, user.password);
        if (!isValid) {
            return errorResponse('Mật khẩu hiện tại không chính xác', 401);
        }

        // Hash and update
        const hashedNewPassword = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedNewPassword },
        });

        return successResponse({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('[Change Password] Error:', error);
        return errorResponse('Đã xảy ra lỗi hệ thống', 500);
    }
}
