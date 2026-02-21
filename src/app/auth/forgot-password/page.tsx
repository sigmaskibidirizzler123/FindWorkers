'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, Loader2, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setMessage('Vui lòng nhập thư điện tử.');
            setStatus('ERROR');
            return;
        }

        setStatus('LOADING');
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();

            if (data.success) {
                setStatus('SUCCESS');
                setMessage(data.data.message || 'Email khôi phục đã được gửi!');
            } else {
                setStatus('ERROR');
                setMessage(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
            }
        } catch (error) {
            setStatus('ERROR');
            setMessage('Lỗi kết nối máy chủ.');
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md animate-slide-up">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 glow-blue">
                        <KeyRound className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Quên mật khẩu?</h1>
                    <p className="text-slate-400">Nhập email của bạn để nhận link khôi phục mật khẩu</p>
                </div>

                <div className="glass-card p-8">
                    {status === 'SUCCESS' ? (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-medium text-white">Đã gửi email khôi phục</h3>
                                <p className="text-slate-400 text-sm">
                                    Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu đến email <strong>{email}</strong>.
                                    Vui lòng kiểm tra hộp thư (và thư mục rác).
                                </p>
                            </div>
                            <Link href="/auth/login" className="btn-primary w-full justify-center">
                                Trở về đăng nhập
                            </Link>
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
                                <label htmlFor="reset-email" className="input-label">Email tài khoản</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input
                                        id="reset-email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@congty.com"
                                        className="input-field pl-11"
                                        required
                                        autoFocus
                                        disabled={status === 'LOADING'}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status === 'LOADING'}
                                className="w-full justify-center py-3 text-base btn-primary rounded-xl font-semibold flex items-center gap-2 transition-all"
                            >
                                {status === 'LOADING' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Gửi email khôi phục <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {!status || status !== 'SUCCESS' ? (
                        <div className="mt-6 text-center">
                            <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
                            </Link>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
