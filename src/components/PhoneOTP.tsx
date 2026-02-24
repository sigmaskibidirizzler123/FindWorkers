'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getFirebaseAuth, isFirebaseConfigured, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase';
import { ConfirmationResult } from 'firebase/auth';

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
    const [devOtp, setDevOtp] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<InstanceType<typeof RecaptchaVerifier> | null>(null);
    const useFirebase = isFirebaseConfigured;

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // ── Vietnamese carrier prefixes database ──
    const CARRIERS: Record<string, { name: string; color: string; icon: string }> = {
        // Viettel
        '032': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '033': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '034': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '035': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '036': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '037': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '038': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '039': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '086': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '096': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '097': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        '098': { name: 'Viettel', color: '#e3342f', icon: '🔴' },
        // Mobifone
        '070': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        '076': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        '077': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        '078': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        '079': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        '089': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        '090': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        '093': { name: 'Mobifone', color: '#3490dc', icon: '🔵' },
        // Vinaphone
        '081': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        '082': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        '083': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        '084': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        '085': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        '088': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        '091': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        '094': { name: 'Vinaphone', color: '#38c172', icon: '🟢' },
        // Vietnamobile
        '052': { name: 'Vietnamobile', color: '#f6993f', icon: '🟠' },
        '056': { name: 'Vietnamobile', color: '#f6993f', icon: '🟠' },
        '058': { name: 'Vietnamobile', color: '#f6993f', icon: '🟠' },
        '092': { name: 'Vietnamobile', color: '#f6993f', icon: '🟠' },
        // Gmobile
        '059': { name: 'Gmobile', color: '#9561e2', icon: '🟣' },
        '099': { name: 'Gmobile', color: '#9561e2', icon: '🟣' },
    };

    // Detect carrier from phone number
    const detectCarrier = (p: string): { name: string; color: string; icon: string } | null => {
        const n = normalizePhone(p);
        if (n.length < 4) return null;
        const prefix3 = n.slice(0, 3);
        return CARRIERS[prefix3] || null;
    };

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

    // Get carrier info for current phone
    const carrier = detectCarrier(phone);
    const phoneNormalized = normalizePhone(phone);
    const phoneComplete = phoneNormalized.length === 10;
    const phoneHasValidPrefix = phoneNormalized.length >= 3 && carrier !== null;
    const phoneInvalidPrefix = phoneNormalized.length >= 3 && carrier === null && /^0\d{2}/.test(phoneNormalized);

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

    // ── Initialize reCAPTCHA for Firebase ──
    const setupRecaptcha = useCallback(() => {
        if (!useFirebase) return;
        try {
            const auth = getFirebaseAuth();
            if (!recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    size: 'invisible',
                    callback: () => {
                        console.log('[Firebase] reCAPTCHA solved');
                    },
                });
            }
        } catch (err) {
            console.error('[Firebase] reCAPTCHA setup error:', err);
        }
    }, [useFirebase]);

    useEffect(() => {
        setupRecaptcha();
    }, [setupRecaptcha]);

    // ── STEP 1: Send OTP ──
    const handleSendOTP = async () => {
        if (!isValidPhone(phone)) {
            setError('Số điện thoại không hợp lệ (VD: 0907697043)');
            return;
        }

        setLoading(true);
        setError('');
        setAttemptsInfo('');
        setDevOtp('');

        const normalizedPhone = normalizePhone(phone);
        const internationalPhone = '+84' + normalizedPhone.slice(1);

        // ── Firebase Phone Auth (SMS thật) ──
        if (useFirebase) {
            try {
                setupRecaptcha();
                const auth = getFirebaseAuth();
                const appVerifier = recaptchaVerifierRef.current;
                if (!appVerifier) {
                    setError('Không thể khởi tạo reCAPTCHA. Vui lòng tải lại trang.');
                    setLoading(false);
                    return;
                }

                console.log(`[Firebase] Sending OTP to ${internationalPhone}`);
                const result = await signInWithPhoneNumber(auth, internationalPhone, appVerifier);
                setConfirmationResult(result);

                setStep('otp');
                setCountdown(60);
                setMaskedPhone(maskPhoneDisplay(phone));
                setOtp(['', '', '', '', '', '']);
                setError('');
                setSendsRemaining(prev => prev - 1);

                console.log(`[Firebase] ✅ OTP sent successfully to ${maskPhoneDisplay(phone)}`);
                setTimeout(() => inputRefs.current[0]?.focus(), 150);
            } catch (err: unknown) {
                console.error('[Firebase] Send OTP error:', err);
                const firebaseError = err as { code?: string; message?: string };

                // Reset reCAPTCHA on error
                if (recaptchaVerifierRef.current) {
                    try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
                    recaptchaVerifierRef.current = null;
                }

                if (firebaseError.code === 'auth/too-many-requests') {
                    setError('Quá nhiều yêu cầu. Vui lòng chờ vài phút rồi thử lại.');
                } else if (firebaseError.code === 'auth/invalid-phone-number') {
                    setError('Số điện thoại không hợp lệ.');
                } else if (firebaseError.code === 'auth/quota-exceeded') {
                    setError('Đã vượt quá giới hạn SMS. Vui lòng thử lại sau.');
                } else {
                    setError(firebaseError.message || 'Không thể gửi OTP. Vui lòng thử lại.');
                }
            } finally {
                setLoading(false);
            }
            return;
        }

        // ── Fallback: Custom API OTP (khi Firebase không khả dụng) ──
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone: normalizedPhone, mode }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Không thể gửi OTP'); return; }

            setStep('otp');
            setCountdown(data.resend_cooldown || 60);
            setMaskedPhone(data.phone_masked || maskPhoneDisplay(phone));
            setOtp(['', '', '', '', '', '']);
            setError('');
            if (data.devOtp) setDevOtp(data.devOtp);
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

        const normalizedPhone = normalizePhone(phone);

        // ── Firebase verify ──
        if (useFirebase && confirmationResult) {
            try {
                const credential = await confirmationResult.confirm(code);
                const user = credential.user;
                const idToken = await user.getIdToken();

                console.log(`[Firebase] ✅ OTP verified! UID: ${user.uid}`);

                setStep('verified');
                onVerified({
                    phone: normalizedPhone,
                    firebaseIdToken: idToken,
                    firebaseUid: user.uid,
                });
            } catch (err: unknown) {
                console.error('[Firebase] Verify error:', err);
                const firebaseError = err as { code?: string };

                if (firebaseError.code === 'auth/invalid-verification-code') {
                    setError('Mã OTP không đúng. Vui lòng kiểm tra lại.');
                } else if (firebaseError.code === 'auth/code-expired') {
                    setError('Mã OTP đã hết hạn. Vui lòng gửi lại.');
                } else {
                    setError('Xác thực thất bại. Vui lòng thử lại.');
                }
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } finally {
                setLoading(false);
            }
            return;
        }

        // ── Fallback: Custom API verify ──
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone: normalizedPhone, otp_code: code, mode }),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || 'Xác thực thất bại');
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                return;
            }
            setStep('verified');
            onVerified({
                phone: normalizedPhone,
                firebaseIdToken: '',
                firebaseUid: data.verificationId || '',
            });
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
        setDevOtp('');

        // Firebase: gửi lại bằng cách gọi signInWithPhoneNumber lại
        if (useFirebase) {
            try {
                // Reset reCAPTCHA
                if (recaptchaVerifierRef.current) {
                    try { recaptchaVerifierRef.current.clear(); } catch { /* ignore */ }
                    recaptchaVerifierRef.current = null;
                }
                setupRecaptcha();

                const auth = getFirebaseAuth();
                const appVerifier = recaptchaVerifierRef.current;
                if (!appVerifier) {
                    setError('Không thể gửi lại. Vui lòng tải lại trang.');
                    setLoading(false);
                    return;
                }

                const normalizedPhone = normalizePhone(phone);
                const internationalPhone = '+84' + normalizedPhone.slice(1);
                const result = await signInWithPhoneNumber(auth, internationalPhone, appVerifier);
                setConfirmationResult(result);

                setCountdown(60);
                setSendsRemaining(prev => prev - 1);
                setAttemptsInfo('Đã gửi lại mã mới!');
                setTimeout(() => setAttemptsInfo(''), 3000);
                setTimeout(() => inputRefs.current[0]?.focus(), 150);
            } catch (err: unknown) {
                console.error('[Firebase] Resend error:', err);
                const firebaseError = err as { code?: string; message?: string };
                if (firebaseError.code === 'auth/too-many-requests') {
                    setError('Quá nhiều yêu cầu. Vui lòng chờ vài phút.');
                } else {
                    setError(firebaseError.message || 'Không thể gửi lại.');
                }
            } finally {
                setLoading(false);
            }
            return;
        }

        // Fallback: custom API
        try {
            const res = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ phone: normalizePhone(phone) }),
            });
            const data = await res.json();
            if (!data.success) { setError(data.error || 'Không thể gửi lại'); return; }
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
            {/* reCAPTCHA container (invisible) */}
            <div id="recaptcha-container"></div>
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
                                    className={`otp-phone-input ${phoneInvalidPrefix ? 'otp-phone-invalid' : ''} ${phoneHasValidPrefix && phoneComplete ? 'otp-phone-valid' : ''}`}
                                    disabled={disabled || loading}
                                    maxLength={12}
                                    id="phone-input"
                                    autoComplete="off"
                                />
                            </div>

                            {/* ── Carrier detection info ── */}
                            {phoneNormalized.length >= 3 && (
                                <div className={`otp-carrier-info ${carrier ? 'otp-carrier-valid' : 'otp-carrier-invalid'}`}>
                                    {carrier ? (
                                        <>
                                            <span className="otp-carrier-icon">{carrier.icon}</span>
                                            <span className="otp-carrier-name">Nhà mạng: <strong style={{ color: carrier.color }}>{carrier.name}</strong></span>
                                            {phoneComplete && <span className="otp-carrier-check">✅</span>}
                                        </>
                                    ) : (
                                        <>
                                            <span className="otp-carrier-icon">⚠️</span>
                                            <span className="otp-carrier-warn">Đầu số <strong>{phoneNormalized.slice(0, 3)}</strong> không nhận diện được nhà mạng. Vẫn có thể gửi OTP.</span>
                                        </>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleSendOTP}
                                disabled={disabled || loading || !phone}
                                className="otp-send-btn"
                                id="send-otp-btn"
                            >
                                {loading ? '⏳ Đang gửi...' : '📨 Gửi mã OTP'}
                            </button>
                            <p className="otp-hint">{useFirebase ? '🔥 SMS gửi qua Firebase (miễn phí)' : 'Bạn sẽ nhận SMS chứa mã xác thực 6 số'}</p>
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

                    {/* Show OTP on screen when SMS unavailable */}
                    {devOtp && (
                        <div className="otp-dev-code">
                            <p className="otp-dev-label">📋 Mã OTP của bạn:</p>
                            <p className="otp-dev-value">{devOtp}</p>
                            <p className="otp-dev-note">Nhập mã trên vào ô bên dưới để xác thực</p>
                        </div>
                    )}

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

                /* Dev OTP Display */
                .otp-dev-code {
                    text-align: center;
                    padding: 14px;
                    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(99, 102, 241, 0.12));
                    border: 2px dashed rgba(99, 102, 241, 0.4);
                    border-radius: 10px;
                    animation: slideDown 0.3s ease-out;
                }
                .otp-dev-label {
                    font-size: 12px;
                    color: #94a3b8;
                    margin: 0 0 4px;
                }
                .otp-dev-value {
                    font-size: 32px;
                    font-weight: 800;
                    letter-spacing: 8px;
                    color: #a5b4fc;
                    margin: 0;
                    font-family: monospace;
                }
                .otp-dev-note {
                    font-size: 11px;
                    color: #64748b;
                    margin: 6px 0 0;
                }

                /* Carrier Detection */
                .otp-carrier-info {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    animation: slideDown 0.2s ease-out;
                }
                .otp-carrier-valid {
                    background: rgba(34, 197, 94, 0.08);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                .otp-carrier-invalid {
                    background: rgba(245, 158, 11, 0.08);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }
                .otp-carrier-icon { font-size: 14px; }
                .otp-carrier-name { color: #cbd5e1; }
                .otp-carrier-warn { color: #fbbf24; font-size: 11px; }
                .otp-carrier-check { margin-left: auto; }

                /* Phone input validation states */
                .otp-phone-valid {
                    border-color: rgba(34, 197, 94, 0.4) !important;
                    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.15) !important;
                }
                .otp-phone-invalid {
                    border-color: rgba(245, 158, 11, 0.4) !important;
                    box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.15) !important;
                }
            `}</style>
        </div>
    );
}
