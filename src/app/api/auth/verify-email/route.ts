/**
 * Email Verification API
 * 
 * POST /api/auth/verify-email — Send verification email
 * GET  /api/auth/verify-email?token=xxx — Confirm verification
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { createRateLimiter, checkRateLimit } from '@/lib/rate-limiter';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// 3 emails per hour max
const emailVerifyLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 3,
    label: 'email-verify',
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

/**
 * POST — Send verification email
 */
export async function POST(request: NextRequest) {
    const rateLimitResponse = checkRateLimit(request, emailVerifyLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload) return errorResponse('Token không hợp lệ', 401);

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) return errorResponse('Không tìm thấy tài khoản', 404);
        if (!user.email) return errorResponse('Tài khoản chưa có email', 400);
        if (user.emailVerified) return errorResponse('Email đã được xác thực rồi', 400);

        // Generate verification token (32 bytes hex)
        const verifyTokenStr = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifyToken: verifyTokenStr,
                emailVerifyExpires: expiresAt,
            },
        });

        // Send verification email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://find-workers-p7ka.vercel.app';
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${verifyTokenStr}`;

        await transporter.sendMail({
            from: `"FindWorkers" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: '✅ Xác thực email — FindWorkers',
            html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 28px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">📧 Xác thực Email</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px;">FindWorkers • Hệ thống tuyển dụng Phú Quốc</p>
                </div>
                <div style="padding: 28px;">
                    <p style="color: #334155; font-size: 15px; margin: 0 0 20px;">Xin chào,</p>
                    <p style="color: #334155; font-size: 15px; margin: 0 0 24px;">Bấm nút bên dưới để xác thực email <strong>${user.email}</strong>:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${verifyUrl}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
                            ✅ Xác thực email
                        </a>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px; margin: 20px 0 0; text-align: center;">Link có hiệu lực 24 giờ</p>
                </div>
                <div style="background: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 11px; margin: 0;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
                </div>
            </div>`,
        });

        return successResponse({ message: 'Email xác thực đã được gửi. Vui lòng kiểm tra hộp thư.' });
    } catch (error) {
        console.error('[Email Verify] Send error:', error);
        return errorResponse('Không thể gửi email xác thực', 500);
    }
}

/**
 * GET — Confirm email verification via link
 */
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const verifyTokenStr = searchParams.get('token');

    if (!verifyTokenStr) {
        return renderResult('❌ Lỗi', 'Link không hợp lệ.', 'error');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { emailVerifyToken: verifyTokenStr },
        });

        if (!user) {
            return renderResult('❌ Token không hợp lệ', 'Link xác thực không tồn tại hoặc đã hết hạn.', 'error');
        }

        // Check expiry
        if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
            return renderResult('⏰ Đã hết hạn', 'Link xác thực đã hết hạn. Vui lòng gửi lại email xác thực.', 'error');
        }

        if (user.emailVerified) {
            return renderResult('✅ Đã xác thực', 'Email của bạn đã được xác thực trước đó.', 'info');
        }

        // Mark email as verified
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyToken: null,
                emailVerifyExpires: null,
                isVerified: user.phoneVerified, // isVerified = true only when BOTH verified
            },
        });

        const redirectUrl = user.role === 'EMPLOYER' ? '/employer/dashboard' : '/jobs';
        return renderResult(
            '✅ Xác thực thành công!',
            `Email <strong>${user.email}</strong> đã được xác thực thành công.<br/><br/>
            <a href="${redirectUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border-radius:10px;text-decoration:none;font-weight:600;">
                🏠 Về trang chủ
            </a>`,
            'success'
        );
    } catch (error) {
        console.error('[Email Verify] Confirm error:', error);
        return renderResult('❌ Lỗi hệ thống', 'Đã xảy ra lỗi. Vui lòng thử lại.', 'error');
    }
}

function renderResult(title: string, message: string, type: 'success' | 'error' | 'info') {
    const gradients = {
        success: 'linear-gradient(135deg, #22c55e, #16a34a)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)',
        info: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    };

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - FindWorkers</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: rgba(30,41,59,0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; max-width: 480px; width: 100%; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .header { background: ${gradients[type]}; padding: 28px; text-align: center; }
        .header h1 { color: white; font-size: 22px; font-weight: 700; }
        .body { padding: 28px; color: #cbd5e1; font-size: 15px; line-height: 1.7; }
        .footer { padding: 14px 28px; background: rgba(15,23,42,0.5); text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
        a { color: #818cf8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header"><h1>${title}</h1></div>
        <div class="body">${message}</div>
        <div class="footer">FindWorkers • Hệ thống tuyển dụng Phú Quốc</div>
    </div>
</body>
</html>`;

    return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
