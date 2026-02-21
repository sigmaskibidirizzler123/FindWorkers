'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Loader2, KeyRound, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setMessage('Link xác thực không hợp lệ hoặc đã hết hạn.');
            setStatus('ERROR');
            return;
        }

        if (password.length < 6) {
            setMessage('Mật khẩu quá ngắn, vui lòng nhập ít nhất 6 ký tự.');
            setStatus('ERROR');
            return;
        }

        if (password !== confirmPassword) {
            setMessage('Mật khẩu không trùng khớp.');
            setStatus('ERROR');
            return;
        }

        setStatus('LOADING');
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();

            if (data.success) {
                setStatus('SUCCESS');
                setMessage(data.data.message || 'Mật khẩu đã được đặt lại thành công!');
            } else {
                setStatus('ERROR');
                setMessage(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
            }
        } catch (error) {
            setStatus('ERROR');
            setMessage('Lỗi kết nối máy chủ.');
        }
    };

    if (!token && status !== 'SUCCESS') {
        return (
            <div className="w-full max-w-md animate-slide-up text-center space-y-4 glass-card p-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold text-white">Link không hợp lệ</h2>
                <p className="text-slate-400 text-sm">Vui lòng kiểm tra lại đường dẫn từ email hoặc yêu cầu gửi lại email khôi phục mật khẩu.</p>
                <Link href="/auth/forgot-password" className="btn-primary w-full justify-center">
                    Yêu cầu khôi phục mật khẩu
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md animate-slide-up">

            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 glow-blue">
                    <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Đặt lại mật khẩu</h1>
                <p className="text-slate-400">Tạo mật khẩu mới cho tài khoản của bạn</p>
            </div>

            <div className="glass-card p-8">
                {status === 'SUCCESS' ? (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-medium text-white">Thành công!</h3>
                            <p className="text-slate-400 text-sm">
                                {message}
                            </p>
                        </div>
                        <button onClick={() => router.push('/auth/login')} className="btn-primary w-full justify-center">
                            Tiến hành đăng nhập <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {status === 'ERROR' && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{message}</span>
                            </div>
                        )}

                        <div>
                            <label htmlFor="new-pwd" className="input-label">Mật khẩu mới</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    id="new-pwd"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field pl-11 pr-11"
                                    required
                                    disabled={status === 'LOADING'}
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

                        <div>
                            <label htmlFor="confirm-pwd" className="input-label">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    id="confirm-pwd"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input-field pl-11 pr-11"
                                    required
                                    disabled={status === 'LOADING'}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'LOADING'}
                            className="w-full justify-center py-3 text-base bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20 rounded-xl font-semibold flex items-center gap-2 transition-all"
                        >
                            {status === 'LOADING' ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Xác nhận thay đổi <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
            <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-blue-500" />}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
