import { NextRequest, NextResponse } from 'next/server';
import { otpStore } from '@/lib/otp-store';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, otp } = body;

        if (!phone || !otp) {
            return NextResponse.json(
                { error: 'Vui lòng nhập số điện thoại và mã OTP' },
                { status: 400 }
            );
        }

        // Normalize phone
        let normalizedPhone = phone.replace(/[\s\-().]/g, '');
        if (normalizedPhone.startsWith('+84')) {
            normalizedPhone = '0' + normalizedPhone.slice(3);
        }

        // Get stored OTP
        const storedData = otpStore.get(normalizedPhone);

        if (!storedData) {
            return NextResponse.json(
                { error: 'Mã OTP đã hết hạn hoặc chưa được gửi. Vui lòng gửi lại.' },
                { status: 400 }
            );
        }

        // Check expiration
        if (storedData.expiresAt < Date.now()) {
            otpStore.delete(normalizedPhone);
            return NextResponse.json(
                { error: 'Mã OTP đã hết hạn. Vui lòng gửi lại.' },
                { status: 400 }
            );
        }

        // Verify OTP
        if (storedData.otp !== otp) {
            return NextResponse.json(
                { error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại.' },
                { status: 400 }
            );
        }

        // OTP verified! Clean up
        otpStore.delete(normalizedPhone);

        // Generate a verification ID (replaces firebaseUid)
        const verificationId = crypto.randomUUID();

        return NextResponse.json({
            success: true,
            message: 'Xác thực thành công',
            verificationId,
            token: verificationId,
        });

    } catch (error) {
        console.error('[verify-otp] Error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
