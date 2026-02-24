'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import PhoneOTP from '@/components/PhoneOTP';
import {
    Phone, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
    User, Building2, Briefcase, AlertCircle, CheckCircle2,
    ShieldCheck, MapPin
} from 'lucide-react';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setUser } = useAuthStore();
    const defaultRole = searchParams.get('role') || 'CANDIDATE';

    const [activeTab, setActiveTab] = useState<'CANDIDATE' | 'EMPLOYER'>(
        defaultRole === 'EMPLOYER' ? 'EMPLOYER' : 'CANDIDATE'
    );

    // Candidate fields
    const [candidateData, setCandidateData] = useState({
        phone: '',
        password: '',
        confirmPassword: '',
        email: '', // optional
    });

    // Employer fields
    const [employerData, setEmployerData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        phone: '', // optional
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [phoneVerified, setPhoneVerified] = useState(false);
    const [verifiedPhone, setVerifiedPhone] = useState('');
    const [firebaseUid, setFirebaseUid] = useState('');
    const [firebaseIdToken, setFirebaseIdToken] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const isCandidate = activeTab === 'CANDIDATE';
        const data = isCandidate ? candidateData : employerData;

        // Validate confirm password
        if (data.password !== data.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        // Role-specific validation
        if (isCandidate) {
            if (!candidateData.phone) {
                setError('Vui lòng nhập số điện thoại');
                return;
            }
            if (candidateData.password.length < 6) {
                setError('Mật khẩu phải có ít nhất 6 ký tự');
                return;
            }
        } else {
            if (!employerData.email) {
                setError('Email là bắt buộc cho doanh nghiệp');
                return;
            }
            if (employerData.password.length < 8) {
                setError('Mật khẩu doanh nghiệp phải có ít nhất 8 ký tự');
                return;
            }
        }

        setLoading(true);

        try {
            const body = isCandidate
                ? {
                    role: 'CANDIDATE',
                    phone: verifiedPhone || candidateData.phone,
                    password: candidateData.password,
                    email: candidateData.email || undefined,
                    firebaseUid: firebaseUid || undefined,
                    firebaseIdToken: firebaseIdToken || undefined,
                }
                : {
                    role: 'EMPLOYER',
                    email: employerData.email,
                    password: employerData.password,
                    phone: employerData.phone || undefined,
                };

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // ⭐ Required for browser to save HttpOnly cookie
                body: JSON.stringify(body),
            });

            const result = await res.json();

            if (!result.success) {
                setError(result.error);
                return;
            }

            setUser(result.data.user);

            // Hard redirect ensures cookie is sent with new page request
            window.location.href = result.data.redirectPath || '/jobs';
        } catch {
            setError('Đã xảy ra lỗi, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md animate-slide-up">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 glow-blue">
                        <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {activeTab === 'CANDIDATE' ? 'Tìm việc ngay!' : 'Bắt đầu tuyển dụng'}
                    </h1>
                    <p className="text-slate-400">
                        {activeTab === 'CANDIDATE'
                            ? 'Đăng ký miễn phí, tìm việc trong 30 giây'
                            : 'Tạo tài khoản để đăng tin tuyển dụng'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="glass-card p-8">
                    {/* Role Selector */}
                    <div className="grid grid-cols-2 gap-3 mb-6" id="register-role-tabs">
                        <button
                            type="button"
                            onClick={() => { setActiveTab('CANDIDATE'); setError(''); }}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'CANDIDATE'
                                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                }`}
                            id="register-tab-candidate"
                        >
                            <User className="w-6 h-6" />
                            <span className="text-sm font-semibold">Tôi tìm việc</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('EMPLOYER'); setError(''); }}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'EMPLOYER'
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-lg shadow-purple-500/10'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                }`}
                            id="register-tab-employer"
                        >
                            <Building2 className="w-6 h-6" />
                            <span className="text-sm font-semibold">Doanh nghiệp</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ═══ CANDIDATE FORM ═══ */}
                        {activeTab === 'CANDIDATE' && (
                            <>
                                {/* Step 1: Phone OTP Verification */}
                                {!phoneVerified ? (
                                    <div>
                                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
                                            <div className="flex items-center gap-2 text-sm text-blue-300 mb-1">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span className="font-semibold">Bước 1: Xác thực số điện thoại</span>
                                            </div>
                                            <p className="text-xs text-slate-400">Xác thực OTP để bảo vệ tài khoản của bạn</p>
                                        </div>
                                        <PhoneOTP
                                            mode="register"
                                            onVerified={(data) => {
                                                setPhoneVerified(true);
                                                setVerifiedPhone(data.phone);
                                                setFirebaseUid(data.firebaseUid);
                                                setFirebaseIdToken(data.firebaseIdToken);
                                                setCandidateData(prev => ({ ...prev, phone: data.phone }));
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* Verified phone badge */}
                                        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            <div>
                                                <p className="text-sm text-green-300 font-semibold">Đã xác thực: {verifiedPhone}</p>
                                                <p className="text-xs text-slate-400">Số điện thoại đã được xác minh qua OTP</p>
                                            </div>
                                        </div>

                                        {/* Step 3: Password */}
                                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <div className="flex items-center gap-2 text-sm text-blue-300 mb-1">
                                                <Lock className="w-4 h-4" />
                                                <span className="font-semibold">Bước 3: Tạo mật khẩu</span>
                                            </div>
                                            <p className="text-xs text-slate-400">Mật khẩu dùng để đăng nhập lần sau</p>
                                        </div>

                                        {/* Password */}
                                        <div>
                                            <label htmlFor="reg-c-password" className="input-label">
                                                Mật khẩu <span className="text-xs text-slate-500">(tối thiểu 6 ký tự)</span>
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                <input
                                                    id="reg-c-password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={candidateData.password}
                                                    onChange={(e) => setCandidateData({ ...candidateData, password: e.target.value })}
                                                    placeholder="••••••"
                                                    className="input-field pl-11 pr-11"
                                                    required
                                                    minLength={6}
                                                    autoFocus
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Confirm Password */}
                                        <div>
                                            <label htmlFor="reg-c-confirm" className="input-label">Xác nhận mật khẩu</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                <input
                                                    id="reg-c-confirm"
                                                    type="password"
                                                    value={candidateData.confirmPassword}
                                                    onChange={(e) => setCandidateData({ ...candidateData, confirmPassword: e.target.value })}
                                                    placeholder="Nhập lại mật khẩu"
                                                    className="input-field pl-11"
                                                    required
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                        </div>

                                        {/* Email (optional) */}
                                        <div>
                                            <label htmlFor="reg-c-email" className="input-label">
                                                Email <span className="text-xs text-slate-500">(không bắt buộc)</span>
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                <input
                                                    id="reg-c-email"
                                                    type="email"
                                                    value={candidateData.email}
                                                    onChange={(e) => setCandidateData({ ...candidateData, email: e.target.value })}
                                                    placeholder="your@email.com (tuỳ chọn)"
                                                    className="input-field pl-11"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Benefits */}
                                <div className="pt-2 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        <span>Miễn phí hoàn toàn</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <MapPin className="w-4 h-4 text-blue-500" />
                                        <span>Hàng trăm việc làm tại Phú Quốc</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <ShieldCheck className="w-4 h-4 text-purple-500" />
                                        <span>Xác thực OTP — bảo vệ tài khoản</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ═══ EMPLOYER — CONCIERGE MODE ═══ */}
                        {activeTab === 'EMPLOYER' && (
                            <div className="space-y-5">
                                {/* Info Card */}
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <ShieldCheck className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-sm mb-1">Tài khoản được cấp bởi Admin</h3>
                                            <p className="text-slate-400 text-xs leading-relaxed">
                                                Để đảm bảo chất lượng việc làm tại Phú Quốc, tài khoản Doanh nghiệp được cấp trực tiếp bởi Ban quản trị FindWorkers.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 ml-13">
                                        <div className="flex items-center gap-2 text-xs text-slate-300">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span>Đăng tin tuyển dụng <strong className="text-white">miễn phí 100%</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-300">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span>Admin hỗ trợ tạo tin, <strong className="text-white">không cần thao tác gì</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-300">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span>Tiếp cận <strong className="text-white">hàng trăm ứng viên</strong> tại Phú Quốc</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-300">
                                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <span>Duyệt hồ sơ ứng viên <strong className="text-white">ngay trên Gmail</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* CTA — Contact Admin */}
                                <div className="text-center space-y-3">
                                    <p className="text-sm text-slate-400">Liên hệ ngay để được kích hoạt tài khoản:</p>

                                    <a
                                        href="https://zalo.me/0907697043"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base transition-all bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/25"
                                    >
                                        💬 Chat Zalo với Admin
                                    </a>

                                    <a
                                        href="tel:0907697043"
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                                    >
                                        📞 Gọi trực tiếp: 0907 697 043
                                    </a>

                                    <p className="text-xs text-slate-500 pt-1">
                                        Nhật Minh — Admin FindWorkers Phú Quốc
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Submit Button — only for CANDIDATE */}
                        {activeTab === 'CANDIDATE' && phoneVerified && (
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center gap-2 transition-all mt-2 btn-primary"
                                id="register-submit"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Đăng ký tìm việc
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            Đã có tài khoản?{' '}
                            <Link
                                href={`/auth/login?role=${activeTab}`}
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Đăng nhập
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}>
            <RegisterForm />
        </Suspense>
    );
}
