'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
    Building2, Phone, MapPin, Loader2, ArrowRight, ArrowLeft,
    CheckCircle2, AlertCircle, FileText, Store, Camera, X, ImageIcon
} from 'lucide-react';
import { getEmployerCompletionStatus, FIELD_LABELS } from '@/lib/profile-helpers';

// =========================================
// Constants — Phú Quốc market
// =========================================

const BUSINESS_TYPES = [
    'Nhà hàng', 'Quán cafe', 'Khách sạn', 'Resort',
    'Homestay', 'Spa / Massage', 'Bar / Club', 'Quán ăn',
    'Cửa hàng', 'Dịch vụ du lịch', 'Xây dựng', 'Khác',
];

const LOCATIONS = [
    'Dương Đông', 'An Thới', 'Cửa Dương', 'Cửa Cạn',
    'Gành Dầu', 'Hàm Ninh', 'Dương Tơ', 'Bãi Thơm',
    'Bãi Trường', 'Bãi Sao', 'Thổ Châu', 'Khác',
];

// =========================================
// Types
// =========================================

interface ProfileData {
    businessName: string;
    businessType: string;
    address: string;
    location: string;
    phone: string;
    description: string;
    logoUrl: string;
    companyImages: string; // JSON array of URLs
}

const INITIAL_FORM: ProfileData = {
    businessName: '',
    businessType: '',
    address: '',
    location: '',
    phone: '',
    description: '',
    logoUrl: '',
    companyImages: '[]',
};

// =========================================
// Component
// =========================================

