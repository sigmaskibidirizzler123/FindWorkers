'use client';

import { useState, useEffect, useRef } from 'react';

interface PhoneOTPProps {
    onVerified: (data: { phone: string; firebaseIdToken: string; firebaseUid: string }) => void;
    initialPhone?: string;
    disabled?: boolean;
    mode?: 'register' | 'verify' | 'change-phone';
}

export default function PhoneOTP({ onVerified, initialPhone = '', disabled = false, mode = 'register' }: PhoneOTPProps) {
    const [phone, setPhone] = useState(initialPhone);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [step, setStep] = useState<'phone' | 'otp' | 'verified'>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [maskedPhone, setMaskedPhone] = useState('');
    const [sendsRemaining, setSendsRemaining] = useState(3);
    const [attemptsInfo, setAttemptsInfo] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // Validate VN phone
    const isValidPhone = (p: string): boolean => {
        const cleaned = p.replace(/[\s\-().]/g, '');
        if (cleaned.startsWith('+84')) return /^\+84[35789]\d{8}$/.test(cleaned);
        if (cleaned.startsWith('0')) return /^0[35789]\d{8}$/.test(cleaned);
        return false;
    };

    // Normalize phone
    const normalizePhone = (p: string): string => {
        let cleaned = p.replace(/[\s\-().]/g, '');
        if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3);
        return cleaned;
    };

    // Mask phone for display: 0907***043
    const maskPhoneDisplay = (p: string): string => {
        const n = normalizePhone(p);
        if (n.length < 7) return n;
        return n.slice(0, 4) + '***' + n.slice(-3);
    };

    // Handle OTP digit input
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        const fullCode = newOtp.join('');
        if (fullCode.length === 6 && !newOtp.includes('')) {
            handleVerifyOTP(fullCode);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length > 0) {
            const newOtp = [...otp];
            for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
            setOtp(newOtp);
            const lastIndex = Math.min(pasted.length, 5);
            inputRefs.current[lastIndex]?.focus();
            if (pasted.length === 6) handleVerifyOTP(pasted);
        }
    };

    // ── STEP 1: Send OTP ──
    const handleSendOTP = async () => {
        if (!isValidPhone(phone)) {
            setError('Số điện thoại không hợp lệ (VD: 0907697043)');
            return;
        }

        setLoading(true);
        setError('');
        setAttemptsInfo('');

        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    phone: normalizePhone(phone),
                    mode,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.error || 'Không thể gửi OTP');
                return;
            }

            setStep('otp');
            setCountdown(data.resend_cooldown || 60);
            setMaskedPhone(data.phone_masked || maskPhoneDisplay(phone));
            setOtp(['', '', '', '', '', '']);
            setError('');

            setTimeout(() => inputRefs.current[0]?.focus(), 150);
        } catch {
            setError('Lỗi kết nối server. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // ── STEP 2: Verify OTP ──
    const handleVerifyOTP = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        if (code.length !== 6) {
            setError('Mã OTP phải có 6 chữ số');
            return;
        }

        setLoading(true);
        setError('');
        setAttemptsInfo('');

        try {
            const normalizedPhone = normalizePhone(phone);
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    phone: normalizedPhone,
                    otp_code: code,
                    mode,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.error || 'Xác thực thất bại');
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                return;
            }

            // ── SUCCESS ──
            setStep('verified');

            // If register mode and user was created, redirect
            if (mode === 'register' && data.user && data.redirectPath) {
                onVerified({
                    phone: normalizedPhone,
                    firebaseIdToken: data.token || '',
                    firebaseUid: data.verificationId || data.user?.id || '',
                });
                // Auto redirect after showing success
                setTimeout(() => {
                    window.location.href = data.redirectPath;
                }, 1500);
            } else {
                onVerified({
                    phone: normalizedPhone,
                    firebaseIdToken: data.token || '',
                    firebaseUid: data.verificationId || '',
                });
            }
        } catch {
            setError('Lỗi kết nối server.');
        } finally {
            setLoading(false);
        }
    };

    // ── Resend OTP ──
    const handleResend = async () => {
        setLoading(true);
        setError('');
        setOtp(['', '', '', '', '', '']);

        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone: normalizePhone(phone) }),
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.error || 'Không thể gửi lại');
                return;
            }

            setCountdown(data.resend_cooldown || 60);
            setSendsRemaining(data.sends_remaining ?? sendsRemaining - 1);
            setAttemptsInfo('Đã gửi lại mã mới!');
            setTimeout(() => setAttemptsInfo(''), 3000);
            setTimeout(() => inputRefs.current[0]?.focus(), 150);
        } catch {
            setError('Lỗi kết nối.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="phone-otp-container">
            {/* ════════ STEP 1: Phone Input ════════ */}
            {step !== 'verified' && (
                <div className="otp-section">
                    <div className="otp-step-badge">
                        <span className="otp-step-number">{step === 'phone' ? '1' : '✓'}</span>
                        <span className="otp-step-text">
                            {step === 'phone' ? 'Bước 1: Nhập số điện thoại' : `SĐT: ${maskedPhone}`}
                        </span>
                    </div>

                    {step === 'phone' && (
                        <>
                            <label className="otp-label">📱 Số điện thoại <span className="otp-required">*</span></label>
                            <div className="otp-input-group">
                                <span className="otp-prefix">+84</span>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="0907697043"
                                    className="otp-phone-input"
                                    disabled={disabled || loading}
                                    maxLength={12}
                                    id="phone-input"
                                />
                            </div>
                            <button
                                onClick={handleSendOTP}
                                disabled={disabled || loading || !phone}
                                className="otp-send-btn"
                                id="send-otp-btn"
                            >
                                {loading ? '⏳ Đang gửi...' : '📨 Gửi mã OTP'}
                            </button>
                            <p className="otp-hint">Bạn sẽ nhận SMS chứa mã xác thực 6 số</p>
                        </>
                    )}
                </div>
            )}

            {/* ════════ STEP 2: OTP Input ════════ */}
            {step === 'otp' && (
                <div className="otp-section otp-verify-section">
                    <div className="otp-step-badge otp-step-active">
                        <span className="otp-step-number">2</span>
                        <span className="otp-step-text">Bước 2: Nhập mã xác thực</span>
                    </div>

                    <p className="otp-verify-subtitle">
                        Đã gửi SMS đến <strong>{maskedPhone}</strong>. Mã có hiệu lực 5 phút.
                    </p>

                    {/* 6-digit OTP boxes */}
                    <div className="otp-digits" onPaste={handlePaste}>
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                className={`otp-digit-box ${digit ? 'otp-digit-filled' : ''}`}
                                disabled={loading}
                                autoComplete="one-time-code"
                                id={`otp-digit-${i}`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => handleVerifyOTP()}
                        disabled={loading || otp.join('').length !== 6}
                        className="otp-verify-btn"
                        id="verify-otp-btn"
                    >
                        {loading ? '⏳ Đang xác thực...' : '✅ Xác thực'}
                    </button>

                    {/* Attempts info */}
                    {attemptsInfo && <p className="otp-info">{attemptsInfo}</p>}

                    <div className="otp-actions">
                        <button
                            onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); setAttemptsInfo(''); }}
                            className="otp-link-btn"
                            disabled={loading}
                        >
                            ← Đổi số điện thoại
                        </button>
                        {countdown > 0 ? (
                            <span className="otp-countdown">Gửi lại sau {countdown}s</span>
                        ) : sendsRemaining > 0 ? (
                            <button onClick={handleResend} className="otp-link-btn otp-resend-btn" disabled={loading}>
                                🔄 Gửi lại mã ({sendsRemaining} lần)
                            </button>
                        ) : (
                            <span className="otp-countdown">Đã hết số lần gửi</span>
                        )}
                    </div>
                </div>
            )}

            {/* ════════ VERIFIED ════════ */}
            {step === 'verified' && (
                <div className="otp-section otp-success">
                    <div className="otp-success-anim">
                        <div className="otp-success-circle">
                            <svg viewBox="0 0 52 52" className="otp-checkmark">
                                <circle cx="26" cy="26" r="25" fill="none" className="otp-checkmark-circle" />
                                <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" className="otp-checkmark-check" />
                            </svg>
                        </div>
                    </div>
                    <p className="otp-success-text">
                        Xác thực thành công!
                    </p>
                    <p className="otp-success-sub">
                        Số <strong>{maskedPhone || phone}</strong> đã được xác minh
                    </p>
                    {mode === 'register' && (
                        <p className="otp-redirect-text">Đang chuyển hướng...</p>
                    )}
                </div>
            )}

            {/* ════════ ERROR ════════ */}
            {error && (
                <div className="otp-error">
                    ⚠️ {error}
                </div>
            )}

            <style jsx>{`
                .phone-otp-container {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .otp-section {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                /* ── Step Badge ── */
                .otp-step-badge {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    background: rgba(99, 102, 241, 0.08);
                    border-radius: 8px;
                    border-left: 3px solid rgba(99, 102, 241, 0.4);
                }
                .otp-step-active {
                    border-left-color: #22c55e;
                    background: rgba(34, 197, 94, 0.08);
                }
                .otp-step-number {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    font-size: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .otp-step-active .otp-step-number {
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                }
                .otp-step-text {
                    color: #c7d2fe;
                    font-size: 13px;
                    font-weight: 600;
                }

                /* ── Labels ── */
                .otp-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: #e2e8f0;
                }
                .otp-required { color: #ef4444; margin-left: 4px; }

                /* ── Phone Input ── */
                .otp-input-group {
                    display: flex;
                    align-items: center;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 10px;
                    overflow: hidden;
                    transition: border-color 0.2s;
                }
                .otp-input-group:focus-within {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
                }
                .otp-prefix {
                    padding: 12px 14px;
                    color: #94a3b8;
                    font-weight: 600;
                    font-size: 14px;
                    background: rgba(255,255,255,0.05);
                    border-right: 1px solid rgba(255,255,255,0.1);
                }
                .otp-phone-input {
                    flex: 1;
                    padding: 12px 14px;
                    background: transparent;
                    border: none;
                    color: #f1f5f9;
                    font-size: 16px;
                    outline: none;
                }
                .otp-phone-input::placeholder { color: #475569; }
                .otp-phone-input:disabled { opacity: 0.6; }

                /* ── Buttons ── */
                .otp-send-btn {
                    padding: 13px;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    transition: all 0.2s;
                }
                .otp-send-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
                }
                .otp-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                .otp-hint {
                    font-size: 12px;
                    color: #64748b;
                    text-align: center;
                    margin: 0;
                }

                /* ── OTP Verify Section ── */
                .otp-verify-section {
                    padding: 16px;
                    background: rgba(34, 197, 94, 0.04);
                    border: 1px solid rgba(34, 197, 94, 0.15);
                    border-radius: 12px;
                    animation: slideDown 0.35s ease-out;
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .otp-verify-subtitle {
                    font-size: 13px;
                    color: #94a3b8;
                    margin: 0;
                    text-align: center;
                }

                /* ── 6-digit OTP Boxes ── */
                .otp-digits {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    margin: 8px 0;
                }
                .otp-digit-box {
                    width: 46px;
                    height: 54px;
                    text-align: center;
                    font-size: 22px;
                    font-weight: 700;
                    color: #f1f5f9;
                    background: rgba(15, 23, 42, 0.7);
                    border: 2px solid rgba(148, 163, 184, 0.2);
                    border-radius: 10px;
                    outline: none;
                    transition: all 0.15s;
                    caret-color: #22c55e;
                }
                .otp-digit-box:focus {
                    border-color: #22c55e;
                    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
                    background: rgba(15, 23, 42, 0.9);
                }
                .otp-digit-filled {
                    border-color: rgba(34, 197, 94, 0.5);
                    background: rgba(34, 197, 94, 0.06);
                }
                .otp-digit-box:disabled { opacity: 0.5; }

                .otp-verify-btn {
                    padding: 12px;
                    border: none;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                    transition: all 0.2s;
                }
                .otp-verify-btn:hover:not(:disabled) {
                    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
                    transform: translateY(-1px);
                }
                .otp-verify-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

                /* ── Actions ── */
                .otp-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 4px;
                }
                .otp-link-btn {
                    background: none;
                    border: none;
                    color: #818cf8;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    padding: 4px 0;
                    transition: color 0.15s;
                }
                .otp-link-btn:hover { color: #a5b4fc; text-decoration: underline; }
                .otp-link-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .otp-resend-btn { color: #34d399; }
                .otp-resend-btn:hover { color: #6ee7b7; }
                .otp-countdown {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                }

                /* ── Info / Success / Error ── */
                .otp-info {
                    font-size: 12px;
                    color: #34d399;
                    text-align: center;
                    margin: 0;
                    animation: slideDown 0.2s ease;
                }

                .otp-success {
                    align-items: center;
                    padding: 24px 20px;
                    background: rgba(34, 197, 94, 0.06);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    border-radius: 12px;
                    animation: slideDown 0.35s ease-out;
                }
                .otp-success-anim { margin-bottom: 4px; }
                .otp-success-circle {
                    width: 56px;
                    height: 56px;
                }
                .otp-checkmark {
                    width: 56px;
                    height: 56px;
                }
                .otp-checkmark-circle {
                    stroke: #22c55e;
                    stroke-width: 2;
                    stroke-dasharray: 166;
                    stroke-dashoffset: 166;
                    animation: checkStroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
                }
                .otp-checkmark-check {
                    stroke: #22c55e;
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    stroke-dasharray: 48;
                    stroke-dashoffset: 48;
                    animation: checkStroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.4s forwards;
                }
                @keyframes checkStroke {
                    100% { stroke-dashoffset: 0; }
                }

                .otp-success-text {
                    color: #86efac;
                    font-size: 16px;
                    font-weight: 700;
                    text-align: center;
                    margin: 4px 0 0;
                }
                .otp-success-sub {
                    color: #94a3b8;
                    font-size: 13px;
                    text-align: center;
                    margin: 4px 0 0;
                }
                .otp-redirect-text {
                    color: #6366f1;
                    font-size: 12px;
                    text-align: center;
                    margin: 8px 0 0;
                    animation: pulse 1.5s ease infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .otp-error {
                    padding: 10px 14px;
                    background: rgba(239, 68, 68, 0.08);
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    border-radius: 8px;
                    color: #fca5a5;
                    font-size: 13px;
                    animation: slideDown 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}
