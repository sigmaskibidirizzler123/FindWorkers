'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import {
    MapPin, Clock, Building2, Users, Eye, Briefcase,
    Heart, Share2, ArrowLeft, Zap, Star, CheckCircle2, AlertCircle,
    Loader2, Send, Globe, Phone, Camera, X, ChevronLeft,
    ChevronRight, User, Mail, CreditCard, ImageIcon, MessageCircle
} from 'lucide-react';

interface Job {
    id: string;
    title: string;
    description: string;
    requirements: string | null;
    benefits: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryNegotiable: boolean;
    location: string;
    district: string | null;
    city: string | null;
    jobType: string;
    shift: string | null;
    experienceRequired: number;
    genderRequirement: string | null;
    positions: number;
    isUrgent: boolean;
    isFeatured: boolean;
    viewCount: number;
    createdAt: string;
    employer: {
        id: string;
        businessName: string;
        businessType: string | null;
        description: string | null;
        logoUrl: string | null;
        companyImages: string | null;
        phone: string | null;
        address: string | null;
        location: string | null;
    };
    category: {
        name: string;
        slug: string;
    } | null;
    skills: { skill: { id: string; name: string } }[];
    _count: { applications: number };
}

const JOB_TYPE_LABELS: Record<string, string> = {
    FULLTIME: 'Toàn thời gian',
    PARTTIME: 'Bán thời gian',
    CONTRACT: 'Hợp đồng',
    SEASONAL: 'Thời vụ',
    SHIFT: 'Theo ca',
};

const SHIFT_LABELS: Record<string, string> = {
    MORNING: 'Ca sáng',
    AFTERNOON: 'Ca chiều',
    EVENING: 'Ca tối',
    NIGHT: 'Ca đêm',
    FLEXIBLE: 'Linh hoạt',
};

function formatSalary(min: number | null, max: number | null, negotiable: boolean) {
    if (negotiable) return 'Thỏa thuận';
    const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';
    if (min && max) return `${fmt(min)} - ${fmt(max)}/tháng`;
    if (min) return `Từ ${fmt(min)}/tháng`;
    if (max) return `Đến ${fmt(max)}/tháng`;
    return 'Thỏa thuận';
}

