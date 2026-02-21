import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { otpStore, checkIPRateLimit, checkResendLimit, OTP_CONFIG, maskPhone } from '@/lib/otp-store';
import { sendOTP, isSMSConfigured } from '@/lib/sms';
import { getClientIP } from '@/lib/rate-limiter';
import { validatePhone, toInternational } from '@/lib/phone-validator';
import crypto from 'crypto';

function generateOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
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

        // ── Multi-layer phone validation (Level 1→3) ──
        const validation = validatePhone(phone);

        if (!validation.valid) {
            return NextResponse.json({
                success: false,
                error: validation.errors[0] || 'Số điện thoại không hợp lệ',
                validationLevel: validation.level,
                riskScore: validation.riskScore,
            }, { status: 400 });
        }

        const normalized = validation.phone.normalized;

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
        const maskedPhone = maskPhone(normalized);
        let smsFailed = false;

        if (!smsResult.success) {
            console.error(`[send-otp] SMS failed:`, smsResult.error);

            // Production: block if SMS fails (no fallback)
            if (process.env.NODE_ENV === 'production' && smsResult.provider !== 'console') {
                return NextResponse.json({
                    success: false,
                    error: 'Không thể gửi mã OTP. Vui lòng thử lại sau.',
                }, { status: 503 });
            }

            console.log(`[send-otp] DEV fallback: showing OTP on screen for ${maskedPhone}`);
            smsFailed = true;
        } else {
            console.log(`[send-otp] ✅ OTP sent to ${maskedPhone} via ${smsResult.provider}`);
        }

        // Only show devOtp in development mode
        const isDev = process.env.NODE_ENV !== 'production';
        const showDevOtp = isDev && (smsResult.provider === 'console' || smsFailed);

        return NextResponse.json({
            success: true,
            message: smsFailed
                ? `SMS không khả dụng. Mã OTP hiển thị bên dưới.`
                : `Đã gửi mã OTP đến ${maskedPhone}`,
            phone_masked: maskedPhone,
            phone_international: toInternational(normalized),
            expires_in: OTP_CONFIG.EXPIRES_IN_MS / 1000,
            resend_cooldown: OTP_CONFIG.RESEND_COOLDOWN_MS / 1000,
            provider: smsResult.provider || 'fallback',
            sms_sent: !smsFailed,
            // Carrier & validation info
            carrier: validation.carrier ? {
                name: validation.carrier.name,
                code: validation.carrier.code,
                icon: validation.carrier.icon,
            } : null,
            riskScore: validation.riskScore,
            validationLevel: validation.level,
            // DevOtp: ONLY in development mode, NEVER in production
            ...(showDevOtp ? { devOtp: code } : {}),
        });

    } catch (error) {
        console.error('[send-otp] Error:', error);
        return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
    }
}
