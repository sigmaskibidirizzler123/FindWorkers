/**
 * SMS Provider Service
 * Hỗ trợ đa nhà cung cấp: Twilio, SpeedSMS, ESMS
 * Chọn provider qua biến môi trường SMS_PROVIDER
 */

// ============================================
// Types
// ============================================
interface SMSResult {
    success: boolean;
    messageId?: string;
    error?: string;
    provider: string;
}

interface SMSProvider {
    name: string;
    send(phone: string, message: string): Promise<SMSResult>;
}

// ============================================
// Format phone: 0xxx → +84xxx (cho các provider quốc tế)
// ============================================
function toInternational(phone: string): string {
    let cleaned = phone.replace(/[\s\-().]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '+84' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('+')) {
        cleaned = '+84' + cleaned;
    }
    return cleaned;
}

// ============================================
// 1. TWILIO Provider
// https://www.twilio.com
// Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
// ============================================
const twilioProvider: SMSProvider = {
    name: 'twilio',
    async send(phone: string, message: string): Promise<SMSResult> {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromPhone) {
            return { success: false, error: 'Twilio chưa được cấu hình', provider: 'twilio' };
        }

        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
            const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

            const body = new URLSearchParams({
                To: toInternational(phone),
                From: fromPhone,
                Body: message,
            });

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });

            const data = await res.json();

            if (res.ok) {
                console.log(`[Twilio] SMS sent to ${phone}, SID: ${data.sid}`);
                return { success: true, messageId: data.sid, provider: 'twilio' };
            } else {
                console.error(`[Twilio] Error:`, data);
                return { success: false, error: data.message || 'Twilio error', provider: 'twilio' };
            }
        } catch (err) {
            console.error('[Twilio] Exception:', err);
            return { success: false, error: 'Không thể kết nối Twilio', provider: 'twilio' };
        }
    },
};

// ============================================
// 2. SPEEDSMS Provider (Việt Nam)
// https://speedsms.vn
// Env: SPEEDSMS_TOKEN
// ============================================
const speedSMSProvider: SMSProvider = {
    name: 'speedsms',
    async send(phone: string, message: string): Promise<SMSResult> {
        const token = process.env.SPEEDSMS_TOKEN;

        if (!token) {
            return { success: false, error: 'SpeedSMS chưa được cấu hình', provider: 'speedsms' };
        }

        try {
            // SpeedSMS dùng số dạng 84xxx (không có dấu +)
            let smsPhone = phone.replace(/[\s\-().+]/g, '');
            if (smsPhone.startsWith('0')) {
                smsPhone = '84' + smsPhone.slice(1);
            }

            const res = await fetch('https://api.speedsms.vn/index.php/sms/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${token}:x`).toString('base64')}`,
                },
                body: JSON.stringify({
                    to: [smsPhone],
                    content: message,
                    type: 5, // Type 5 = OTP message (ưu tiên cao nhất)
                    sender: process.env.SPEEDSMS_SENDER || 'FindWorkers',
                }),
            });

            const data = await res.json();

            if (data.status === 'success') {
                console.log(`[SpeedSMS] SMS sent to ${phone}`);
                return { success: true, messageId: data.data?.[0]?.tranId, provider: 'speedsms' };
            } else {
                console.error(`[SpeedSMS] Error:`, data);
                return { success: false, error: data.message || 'SpeedSMS error', provider: 'speedsms' };
            }
        } catch (err) {
            console.error('[SpeedSMS] Exception:', err);
            return { success: false, error: 'Không thể kết nối SpeedSMS', provider: 'speedsms' };
        }
    },
};

// ============================================
// 3. ESMS Provider (Việt Nam)
// https://esms.vn
// Env: ESMS_API_KEY, ESMS_SECRET_KEY
// ============================================
const esmsProvider: SMSProvider = {
    name: 'esms',
    async send(phone: string, message: string): Promise<SMSResult> {
        const apiKey = process.env.ESMS_API_KEY;
        const secretKey = process.env.ESMS_SECRET_KEY;

        if (!apiKey || !secretKey) {
            return { success: false, error: 'ESMS chưa được cấu hình', provider: 'esms' };
        }

        try {
            // ESMS dùng số dạng 0xxx
            let smsPhone = phone.replace(/[\s\-().+]/g, '');
            if (smsPhone.startsWith('84')) {
                smsPhone = '0' + smsPhone.slice(2);
            }

            const res = await fetch('http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ApiKey: apiKey,
                    Content: message,
                    Phone: smsPhone,
                    SecretKey: secretKey,
                    SmsType: '8', // Type 8 = OTP
                    Brandname: process.env.ESMS_BRANDNAME || 'Verify',
                }),
            });

            const data = await res.json();

            if (data.CodeResult === '100') {
                console.log(`[ESMS] SMS sent to ${phone}, ID: ${data.SMSID}`);
                return { success: true, messageId: data.SMSID, provider: 'esms' };
            } else {
                console.error(`[ESMS] Error:`, data);
                return { success: false, error: data.ErrorMessage || 'ESMS error', provider: 'esms' };
            }
        } catch (err) {
            console.error('[ESMS] Exception:', err);
            return { success: false, error: 'Không thể kết nối ESMS', provider: 'esms' };
        }
    },
};

// ============================================
// 4. CONSOLE Provider (Development only)
// ============================================
const consoleProvider: SMSProvider = {
    name: 'console',
    async send(phone: string, message: string): Promise<SMSResult> {
        console.log(`\n========================================`);
        console.log(`📱 [DEV SMS] Gửi đến ${phone}:`);
        console.log(`📨 ${message}`);
        console.log(`========================================\n`);
        return { success: true, messageId: 'dev-' + Date.now(), provider: 'console' };
    },
};

// ============================================
// Provider Registry
// ============================================
const providers: Record<string, SMSProvider> = {
    twilio: twilioProvider,
    speedsms: speedSMSProvider,
    esms: esmsProvider,
    console: consoleProvider,
};

// ============================================
// Main Export
// ============================================
function getProvider(): SMSProvider {
    const providerName = (process.env.SMS_PROVIDER || 'console').toLowerCase();
    const provider = providers[providerName];

    if (!provider) {
        console.warn(`[SMS] Provider "${providerName}" không tồn tại, dùng console`);
        return consoleProvider;
    }

    return provider;
}

/**
 * Gửi mã OTP qua SMS
 */
export async function sendOTP(phone: string, otp: string): Promise<SMSResult> {
    const message = `[FindWorkers] Ma xac thuc OTP cua ban la: ${otp}. Ma co hieu luc trong 5 phut. Khong chia se ma nay voi bat ky ai.`;
    const provider = getProvider();

    console.log(`[SMS] Sending OTP via ${provider.name} to ${phone}`);
    return provider.send(phone, message);
}

/**
 * Kiểm tra SMS provider đã được cấu hình chưa
 */
export function isSMSConfigured(): boolean {
    const providerName = (process.env.SMS_PROVIDER || 'console').toLowerCase();
    if (providerName === 'console') return true; // Dev mode always works

    switch (providerName) {
        case 'twilio':
            return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
        case 'speedsms':
            return !!process.env.SPEEDSMS_TOKEN;
        case 'esms':
            return !!(process.env.ESMS_API_KEY && process.env.ESMS_SECRET_KEY);
        default:
            return false;
    }
}

export { type SMSResult, type SMSProvider };
