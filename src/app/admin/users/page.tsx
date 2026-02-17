'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Users, Search, Filter, Shield, Ban, Unlock, KeyRound,
    CheckCircle2, XCircle, AlertTriangle, Eye, Loader2, ChevronLeft,
    ChevronRight, RefreshCw, User, Briefcase, Phone, Mail, MapPin,
    Calendar, Activity, BadgeCheck, Clock
} from 'lucide-react';

interface UserItem {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    isVerified: boolean;
    lastLoginAt: string | null;
    lastLoginIP: string | null;
    createdAt: string;
    status: string;
    flags: string[];
    displayName: string;
    jobCount: number;
    applicationCount: number;
    candidateProfile?: {
        fullName: string;
        currentLocation?: string;
        desiredJob?: string;
    } | null;
    employerProfile?: {
        businessName: string;
        businessType?: string;
        location?: string;
    } | null;
}

interface Pagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
    const [actionLoading, setActionLoading] = useState('');
    const [actionReason, setActionReason] = useState('');

    const fetchUsers = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (search) params.set('search', search);
            if (roleFilter) params.set('role', roleFilter);
            if (statusFilter) params.set('status', statusFilter);

            const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setUsers(data.data.users);
                setPagination(data.data.pagination);
            }
        } catch { /* silent */ }
        setLoading(false);
    }, [search, roleFilter, statusFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleAction = async (userId: string, action: string) => {
        if (action === 'BAN' && !confirm('Bạn có chắc muốn BAN user này? Hành động này sẽ khóa vĩnh viễn.')) return;

        setActionLoading(`${userId}_${action}`);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ userId, action, reason: actionReason }),
            });
            const data = await res.json();
            if (data.success) {
                fetchUsers(pagination.page);
                setSelectedUser(null);
                setActionReason('');
            } else {
                alert(data.error);
            }
        } catch {
            alert('Lỗi kết nối');
        }
        setActionLoading('');
    };

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
            SUSPENDED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            BANNED: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        const labels: Record<string, string> = {
            ACTIVE: '✅ Active',
            SUSPENDED: '⏸️ Suspended',
            BANNED: '🚫 Banned',
        };
        return (
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${styles[status] || ''}`}>
                {labels[status] || status}
            </span>
        );
    };

    const roleBadge = (role: string) => {
        const styles: Record<string, string> = {
            ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            EMPLOYER: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            CANDIDATE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        };
        return (
            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${styles[role] || ''}`}>
                {role}
            </span>
        );
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
                        <Users className="w-7 h-7 text-blue-400" />
                        Quản lý người dùng
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {pagination.total} users • Xem, khóa, phân quyền tài khoản
                    </p>
                </div>
                <button onClick={() => fetchUsers(pagination.page)} className="btn-secondary text-sm">
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
                            placeholder="Tìm theo tên, SĐT, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-10"
                            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
                        />
                    </div>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
                        <option value="">Tất cả roles</option>
                        <option value="CANDIDATE">Candidate</option>
                        <option value="EMPLOYER">Employer</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
                        <option value="">Tất cả status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="BANNED">Banned</option>
                    </select>
                    <button onClick={() => fetchUsers(1)} className="btn-primary text-sm">
                        <Filter className="w-4 h-4" /> Lọc
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400">Không tìm thấy user nào</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        <th className="text-left p-4 text-slate-400 font-medium">User</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Liên hệ</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Role</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Trạng thái</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Hoạt động</th>
                                        <th className="text-left p-4 text-slate-400 font-medium">Ngày tạo</th>
                                        <th className="text-right p-4 text-slate-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${user.role === 'ADMIN' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                                                            user.role === 'EMPLOYER' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                                                'bg-gradient-to-br from-emerald-500 to-teal-600'
                                                        }`}>
                                                        {user.displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium truncate max-w-[180px]">
                                                            {user.displayName}
                                                            {user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 inline ml-1" />}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 font-mono">ID: {user.id.slice(0, 8)}...</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="space-y-0.5">
                                                    {user.phone && <div className="text-xs text-slate-400 flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone}</div>}
                                                    {user.email && <div className="text-xs text-slate-400 flex items-center gap-1 truncate max-w-[180px]"><Mail className="w-3 h-3" />{user.email}</div>}
                                                </div>
                                            </td>
                                            <td className="p-4">{roleBadge(user.role)}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5">
                                                    {statusBadge(user.status)}
                                                    {user.flags.map((f, i) => (
                                                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                            ⚠️ {f}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="space-y-0.5 text-xs text-slate-400">
                                                    {user.role === 'EMPLOYER' && (
                                                        <div className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{user.jobCount} jobs</div>
                                                    )}
                                                    {user.role === 'CANDIDATE' && (
                                                        <div className="flex items-center gap-1"><Activity className="w-3 h-3" />{user.applicationCount} applies</div>
                                                    )}
                                                    {user.lastLoginAt && (
                                                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(user.lastLoginAt).toLocaleDateString('vi-VN')}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs text-slate-500">
                                                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setSelectedUser(user)}
                                                        className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                                                        title="Chi tiết"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {user.role !== 'ADMIN' && (
                                                        <>
                                                            {user.status === 'ACTIVE' ? (
                                                                <button
                                                                    onClick={() => handleAction(user.id, 'SUSPEND')}
                                                                    disabled={actionLoading === `${user.id}_SUSPEND`}
                                                                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 transition-colors"
                                                                    title="Suspend"
                                                                >
                                                                    {actionLoading === `${user.id}_SUSPEND` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAction(user.id, 'ACTIVATE')}
                                                                    disabled={actionLoading === `${user.id}_ACTIVATE`}
                                                                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-slate-400 hover:text-green-400 transition-colors"
                                                                    title="Activate"
                                                                >
                                                                    {actionLoading === `${user.id}_ACTIVATE` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleAction(user.id, 'RESET_PASSWORD')}
                                                                disabled={actionLoading === `${user.id}_RESET_PASSWORD`}
                                                                className="p-1.5 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition-colors"
                                                                title="Reset password"
                                                            >
                                                                {actionLoading === `${user.id}_RESET_PASSWORD` ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden divide-y divide-white/5">
                            {users.map(user => (
                                <div key={user.id} className="p-4 hover:bg-white/[0.02]" onClick={() => setSelectedUser(user)}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${user.role === 'ADMIN' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                                                user.role === 'EMPLOYER' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                                    'bg-gradient-to-br from-emerald-500 to-teal-600'
                                            }`}>
                                            {user.displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold truncate">
                                                {user.displayName}
                                                {user.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400 inline ml-1" />}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {roleBadge(user.role)}
                                                {statusBadge(user.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        {user.phone && <span>📱 {user.phone}</span>}
                                        <span>📅 {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Trang {pagination.page}/{pagination.totalPages} • {pagination.total} users
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={pagination.page <= 1}
                                    onClick={() => fetchUsers(pagination.page - 1)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => fetchUsers(pagination.page + 1)}
                                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
                    <div className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ transform: 'none' }}>
                        <div className="p-5 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Chi tiết User</h3>
                                <button onClick={() => setSelectedUser(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl ${selectedUser.role === 'ADMIN' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                                        selectedUser.role === 'EMPLOYER' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' :
                                            'bg-gradient-to-br from-emerald-500 to-teal-600'
                                    }`}>
                                    {selectedUser.displayName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-lg">{selectedUser.displayName}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {roleBadge(selectedUser.role)}
                                        {statusBadge(selectedUser.status)}
                                        {selectedUser.isVerified && (
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                ✅ Verified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">📱 SĐT</span>
                                    <p className="text-sm text-white font-mono">{selectedUser.phone || 'N/A'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">📧 Email</span>
                                    <p className="text-sm text-white truncate">{selectedUser.email || 'N/A'}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">📅 Ngày tạo</span>
                                    <p className="text-sm text-white">{new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <span className="text-[11px] text-slate-500 block mb-1">🕐 Đăng nhập cuối</span>
                                    <p className="text-sm text-white">
                                        {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString('vi-VN') : 'Chưa đăng nhập'}
                                    </p>
                                </div>
                                {selectedUser.role === 'EMPLOYER' && (
                                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                        <span className="text-[11px] text-slate-500 block mb-1">💼 Số tin đăng</span>
                                        <p className="text-sm text-white font-bold">{selectedUser.jobCount}</p>
                                    </div>
                                )}
                                {selectedUser.role === 'CANDIDATE' && (
                                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                        <span className="text-[11px] text-slate-500 block mb-1">📋 Lần ứng tuyển</span>
                                        <p className="text-sm text-white font-bold">{selectedUser.applicationCount}</p>
                                    </div>
                                )}
                                {selectedUser.lastLoginIP && (
                                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                        <span className="text-[11px] text-slate-500 block mb-1">🌐 IP cuối</span>
                                        <p className="text-sm text-white font-mono">{selectedUser.lastLoginIP}</p>
                                    </div>
                                )}
                            </div>

                            {selectedUser.flags.length > 0 && (
                                <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm font-semibold text-orange-400">Cảnh báo</span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        {selectedUser.flags.join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Action buttons */}
                            {selectedUser.role !== 'ADMIN' && (
                                <div className="pt-3 border-t border-white/5 space-y-3">
                                    <div>
                                        <label className="input-label text-xs">Lý do (không bắt buộc)</label>
                                        <input
                                            type="text"
                                            value={actionReason}
                                            onChange={(e) => setActionReason(e.target.value)}
                                            className="input-field text-sm"
                                            placeholder="VD: Spam quá nhiều, vi phạm điều khoản..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedUser.status === 'ACTIVE' ? (
                                            <>
                                                <button onClick={() => handleAction(selectedUser.id, 'SUSPEND')} className="btn-secondary text-sm justify-center py-2.5">
                                                    <Ban className="w-4 h-4" /> Suspend
                                                </button>
                                                <button onClick={() => handleAction(selectedUser.id, 'BAN')} className="btn-danger text-sm justify-center py-2.5">
                                                    <XCircle className="w-4 h-4" /> Ban vĩnh viễn
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleAction(selectedUser.id, 'ACTIVATE')} className="btn-success text-sm justify-center py-2.5 col-span-2">
                                                <Unlock className="w-4 h-4" /> Kích hoạt lại
                                            </button>
                                        )}
                                        <button onClick={() => handleAction(selectedUser.id, 'RESET_PASSWORD')} className="btn-secondary text-sm justify-center py-2.5">
                                            <KeyRound className="w-4 h-4" /> Reset MK
                                        </button>
                                        {!selectedUser.isVerified ? (
                                            <button onClick={() => handleAction(selectedUser.id, 'VERIFY')} className="btn-primary text-sm justify-center py-2.5">
                                                <CheckCircle2 className="w-4 h-4" /> Xác minh
                                            </button>
                                        ) : (
                                            <button onClick={() => handleAction(selectedUser.id, 'UNVERIFY')} className="btn-secondary text-sm justify-center py-2.5">
                                                <Shield className="w-4 h-4" /> Bỏ xác minh
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
