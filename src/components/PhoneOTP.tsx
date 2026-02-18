'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp' | 'verified'>('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
    const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    // Initialize reCAPTCHA
    const setupRecaptcha = useCallback(() => {
        if (recaptchaRef.current) return;

        try {
            const firebaseAuth = getFirebaseAuth();
            recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => {
                    console.log('[reCAPTCHA] Verified');
                },
                'expired-callback': () => {
                    console.log('[reCAPTCHA] Expired');
                    recaptchaRef.current = null;
                },
            });
        } catch (err) {
            console.error('[reCAPTCHA] Setup error:', err);
        }
    }, []);

    // Format phone for Firebase (+84)
    const formatPhoneForFirebase = (p: string): string => {
        let cleaned = p.replace(/[\s\-().]/g, '');
        if (cleaned.startsWith('0')) cleaned = '+84' + cleaned.slice(1);
        else if (!cleaned.startsWith('+')) cleaned = '+84' + cleaned;
        return cleaned;
    };

    // Validate VN phone
    const isValidPhone = (p: string): boolean => {
        const cleaned = p.replace(/[\s\-().]/g, '');
        if (cleaned.startsWith('+84')) return /^\+84[35789]\d{8}$/.test(cleaned);
        if (cleaned.startsWith('0')) return /^0[35789]\d{8}$/.test(cleaned);
        return false;
    };

    // Send OTP
    const handleSendOTP = async () => {
        if (!isValidPhone(phone)) {
            setError('Số điện thoại không hợp lệ (VD: 0907697043)');
            return;
        }

        setLoading(true);
        setError('');

        try {
            setupRecaptcha();

            if (!recaptchaRef.current) {
                throw new Error('reCAPTCHA chưa sẵn sàng. Vui lòng tải lại trang.');
            }

            const firebasePhone = formatPhoneForFirebase(phone);
            const firebaseAuth = getFirebaseAuth();
            const result = await signInWithPhoneNumber(firebaseAuth, firebasePhone, recaptchaRef.current);
            setConfirmResult(result);
            setStep('otp');
            setCountdown(60); // 60 second cooldown before resend
            setError('');
        } catch (err: unknown) {
            console.error('[OTP] Send error:', err);
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/too-many-requests') {
                setError('Bạn đã gửi quá nhiều lần. Vui lòng đợi ít phút.');
            } else if (firebaseErr.code === 'auth/invalid-phone-number') {
                setError('Số điện thoại không hợp lệ.');
            } else if (firebaseErr.code === 'auth/quota-exceeded') {
                setError('Hết quota SMS. Vui lòng liên hệ admin.');
            } else {
                setError(firebaseErr.message || 'Không thể gửi OTP. Vui lòng thử lại.');
            }
            // Reset reCAPTCHA on error
            recaptchaRef.current = null;
        } finally {
            setLoading(false);
        }
    };

    // Verify OTP
    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            setError('Mã OTP phải có 6 chữ số');
            return;
        }

        if (!confirmResult) {
            setError('Phiên xác thực đã hết hạn. Vui lòng gửi lại OTP.');
            setStep('phone');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const credential = await confirmResult.confirm(otp);
            const idToken = await credential.user.getIdToken();
            const uid = credential.user.uid;

            // Verify with our backend
            const res = await fetch('/api/auth/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    firebaseIdToken: idToken,
                    phone: phone,
                    mode: mode,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Xác thực thất bại');
                return;
            }

            setStep('verified');
            onVerified({
                phone: phone.replace(/[\s\-().]/g, '').startsWith('+84')
                    ? '0' + phone.replace(/[\s\-().]/g, '').slice(3)
                    : phone.replace(/[\s\-().]/g, ''),
                firebaseIdToken: idToken,
                firebaseUid: uid,
            });
        } catch (err: unknown) {
            console.error('[OTP] Verify error:', err);
            const firebaseErr = err as { code?: string; message?: string };
            if (firebaseErr.code === 'auth/invalid-verification-code') {
                setError('Mã OTP không chính xác. Vui lòng kiểm tra lại.');
            } else if (firebaseErr.code === 'auth/code-expired') {
                setError('Mã OTP đã hết hạn. Vui lòng gửi lại.');
                setStep('phone');
            } else {
                setError(firebaseErr.message || 'Xác thực thất bại.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        recaptchaRef.current = null;
        setOtp('');
        setError('');
        await handleSendOTP();
    };

    return (
        <div className="phone-otp-container">
            {/* Invisible reCAPTCHA container */}
            <div id="recaptcha-container"></div>

            {step === 'phone' && (
                <div className="otp-step">
                    <label className="otp-label">
                        📱 Số điện thoại
                        <span className="otp-required">*</span>
                    </label>
                    <div className="otp-input-group">
                        <span className="otp-prefix">+84</span>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="0907697043"
                            className="otp-input"
                            disabled={disabled || loading}
                            maxLength={12}
                        />
                    </div>
                    <button
                        onClick={handleSendOTP}
                        disabled={disabled || loading || !phone}
                        className="otp-button otp-button-primary"
                    >
                        {loading ? (
                            <span className="otp-spinner">⏳</span>
                        ) : (
                            '📨 Gửi mã OTP'
                        )}
                    </button>
                    <p className="otp-hint">Bạn sẽ nhận SMS chứa mã xác thực 6 số</p>
                </div>
            )}

            {step === 'otp' && (
                <div className="otp-step">
                    <label className="otp-label">
                        🔐 Nhập mã OTP
                    </label>
                    <p className="otp-sent-to">
                        Đã gửi đến <strong>{phone}</strong>
                        <button
                            className="otp-change-phone"
                            onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                        >
                            Đổi số
                        </button>
                    </p>
                    <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="••••••"
                        className="otp-input otp-input-code"
                        maxLength={6}
                        autoFocus
                        disabled={loading}
                    />
                    <button
                        onClick={handleVerifyOTP}
                        disabled={loading || otp.length !== 6}
                        className="otp-button otp-button-primary"
                    >
                        {loading ? '⏳ Đang xác thực...' : '✅ Xác thực'}
                    </button>
                    <div className="otp-resend">
                        {countdown > 0 ? (
                            <span className="otp-countdown">Gửi lại sau {countdown}s</span>
                        ) : (
                            <button onClick={handleResend} className="otp-resend-btn" disabled={loading}>
                                🔄 Gửi lại mã OTP
                            </button>
                        )}
                    </div>
                </div>
            )}

            {step === 'verified' && (
                <div className="otp-step otp-verified">
                    <div className="otp-verified-icon">✅</div>
                    <p className="otp-verified-text">
                        Số <strong>{phone}</strong> đã được xác thực thành công
                    </p>
                </div>
            )}

            {error && (
                <div className="otp-error">
                    ⚠️ {error}
                </div>
            )}

            <style jsx>{`
                .phone-otp-container {
                    width: 100%;
                }
                .otp-step {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .otp-label {
                    font-size: 14px;
                    font-weight: 600;
                    color: #e2e8f0;
                }
                .otp-required {
                    color: #ef4444;
                    margin-left: 4px;
                }
                .otp-input-group {
                    display: flex;
                    align-items: center;
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 10px;
                    overflow: hidden;
                }
                .otp-prefix {
                    padding: 12px 14px;
                    color: #94a3b8;
                    font-weight: 600;
                    font-size: 14px;
                    background: rgba(255,255,255,0.05);
                    border-right: 1px solid rgba(255,255,255,0.1);
                }
                .otp-input {
                    flex: 1;
                    padding: 12px 14px;
                    background: transparent;
                    border: none;
                    color: #f1f5f9;
                    font-size: 16px;
                    outline: none;
                }
                .otp-input::placeholder {
                    color: #475569;
                }
                .otp-input-code {
                    background: rgba(30, 41, 59, 0.8);
                    border: 2px solid rgba(99, 102, 241, 0.5);
                    border-radius: 10px;
                    text-align: center;
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: 12px;
                    padding: 16px;
                    color: #f1f5f9;
                }
                .otp-input-code:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                }
                .otp-button {
                    padding: 14px;
                    border: none;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .otp-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .otp-button-primary {
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                }
                .otp-button-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }
                .otp-hint {
                    font-size: 12px;
                    color: #64748b;
                    text-align: center;
                }
                .otp-sent-to {
                    font-size: 13px;
                    color: #94a3b8;
                }
                .otp-change-phone {
                    background: none;
                    border: none;
                    color: #6366f1;
                    cursor: pointer;
                    font-size: 13px;
                    margin-left: 8px;
                    text-decoration: underline;
                }
                .otp-resend {
                    text-align: center;
                    margin-top: 4px;
                }
                .otp-countdown {
                    font-size: 13px;
                    color: #64748b;
                }
                .otp-resend-btn {
                    background: none;
                    border: none;
                    color: #6366f1;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                }
                .otp-resend-btn:hover {
                    text-decoration: underline;
                }
                .otp-verified {
                    align-items: center;
                    padding: 20px;
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 12px;
                }
                .otp-verified-icon {
                    font-size: 36px;
                }
                .otp-verified-text {
                    color: #86efac;
                    font-size: 14px;
                    text-align: center;
                }
                .otp-error {
                    margin-top: 8px;
                    padding: 10px 14px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 8px;
                    color: #fca5a5;
                    font-size: 13px;
                }
                .otp-spinner {
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
