import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createRateLimiter, checkRateLimit } from '@/lib/rate-limiter';

const resetPasswordLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    label: 'reset-password',
});

export async function POST(request: NextRequest) {
    const rateLimitResponse = checkRateLimit(request, resetPasswordLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return errorResponse('Vui lòng cung cấp mã xác thực và mật khẩu mới', 400);
        }

        if (password.length < 6) {
            return errorResponse('Mật khẩu quá ngắn', 400);
        }

        const user = await prisma.user.findUnique({
            where: { resetPasswordToken: token },
        });

        if (!user) {
            return errorResponse('Mã xác thực không hợp lệ hoặc không tồn tại', 400);
        }

        if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
            return errorResponse('Mã xác thực đã hết hạn. Vui lòng gửi yêu cầu đặt lại mật khẩu mới.', 400);
        }

        // Hash new password
        const hashedPassword = await hashPassword(password);

        // Update password and clear token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                failedLoginAttempts: 0, // unlock account if it was locked due to attempts
                lockedUntil: null,
            },
        });

        return successResponse({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' });
    } catch (error) {
        console.error('[Reset Password] Error:', error);
        return errorResponse('Đã xảy ra lỗi hệ thống', 500);
    }
}
