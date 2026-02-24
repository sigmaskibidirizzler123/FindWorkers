'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Briefcase, Users, Eye, UserCheck, Clock, TrendingUp,
    Plus, ChevronRight, MapPin, Zap, Star, BarChart3,
    CalendarDays, Building2, GitBranch, ArrowUpRight,
    Filter, MoreHorizontal, CheckCircle2, XCircle,
    Copy, Pencil, RotateCcw, Loader2, ChevronDown,
    Camera, Store
} from 'lucide-react';

interface DashboardStats {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    pendingReview: number;
    interviewScheduled: number;
    totalHired: number;
    totalViews: number;
    avgTimeToHire: number;
    conversionRate: number;
}

interface JobWithPipeline {
    id: string;
    title: string;
    location: string;
    city: string;
    positions: number;
    hiredCount: number;
    status: string;
    isUrgent: boolean;
    isFeatured: boolean;
    viewCount: number;
    createdAt: string;
    pipeline: {
        applied: number;
        reviewed: number;
        shortlisted: number;
        interview: number;
        hired: number;
        rejected: number;
    };
}

const DEFAULT_STATS: DashboardStats = {
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingReview: 0,
    interviewScheduled: 0,
    totalHired: 0,
    totalViews: 0,
    avgTimeToHire: 0,
    conversionRate: 0,
};

interface EmployerInfo {
    businessName: string;
    businessType: string | null;
    logoUrl: string | null;
    location: string;
}