// ═══════════════════════════════
// Company Image Gallery
// ═══════════════════════════════
function CompanyGallery({ images, logoUrl }: { images: string[]; logoUrl: string | null }) {
    const [current, setCurrent] = useState(0);
    const allImages = [...(logoUrl ? [logoUrl] : []), ...images];

    if (allImages.length === 0) return null;

    return (
        <div className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-800">
                <img
                    src={allImages[current]}
                    alt=""
                    className="w-full h-full object-cover"
                />
                {allImages.length > 1 && (
                    <>
                        <button
                            onClick={() => setCurrent((c) => (c - 1 + allImages.length) % allImages.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setCurrent((c) => (c + 1) % allImages.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {allImages.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrent(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {allImages.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${i === current ? 'border-blue-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        >
                            <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════
// Quick Apply Modal
// ═══════════════════════════════
function QuickApplyModal({
    isOpen,
    onClose,
    jobId,
    jobTitle,
}: {
    isOpen: boolean;
    onClose: () => void;
    jobId: string;
    jobTitle: string;
}) {
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        cccd: '',
    });
    const [cccdImage, setCccdImage] = useState<File | null>(null);
    const [cccdPreview, setCccdPreview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Ảnh CCCD không được quá 5MB');
            return;
        }

        setCccdImage(file);
        setCccdPreview(URL.createObjectURL(file));
        setError('');
    };

    // Field validation helpers
    const validations = {
        fullName: formData.fullName.trim().length >= 2,
        phone: /^(0|\+84)\d{9,10}$/.test(formData.phone.replace(/\s/g, '')),
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
        cccd: /^\d{12}$/.test(formData.cccd.replace(/\s/g, '')),
        cccdImage: !!cccdImage,
    };

    const allValid = Object.values(validations).every(Boolean);

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Mark all fields as touched to show validation
        setTouched({ fullName: true, phone: true, email: true, cccd: true, cccdImage: true });

        if (!allValid) {
            if (!validations.fullName) setError('Vui lòng nhập họ và tên (ít nhất 2 ký tự)');
            else if (!validations.phone) setError('Số điện thoại không hợp lệ (VD: 0901234567)');
            else if (!validations.email) setError('Email không hợp lệ (VD: ten@gmail.com)');
            else if (!validations.cccd) setError('Số CCCD phải có đúng 12 chữ số');
            else if (!validations.cccdImage) setError('Vui lòng chụp hoặc tải ảnh CCCD mặt trước');
            return;
        }

        setError('');
        setSubmitting(true);

        try {
            const fd = new FormData();
            fd.append('jobId', jobId);
            fd.append('fullName', formData.fullName);
            fd.append('phone', formData.phone);
            fd.append('email', formData.email);
            fd.append('cccd', formData.cccd);
            if (cccdImage) fd.append('cccdImage', cccdImage);

            const res = await fetch('/api/apply-quick', {
                method: 'POST',
                body: fd,
            });

            const data = await res.json();

            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'Đã xảy ra lỗi');
            }
        } catch {
            setError('Đã xảy ra lỗi kết nối');
        } finally {
            setSubmitting(false);
        }
    };

    // Validation indicator component
    const FieldStatus = ({ field, messages }: { field: string; messages: { valid: string; invalid: string } }) => {
        if (!touched[field]) return null;
        const isValid = validations[field as keyof typeof validations];
        return (
            <p className={`text-xs mt-1 flex items-center gap-1 ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                {isValid ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {isValid ? messages.valid : messages.invalid}
            </p>
        );
    };

    if (!isOpen) return null;

    // Success — show Zalo QR
    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div
                    className="relative glass-card p-8 max-w-md w-full animate-slide-up text-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">Gửi thành công! 🎉</h3>
                    <p className="text-slate-400 mb-6">
                        Thông tin của bạn đã được gửi. Vui lòng liên hệ qua Zalo để được phản hồi nhanh nhất!
                    </p>

                    {/* Zalo QR */}
                    <div className="bg-white rounded-2xl p-6 mb-6">
                        <p className="text-slate-800 font-bold text-lg mb-1">Nhật Minh</p>
                        <p className="text-slate-500 text-sm mb-4">Quét mã QR để chat Zalo</p>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent('https://zalo.me/0907697043')}`}
                            alt="Zalo QR"
                            className="w-48 h-48 mx-auto"
                        />
                        <div className="flex items-center justify-center gap-2 mt-3">
                            <MessageCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-slate-600 font-medium">Zalo: 0907697043</span>
                        </div>
                    </div>

                    <a
                        href="https://zalo.me/0907697043"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary w-full justify-center py-3 text-base"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Mở Zalo ngay
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative glass-card p-6 sm:p-8 max-w-lg w-full animate-slide-up max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h3 className="text-xl font-bold text-white mb-1">Ứng tuyển nhanh</h3>
                <p className="text-sm text-slate-400 mb-4">{jobTitle}</p>

                {/* Validation Checklist */}
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 mb-4">
                    <p className="text-xs text-slate-500 mb-2 font-semibold">📋 Thông tin cần điền:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { key: 'fullName', label: 'Họ và tên' },
                            { key: 'phone', label: 'Số điện thoại' },
                            { key: 'email', label: 'Email' },
                            { key: 'cccd', label: 'Số CCCD' },
                            { key: 'cccdImage', label: 'Ảnh CCCD' },
                        ].map((item) => {
                            const isValid = validations[item.key as keyof typeof validations];
                            return (
                                <div key={item.key} className={`flex items-center gap-1.5 text-xs ${isValid ? 'text-green-400' : 'text-slate-500'}`}>
                                    {isValid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                                    {item.label}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label className="input-label">
                            <User className="w-4 h-4 inline mr-1" /> Họ và tên *
                        </label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            onBlur={() => markTouched('fullName')}
                            className={`input-field ${touched.fullName ? (validations.fullName ? 'border-green-500/30' : 'border-red-500/30') : ''}`}
                            placeholder="Nguyễn Văn A"
                        />
                        <FieldStatus field="fullName" messages={{ valid: 'Hợp lệ', invalid: 'Tên phải có ít nhất 2 ký tự' }} />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="input-label">
                            <Phone className="w-4 h-4 inline mr-1" /> Số điện thoại *
                        </label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            onBlur={() => markTouched('phone')}
                            className={`input-field ${touched.phone ? (validations.phone ? 'border-green-500/30' : 'border-red-500/30') : ''}`}
                            placeholder="0901234567"
                        />
                        <FieldStatus field="phone" messages={{ valid: 'Số điện thoại hợp lệ', invalid: 'Nhập SĐT Việt Nam (VD: 0901234567)' }} />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="input-label">
                            <Mail className="w-4 h-4 inline mr-1" /> Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            onBlur={() => markTouched('email')}
                            className={`input-field ${touched.email ? (validations.email ? 'border-green-500/30' : 'border-red-500/30') : ''}`}
                            placeholder="email@gmail.com"
                        />
                        <FieldStatus field="email" messages={{ valid: 'Email hợp lệ', invalid: 'Email không đúng (VD: ten@gmail.com)' }} />
                    </div>

                    {/* CCCD */}
                    <div>
                        <label className="input-label">
                            <CreditCard className="w-4 h-4 inline mr-1" /> Số CCCD *
                        </label>
                        <input
                            type="text"
                            value={formData.cccd}
                            onChange={(e) => setFormData({ ...formData, cccd: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                            onBlur={() => markTouched('cccd')}
                            className={`input-field ${touched.cccd ? (validations.cccd ? 'border-green-500/30' : 'border-red-500/30') : ''}`}
                            placeholder="012345678901"
                            maxLength={12}
                        />
                        <FieldStatus field="cccd" messages={{ valid: 'CCCD hợp lệ (12 số)', invalid: `Cần đủ 12 số (hiện tại: ${formData.cccd.length}/12)` }} />
                    </div>

                    {/* CCCD Image - REQUIRED */}
                    <div>
                        <label className="input-label">
                            <Camera className="w-4 h-4 inline mr-1" /> Hình ảnh CCCD mặt trước * <span className="text-red-400 text-xs">(bắt buộc)</span>
                        </label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => { handleFileChange(e); markTouched('cccdImage'); }}
                            className="hidden"
                        />
                        {cccdPreview ? (
                            <div className="relative rounded-xl overflow-hidden border-2 border-green-500/30">
                                <img src={cccdPreview} alt="CCCD" className="w-full h-40 object-cover" />
                                <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-green-500/90 text-white text-xs font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Đã tải ảnh
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCccdImage(null);
                                        setCccdPreview('');
                                        markTouched('cccdImage');
                                    }}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full p-6 rounded-xl border-2 border-dashed transition-all flex flex-col items-center gap-2
                                    ${touched.cccdImage && !validations.cccdImage
                                        ? 'border-red-500/50 bg-red-500/5'
                                        : 'border-slate-600 hover:border-blue-500/50 bg-slate-800/30 hover:bg-blue-500/5'
                                    }`}
                            >
                                <ImageIcon className={`w-8 h-8 ${touched.cccdImage && !validations.cccdImage ? 'text-red-400' : 'text-slate-500'}`} />
                                <span className={`text-sm ${touched.cccdImage && !validations.cccdImage ? 'text-red-400' : 'text-slate-400'}`}>
                                    {touched.cccdImage && !validations.cccdImage ? '⚠️ Bắt buộc chụp/tải ảnh CCCD mặt trước' : 'Chụp hoặc tải ảnh CCCD mặt trước'}
                                </span>
                            </button>
                        )}
                        <FieldStatus field="cccdImage" messages={{ valid: 'Đã có ảnh CCCD', invalid: 'Bắt buộc phải có ảnh CCCD mặt trước' }} />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !allValid}
                        className={`w-full justify-center py-3 text-base flex items-center gap-2 rounded-xl font-semibold transition-all
                            ${allValid
                                ? 'btn-primary'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                            }`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Đang gửi...
                            </>
                        ) : allValid ? (
                            <>
                                <Send className="w-5 h-5" /> Gửi đơn ứng tuyển
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-5 h-5" /> Vui lòng điền đủ thông tin
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ═══════════════════════════════
// Main Page
// ═══════════════════════════════
export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user } = useAuthStore();
    const [job, setJob] = useState<Job | null>(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await fetch(`/api/jobs/${id}`);
                const data = await res.json();
                if (data.success) {
                    setJob(data.data);
                }
            } catch (error) {
                console.error('Fetch job error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    if (!job) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
                <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Không tìm thấy tin tuyển dụng</h2>
                <p className="text-slate-400 mb-6">Tin này có thể đã bị xoá hoặc hết hạn</p>
                <Link href="/jobs" className="btn-primary">← Quay lại tìm việc</Link>
            </div>
        );
    }

    const companyImages: string[] = (() => {
        try {
            return job.employer.companyImages ? JSON.parse(job.employer.companyImages) : [];
        } catch {
            return [];
        }
    })();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <Link href="/jobs" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Quay lại tìm việc
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Job Header */}
                    <div className="glass-card p-8 animate-slide-up">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {job.isUrgent && <span className="badge badge-urgent"><Zap className="w-3 h-3 mr-1" /> Tuyển gấp</span>}
                            {job.isFeatured && <span className="badge badge-featured"><Star className="w-3 h-3 mr-1" /> Nổi bật</span>}
                            {job.category && <span className="badge badge-category">{job.category.name}</span>}
                        </div>

                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{job.title}</h1>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center overflow-hidden">
                                {job.employer.logoUrl ? (
                                    <img src={job.employer.logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-6 h-6 text-slate-300" />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-white">{job.employer.businessName}</p>
                                {job.employer.businessType && <p className="text-sm text-slate-400">{job.employer.businessType}</p>}
                            </div>
                        </div>

                        {/* Quick Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <p className="text-xs text-slate-500 mb-1">💰 Mức lương</p>
                                <p className="font-semibold text-green-400 text-sm">
                                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <p className="text-xs text-slate-500 mb-1">📍 Địa điểm</p>
                                <p className="font-semibold text-white text-sm">{job.location}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <p className="text-xs text-slate-500 mb-1">⏰ Hình thức</p>
                                <p className="font-semibold text-white text-sm">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <p className="text-xs text-slate-500 mb-1">📋 Kinh nghiệm</p>
                                <p className="font-semibold text-white text-sm">
                                    {job.experienceRequired === 0 ? 'Không yêu cầu' : `${job.experienceRequired} năm`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h2 className="text-xl font-bold text-white mb-4">Mô tả công việc</h2>
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-line">
                            {job.description}
                        </div>
                    </div>

                    {/* Requirements */}
                    {job.requirements && (
                        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                            <h2 className="text-xl font-bold text-white mb-4">Yêu cầu</h2>
                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-line">
                                {job.requirements}
                            </div>
                        </div>
                    )}

                    {/* Benefits */}
                    {job.benefits && (
                        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            <h2 className="text-xl font-bold text-white mb-4">Quyền lợi</h2>
                            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-line">
                                {job.benefits}
                            </div>
                        </div>
                    )}

                    {/* Additional Info */}
                    <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.25s' }}>
                        <h2 className="text-xl font-bold text-white mb-4">Thông tin thêm</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {job.shift && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span className="text-slate-400">Ca: </span>
                                    <span className="text-white">{SHIFT_LABELS[job.shift] || job.shift}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                                <Users className="w-4 h-4 text-slate-500" />
                                <span className="text-slate-400">Số lượng: </span>
                                <span className="text-white">{job.positions} người</span>
                            </div>
                            {job.genderRequirement && (
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-slate-400">Giới tính: </span>
                                    <span className="text-white">{job.genderRequirement}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                                <Eye className="w-4 h-4 text-slate-500" />
                                <span className="text-slate-400">Lượt xem: </span>
                                <span className="text-white">{job.viewCount}</span>
                            </div>
                        </div>

                        {/* Skills */}
                        {job.skills.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-white/5">
                                <p className="text-sm text-slate-400 mb-3">Kỹ năng yêu cầu:</p>
                                <div className="flex flex-wrap gap-2">
                                    {job.skills.map((s) => (
                                        <span key={s.skill.id} className="badge badge-category">{s.skill.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Apply Card */}
                    <div className="glass-card p-6 sticky top-24 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                        <div className="text-center mb-6">
                            <p className="text-2xl font-bold text-green-400 mb-1">
                                {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}
                            </p>
                            <p className="text-sm text-slate-400">{job._count.applications} người đã ứng tuyển</p>
                        </div>

                        <button
                            onClick={() => setShowApplyModal(true)}
                            className="btn-primary w-full justify-center py-3 text-base mb-3"
                            id="apply-button"
                        >
                            <Send className="w-5 h-5" /> Ứng tuyển ngay
                        </button>

                        <div className="flex gap-2">
                            <button className="btn-secondary flex-1 justify-center">
                                <Heart className="w-4 h-4" /> Lưu
                            </button>
                            <button className="btn-secondary flex-1 justify-center">
                                <Share2 className="w-4 h-4" /> Chia sẻ
                            </button>
                        </div>
                    </div>

                    {/* Company Card with Images */}
                    <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Về công ty</h3>

                        {/* Company Images Gallery */}
                        {(companyImages.length > 0 || job.employer.logoUrl) && (
                            <div className="mb-4">
                                <CompanyGallery images={companyImages} logoUrl={job.employer.logoUrl} />
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {job.employer.logoUrl ? (
                                    <img src={job.employer.logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-5 h-5 text-slate-300" />
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-white">{job.employer.businessName}</p>
                                {job.employer.businessType && (
                                    <p className="text-sm text-slate-400">{job.employer.businessType}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {job.employer.address && (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <MapPin className="w-4 h-4 text-slate-500" />
                                    {job.employer.address}
                                </div>
                            )}
                            {job.employer.location && (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Globe className="w-4 h-4 text-slate-500" />
                                    {job.employer.location}
                                </div>
                            )}
                        </div>

                        {job.employer.description && (
                            <p className="mt-4 pt-4 border-t border-white/5 text-sm text-slate-400">
                                {job.employer.description}
                            </p>
                        )}

                        {/* Contact button — opens apply modal */}
                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                            <button
                                onClick={() => setShowApplyModal(true)}
                                className="btn-success w-full justify-center text-sm"
                            >
                                <Send className="w-4 h-4" /> Ứng tuyển ngay
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Apply Modal */}
            <QuickApplyModal
                isOpen={showApplyModal}
                onClose={() => setShowApplyModal(false)}
                jobId={job.id}
                jobTitle={job.title}
            />
        </div>
    );
}
