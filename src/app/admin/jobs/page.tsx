'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Briefcase, Search, Filter, Loader2, ChevronLeft,
    ChevronRight, RefreshCw, Eye, XCircle, CheckCircle2, Ban,
    AlertTriangle, MapPin, Users as UsersIcon, DollarSign, Calendar,
    TrendingUp, Star, Zap, Tag, Building2, Clock, BarChart3,
    ShieldAlert, Flag
} from 'lucide-react';

interface JobItem {
    id: string;
    title: string;
    description: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryNegotiable: boolean;
    location: string;
    jobType: string;
    status: string;
    isUrgent: boolean;
    isFeatured: boolean;
    viewCount: number;
    positions: number;
    hiredCount: number;
    createdAt: string;
    expiresAt: string | null;
    autoFlags: string[];
    isFlagged: boolean;
    applicationCount: number;
    isEmployerVerified: boolean;
    employer: {
        id: string;
        businessName: string;
        businessType: string | null;
        location: string;
    };
    category: { id: string; name: string } | null;
}

export default function AdminJobsPage() {
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [flaggedOnly, setFlaggedOnly] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
    const [actionLoading, setActionLoading] = useState('');

    const fetchJobs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            if (flaggedOnly) params.set('flagged', 'true');

            const res = await fetch(`/api/admin/jobs?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setJobs(data.data.jobs);
                setPagination(data.data.pagination);
            }
        } catch { /* silent */ }
        setLoading(false);
    }, [search, statusFilter, flaggedOnly]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const handleAction = async (jobId: string, action: string) => {
        setActionLoading(`${jobId}_${action}`);
        try {
            const res = await fetch('/api/admin/jobs', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ jobId, action }),
            });
            const data = await res.json();
            if (data.success) {
                fetchJobs(pagination.page);
                setSelectedJob(null);
            } else {
                alert(data.error);
            }
        } catch { alert('Lỗi kết nối'); }
        setActionLoading('');
    };

    const formatSalary = (min: number | null, max: number | null, negotiable: boolean) => {
        if (negotiable) return 'Thỏa thuận';
        if (!min && !max) return 'Chưa set';
        const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(0)}tr` : `${(n / 1000).toFixed(0)}k`;
        if (min && max) return `${fmt(min)} - ${fmt(max)}`;
        if (min) return `Từ ${fmt(min)}`;
        return `Đến ${fmt(max!)}`;
    };

    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
        CLOSED: 'bg-red-500/10 text-red-400 border-red-500/20',
        DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        EXPIRED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };

    const flagLabels: Record<string, { text: string; color: string }> = {
        HIGH_SALARY: { text: '💰 Lương cao bất thường', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
        NO_LOCATION: { text: '📍 Thiếu địa chỉ', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
        SENSITIVE_CONTENT: { text: '🚨 Nội dung nhạy cảm', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin" className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Briefcase className="w-7 h-7 text-purple-400" />
                        Quản lý tin tuyển dụng
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">{pagination.total} tin • Kiểm duyệt, quản lý tin tuyển dụng</p>
                </div>
                <button onClick={() => fetchJobs(pagination.page)} className="btn-secondary text-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Tìm theo tiêu đề, doanh nghiệp..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10"
                            onKeyDown={(e) => e.key === 'Enter' && fetchJobs(1)}
                        />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
                        <option value="">Tất cả status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="CLOSED">Closed</option>
                        <option value="DRAFT">Draft</option>
                        <option value="EXPIRED">Expired</option>
                    </select>
                    <button
                        onClick={() => setFlaggedOnly(!flaggedOnly)}
                        className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${flaggedOnly
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                            }`}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        {flaggedOnly ? '🚨 Flagged Only' : 'Flagged'}
                    </button>
                    <button onClick={() => fetchJobs(1)} className="btn-primary text-sm">
                        <Filter className="w-4 h-4" /> Lọc
                    </button>
                </div>
            </div>

            {/* Jobs List */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Đang tải...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="p-12 text-center">
                        <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400">Không tìm thấy tin nào</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-white/5">
                            {jobs.map(job => (
                                <div key={job.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="text-white font-semibold truncate">{job.title}</h3>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColors[job.status] || ''}`}>
                                                    {job.status}
                                                </span>
                                                {job.isUrgent && (
                                                    <span className="badge badge-urgent text-[10px] py-0">
                                                        <Zap className="w-3 h-3" /> GẤP
                                                    </span>
                                                )}
                                                {job.isFeatured && (
                                                    <span className="badge badge-featured text-[10px] py-0">
                                                        <Star className="w-3 h-3" /> HOT
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {job.employer.businessName}
                                                    {job.isEmployerVerified && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                                                </span>
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                                                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}</span>
                                                <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" />{job.applicationCount} ứng viên</span>
                                                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{job.viewCount} views</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(job.createdAt).toLocaleDateString('vi-VN')}</span>
                                            </div>

                                            {/* Auto flags */}
                                            {job.isFlagged && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {job.autoFlags.map((flag, i) => (
                                                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border ${flagLabels[flag]?.color || 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                                                            {flagLabels[flag]?.text || flag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => setSelectedJob(job)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white" title="Chi tiết">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {job.status === 'ACTIVE' ? (
                                                <button
                                                    onClick={() => handleAction(job.id, 'CLOSE')}
                                                    disabled={!!actionLoading}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400"
                                                    title="Close"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(job.id, 'REOPEN')}
                                                    disabled={!!actionLoading}
                                                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-slate-400 hover:text-green-400"
                                                    title="Reopen"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAction(job.id, 'TOGGLE_URGENT')}
                                                disabled={!!actionLoading}
                                                className={`p-1.5 rounded-lg transition-colors ${job.isUrgent ? 'text-red-400 bg-red-500/10' : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}
                                                title="Toggle Urgent"
                                            >
                                                <Zap className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleAction(job.id, 'TOGGLE_FEATURED')}
                                                disabled={!!actionLoading}
                                                className={`p-1.5 rounded-lg transition-colors ${job.isFeatured ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
                                                title="Toggle Featured"
                                            >
                                                <Star className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Trang {pagination.page}/{pagination.totalPages} • {pagination.total} tin
                            </span>
                            <div className="flex items-center gap-2">
                                <button disabled={pagination.page <= 1} onClick={() => fetchJobs(pagination.page - 1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchJobs(pagination.page + 1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Job Detail Modal */}
            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedJob(null)}>
                    <div className="glass-card w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ transform: 'none' }}>
                        <div className="p-5 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Chi tiết tin tuyển dụng</h3>
                                <button onClick={() => setSelectedJob(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <h4 className="text-xl text-white font-bold">{selectedJob.title}</h4>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColors[selectedJob.status]}`}>{selectedJob.status}</span>
                                    {selectedJob.isUrgent && <span className="badge badge-urgent text-[10px] py-0"><Zap className="w-3 h-3" /> GẤP</span>}
                                    {selectedJob.isFeatured && <span className="badge badge-featured text-[10px] py-0"><Star className="w-3 h-3" /> HOT</span>}
                                    {selectedJob.category && <span className="badge badge-category text-[10px] py-0"><Tag className="w-3 h-3" /> {selectedJob.category.name}</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">🏢 Doanh nghiệp</span>
                                    <p className="text-sm text-white font-medium">{selectedJob.employer.businessName}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">💰 Lương</span>
                                    <p className="text-sm text-green-400 font-semibold">{formatSalary(selectedJob.salaryMin, selectedJob.salaryMax, selectedJob.salaryNegotiable)}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">📍 Vị trí</span>
                                    <p className="text-sm text-white">{selectedJob.location}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">👥 Ứng viên</span>
                                    <p className="text-sm text-white font-bold">{selectedJob.applicationCount}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">👁 Lượt xem</span>
                                    <p className="text-sm text-white font-bold">{selectedJob.viewCount}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">✅ Đã tuyển</span>
                                    <p className="text-sm text-white">{selectedJob.hiredCount}/{selectedJob.positions}</p>
                                </div>
                            </div>

                            {selectedJob.isFlagged && (
                                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldAlert className="w-5 h-5 text-red-400" />
                                        <h5 className="font-semibold text-red-400">⚠️ Auto-Flag System</h5>
                                    </div>
                                    <div className="space-y-1">
                                        {selectedJob.autoFlags.map((flag, i) => (
                                            <p key={i} className="text-sm text-slate-300">
                                                • {flagLabels[flag]?.text || flag}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <h5 className="text-sm font-semibold text-slate-300 mb-2">Mô tả</h5>
                                <p className="text-sm text-slate-400 whitespace-pre-line line-clamp-6">{selectedJob.description}</p>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-2">
                                {selectedJob.status !== 'ACTIVE' && (
                                    <button onClick={() => handleAction(selectedJob.id, 'APPROVE')} className="btn-success text-sm justify-center py-2.5">
                                        <CheckCircle2 className="w-4 h-4" /> Approve
                                    </button>
                                )}
                                {selectedJob.status === 'ACTIVE' && (
                                    <button onClick={() => handleAction(selectedJob.id, 'CLOSE')} className="btn-danger text-sm justify-center py-2.5">
                                        <Ban className="w-4 h-4" /> Đóng tin
                                    </button>
                                )}
                                <button onClick={() => handleAction(selectedJob.id, 'TOGGLE_URGENT')} className="btn-secondary text-sm justify-center py-2.5">
                                    <Zap className="w-4 h-4" /> {selectedJob.isUrgent ? 'Bỏ GẤP' : 'Gắn GẤP'}
                                </button>
                                <button onClick={() => handleAction(selectedJob.id, 'TOGGLE_FEATURED')} className="btn-secondary text-sm justify-center py-2.5">
                                    <Star className="w-4 h-4" /> {selectedJob.isFeatured ? 'Bỏ HOT' : 'Gắn HOT'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
