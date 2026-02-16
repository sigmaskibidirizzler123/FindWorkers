'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
    Briefcase, MapPin, DollarSign, Users,
    Loader2, ArrowRight, FileText, Zap
} from 'lucide-react';
import TemplateSelector from '@/components/job/TemplateSelector';
import ShiftSelector, { ShiftType } from '@/components/job/ShiftSelector';

const JOB_TYPES = [
    { value: 'FULLTIME', label: 'Toàn thời gian' },
    { value: 'PARTTIME', label: 'Bán thời gian' },
    { value: 'CONTRACT', label: 'Hợp đồng' },
    { value: 'SEASONAL', label: 'Thời vụ' },
    { value: 'SHIFT', label: 'Theo ca' },
];

interface TemplateDetail {
    id: string;
    title: string;
    description: string;
    requirements: string;
    benefits: string;
    defaultSalaryMin: number | null;
    defaultSalaryMax: number | null;
    suggestedShifts: string | null;
    category: string;
    categoryId: string | null;
}

export default function CreateJobPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [templateApplied, setTemplateApplied] = useState(false);

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
        experienceRequired: '0',
        genderRequirement: '',
        positions: '1',
        isUrgent: false,
        categoryId: '',
    });

    const [selectedShifts, setSelectedShifts] = useState<ShiftType[]>([]);

    // Handle template selection - autofill form
    const handleTemplateSelect = (template: TemplateDetail) => {
        setSelectedTemplateId(template.id);

        // Parse suggested shifts from template
        let suggestedShifts: ShiftType[] = [];
        if (template.suggestedShifts) {
            try {
                suggestedShifts = JSON.parse(template.suggestedShifts);
            } catch { /* ignore parse errors */ }
        }

        setFormData({
            ...formData,
            title: template.title,
            description: template.description,
            requirements: template.requirements,
            benefits: template.benefits,
            salaryMin: template.defaultSalaryMin?.toString() || '',
            salaryMax: template.defaultSalaryMax?.toString() || '',
            categoryId: template.categoryId || '',
        });

        setSelectedShifts(suggestedShifts);

        // Show success flash
        setTemplateApplied(true);
        setTimeout(() => setTemplateApplied(false), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    shifts: selectedShifts,
                }),
            });

            const data = await res.json();
            if (data.success) {
                router.push('/employer/dashboard');
            } else {
                setError(data.error);
            }
        } catch {
            setError('Đã xảy ra lỗi');
        } finally {
            setLoading(false);
        }
    };

    if (user?.role !== 'EMPLOYER') {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <p className="text-slate-400">Trang này chỉ dành cho nhà tuyển dụng</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <div className="text-center mb-8 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Đăng tin tuyển dụng</h1>
                <p className="text-slate-400">Tạo tin tuyển dụng để tìm ứng viên phù hợp</p>
            </div>

            {/* ===== Step 1: Template Selector ===== */}
            <div className="mb-6 animate-slide-up">
                <TemplateSelector
                    onSelectTemplate={handleTemplateSelect}
                    selectedTemplateId={selectedTemplateId}
                />
            </div>

            {/* Template applied success banner */}
            {templateApplied && (
                <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex items-center gap-2 animate-slide-up">
                    <span className="text-lg">✨</span>
                    Đã áp dụng mẫu! Bạn có thể chỉnh sửa nội dung bên dưới.
                </div>
            )}

            <div className={`glass-card p-8 animate-slide-up ${templateApplied ? 'template-autofill-flash' : ''}`}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">{error}</div>
                    )}

                    {/* Job Title */}
                    <div>
                        <label className="input-label">Tiêu đề công việc *</label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="VD: Phụ bếp nhà hàng Nhật"
                                className="input-field pl-11"
                                required
                                id="job-title"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="input-label">Mô tả công việc *</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Mô tả chi tiết công việc, nhiệm vụ, môi trường làm việc..."
                                rows={5}
                                className="input-field pl-11 resize-none"
                                required
                                id="job-description"
                            />
                        </div>
                    </div>

                    {/* Requirements & Benefits */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="input-label">Yêu cầu</label>
                            <textarea
                                value={formData.requirements}
                                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                                placeholder="- Siêng năng, chăm chỉ&#10;- Có kinh nghiệm..."
                                rows={4}
                                className="input-field resize-none"
                                id="job-requirements"
                            />
                        </div>
                        <div>
                            <label className="input-label">Quyền lợi</label>
                            <textarea
                                value={formData.benefits}
                                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                                placeholder="- Lương cạnh tranh&#10;- BHXH&#10;- Bao ăn..."
                                rows={4}
                                className="input-field resize-none"
                                id="job-benefits"
                            />
                        </div>
                    </div>

                    {/* ===== Step 3: Shift Selector ===== */}
                    <ShiftSelector
                        selectedShifts={selectedShifts}
                        onChange={setSelectedShifts}
                    />

                    {/* Salary */}
                    <div>
                        <label className="input-label flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Mức lương (VNĐ/tháng)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                            <input
                                type="number"
                                value={formData.salaryMin}
                                onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                                placeholder="Tối thiểu"
                                className="input-field"
                                disabled={formData.salaryNegotiable}
                                id="salary-min"
                            />
                            <input
                                type="number"
                                value={formData.salaryMax}
                                onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                                placeholder="Tối đa"
                                className="input-field"
                                disabled={formData.salaryNegotiable}
                                id="salary-max"
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.salaryNegotiable}
                                    onChange={(e) => setFormData({ ...formData, salaryNegotiable: e.target.checked })}
                                    className="rounded"
                                    id="salary-negotiable"
                                />
                                Thỏa thuận
                            </label>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="input-label">Địa điểm *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Quận 1"
                                    className="input-field pl-11"
                                    required
                                    id="job-location"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="input-label">Quận/Huyện</label>
                            <input
                                type="text"
                                value={formData.district}
                                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                                placeholder="Quận 1"
                                className="input-field"
                                id="job-district"
                            />
                        </div>
                        <div>
                            <label className="input-label">Thành phố</label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="TP.HCM"
                                className="input-field"
                                id="job-city"
                            />
                        </div>
                    </div>

                    {/* Job Details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                        <div>
                            <label className="input-label">Loại</label>
                            <select
                                value={formData.jobType}
                                onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                                className="input-field"
                                id="job-type"
                            >
                                {JOB_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">Kinh nghiệm (năm)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.experienceRequired}
                                onChange={(e) => setFormData({ ...formData, experienceRequired: e.target.value })}
                                className="input-field"
                                id="job-experience"
                            />
                        </div>
                        <div>
                            <label className="input-label">Số lượng</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.positions}
                                    onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
                                    className="input-field pl-11"
                                    id="job-positions"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.isUrgent}
                                onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                                className="rounded"
                                id="job-urgent"
                            />
                            <Zap className="w-4 h-4 text-red-400" /> Tuyển gấp
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full justify-center py-3 text-base disabled:opacity-50"
                        id="submit-job"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Đăng tin tuyển dụng <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
