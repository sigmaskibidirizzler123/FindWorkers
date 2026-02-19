// Shared in-memory OTP store
// In production, replace with Redis for multi-instance support

export interface OTPEntry {
    code: string;
    expiresAt: number;
    attemptCount: number;      // Số lần nhập sai
    sendCount: number;         // Số lần gửi OTP
    firstSendAt: number;       // Thời điểm gửi lần đầu (dùng cho rate limit resend)
    lastSendAt: number;        // Thời điểm gửi gần nhất
    blockedUntil?: number;     // Block xác thực đến thời điểm này
    phone: string;             // Lưu SĐT chuẩn hóa
    verified?: boolean;        // Đã xác thực thành công?
    verificationId?: string;   // ID xác thực (uuid)
}

// Rate limit tracking per IP
export interface IPRateEntry {
    count: number;
    firstRequestAt: number;
}

// Use globalThis to persist across hot reloads in dev
const globalForOtp = globalThis as unknown as {
    otpStore: Map<string, OTPEntry> | undefined;
    ipRateStore: Map<string, IPRateEntry> | undefined;
};

export const otpStore: Map<string, OTPEntry> =
    globalForOtp.otpStore ?? new Map();

export const ipRateStore: Map<string, IPRateEntry> =
    globalForOtp.ipRateStore ?? new Map();

if (process.env.NODE_ENV !== 'production') {
    globalForOtp.otpStore = otpStore;
    globalForOtp.ipRateStore = ipRateStore;
}

// ── Constants ──
export const OTP_CONFIG = {
    CODE_LENGTH: 6,
    EXPIRES_IN_MS: 5 * 60 * 1000,         // 5 phút
    MAX_VERIFY_ATTEMPTS: 5,                 // Tối đa 5 lần nhập sai
    BLOCK_DURATION_MS: 15 * 60 * 1000,     // Block 15 phút khi nhập sai quá nhiều
    MAX_RESEND_COUNT: 3,                    // Tối đa 3 lần resend
    RESEND_WINDOW_MS: 10 * 60 * 1000,      // Trong 10 phút
    RESEND_COOLDOWN_MS: 60 * 1000,         // Phải đợi 60s giữa mỗi lần gửi
    IP_MAX_REQUESTS: 5,                     // Tối đa 5 request / IP
    IP_WINDOW_MS: 60 * 60 * 1000,          // Trong 1 giờ
};

// ── Helper: Check IP rate limit ──
export function checkIPRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const record = ipRateStore.get(ip);

    if (!record) {
        ipRateStore.set(ip, { count: 1, firstRequestAt: now });
        return { allowed: true };
    }

    // Reset window if expired
    if (now - record.firstRequestAt > OTP_CONFIG.IP_WINDOW_MS) {
        ipRateStore.set(ip, { count: 1, firstRequestAt: now });
        return { allowed: true };
    }

    if (record.count >= OTP_CONFIG.IP_MAX_REQUESTS) {
        const retryAfterMs = OTP_CONFIG.IP_WINDOW_MS - (now - record.firstRequestAt);
        return { allowed: false, retryAfterMs };
    }

    record.count++;
    return { allowed: true };
}

// ── Helper: Check phone resend limit ──
export function checkResendLimit(entry: OTPEntry): { allowed: boolean; retryAfterMs?: number; reason?: string } {
    const now = Date.now();

    // Cooldown between sends (60s)
    const timeSinceLastSend = now - entry.lastSendAt;
    if (timeSinceLastSend < OTP_CONFIG.RESEND_COOLDOWN_MS) {
        return {
            allowed: false,
            retryAfterMs: OTP_CONFIG.RESEND_COOLDOWN_MS - timeSinceLastSend,
            reason: `Vui lòng đợi ${Math.ceil((OTP_CONFIG.RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000)} giây`,
        };
    }

    // Max resend in window (3 in 10 min)
    const timeInWindow = now - entry.firstSendAt;
    if (entry.sendCount >= OTP_CONFIG.MAX_RESEND_COUNT && timeInWindow < OTP_CONFIG.RESEND_WINDOW_MS) {
        const retryAfterMs = OTP_CONFIG.RESEND_WINDOW_MS - timeInWindow;
        return {
            allowed: false,
            retryAfterMs,
            reason: `Đã gửi tối đa ${OTP_CONFIG.MAX_RESEND_COUNT} lần. Đợi ${Math.ceil(retryAfterMs / 60000)} phút`,
        };
    }

    // Reset if window expired
    if (timeInWindow >= OTP_CONFIG.RESEND_WINDOW_MS) {
        entry.sendCount = 0;
        entry.firstSendAt = now;
    }

    return { allowed: true };
}

// ── Helper: Mask phone for display ──
export function maskPhone(phone: string): string {
    if (phone.length < 7) return phone;
    return phone.slice(0, 4) + '***' + phone.slice(-3);
}

// ── Cleanup expired entries periodically ──
if (typeof setInterval !== 'undefined') {
    const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, value] of otpStore.entries()) {
            // Remove entries expired for more than 30 minutes
            if (value.expiresAt < now - 30 * 60 * 1000) {
                otpStore.delete(key);
            }
        }
        for (const [key, value] of ipRateStore.entries()) {
            if (now - value.firstRequestAt > OTP_CONFIG.IP_WINDOW_MS) {
                ipRateStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);

    if (cleanup.unref) cleanup.unref();
}
