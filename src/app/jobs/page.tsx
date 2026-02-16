'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Search, MapPin, Filter, X, Clock, Building2,
    ChevronDown, Zap, Star, Briefcase, Loader2
} from 'lucide-react';

interface Job {
    id: string;
    title: string;
    description: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryNegotiable: boolean;
    location: string;
    city: string | null;
    jobType: string;
    shift: string | null;
    experienceRequired: number;
    isUrgent: boolean;
    isFeatured: boolean;
    createdAt: string;
    viewCount: number;
    employer: {
        companyName: string;
        logoUrl: string | null;
        isVerified: boolean;
        city: string | null;
    };
    category: {
        name: string;
        slug: string;
    } | null;
    _count: {
        applications: number;
    };
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const JOB_TYPES = [
    { value: '', label: 'Tất cả' },
    { value: 'FULLTIME', label: 'Toàn thời gian' },
    { value: 'PARTTIME', label: 'Bán thời gian' },
    { value: 'CONTRACT', label: 'Hợp đồng' },
    { value: 'SEASONAL', label: 'Thời vụ' },
    { value: 'SHIFT', label: 'Theo ca' },
];

const SHIFTS = [
    { value: '', label: 'Tất cả' },
    { value: 'MORNING', label: 'Ca sáng' },
    { value: 'AFTERNOON', label: 'Ca chiều' },
    { value: 'EVENING', label: 'Ca tối' },
    { value: 'NIGHT', label: 'Ca đêm' },
    { value: 'FLEXIBLE', label: 'Linh hoạt' },
];

function formatSalary(min: number | null, max: number | null, negotiable: boolean) {
    if (negotiable) return 'Thỏa thuận';
    const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `Từ ${fmt(min)}`;
    if (max) return `Đến ${fmt(max)}`;
    return 'Thỏa thuận';
}

function formatTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Vừa đăng';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return `${Math.floor(days / 30)} tháng trước`;
}

