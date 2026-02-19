'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
    User, Phone, MapPin, Briefcase, Clock, Loader2,
    ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Zap, Mail, ShieldCheck
} from 'lucide-react';
import { getCandidateCompletionStatus, FIELD_LABELS } from '@/lib/profile-helpers';

// =========================================
// Constants — Phú Quốc market
// =========================================

const LOCATIONS = [
    'Dương Đông', 'An Thới', 'Cửa Dương', 'Cửa Cạn',
    'Gành Dầu', 'Hàm Ninh', 'Dương Tơ', 'Bãi Thơm',
    'Thổ Châu', 'Khác',
];

const DESIRED_JOBS = [
    'Phục vụ', 'Pha chế', 'Thu ngân', 'Bếp / Phụ bếp',
    'Lễ tân', 'Housekeeping', 'Bảo vệ', 'Xe ôm / Grab',
    'Tạp vụ', 'Spa / Massage', 'Hướng dẫn viên', 'Khác',
];

const SHIFT_OPTIONS = [
    { value: 'MORNING', label: 'Ca sáng', time: '6:00 – 14:00', icon: '🌅' },
    { value: 'AFTERNOON', label: 'Ca chiều', time: '14:00 – 22:00', icon: '☀️' },
    { value: 'EVENING', label: 'Ca tối', time: '18:00 – 23:00', icon: '🌆' },
    { value: 'NIGHT', label: 'Ca đêm', time: '22:00 – 6:00', icon: '🌙' },
    { value: 'FLEXIBLE', label: 'Linh hoạt', time: 'Bất kỳ ca nào', icon: '⚡' },
];

// =========================================
// Types
// =========================================

interface ProfileData {
    fullName: string;
    phone: string;
    currentLocation: string;
    desiredJob: string;
    experienceMonths: number;
    shifts: string[];
    availableImmediately: boolean;
    description: string;
}

const INITIAL_FORM: ProfileData = {
    fullName: '',
    phone: '',
    currentLocation: '',
    desiredJob: '',
    experienceMonths: 0,
    shifts: [],
    availableImmediately: false,
    description: '',
};

// =========================================
// Component
// =========================================