export default function EmployerDashboardPage() {
    const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
    const [jobs, setJobs] = useState<JobWithPipeline[]>([]);
    const [filterStatus, setFilterStatus] = useState<'all' | 'ACTIVE' | 'CLOSED' | 'DRAFT'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [employer, setEmployer] = useState<EmployerInfo | null>(null);

    const fetchDashboard = async () => {
        try {
            const res = await fetch('/api/employer/dashboard', {
                credentials: 'include',
                cache: 'no-store'
            });
            const data = await res.json();
            if (data.success) {
                setStats(data.data.stats);
                setJobs(data.data.jobs);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEmployerProfile = async () => {
        try {
            const res = await fetch('/api/profile/employer', { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.data) {
                setEmployer({
                    businessName: data.data.businessName,
                    businessType: data.data.businessType,
                    logoUrl: data.data.logoUrl,
                    location: data.data.location,
                });
            }
        } catch {
            // No profile yet
        }
    };

    useEffect(() => {
        fetchDashboard();
        fetchEmployerProfile();
    }, []);

    // Action: Close / Reopen job
    const handleStatusChange = async (jobId: string, action: 'close' | 'reopen') => {
        setActionLoading(jobId);
        try {
            const res = await fetch(`/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (data.success) {
                // Refresh dashboard data
                await fetchDashboard();
            }
        } catch (error) {
            console.error('Status change error:', error);
        } finally {
            setActionLoading(null);
        }
    };

    // Action: Duplicate job
    const handleDuplicate = async (job: JobWithPipeline) => {
        setActionLoading(job.id + '-dup');
        try {
            const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    title: `${job.title} (bản sao)`,
                    description: '(Nhân bản từ tin cũ)',
                    location: job.location,
                    city: job.city,
                    positions: job.positions,
                    isUrgent: job.isUrgent,
                }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchDashboard();
            }
        } catch (error) {
            console.error('Duplicate error:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredJobs = filterStatus === 'all'
        ? jobs
        : jobs.filter((j) => j.status === filterStatus);

    const kpiCards = [
        { icon: Briefcase, label: 'Job đang mở', value: stats.activeJobs, total: stats.totalJobs, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
        { icon: Users, label: 'Tổng ứng viên', value: stats.totalApplications, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-500/10' },
        { icon: Clock, label: 'Chờ xem', value: stats.pendingReview, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', alert: stats.pendingReview > 10 },
        { icon: CalendarDays, label: 'Phỏng vấn', value: stats.interviewScheduled, color: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-500/10' },
        { icon: UserCheck, label: 'Đã tuyển', value: stats.totalHired, color: 'from-green-500 to-emerald-500', bg: 'bg-green-500/10' },
        { icon: Eye, label: 'Lượt xem', value: stats.totalViews.toLocaleString(), color: 'from-sky-500 to-blue-500', bg: 'bg-sky-500/10' },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* ── Employer Profile Card ── */}
            <div className="glass-card p-5 mb-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Logo */}
                        <Link href="/employer/profile" className="group relative flex-shrink-0">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center overflow-hidden border-2 border-white/10 group-hover:border-blue-500/40 transition-all">
                                {employer?.logoUrl ? (
                                    <img src={employer.logoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-7 h-7 text-slate-300" />
                                )}
                            </div>
                            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-white">
                                {employer?.businessName || 'Dashboard Tuyển dụng'}
                            </h1>
                            <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                                {employer?.businessType && (
                                    <span className="flex items-center gap-1">
                                        <Store className="w-3.5 h-3.5" /> {employer.businessType}
                                    </span>
                                )}
                                {employer?.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" /> {employer.location}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Link href="/employer/profile" className="btn-secondary text-sm">
                            <Pencil className="w-3.5 h-3.5" /> Hồ sơ
                        </Link>
                        <Link href="/employer/branches" className="btn-secondary text-sm">
                            <GitBranch className="w-3.5 h-3.5" /> Chi nhánh
                        </Link>
                        <Link href="/employer/jobs/create" className="btn-primary text-sm">
                            <Plus className="w-4 h-4" /> Đăng tin mới
                        </Link>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {kpiCards.map((kpi, i) => (
                    <div key={i} className="glass-card p-4 relative overflow-hidden group">
                        <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                            <kpi.icon className={`w-5 h-5 bg-gradient-to-br ${kpi.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'unset' }} />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {kpi.value}
                            {'total' in kpi && kpi.total && (
                                <span className="text-sm font-normal text-slate-500">/{kpi.total}</span>
                            )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{kpi.label}</div>
                        {'alert' in kpi && kpi.alert && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                    </div>
                ))}
            </div>

            {/* KPI Performance Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-400">Thời gian tuyển TB</span>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.avgTimeToHire}<span className="text-sm font-normal text-slate-500 ml-1">ngày</span></div>
                    <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: `${Math.min(100, (10 - stats.avgTimeToHire) * 10)}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Mục tiêu: dưới 7 ngày</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-400">Tỷ lệ chuyển đổi</span>
                        <BarChart3 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.conversionRate}<span className="text-sm font-normal text-slate-500 ml-1">%</span></div>
                    <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${stats.conversionRate}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Ứng tuyển → Tuyển</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-slate-400">Ứng viên chưa phản hồi</span>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.pendingReview}</div>
                    <div className="mt-3">
                        {stats.pendingReview > 5 ? (
                            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">⚠ Cần xem xét sớm</span>
                        ) : (
                            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">✓ Đang tốt</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Job Listings with Pipeline */}
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-400" />
                    Danh sách vị trí tuyển dụng
                </h2>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as 'all' | 'ACTIVE' | 'CLOSED' | 'DRAFT')}
                        className="input-field !w-auto !py-1.5 !px-3 text-sm !rounded-lg"
                        id="job-filter-status"
                    >
                        <option value="all">Tất cả ({jobs.length})</option>
                        <option value="ACTIVE">Đang mở ({jobs.filter(j => j.status === 'ACTIVE').length})</option>
                        <option value="CLOSED">Đã đóng ({jobs.filter(j => j.status === 'CLOSED').length})</option>
                        <option value="DRAFT">Bản nháp ({jobs.filter(j => j.status === 'DRAFT').length})</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                        <p className="text-slate-400 text-sm mt-4">Đang tải...</p>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">Chưa có tin tuyển dụng nào</p>
                        <Link href="/employer/jobs/create" className="btn-primary mt-4 inline-flex">
                            <Plus className="w-4 h-4" /> Đăng tin đầu tiên
                        </Link>
                    </div>
                ) : (
                    filteredJobs.map((job) => (
                        <JobPipelineCard
                            key={job.id}
                            job={job}
                            actionLoading={actionLoading}
                            onStatusChange={handleStatusChange}
                            onDuplicate={handleDuplicate}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function JobPipelineCard({ job, actionLoading, onStatusChange, onDuplicate }: {
    job: JobWithPipeline;
    actionLoading: string | null;
    onStatusChange: (jobId: string, action: 'close' | 'reopen') => void;
    onDuplicate: (job: JobWithPipeline) => void;
}) {
    const [showActions, setShowActions] = useState(false);
    const totalPipeline = Object.values(job.pipeline).reduce((s, v) => s + v, 0);
    const isActive = job.status === 'ACTIVE';
    const isDraft = job.status === 'DRAFT';
    const progress = job.positions > 0 ? (job.hiredCount / job.positions) * 100 : 0;
    const isActionLoading = actionLoading === job.id || actionLoading === job.id + '-dup';

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    const pipelineSteps = [
        { key: 'applied', label: 'Mới', count: job.pipeline.applied, color: 'bg-blue-500' },
        { key: 'reviewed', label: 'Đã xem', count: job.pipeline.reviewed, color: 'bg-sky-500' },
        { key: 'shortlisted', label: 'Chọn', count: job.pipeline.shortlisted, color: 'bg-yellow-500' },
        { key: 'interview', label: 'PV', count: job.pipeline.interview, color: 'bg-purple-500' },
        { key: 'hired', label: 'Tuyển', count: job.pipeline.hired, color: 'bg-green-500' },
        { key: 'rejected', label: 'Loại', count: job.pipeline.rejected, color: 'bg-red-500/60' },
    ];

    const statusBadge = () => {
        if (isActive) return <span className="badge text-[11px] bg-green-500/20 text-green-400 border border-green-500/30">● Đang tuyển</span>;
        if (isDraft) return <span className="badge text-[11px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">● Bản nháp</span>;
        return <span className="badge text-[11px] bg-slate-500/20 text-slate-400 border border-slate-500/30"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Đã đóng</span>;
    };

    return (
        <div className={`glass-card p-5 transition-all ${!isActive && !isDraft ? 'opacity-60 hover:opacity-80' : ''}`}>
            {/* Job Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white text-lg">{job.title}</h3>
                            {statusBadge()}
                            {job.isUrgent && (
                                <span className="badge badge-urgent text-[11px]">
                                    <Zap className="w-3 h-3 mr-0.5" /> Gấp
                                </span>
                            )}
                            {job.isFeatured && (
                                <span className="badge badge-featured text-[11px]">
                                    <Star className="w-3 h-3 mr-0.5" /> Hot
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.city || job.location}</span>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {job.viewCount} lượt xem</span>
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {totalPipeline} ứng viên</span>
                            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(job.createdAt)}</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {totalPipeline > 0 && (
                        <Link
                            href={`/employer/jobs/${job.id}/applications`}
                            className="btn-primary text-xs py-1.5 px-3"
                        >
                            Xem CV <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    )}

                    {/* Status toggle */}
                    {isActive ? (
                        <button
                            onClick={() => onStatusChange(job.id, 'close')}
                            disabled={isActionLoading}
                            className="btn-secondary text-xs py-1.5 px-3 !text-red-400 hover:!bg-red-500/10 disabled:opacity-50"
                            title="Đóng tin"
                        >
                            {actionLoading === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Đóng tin
                        </button>
                    ) : (
                        <button
                            onClick={() => onStatusChange(job.id, 'reopen')}
                            disabled={isActionLoading}
                            className="btn-secondary text-xs py-1.5 px-3 !text-green-400 hover:!bg-green-500/10 disabled:opacity-50"
                            title="Mở lại"
                        >
                            {actionLoading === job.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                            Mở lại
                        </button>
                    )}

                    {/* More actions dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowActions(!showActions)}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {showActions && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                                <div className="absolute right-0 top-full mt-1 z-20 w-44 glass-card overflow-hidden shadow-2xl border border-white/10">
                                    <Link
                                        href={`/employer/jobs/${job.id}/edit`}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                                        onClick={() => setShowActions(false)}
                                    >
                                        <Pencil className="w-3.5 h-3.5" /> Chỉnh sửa
                                    </Link>
                                    <button
                                        onClick={() => { onDuplicate(job); setShowActions(false); }}
                                        disabled={isActionLoading}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors w-full text-left disabled:opacity-50"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> Nhân bản
                                    </button>
                                    <Link
                                        href={`/jobs/${job.id}`}
                                        target="_blank"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                                        onClick={() => setShowActions(false)}
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Xem public
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Hiring Progress */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Tiến độ tuyển dụng</span>
                    <span className="text-white font-semibold">{job.hiredCount}/{job.positions} vị trí</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Pipeline Funnel */}
            <div className="grid grid-cols-6 gap-2">
                {pipelineSteps.map((step) => (
                    <div
                        key={step.key}
                        className="text-center p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                    >
                        <div className={`w-6 h-6 ${step.color} rounded-lg flex items-center justify-center mx-auto mb-1`}>
                            <span className="text-[10px] font-bold text-white">{step.count}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{step.label}</div>
                    </div>
                ))}
            </div>

            {/* Pipeline Bar */}
            {totalPipeline > 0 && (
                <div className="mt-3 flex h-1.5 rounded-full overflow-hidden bg-white/5">
                    {pipelineSteps.filter(s => s.count > 0).map((step) => (
                        <div
                            key={step.key}
                            className={`${step.color} transition-all`}
                            style={{ width: `${(step.count / totalPipeline) * 100}%` }}
                            title={`${step.label}: ${step.count}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
