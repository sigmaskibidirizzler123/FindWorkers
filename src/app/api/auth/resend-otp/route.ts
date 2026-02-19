import { NextRequest, NextResponse } from 'next/server';
import { otpStore, checkIPRateLimit, checkResendLimit, OTP_CONFIG, maskPhone } from '@/lib/otp-store';
import { sendOTP } from '@/lib/sms';
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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone } = body;

        if (!phone) {
            return NextResponse.json({ success: false, error: 'Thiếu số điện thoại' }, { status: 400 });
        }

        const normalized = normalizePhone(phone);

        // ── IP Rate Limit ──
        const ip = getClientIP(req);
        const ipCheck = checkIPRateLimit(ip);
        if (!ipCheck.allowed) {
            return NextResponse.json(
                { success: false, error: 'Quá nhiều yêu cầu. Thử lại sau.' },
                { status: 429 }
            );
        }

        // ── Check existing entry ──
        const existing = otpStore.get(normalized);
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'Chưa có yêu cầu OTP nào. Vui lòng gửi OTP trước.' },
                { status: 400 }
            );
        }

        // ── Check resend limits ──
        const resendCheck = checkResendLimit(existing);
        if (!resendCheck.allowed) {
            return NextResponse.json(
                { success: false, error: resendCheck.reason || 'Chưa thể gửi lại' },
                { status: 429 }
            );
        }

        // ── Generate new OTP ──
        const now = Date.now();
        const newCode = generateOTP();

        existing.code = newCode;
        existing.expiresAt = now + OTP_CONFIG.EXPIRES_IN_MS;
        existing.attemptCount = 0; // Reset attempts
        existing.sendCount++;
        existing.lastSendAt = now;
        delete existing.blockedUntil; // Remove block

        // ── Send SMS ──
        const smsResult = await sendOTP(normalized, newCode);

        if (!smsResult.success) {
            return NextResponse.json(
                { success: false, error: 'Không thể gửi SMS. Thử lại sau.' },
                { status: 500 }
            );
        }

        const isDev = process.env.NODE_ENV === 'development';
        const maskedPhone = maskPhone(normalized);

        console.log(`[resend-otp] Resent OTP to ${maskedPhone} (send #${existing.sendCount})`);

        return NextResponse.json({
            success: true,
            message: `Đã gửi lại mã OTP đến ${maskedPhone}`,
            expires_in: OTP_CONFIG.EXPIRES_IN_MS / 1000,
            resend_cooldown: OTP_CONFIG.RESEND_COOLDOWN_MS / 1000,
            sends_remaining: Math.max(0, OTP_CONFIG.MAX_RESEND_COUNT - existing.sendCount),
            ...(isDev && smsResult.provider === 'console' ? { devOtp: newCode } : {}),
        });

    } catch (error) {
        console.error('[resend-otp] Error:', error);
        return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
    }
}