function JobsContent() {
    const searchParams = useSearchParams();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        city: searchParams.get('city') || '',
        jobType: searchParams.get('jobType') || '',
        shift: searchParams.get('shift') || '',
        isUrgent: searchParams.get('isUrgent') === 'true',
        noExperience: searchParams.get('noExperience') === 'true',
        sort: searchParams.get('sort') || 'newest',
        page: 1,
    });

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.set('search', filters.search);
            if (filters.city) params.set('city', filters.city);
            if (filters.jobType) params.set('jobType', filters.jobType);
            if (filters.shift) params.set('shift', filters.shift);
            if (filters.isUrgent) params.set('isUrgent', 'true');
            if (filters.noExperience) params.set('noExperience', 'true');
            params.set('sort', filters.sort);
            params.set('page', filters.page.toString());
            params.set('limit', '12');

            const res = await fetch(`/api/jobs?${params.toString()}`);
            const data = await res.json();

            if (data.success) {
                setJobs(data.data);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error('Fetch jobs error:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Page header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    Tìm kiếm <span className="gradient-text">việc làm</span>
                </h1>
                <p className="text-slate-400">
                    {pagination ? `${pagination.total.toLocaleString()} việc làm đang tuyển` : 'Đang tải...'}
                </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Tìm công việc, vị trí, công ty..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                            className="input-field pl-11"
                            id="job-search-input"
                        />
                    </div>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Thành phố..."
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value, page: 1 })}
                            className="input-field pl-11 sm:w-48"
                            id="job-city-input"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn-secondary ${showFilters ? '!border-blue-500/30 !text-blue-400' : ''}`}
                        id="toggle-filters"
                    >
                        <Filter className="w-4 h-4" />
                        Bộ lọc
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Extended Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-white/5 animate-slide-up">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="input-label">Loại công việc</label>
                                <select
                                    value={filters.jobType}
                                    onChange={(e) => setFilters({ ...filters, jobType: e.target.value, page: 1 })}
                                    className="input-field"
                                >
                                    {JOB_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Ca làm việc</label>
                                <select
                                    value={filters.shift}
                                    onChange={(e) => setFilters({ ...filters, shift: e.target.value, page: 1 })}
                                    className="input-field"
                                >
                                    {SHIFTS.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Sắp xếp</label>
                                <select
                                    value={filters.sort}
                                    onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="newest">Mới nhất</option>
                                    <option value="salary_high">Lương cao nhất</option>
                                    <option value="salary_low">Lương thấp nhất</option>
                                    <option value="popular">Phổ biến nhất</option>
                                </select>
                            </div>
                            <div className="space-y-3 pt-6">
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.isUrgent}
                                        onChange={(e) => setFilters({ ...filters, isUrgent: e.target.checked, page: 1 })}
                                        className="rounded"
                                    />
                                    <Zap className="w-4 h-4 text-red-400" /> Tuyển gấp
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.noExperience}
                                        onChange={(e) => setFilters({ ...filters, noExperience: e.target.checked, page: 1 })}
                                        className="rounded"
                                    />
                                    ✨ Không cần kinh nghiệm
                                </label>
                            </div>
                        </div>
                        <button
                            onClick={() => setFilters({
                                search: '', city: '', jobType: '', shift: '',
                                isUrgent: false, noExperience: false, sort: 'newest', page: 1,
                            })}
                            className="mt-4 text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            <X className="w-4 h-4" /> Xóa bộ lọc
                        </button>
                    </div>
                )}
            </div>

            {/* Active Filters */}
            {(filters.search || filters.city || filters.jobType || filters.shift || filters.isUrgent || filters.noExperience) && (
                <div className="flex flex-wrap gap-2 mb-6">
                    {filters.search && (
                        <span className="badge badge-category">
                            🔍 {filters.search}
                            <button onClick={() => setFilters({ ...filters, search: '', page: 1 })} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {filters.city && (
                        <span className="badge badge-category">
                            📍 {filters.city}
                            <button onClick={() => setFilters({ ...filters, city: '', page: 1 })} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                    {filters.isUrgent && (
                        <span className="badge badge-urgent">
                            ⚡ Tuyển gấp
                            <button onClick={() => setFilters({ ...filters, isUrgent: false, page: 1 })} className="ml-1 hover:text-white"><X className="w-3 h-3" /></button>
                        </span>
                    )}
                </div>
            )}

            {/* Jobs Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-20">
                    <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Không tìm thấy việc làm</h3>
                    <p className="text-slate-400 mb-6">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
                    <button
                        onClick={() => setFilters({
                            search: '', city: '', jobType: '', shift: '',
                            isUrgent: false, noExperience: false, sort: 'newest', page: 1,
                        })}
                        className="btn-primary"
                    >
                        Xóa bộ lọc
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {jobs.map((job, i) => (
                            <Link
                                key={job.id}
                                href={`/jobs/${job.id}`}
                                className="glass-card p-6 group animate-slide-up"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center flex-shrink-0">
                                        {job.employer.logoUrl ? (
                                            <img src={job.employer.logoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex gap-1.5">
                                        {job.isUrgent && (
                                            <span className="badge badge-urgent text-xs">
                                                <Zap className="w-3 h-3 mr-0.5" /> Gấp
                                            </span>
                                        )}
                                        {job.isFeatured && (
                                            <span className="badge badge-featured text-xs">
                                                <Star className="w-3 h-3 mr-0.5" /> Hot
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-base font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
                                    {job.title}
                                </h3>
                                <p className="text-sm text-slate-400 mb-3 flex items-center gap-1">
                                    {job.employer.companyName}
                                    {job.employer.isVerified && <span className="text-blue-400">✓</span>}
                                </p>

                                <div className="space-y-1.5 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                        {job.location}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        {formatTime(job.createdAt)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <span className="text-base font-bold text-green-400">
                                        {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}
                                    </span>
                                    {job.category && (
                                        <span className="badge badge-category text-xs">{job.category.name}</span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-10">
                            <button
                                onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                                disabled={filters.page === 1}
                                className="btn-secondary disabled:opacity-30"
                            >
                                ← Trước
                            </button>
                            <span className="px-4 py-2 text-sm text-slate-400">
                                Trang {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, filters.page + 1) })}
                                disabled={filters.page === pagination.totalPages}
                                className="btn-secondary disabled:opacity-30"
                            >
                                Tiếp →
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function JobsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>}>
            <JobsContent />
        </Suspense>
    );
}
