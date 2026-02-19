import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { otpStore, checkIPRateLimit, checkResendLimit, OTP_CONFIG, maskPhone } from '@/lib/otp-store';
import { sendOTP, isSMSConfigured } from '@/lib/sms';
import { getClientIP } from '@/lib/rate-limiter';
import crypto from 'crypto';

function generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
}

function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-().]/g, '');
    if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('84') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);
    return cleaned;
}

function toInternational(phone: string): string {
    if (phone.startsWith('0')) return '+84' + phone.slice(1);
    if (phone.startsWith('+84')) return phone;
    return '+84' + phone;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, mode = 'register' } = body;

        // ── Validate ──
        if (!phone) {
            return NextResponse.json({ success: false, error: 'Vui lòng nhập số điện thoại' }, { status: 400 });
        }

        // Check SMS configured
        if (!isSMSConfigured()) {
            return NextResponse.json(
                { success: false, error: 'Hệ thống SMS chưa được cấu hình' },
                { status: 503 }
            );
        }

        const normalized = normalizePhone(phone);

        // Validate VN phone format
        if (!/^0[35789]\d{8}$/.test(normalized)) {
            return NextResponse.json({ success: false, error: 'Số điện thoại không hợp lệ' }, { status: 400 });
        }

        // ── IP Rate Limit (5 requests / hour) ──
        const ip = getClientIP(req);
        const ipCheck = checkIPRateLimit(ip);
        if (!ipCheck.allowed) {
            const retryMin = Math.ceil((ipCheck.retryAfterMs || 0) / 60000);
            return NextResponse.json(
                { success: false, error: `Quá nhiều yêu cầu. Thử lại sau ${retryMin} phút.` },
                { status: 429 }
            );
        }

        // ── Check existing OTP entry for resend limits ──
        const existing = otpStore.get(normalized);
        if (existing) {
            const resendCheck = checkResendLimit(existing);
            if (!resendCheck.allowed) {
                return NextResponse.json(
                    { success: false, error: resendCheck.reason || 'Gửi quá nhiều lần' },
                    { status: 429 }
                );
            }
        }

        // ── Check duplicate phone (register mode) ──
        if (mode === 'register') {
            const existingUser = await prisma.user.findFirst({
                where: { phone: normalized },
            });
            if (existingUser) {
                return NextResponse.json(
                    { success: false, error: 'Số điện thoại này đã được đăng ký' },
                    { status: 400 }
                );
            }
        }

        // ── Generate OTP ──
        const code = generateOTP();
        const now = Date.now();

        otpStore.set(normalized, {
            code,
            expiresAt: now + OTP_CONFIG.EXPIRES_IN_MS,
            attemptCount: 0,
            sendCount: (existing?.sendCount || 0) + 1,
            firstSendAt: existing?.firstSendAt || now,
            lastSendAt: now,
            phone: normalized,
        });

        // ── Send SMS ──
        const smsResult = await sendOTP(normalized, code);

        if (!smsResult.success) {
            console.error(`[send-otp] SMS failed:`, smsResult.error);
            return NextResponse.json(
                { success: false, error: 'Không thể gửi SMS. Vui lòng thử lại.' },
                { status: 500 }
            );
        }

        const isDev = process.env.NODE_ENV === 'development';
        const maskedPhone = maskPhone(normalized);

        console.log(`[send-otp] OTP sent to ${maskedPhone} via ${smsResult.provider}`);

        return NextResponse.json({
            success: true,
            message: `Đã gửi mã OTP đến ${maskedPhone}`,
            phone_masked: maskedPhone,
            phone_international: toInternational(normalized),
            expires_in: OTP_CONFIG.EXPIRES_IN_MS / 1000, // seconds
            resend_cooldown: OTP_CONFIG.RESEND_COOLDOWN_MS / 1000,
            provider: smsResult.provider,
            ...(isDev && smsResult.provider === 'console' ? { devOtp: code } : {}),
        });

    } catch (error) {
        console.error('[send-otp] Error:', error);
        return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
    }
}
