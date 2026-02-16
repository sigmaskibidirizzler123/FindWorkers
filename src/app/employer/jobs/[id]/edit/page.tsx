'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    Briefcase, MapPin, DollarSign, Users,
    Loader2, ArrowLeft, Save, Zap
} from 'lucide-react';
import ShiftSelector, { ShiftType } from '@/components/job/ShiftSelector';

const JOB_TYPES = [
    { value: 'FULLTIME', label: 'Toàn thời gian' },
    { value: 'PARTTIME', label: 'Bán thời gian' },
    { value: 'CONTRACT', label: 'Hợp đồng' },
    { value: 'SEASONAL', label: 'Thời vụ' },
    { value: 'SHIFT', label: 'Theo ca' },
];

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requirements: '',
        benefits: '',
        salaryMin: '',
        salaryMax: '',
        salaryNegotiable: false,
        location: '',
        district: '',
        city: '',
        jobType: 'FULLTIME',
        positions: '1',
        experienceRequired: '0',
        genderRequirement: '',
        isUrgent: false,
        shifts: [] as ShiftType[],
    });

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await fetch(`/api/employer/jobs/${id}`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    const job = data.data.job;
                    let shifts: ShiftType[] = [];
                    try {
                        shifts = JSON.parse(job.shifts || '[]');
                    } catch { /* empty */ }

                    setFormData({
                        title: job.title || '',
                        description: job.description || '',
                        requirements: job.requirements || '',
                        benefits: job.benefits || '',
                        salaryMin: job.salaryMin?.toString() || '',
                        salaryMax: job.salaryMax?.toString() || '',
                        salaryNegotiable: job.salaryNegotiable || false,
                        location: job.location || '',
                        district: job.district || '',
                        city: job.city || '',
                        jobType: job.jobType || 'FULLTIME',
                        positions: job.positions?.toString() || '1',
                        experienceRequired: job.experienceRequired?.toString() || '0',
                        genderRequirement: job.genderRequirement || '',
                        isUrgent: job.isUrgent || false,
                        shifts,
                    });
                } else {
                    setError('Không tìm thấy tin tuyển dụng');
                }
            } catch (err) {
                setError('Lỗi khi tải thông tin');
            } finally {
                setLoading(false);
            }
        };
        fetchJob();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const res = await fetch(`/api/jobs/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    salaryMin: formData.salaryMin || null,
                    salaryMax: formData.salaryMax || null,
                    experienceRequired: formData.experienceRequired || '0',
                    positions: formData.positions || '1',
                }),
            });

            const data = await res.json();
            if (data.success) {
                setSuccess('Đã cập nhật tin tuyển dụng thành công!');
                setTimeout(() => router.push('/employer/dashboard'), 1500);
            } else {
                setError(data.error || 'Có lỗi xảy ra');
            }
        } catch {
            setError('Lỗi kết nối server');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-2 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Quay lại
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Briefcase className="w-8 h-8 text-blue-400" />
                        Chỉnh sửa tin tuyển dụng
                    </h1>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 mb-6">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="glass-card p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-400" /> Thông tin cơ bản
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Tiêu đề vị trí *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input-field"
                            placeholder="VD: Phụ bếp nhà hàng Nhật"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Mô tả công việc *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-field min-h-[120px]"
                            placeholder="Mô tả chi tiết công việc..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Yêu cầu</label>
                            <textarea
                                value={formData.requirements}
                                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                                className="input-field min-h-[80px]"
                                placeholder="Yêu cầu ứng viên..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Quyền lợi</label>
                            <textarea
                                value={formData.benefits}
                                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                                className="input-field min-h-[80px]"
                                placeholder="Quyền lợi nhân viên..."
                            />
                        </div>
                    </div>
                </div>

                {/* Salary & Work */}
                <div className="glass-card p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" /> Lương & Hình thức
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Lương tối thiểu</label>
                            <input
                                type="number"
                                value={formData.salaryMin}
                                onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                                className="input-field"
                                placeholder="5000000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Lương tối đa</label>
                            <input
                                type="number"
                                value={formData.salaryMax}
                                onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                                className="input-field"
                                placeholder="10000000"
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer p-3">
                                <input
                                    type="checkbox"
                                    checked={formData.salaryNegotiable}
                                    onChange={(e) => setFormData({ ...formData, salaryNegotiable: e.target.checked })}
                                    className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                                />
                                <span className="text-sm text-slate-300">Lương thỏa thuận</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Hình thức</label>
                            <select
                                value={formData.jobType}
                                onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                                className="input-field"
                            >
                                {JOB_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Số lượng cần tuyển</label>
                            <input
                                type="number"
                                value={formData.positions}
                                onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                                className="input-field"
                                min="1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Kinh nghiệm (năm)</label>
                            <input
                                type="number"
                                value={formData.experienceRequired}
                                onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
                                className="input-field"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Shift Selector */}
                    <ShiftSelector
                        selectedShifts={formData.shifts}
                        onChange={(shifts) => setFormData({ ...formData, shifts })}
                    />
                </div>

                {/* Location */}
                <div className="glass-card p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-400" /> Địa điểm làm việc
                    </h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Địa chỉ *</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="input-field"
                            placeholder="Số 123 đường ABC..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Quận/Huyện</label>
                            <input
                                type="text"
                                value={formData.district}
                                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                className="input-field"
                                placeholder="Dương Đông"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Thành phố</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="input-field"
                                placeholder="Phú Quốc"
                            />
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="glass-card p-6 space-y-5">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" /> Tùy chọn
                    </h2>

                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.isUrgent}
                            onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                        />
                        <div>
                            <span className="text-sm font-medium text-white">🔥 Tuyển gấp</span>
                            <p className="text-xs text-slate-400">Tin sẽ được đánh dấu ưu tiên</p>
                        </div>
                    </label>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="btn-secondary"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Lưu thay đổi</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
