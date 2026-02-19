import { NextRequest, NextResponse } from 'next/server';
import { otpStore, OTP_CONFIG } from '@/lib/otp-store';
import crypto from 'crypto';

function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-().]/g, '');
    if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('84') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);
    return cleaned;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, otp_code, otp, mode = 'register' } = body;
        const code = otp_code || otp; // Support both field names

        // ── Validate ──
        if (!phone || !code) {
            return NextResponse.json(
                { success: false, error: 'Thiếu số điện thoại hoặc mã OTP' },
                { status: 400 }
            );
        }

        const normalized = normalizePhone(phone);

        // ── Get stored OTP ──
        const stored = otpStore.get(normalized);

        if (!stored) {
            return NextResponse.json(
                { success: false, error: 'Mã OTP đã hết hạn hoặc chưa được gửi' },
                { status: 400 }
            );
        }

        // ── Check block ──
        const now = Date.now();
        if (stored.blockedUntil && now < stored.blockedUntil) {
            const remainMin = Math.ceil((stored.blockedUntil - now) / 60000);
            return NextResponse.json(
                { success: false, error: `Bạn đã nhập sai quá nhiều lần. Thử lại sau ${remainMin} phút.` },
                { status: 429 }
            );
        }

        // ── Check expired ──
        if (stored.expiresAt < now) {
            otpStore.delete(normalized);
            return NextResponse.json(
                { success: false, error: 'Mã OTP đã hết hạn. Vui lòng gửi lại.' },
                { status: 400 }
            );
        }

        // ── Check max attempts ──
        if (stored.attemptCount >= OTP_CONFIG.MAX_VERIFY_ATTEMPTS) {
            stored.blockedUntil = now + OTP_CONFIG.BLOCK_DURATION_MS;
            return NextResponse.json(
                { success: false, error: 'Nhập sai quá 5 lần. Bị khóa 15 phút.' },
                { status: 429 }
            );
        }

        // ── Compare OTP ──
        if (stored.code !== code.toString().trim()) {
            stored.attemptCount++;
            const remaining = OTP_CONFIG.MAX_VERIFY_ATTEMPTS - stored.attemptCount;

            if (stored.attemptCount >= OTP_CONFIG.MAX_VERIFY_ATTEMPTS) {
                stored.blockedUntil = now + OTP_CONFIG.BLOCK_DURATION_MS;
                return NextResponse.json(
                    { success: false, error: 'Nhập sai quá 5 lần. Bị khóa 15 phút.' },
                    { status: 429 }
                );
            }

            return NextResponse.json(
                { success: false, error: `Mã OTP không đúng. Còn ${remaining} lần thử.` },
                { status: 400 }
            );
        }

        // ══════════════════════════════════
        // ── OTP CORRECT → Chỉ xác thực phone, KHÔNG tạo user
        // ── User sẽ được tạo ở bước 3 (đặt mật khẩu)
        // ══════════════════════════════════
        const verificationId = crypto.randomUUID();

        // Mark as verified (giữ trong store để bước register kiểm tra)
        stored.verified = true;
        stored.verificationId = verificationId;
        // Extend expiry thêm 10 phút cho bước tạo mật khẩu
        stored.expiresAt = now + 10 * 60 * 1000;

        console.log(`[verify-otp] Phone ${normalized} verified (mode: ${mode}), verificationId: ${verificationId}`);

        return NextResponse.json({
            success: true,
            message: 'Xác thực số điện thoại thành công!',
            verificationId,
            phone: normalized,
        });

    } catch (error) {
        console.error('[verify-otp] Error:', error);
        return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
    }
}
