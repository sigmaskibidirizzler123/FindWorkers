// Shared in-memory OTP store
// In production, replace with Redis for multi-instance support

interface OTPEntry {
    otp: string;
    expiresAt: number;
    attempts: number;
}

// Use globalThis to persist across hot reloads in dev
const globalForOtp = globalThis as unknown as {
    otpStore: Map<string, OTPEntry> | undefined;
};

export const otpStore: Map<string, OTPEntry> =
    globalForOtp.otpStore ?? new Map();

if (process.env.NODE_ENV !== 'production') {
    globalForOtp.otpStore = otpStore;
}

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of otpStore.entries()) {
            if (value.expiresAt < now) {
                otpStore.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}