export default function EmployerProfilePage() {
    const router = useRouter();
    const { user, fetchUser } = useAuthStore();
    const [mode, setMode] = useState<'loading' | 'create' | 'update'>('loading');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState<ProfileData>(INITIAL_FORM);
    const [uploading, setUploading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const companyImagesInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch existing profile on mount ──
    const loadProfile = useCallback(async () => {
        try {
            const res = await fetch('/api/profile/employer', {
                credentials: 'include',
                cache: 'no-store'
            });
            if (res.status === 404 || res.status === 403) {
                setMode('create');
                return;
            }
            const data = await res.json();
            if (data.success && data.data) {
                const p = data.data;
                setFormData({
                    businessName: p.businessName || '',
                    businessType: p.businessType || '',
                    address: p.address || '',
                    location: p.location || '',
                    phone: p.phone || '',
                    description: p.description || '',
                    logoUrl: p.logoUrl || '',
                    companyImages: p.companyImages || '[]',
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

    // ── Upload avatar ──
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Client-side validation
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh (JPEG, PNG, WebP)');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('File quá lớn. Tối đa 5MB');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                credentials: 'include',
                body: formDataUpload,
            });

            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ ...prev, logoUrl: data.data.url }));
                setSuccess('Tải ảnh lên thành công!');
                setTimeout(() => setSuccess(''), 2000);
            } else {
                setError(data.error || 'Lỗi khi tải ảnh lên');
            }
        } catch {
            setError('Lỗi kết nối khi tải ảnh');
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveAvatar = () => {
        setFormData(prev => ({ ...prev, logoUrl: '' }));
    };

    // ── Submit ──
    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        // Validate required
        if (!formData.businessName.trim()) {
            setError('Vui lòng nhập tên cơ sở');
            setStep(1);
            return;
        }
        if (!formData.address.trim()) {
            setError('Vui lòng nhập địa chỉ');
            setStep(1);
            return;
        }
        if (!formData.location) {
            setError('Vui lòng chọn khu vực');
            setStep(1);
            return;
        }
        if (!formData.phone.trim()) {
            setError('Vui lòng nhập số điện thoại');
            setStep(1);
            return;
        }

        setLoading(true);

        try {
            const method = mode === 'create' ? 'POST' : 'PUT';
            const res = await fetch('/api/profile/employer', {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(mode === 'create' ? 'Tạo hồ sơ thành công!' : 'Cập nhật thành công!');
                setMode('update');
                await fetchUser();
                setTimeout(() => router.push('/employer/dashboard'), 1500);
            } else {
                setError(data.error || 'Đã xảy ra lỗi');
            }
        } catch {
            setError('Đã xảy ra lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    // ── Completion ──
    const completion = getEmployerCompletionStatus(formData as any);

    // ── Guard: only EMPLOYER ──
    if (user?.role !== 'EMPLOYER') {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-slate-400">Trang này chỉ dành cho nhà tuyển dụng</p>
            </div>
        );
    }

    // ── Loading state ──
    if (mode === 'loading') {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                <p className="text-slate-400">Đang tải hồ sơ...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto px-4 py-8 pb-24">
            {/* ── Header ── */}
            <div className="text-center mb-6 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">
                    {mode === 'create' ? 'Tạo hồ sơ cơ sở' : 'Cập nhật hồ sơ cơ sở'}
                </h1>
                <p className="text-slate-400 text-sm">
                    {mode === 'create'
                        ? 'Hoàn thành thông tin để bắt đầu đăng tin tuyển dụng'
                        : 'Cập nhật thông tin cơ sở kinh doanh của bạn'}
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
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
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
            <div className="flex items-center justify-center gap-3 mb-6">
                {[1, 2].map(s => (
                    <button
                        key={s}
                        onClick={() => setStep(s)}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${step === s
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : step > s
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-slate-800/50 text-slate-500 border border-slate-700/30'
                            }`}
                    >
                        {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s}</span>}
                        <span>{s === 1 ? 'Thông tin cơ sở' : 'Mô tả & Avatar'}</span>
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

            {/* ── Form ── */}
            <div className="glass-card p-6 animate-slide-up">

                {/* ── Step 1: Business Info ── */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Store className="w-5 h-5 text-purple-400" />
                            Thông tin cơ sở
                        </h2>

                        <div>
                            <label className="input-label">Tên quán / khách sạn / cơ sở *</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                                    placeholder="VD: Quán Phở Sài Gòn, Resort ABC..."
                                    className="input-field pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Loại hình kinh doanh</label>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    value={formData.businessType}
                                    onChange={e => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                                    className="input-field pl-10"
                                >
                                    <option value="">Chọn loại hình...</option>
                                    {BUSINESS_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Địa chỉ *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="VD: 123 Trần Hưng Đạo, TT. Dương Đông"
                                    className="input-field pl-10"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Khu vực *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <select
                                    value={formData.location}
                                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                    className="input-field pl-10"
                                    required
                                >
                                    <option value="">Chọn khu vực...</option>
                                    {LOCATIONS.map(l => (
                                        <option key={l} value={l}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Số điện thoại liên hệ *</label>
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

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!formData.businessName.trim()) {
                                        setError('Vui lòng nhập tên cơ sở');
                                        return;
                                    }
                                    if (!formData.address.trim()) {
                                        setError('Vui lòng nhập địa chỉ');
                                        return;
                                    }
                                    if (!formData.location) {
                                        setError('Vui lòng chọn khu vực');
                                        return;
                                    }
                                    if (!formData.phone.trim()) {
                                        setError('Vui lòng nhập số điện thoại');
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

                {/* ── Step 2: Description & Avatar ── */}
                {step === 2 && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-pink-400" />
                            Mô tả & Avatar
                        </h2>

                        {/* ── Avatar Upload Section ── */}
                        <div>
                            <label className="input-label">Logo / Avatar cơ sở</label>
                            <div className="flex items-start gap-4">
                                {/* Avatar Preview */}
                                <div className="relative group flex-shrink-0">
                                    <div
                                        className={`w-24 h-24 rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all cursor-pointer
                                            ${formData.logoUrl
                                                ? 'border-purple-500/40 bg-purple-500/5'
                                                : 'border-slate-600 bg-slate-800/50 hover:border-purple-500/40 hover:bg-purple-500/5'
                                            }`}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {uploading ? (
                                            <div className="flex flex-col items-center gap-1">
                                                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                                                <span className="text-[10px] text-slate-400">Đang tải...</span>
                                            </div>
                                        ) : formData.logoUrl ? (
                                            <img
                                                src={formData.logoUrl}
                                                alt="Logo"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 p-2">
                                                <ImageIcon className="w-6 h-6 text-slate-500" />
                                                <span className="text-[10px] text-slate-500 text-center">Tải ảnh lên</span>
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        {!uploading && (
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Remove button */}
                                    {formData.logoUrl && !uploading && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveAvatar();
                                            }}
                                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-lg"
                                            title="Xóa ảnh"
                                        >
                                            <X className="w-3.5 h-3.5 text-white" />
                                        </button>
                                    )}
                                </div>

                                {/* Upload info */}
                                <div className="flex-1 pt-1">
                                    <p className="text-xs text-slate-400 mb-2">
                                        Tải lên logo hoặc ảnh đại diện cơ sở của bạn. Ảnh sẽ hiển thị trên tin tuyển dụng và hồ sơ công ty.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-all disabled:opacity-50"
                                        >
                                            <Camera className="w-3 h-3 inline mr-1" />
                                            {formData.logoUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1.5">
                                        JPEG, PNG, WebP • Tối đa 5MB
                                    </p>
                                </div>
                            </div>

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {/* ── Company Images Upload ── */}
                        <div>
                            <label className="input-label">📸 Hình ảnh cơ sở (tối đa 5 ảnh)</label>
                            <p className="text-xs text-slate-400 mb-3">
                                Tải lên hình ảnh về khách sạn, quán cafe, nhà hàng... để ứng viên thấy nơi làm việc.
                            </p>

                            {/* Current images */}
                            {(() => {
                                let images: string[] = [];
                                try { images = JSON.parse(formData.companyImages || '[]'); } catch { images = []; }
                                return (
                                    <>
                                        {images.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {images.map((url: string, i: number) => (
                                                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group">
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newImages = images.filter((_: string, idx: number) => idx !== i);
                                                                setFormData(prev => ({ ...prev, companyImages: JSON.stringify(newImages) }));
                                                            }}
                                                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {images.length < 5 && (
                                            <button
                                                type="button"
                                                onClick={() => companyImagesInputRef.current?.click()}
                                                disabled={uploadingImages}
                                                className="w-full p-4 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500/50 bg-slate-800/30 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {uploadingImages ? (
                                                    <><Loader2 className="w-5 h-5 animate-spin text-blue-400" /> Đang tải...
                                                    </>
                                                ) : (
                                                    <><Camera className="w-5 h-5 text-slate-400" /> <span className="text-sm text-slate-400">Thêm ảnh ({images.length}/5)</span></>
                                                )}
                                            </button>
                                        )}
                                    </>
                                );
                            })()}

                            <input
                                ref={companyImagesInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 5 * 1024 * 1024) {
                                        setError('Ảnh quá lớn, tối đa 5MB');
                                        return;
                                    }
                                    setUploadingImages(true);
                                    setError('');
                                    try {
                                        const fd = new FormData();
                                        fd.append('file', file);
                                        const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
                                        const data = await res.json();
                                        if (data.success) {
                                            let images: string[] = [];
                                            try { images = JSON.parse(formData.companyImages || '[]'); } catch { images = []; }
                                            images.push(data.data.url);
                                            setFormData(prev => ({ ...prev, companyImages: JSON.stringify(images) }));
                                            setSuccess('Tải ảnh thành công!');
                                            setTimeout(() => setSuccess(''), 2000);
                                        } else {
                                            setError(data.error || 'Lỗi tải ảnh');
                                        }
                                    } catch {
                                        setError('Lỗi kết nối');
                                    } finally {
                                        setUploadingImages(false);
                                        if (companyImagesInputRef.current) companyImagesInputRef.current.value = '';
                                    }
                                }}
                            />
                        </div>

                        {/* ── Description ── */}
                        <div>
                            <label className="input-label">Giới thiệu cơ sở (tùy chọn)</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="VD: Nhà hàng hải sản 5 năm tại Dương Đông, phục vụ khách du lịch, môi trường thân thiện..."
                                rows={4}
                                className="input-field resize-none"
                                maxLength={1000}
                            />
                            <p className="text-xs text-slate-500 mt-1 text-right">
                                {formData.description.length}/1000
                            </p>
                        </div>

                        {/* ── Summary ── */}
                        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 space-y-2">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">📋 Tóm tắt hồ sơ cơ sở</h3>
                            <div className="flex items-start gap-3">
                                {/* Mini avatar preview */}
                                <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {formData.logoUrl ? (
                                        <img src={formData.logoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Building2 className="w-5 h-5 text-slate-500" />
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                                    <div>
                                        <span className="text-slate-500">Tên:</span>
                                        <span className="text-white ml-1">{formData.businessName || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Loại hình:</span>
                                        <span className="text-white ml-1">{formData.businessType || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Khu vực:</span>
                                        <span className="text-white ml-1">{formData.location || '—'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">SĐT:</span>
                                        <span className="text-white ml-1">{formData.phone || '—'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-500">Địa chỉ:</span>
                                        <span className="text-white ml-1">{formData.address || '—'}</span>
                                    </div>
                                </div>
                            </div>
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
                                onClick={handleSubmit}
                                disabled={loading}
                                className="btn-primary disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'create' ? 'Tạo hồ sơ cơ sở' : 'Lưu thay đổi'}
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
