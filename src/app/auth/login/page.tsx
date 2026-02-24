'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
    Phone, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2,
    User, Building2, Briefcase, AlertCircle, ShieldCheck
} from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setUser } = useAuthStore();
    const defaultRole = searchParams.get('role') || 'CANDIDATE';

    const [activeTab, setActiveTab] = useState<'CANDIDATE' | 'EMPLOYER'>(
        defaultRole === 'EMPLOYER' ? 'EMPLOYER' : 'CANDIDATE'
    );
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-redirect removed to prevent state/cookie mismatch loop
    // Client state should not drive routing on login page, only on successful action
    /*
    useEffect(() => {
        const checkAuth = async () => {
             // ...
        }
    }, [...]);
    */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const isCandidate = activeTab === 'CANDIDATE';
            const isPhoneInput = /^\+?\d/.test(email); // Check if employer typed a phone number
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...(isCandidate
                        ? { phone }
                        : isPhoneInput
                            ? { phone: email } // Employer entered a phone number
                            : { email }        // Employer entered an email
                    ),
                    password,
                    role: activeTab,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.error);
                return;
            }

            setUser(data.data.user);

            // Use window.location for hard redirect (ensures cookie is sent with new request)
            const redirectTo = searchParams.get('redirect');
            const redirectPath = redirectTo || data.data.redirectPath || '/jobs';
            console.log('Login success, redirecting to:', redirectPath);
            window.location.href = redirectPath;
        } catch (err) {
            console.error('Login error:', err);
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
                    <h1 className="text-3xl font-bold text-white mb-2">Chào mừng trở lại!</h1>
                    <p className="text-slate-400">Đăng nhập để tiếp tục</p>
                </div>

                {/* Form Card */}
                <div className="glass-card p-8">
                    {/* Role Tabs */}
                    <div className="grid grid-cols-2 gap-3 mb-6" id="login-role-tabs">
                        <button
                            type="button"
                            onClick={() => { setActiveTab('CANDIDATE'); setError(''); }}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'CANDIDATE'
                                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                }`}
                            id="login-tab-candidate"
                        >
                            <User className="w-6 h-6" />
                            <span className="text-sm font-semibold">Tôi tìm việc</span>
                            <span className="text-xs opacity-70">Đăng nhập bằng SĐT</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setActiveTab('EMPLOYER'); setError(''); }}
                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${activeTab === 'EMPLOYER'
                                ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-lg shadow-purple-500/10'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                }`}
                            id="login-tab-employer"
                        >
                            <Building2 className="w-6 h-6" />
                            <span className="text-sm font-semibold">Doanh nghiệp</span>
                            <span className="text-xs opacity-70">Đăng nhập bằng Email</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Candidate: Phone field */}
                        {activeTab === 'CANDIDATE' && (
                            <div>
                                <label htmlFor="login-phone" className="input-label">Số điện thoại</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        id="login-phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="0912 345 678"
                                        className="input-field pl-11"
                                        required
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Employer: Phone or Email field */}
                        {activeTab === 'EMPLOYER' && (
                            <div>
                                <label htmlFor="login-employer-id" className="input-label">Số điện thoại hoặc Email</label>
                                <div className="relative">
                                    {/^\d|^\+/.test(email || '') ? (
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    ) : (
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    )}
                                    <input
                                        id="login-employer-id"
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="0912345678 hoặc email@congty.com"
                                        className="input-field pl-11"
                                        required
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Nhập SĐT hoặc email doanh nghiệp</p>
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label htmlFor="login-password" className="input-label !mb-0">Mật khẩu</label>
                                <Link href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field pl-11 pr-11"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Employer security badge */}
                        {activeTab === 'EMPLOYER' && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                <span>Đăng nhập được bảo mật bằng mã hóa SSL</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full justify-center py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold flex items-center gap-2 transition-all ${activeTab === 'CANDIDATE'
                                ? 'btn-primary'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20'
                                }`}
                            id="login-submit"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Đăng nhập <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center space-y-2">
                        <p className="text-sm text-slate-400">
                            Chưa có tài khoản?{' '}
                            <Link
                                href={`/auth/register?role=${activeTab}`}
                                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                Đăng ký ngay
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}>
            <LoginForm />
        </Suspense>
    );
}
