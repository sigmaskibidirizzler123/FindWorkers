import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { otpStore } from '@/lib/otp-store';
import { sendOTP, isSMSConfigured } from '@/lib/sms';
import crypto from 'crypto';

function generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, mode } = body;

        if (!phone) {
            return NextResponse.json({ error: 'Vui lòng nhập số điện thoại' }, { status: 400 });
        }

        // Check SMS provider
        if (!isSMSConfigured()) {
            return NextResponse.json(
                { error: 'Hệ thống SMS chưa được cấu hình. Vui lòng liên hệ admin.' },
                { status: 503 }
            );
        }

        // Normalize phone
        let normalizedPhone = phone.replace(/[\s\-().]/g, '');
        if (normalizedPhone.startsWith('+84')) {
            normalizedPhone = '0' + normalizedPhone.slice(3);
        }

        // Validate VN phone
        if (!/^0[35789]\d{8}$/.test(normalizedPhone)) {
            return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
        }

        // Rate limiting: max 5 attempts per phone in 5 minutes
        const existing = otpStore.get(normalizedPhone);
        if (existing && existing.attempts >= 5 && existing.expiresAt > Date.now()) {
            return NextResponse.json(
                { error: 'Bạn đã gửi quá nhiều lần. Vui lòng đợi 5 phút.' },
                { status: 429 }
            );
        }

        // Check duplicate phone on register
        if (mode === 'register') {
            const existingUser = await prisma.user.findFirst({
                where: { phone: normalizedPhone },
            });
            if (existingUser) {
                return NextResponse.json(
                    { error: 'Số điện thoại này đã được đăng ký' },
                    { status: 400 }
                );
            }
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

        // Store OTP
        otpStore.set(normalizedPhone, {
            otp,
            expiresAt,
            attempts: (existing?.attempts || 0) + 1,
        });

        // Send SMS via configured provider
        const smsResult = await sendOTP(normalizedPhone, otp);

        if (!smsResult.success) {
            console.error(`[send-otp] SMS failed:`, smsResult.error);
            return NextResponse.json(
                { error: 'Không thể gửi SMS. Vui lòng thử lại sau.' },
                { status: 500 }
            );
        }

        const isDev = process.env.NODE_ENV === 'development';

        return NextResponse.json({
            success: true,
            message: 'Đã gửi mã OTP qua SMS',
            provider: smsResult.provider,
            ...(isDev && smsResult.provider === 'console' ? { devOtp: otp } : {}),
        });

    } catch (error) {
        console.error('[send-otp] Error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
