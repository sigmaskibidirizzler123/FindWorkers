import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { otpStore, OTP_CONFIG } from '@/lib/otp-store';
import { generateToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
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
        const { phone, otp_code, otp, mode = 'register', role = 'CANDIDATE', password } = body;
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

        // ── OTP CORRECT ──
        const verificationId = crypto.randomUUID();

        // Mark as verified (keep in store temporarily for registration)
        stored.verified = true;
        stored.verificationId = verificationId;

        console.log(`[verify-otp] Phone ${normalized} verified successfully`);

        // ── Mode: Register → Create user + JWT + auto login ──
        if (mode === 'register') {
            // Check existing user
            const existingUser = await prisma.user.findFirst({
                where: { phone: normalized }
            });

            if (existingUser) {
                otpStore.delete(normalized);
                return NextResponse.json(
                    { success: false, error: 'Số điện thoại này đã được đăng ký' },
                    { status: 400 }
                );
            }

            // Create user with verified phone
            const userRole = (role === 'EMPLOYER') ? 'EMPLOYER' : 'CANDIDATE';
            const hashedPw = password ? await hashPassword(password) : await hashPassword(crypto.randomUUID());

            const user = await prisma.user.create({
                data: {
                    phone: normalized,
                    password: hashedPw,
                    role: userRole,
                    phoneVerified: true,
                    firebaseUid: verificationId, // Reuse field for verification tracking
                },
            });

            // Generate JWT
            const token = generateToken({
                userId: user.id,
                email: user.email || '',
                role: user.role,
            });

            // Clean up OTP
            otpStore.delete(normalized);

            console.log(`[verify-otp] User created: ${user.id} (${userRole})`);

            // Return response with Set-Cookie
            const response = NextResponse.json({
                success: true,
                message: 'Xác thực thành công',
                verificationId,
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    role: user.role,
                    hasProfile: false,
                },
                redirectPath: userRole === 'EMPLOYER' ? '/employer/dashboard' : '/jobs',
            });

            // Set HttpOnly cookie
            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
            });

            return response;
        }

        // ── Mode: Verify (just confirm phone, don't create user) ──
        otpStore.delete(normalized);

        return NextResponse.json({
            success: true,
            message: 'Xác thực thành công',
            verificationId,
            token: verificationId,
        });

    } catch (error) {
        console.error('[verify-otp] Error:', error);
        return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
    }
}
