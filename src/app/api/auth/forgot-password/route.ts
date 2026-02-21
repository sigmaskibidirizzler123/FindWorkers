/**
 * Forgot Password API
 * POST /api/auth/forgot-password
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createRateLimiter, checkRateLimit } from '@/lib/rate-limiter';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Max 3 forgot password requests per hour per IP
const forgotPasswordLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    label: 'forgot-password',
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function POST(request: NextRequest) {
    const rateLimitResponse = checkRateLimit(request, forgotPasswordLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return errorResponse('Vui lòng nhập email', 400);
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });

        // Always return success even if email not found to prevent email enumeration
        if (!user) {
            return successResponse({ message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn khôi phục mật khẩu.' });
        }

        // Generate reset token (32 bytes hex)
        const resetTokenStr = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: resetTokenStr,
                resetPasswordExpires: expiresAt,
            },
        });

        // Send reset email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/auth/reset-password?token=${resetTokenStr}`;

        await transporter.sendMail({
            from: `"FindWorkers" <${process.env.SMTP_USER}>`,
            to: user.email!,
            subject: '🔒 Đặt lại mật khẩu — FindWorkers',
            html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 28px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">🔒 Đặt lại mật khẩu</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;">FindWorkers • Hệ thống tuyển dụng Phú Quốc</p>
                </div>
                <div style="padding: 28px;">
                    <p style="color: #334155; font-size: 15px; margin: 0 0 20px;">Xin chào,</p>
                    <p style="color: #334155; font-size: 15px; margin: 0 0 24px;">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản <strong>${user.email}</strong>. Vui lòng bấm vào nút bên dưới để tiến hành đặt mới:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${resetUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
                            🔄 Đặt lại mật khẩu
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0; text-align: center;">Link này chỉ có hiệu lực trong 1 giờ.</p>
                </div>
                <div style="background: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
                </div>
            </div>`,
        });

        return successResponse({ message: 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn khôi phục mật khẩu.' });
    } catch (error) {
        console.error('[Forgot Password] Error:', error);
        return errorResponse('Đã xảy ra lỗi hệ thống', 500);
    }
}