export default function CandidateProfilePage() {
    const router = useRouter();
    const { user, fetchUser } = useAuthStore();
    const [mode, setMode] = useState<'loading' | 'create' | 'update'>('loading');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
    const [formData, setFormData] = useState<ProfileData>(INITIAL_FORM);

    // ── Fetch existing profile on mount ──
    const loadProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/profile/candidate', { credentials: 'include' });
            if (res.status === 404) {
                setMode('create');
                return;
            }
            const data = await res.json();
            if (data.success && data.data) {
                const p = data.data;
                let shifts: string[] = [];
                if (p.shifts) {
                    if (typeof p.shifts === 'string') {
                        try { shifts = JSON.parse(p.shifts); } catch { shifts = []; }
                    } else if (Array.isArray(p.shifts)) {
                        shifts = p.shifts;
                    }
                }
                setFormData({
                    fullName: p.fullName || '',
                    phone: p.phone || '',
                    currentLocation: p.currentLocation || '',
                    desiredJob: p.desiredJob || '',
                    experienceMonths: p.experienceMonths || 0,
                    shifts,
                    availableImmediately: p.availableImmediately || false,
                    description: p.description || '',
                });
                setMode('update');
            } else {
                setMode('create');
            }
        } catch {
            setMode('create');
        }
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // ── Toggle shift selection ──
    const toggleShift = (shift: string) => {
        setFormData(prev => ({
            ...prev,
            shifts: prev.shifts.includes(shift)
                ? prev.shifts.filter(s => s !== shift)
                : [...prev.shifts, shift],
        }));
    };

    // ── Submit ──
    const handleSubmit = async () => {
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const method = mode === 'create' ? 'POST' : 'PUT';
            const res = await fetch('/api/profile/candidate', {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    shifts: formData.shifts, // API handles JSON stringify
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(mode === 'create' ? 'Tạo hồ sơ thành công!' : 'Cập nhật thành công!');
                setMode('update');
                await fetchUser();
                setTimeout(() => router.push('/jobs'), 1500);
            } else {
                setError(data.error || 'Đã xảy ra lỗi');
            }
        } catch {
            setError('Đã xảy ra lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    // ── Resend Email Verification ──
    const handleVerifyEmail = async () => {
        if (!user?.email) return;
        setEmailVerifyLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (res.ok) {
                setSuccess('Đã gửi email xác thực! Vui lòng kiểm tra hộp thư.');
            } else {
                setError(data.error || 'Gửi email thất bại');
            }
        } catch {
            setError('Lỗi kết nối server');
        } finally {
            setEmailVerifyLoading(false);
        }
    };


    // ── Profile completion ──
    const completion = getCandidateCompletionStatus({
        ...formData,
        shifts: JSON.stringify(formData.shifts),
    });

    // ── Guard: only CANDIDATE ──
    if (user?.role !== 'CANDIDATE') {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-slate-400">Trang này chỉ dành cho ứng viên</p>
            </div>
        );
    }

    // ── Loading state ──
    if (mode === 'loading') {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
                <p className="text-slate-400">Đang tải hồ sơ...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-8 pb-24">
            {/* ── Header ── */}
            <div className="text-center mb-6 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-3">
                    <User className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">
                    {mode === 'create' ? 'Tạo hồ sơ ứng viên' : 'Cập nhật hồ sơ'}
                </h1>
                <p className="text-slate-400 text-sm">
                    {mode === 'create'
                        ? 'Hoàn thành hồ sơ để bắt đầu ứng tuyển'
                        : 'Cập nhật thông tin để nhà tuyển dụng dễ tìm bạn hơn'}
                </p>
            </div>

            {/* ── Profile Completion Bar ── */}
            <div className="glass-card p-4 mb-6 animate-slide-up">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-400">Hoàn thiện hồ sơ</span>
                    <span className={`text-xs font-bold ${completion.isComplete ? 'text-green-400' : 'text-amber-400'}`}>
                        {completion.percentage}%
                    </span>
                </div>
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${completion.isComplete
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            }`}
                        style={{ width: `${completion.percentage}%` }}
                    />
                </div>
                {completion.missing.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                        Thiếu: {completion.missing.map(f => FIELD_LABELS[f] || f).join(', ')}
                    </p>
                )}
            </div>

            {/* ── Step Indicators ── */}
            <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map(s => (
                    <button
                        key={s}
                        onClick={() => setStep(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === s
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : step > s
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-slate-800/50 text-slate-500 border border-slate-700/30'
                            }`}
                    >
                        {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s}</span>}
                        <span className="hidden sm:inline">
                            {s === 1 ? 'Thông tin' : s === 2 ? 'Công việc' : 'Bổ sung'}
                        </span>
                    </button>
                ))}
            </div>

            {/* ── Alerts ── */}
            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}
            {success && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* ── Account Status Card ── */}
            <div className="glass-card p-4 mb-6 animate-slide-up border border-slate-700/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Trạng thái tài khoản
                </h3>
                <div className="space-y-3">
                    {/* Phone Status */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-slate-700/50">
                                <Phone className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{user?.phone}</p>
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Email Status */}
                    {user?.email && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-slate-700/50">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{user.email}</p>
                                    {user.emailVerified ? (
                                        <p className="text-xs text-green-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Đã xác thực
                                        </p>
                                    ) : (
                                        <p className="text-xs text-amber-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Chưa xác thực
                                        </p>
                                    )}
                                </div>
                            </div>
                            {!user.emailVerified && (
                                <button
                                    onClick={handleVerifyEmail}
                                    disabled={emailVerifyLoading}
                                    className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                >
                                    {emailVerifyLoading ? 'Đang gửi...' : 'Xác thực ngay'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Form ── */}
            <div className="glass-card p-6 animate-slide-up">

                {/* ── Step 1: Basic Info ── */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-400" />
                            Thông tin cơ bản
                        </h2>

                        <div>
                            <label className="input-label">Họ và tên *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                    placeholder="Nguyễn Văn A"
                                    className="input-field pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Số điện thoại *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="0912 345 678"
                                    className="input-field pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Khu vực đang ở</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    value={formData.currentLocation}
                                    onChange={e => setFormData(prev => ({ ...prev, currentLocation: e.target.value }))}
                                    className="input-field pl-10"
                                >
                                    <option value="">Chọn khu vực...</option>
                                    {LOCATIONS.map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!formData.fullName.trim() || !formData.phone.trim()) {
                                        setError('Vui lòng nhập họ tên và số điện thoại');
                                        return;
                                    }
                                    setError('');
                                    setStep(2);
                                }}
                                className="btn-primary"
                            >
                                Tiếp theo <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Job Preference ── */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-cyan-400" />
                            Công việc mong muốn
                        </h2>

                        <div>
                            <label className="input-label">Vị trí muốn làm *</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    value={formData.desiredJob}
                                    onChange={e => setFormData(prev => ({ ...prev, desiredJob: e.target.value }))}
                                    className="input-field pl-10"
                                >
                                    <option value="">Chọn vị trí...</option>
                                    {DESIRED_JOBS.map(j => (
                                        <option key={j} value={j}>{j}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="input-label">
                                Ca làm việc được *
                                {formData.shifts.length > 0 && (
                                    <span className="ml-2 text-xs text-blue-400">
                                        ({formData.shifts.length} ca đã chọn)
                                    </span>
                                )}
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                {SHIFT_OPTIONS.map(shift => (
                                    <button
                                        key={shift.value}
                                        type="button"
                                        onClick={() => toggleShift(shift.value)}
                                        className={`shift-chip ${formData.shifts.includes(shift.value)
                                            ? 'shift-chip-selected border-blue-500/40 bg-blue-500/10'
                                            : ''
                                            }`}
                                    >
                                        <span className="shift-chip-icon">{shift.icon}</span>
                                        <span className="shift-chip-content">
                                            <span className="shift-chip-label">{shift.label}</span>
                                            <span className="shift-chip-time">{shift.time}</span>
                                        </span>
                                        {formData.shifts.includes(shift.value) && (
                                            <CheckCircle2 className="w-4 h-4 text-blue-400 ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Kinh nghiệm (tháng)</label>
                            <input
                                type="number"
                                min="0"
                                max="600"
                                value={formData.experienceMonths}
                                onChange={e => setFormData(prev => ({ ...prev, experienceMonths: parseInt(e.target.value) || 0 }))}
                                className="input-field"
                                placeholder="0"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                Ví dụ: 6 = 6 tháng, 24 = 2 năm
                            </p>
                        </div>

                        <div className="flex justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="btn-secondary"
                            >
                                <ArrowLeft className="w-4 h-4" /> Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!formData.desiredJob) {
                                        setError('Vui lòng chọn vị trí mong muốn');
                                        return;
                                    }
                                    if (formData.shifts.length === 0) {
                                        setError('Vui lòng chọn ít nhất 1 ca làm việc');
                                        return;
                                    }
                                    setError('');
                                    setStep(3);
                                }}
                                className="btn-primary"
                            >
                                Tiếp theo <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Extra ── */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-400" />
                            Thông tin bổ sung
                        </h2>

                        <div>
                            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-green-500/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={formData.availableImmediately}
                                    onChange={e => setFormData(prev => ({ ...prev, availableImmediately: e.target.checked }))}
                                    className="w-5 h-5 rounded accent-green-500"
                                />
                                <div>
                                    <span className="text-sm font-medium text-white">Có thể đi làm ngay</span>
                                    <p className="text-xs text-slate-500">Nhà tuyển dụng sẽ ưu tiên bạn hơn</p>
                                </div>
                                {formData.availableImmediately && (
                                    <span className="ml-auto text-xs font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                                        ✓ Sẵn sàng
                                    </span>
                                )}
                            </label>
                        </div>

                        <div>
                            <label className="input-label">Giới thiệu bản thân (tùy chọn)</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="VD: Tôi đã làm phục vụ 1 năm ở Dương Đông, chăm chỉ và nhanh nhẹn..."
                                rows={3}
                                className="input-field resize-none"
                                maxLength={500}
                            />
                            <p className="text-xs text-slate-500 mt-1 text-right">
                                {formData.description.length}/500
                            </p>
                        </div>

                        {/* ── Summary ── */}
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 space-y-2">
                            <h3 className="text-sm font-semibold text-slate-300 mb-2">📋 Tóm tắt hồ sơ</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-slate-500">Họ tên:</span>
                                    <span className="text-white ml-1">{formData.fullName || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">SĐT:</span>
                                    <span className="text-white ml-1">{formData.phone || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Khu vực:</span>
                                    <span className="text-white ml-1">{formData.currentLocation || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Vị trí:</span>
                                    <span className="text-white ml-1">{formData.desiredJob || '—'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-500">Ca làm:</span>
                                    <span className="text-white ml-1">
                                        {formData.shifts.length > 0
                                            ? formData.shifts.map(s => SHIFT_OPTIONS.find(o => o.value === s)?.label).join(', ')
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="btn-secondary"
                            >
                                <ArrowLeft className="w-4 h-4" /> Quay lại
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className="btn-primary disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'create' ? 'Tạo hồ sơ' : 'Lưu thay đổi'}
                                        <CheckCircle2 className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
