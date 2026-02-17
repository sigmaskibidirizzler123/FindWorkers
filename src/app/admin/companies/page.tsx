'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Building2, Search, Filter, Loader2, ChevronLeft,
    ChevronRight, RefreshCw, Eye, XCircle, CheckCircle2, Ban,
    BadgeCheck, MapPin, Phone, Mail, Calendar, Briefcase,
    TrendingUp, Heart, Users, Shield, Unlock, Star, Activity
} from 'lucide-react';

interface EmployerItem {
    id: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
    lastLoginAt: string | null;
    status: string;
    healthScore: number;
    activeJobs: number;
    totalApplications: number;
    hiredCount: number;
    employerProfile: {
        id: string;
        businessName: string;
        businessType: string | null;
        location: string;
        address: string;
        phone: string;
        description: string | null;
        _count: { jobs: number };
    } | null;
}

export default function AdminCompaniesPage() {
    const [employers, setEmployers] = useState<EmployerItem[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedEmployer, setSelectedEmployer] = useState<EmployerItem | null>(null);
    const [actionLoading, setActionLoading] = useState('');

    const fetchCompanies = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);

            const res = await fetch(`/api/admin/companies?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setEmployers(data.data.employers);
                setPagination(data.data.pagination);
            }
        } catch { /* silent */ }
        setLoading(false);
    }, [search, statusFilter]);

    useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

    const handleAction = async (userId: string, action: string) => {
        setActionLoading(`${userId}_${action}`);
        try {
            const res = await fetch('/api/admin/companies', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId, action }),
            });
            const data = await res.json();
            if (data.success) {
                fetchCompanies(pagination.page);
                setSelectedEmployer(null);
            } else {
                alert(data.error);
            }
        } catch { alert('Lỗi kết nối'); }
        setActionLoading('');
    };

    const healthColor = (score: number) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-red-400';
    };

    const healthBg = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 50) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const statusStyles: Record<string, string> = {
        PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
        SUSPENDED: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    const statusLabels: Record<string, string> = {
        PENDING: '⏳ Chờ duyệt',
        APPROVED: '✅ Đã duyệt',
        SUSPENDED: '🚫 Bị khóa',
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
                        <Building2 className="w-7 h-7 text-amber-400" />
                        Quản lý doanh nghiệp
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">{pagination.total} doanh nghiệp • Xác minh, quản lý hồ sơ</p>
                </div>
                <button onClick={() => fetchCompanies(pagination.page)} className="btn-secondary text-sm">
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
                            placeholder="Tìm theo tên DN, SĐT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10"
                            onKeyDown={(e) => e.key === 'Enter' && fetchCompanies(1)}
                        />
                    </div>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
                        <option value="">Tất cả</option>
                        <option value="PENDING">⏳ Chờ duyệt</option>
                        <option value="APPROVED">✅ Đã duyệt</option>
                        <option value="SUSPENDED">🚫 Bị khóa</option>
                    </select>
                    <button onClick={() => fetchCompanies(1)} className="btn-primary text-sm">
                        <Filter className="w-4 h-4" /> Lọc
                    </button>
                </div>
            </div>

            {/* Employers Grid */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Đang tải...</p>
                    </div>
                ) : employers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building2 className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400">Không tìm thấy doanh nghiệp nào</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-white/5">
                            {employers.map(emp => (
                                <div key={emp.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-6 h-6 text-amber-400" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-semibold truncate">
                                                    {emp.employerProfile?.businessName || 'Chưa có profile'}
                                                </h3>
                                                {emp.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusStyles[emp.status]}`}>
                                                    {statusLabels[emp.status]}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                                {emp.employerProfile?.businessType && (
                                                    <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full text-[10px] border border-purple-500/20">
                                                        {emp.employerProfile.businessType}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{emp.employerProfile?.location || 'N/A'}</span>
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{emp.phone || emp.employerProfile?.phone}</span>
                                                <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{emp.employerProfile?._count?.jobs || 0} jobs</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(emp.createdAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </div>

                                        {/* Health Score */}
                                        <div className="flex flex-col items-center gap-1 flex-shrink-0 mr-4">
                                            <div className={`text-lg font-bold ${healthColor(emp.healthScore)}`}>
                                                {emp.healthScore}
                                            </div>
                                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${healthBg(emp.healthScore)}`} style={{ width: `${emp.healthScore}%` }} />
                                            </div>
                                            <span className="text-[10px] text-slate-500">Health</span>
                                        </div>

                                        {/* Quick Stats */}
                                        <div className="hidden md:flex items-center gap-4 text-center flex-shrink-0">
                                            <div>
                                                <p className="text-lg font-bold text-white">{emp.activeJobs}</p>
                                                <p className="text-[10px] text-slate-500">Active</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-white">{emp.totalApplications}</p>
                                                <p className="text-[10px] text-slate-500">Applies</p>
                                            </div>
                                            <div>
                                                <p className="text-lg font-bold text-green-400">{emp.hiredCount}</p>
                                                <p className="text-[10px] text-slate-500">Hired</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={() => setSelectedEmployer(emp)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white" title="Chi tiết">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {emp.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleAction(emp.id, 'APPROVE')}
                                                    disabled={!!actionLoading}
                                                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-slate-400 hover:text-green-400"
                                                    title="Approve"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            {emp.isActive ? (
                                                <button
                                                    onClick={() => handleAction(emp.id, 'SUSPEND')}
                                                    disabled={!!actionLoading}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400"
                                                    title="Suspend"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(emp.id, 'ACTIVATE')}
                                                    disabled={!!actionLoading}
                                                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-slate-400 hover:text-green-400"
                                                    title="Activate"
                                                >
                                                    <Unlock className="w-4 h-4" />
                                                </button>
                                            )}
                                            {!emp.isVerified ? (
                                                <button
                                                    onClick={() => handleAction(emp.id, 'VERIFY')}
                                                    disabled={!!actionLoading}
                                                    className="p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-400"
                                                    title="Verify"
                                                >
                                                    <BadgeCheck className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAction(emp.id, 'UNVERIFY')}
                                                    disabled={!!actionLoading}
                                                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-blue-400 hover:text-amber-400"
                                                    title="Unverify"
                                                >
                                                    <Shield className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Trang {pagination.page}/{pagination.totalPages} • {pagination.total} doanh nghiệp
                            </span>
                            <div className="flex items-center gap-2">
                                <button disabled={pagination.page <= 1} onClick={() => fetchCompanies(pagination.page - 1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchCompanies(pagination.page + 1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Employer Detail Modal */}
            {selectedEmployer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEmployer(null)}>
                    <div className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ transform: 'none' }}>
                        <div className="p-5 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Chi tiết doanh nghiệp</h3>
                                <button onClick={() => setSelectedEmployer(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Header */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                                    <Building2 className="w-7 h-7 text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-lg">
                                        {selectedEmployer.employerProfile?.businessName || 'N/A'}
                                        {selectedEmployer.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400 inline ml-2" />}
                                    </h4>
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusStyles[selectedEmployer.status]}`}>
                                        {statusLabels[selectedEmployer.status]}
                                    </span>
                                </div>
                            </div>

                            {/* Health Score */}
                            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-white flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-pink-400" /> Employer Health Score
                                    </span>
                                    <span className={`text-2xl font-bold ${healthColor(selectedEmployer.healthScore)}`}>
                                        {selectedEmployer.healthScore}/100
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${healthBg(selectedEmployer.healthScore)}`} style={{ width: `${selectedEmployer.healthScore}%` }} />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-white">{selectedEmployer.activeJobs}</p>
                                        <p className="text-[11px] text-slate-500">Jobs Active</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-white">{selectedEmployer.totalApplications}</p>
                                        <p className="text-[11px] text-slate-500">Applications</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-green-400">{selectedEmployer.hiredCount}</p>
                                        <p className="text-[11px] text-slate-500">Hired</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">📱 SĐT</span>
                                    <p className="text-sm text-white font-mono">{selectedEmployer.phone || selectedEmployer.employerProfile?.phone || 'N/A'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">📧 Email</span>
                                    <p className="text-sm text-white truncate">{selectedEmployer.email || 'N/A'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">🏢 Loại hình</span>
                                    <p className="text-sm text-white">{selectedEmployer.employerProfile?.businessType || 'N/A'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">📍 Khu vực</span>
                                    <p className="text-sm text-white">{selectedEmployer.employerProfile?.location || 'N/A'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 col-span-2">
                                    <span className="text-[11px] text-slate-500 block mb-1">🏠 Địa chỉ</span>
                                    <p className="text-sm text-white">{selectedEmployer.employerProfile?.address || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                                {selectedEmployer.status === 'PENDING' && (
                                    <>
                                        <button onClick={() => handleAction(selectedEmployer.id, 'APPROVE')} className="btn-success text-sm justify-center py-2.5">
                                            <CheckCircle2 className="w-4 h-4" /> Phê duyệt
                                        </button>
                                        <button onClick={() => handleAction(selectedEmployer.id, 'REJECT')} className="btn-danger text-sm justify-center py-2.5">
                                            <XCircle className="w-4 h-4" /> Từ chối
                                        </button>
                                    </>
                                )}
                                {selectedEmployer.isActive && selectedEmployer.status !== 'PENDING' && (
                                    <button onClick={() => handleAction(selectedEmployer.id, 'SUSPEND')} className="btn-danger text-sm justify-center py-2.5">
                                        <Ban className="w-4 h-4" /> Khóa DN
                                    </button>
                                )}
                                {!selectedEmployer.isActive && (
                                    <button onClick={() => handleAction(selectedEmployer.id, 'ACTIVATE')} className="btn-success text-sm justify-center py-2.5">
                                        <Unlock className="w-4 h-4" /> Mở khóa
                                    </button>
                                )}
                                {!selectedEmployer.isVerified ? (
                                    <button onClick={() => handleAction(selectedEmployer.id, 'VERIFY')} className="btn-primary text-sm justify-center py-2.5">
                                        <BadgeCheck className="w-4 h-4" /> Xác minh ✅
                                    </button>
                                ) : (
                                    <button onClick={() => handleAction(selectedEmployer.id, 'UNVERIFY')} className="btn-secondary text-sm justify-center py-2.5">
                                        <Shield className="w-4 h-4" /> Bỏ xác minh
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
