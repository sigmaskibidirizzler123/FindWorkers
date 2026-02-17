'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, ScrollText, Search, Filter, Loader2, ChevronLeft,
    ChevronRight, RefreshCw, User, Clock, Activity, Shield,
    AlertTriangle
} from 'lucide-react';

interface LogItem {
    id: string;
    userId: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
    archivedAt: string | null;
    user: {
        id: string;
        email: string | null;
        phone: string | null;
        role: string;
        displayName: string;
    } | null;
}

const ACTION_COLORS: Record<string, string> = {
    USER: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    JOB: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    EMPLOYER: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    CATEGORY: 'text-green-400 bg-green-500/10 border-green-500/20',
    FEATURE: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    LOGIN: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    REGISTER: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function getActionColor(action: string) {
    for (const [key, value] of Object.entries(ACTION_COLORS)) {
        if (action.toUpperCase().includes(key)) return value;
    }
    return 'text-slate-400 bg-white/5 border-white/10';
}

const ACTION_ICONS: Record<string, string> = {
    USER: '👤',
    JOB: '💼',
    EMPLOYER: '🏢',
    CATEGORY: '📂',
    FEATURE: '🚀',
    LOGIN: '🔑',
    REGISTER: '📝',
    BAN: '🚫',
    SUSPEND: '⏸️',
    ACTIVATE: '✅',
    APPROVE: '✅',
    REJECT: '❌',
    DELETE: '🗑️',
    CREATE: '➕',
    UPDATE: '✏️',
    RESET: '🔄',
    VERIFY: '☑️',
};

function getActionIcon(action: string) {
    for (const [key, icon] of Object.entries(ACTION_ICONS)) {
        if (action.toUpperCase().includes(key)) return icon;
    }
    return '📋';
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '50' });
            if (actionFilter) params.set('action', actionFilter);
            if (entityFilter) params.set('entity', entityFilter);

            const res = await fetch(`/api/admin/logs?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setLogs(data.data.logs);
                setPagination(data.data.pagination);
            }
        } catch { /* silent */ }
        setLoading(false);
    }, [actionFilter, entityFilter]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const formatTime = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);

        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        if (diffHr < 24) return `${diffHr} giờ trước`;
        if (diffDay < 7) return `${diffDay} ngày trước`;
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin" className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <ScrollText className="w-7 h-7 text-rose-400" />
                        Nhật ký hoạt động
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">{pagination.total} records • Theo dõi mọi thao tác trong hệ thống</p>
                </div>
                <button onClick={() => fetchLogs(pagination.page)} className="btn-secondary text-sm">
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
                            placeholder="Tìm theo action..."
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="input-field pl-10"
                            onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                        />
                    </div>
                    <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
                        <option value="">Tất cả entities</option>
                        <option value="User">User</option>
                        <option value="Job">Job</option>
                        <option value="Employer">Employer</option>
                        <option value="Category">Category</option>
                        <option value="FeatureFlag">FeatureFlag</option>
                    </select>
                    <button onClick={() => fetchLogs(1)} className="btn-primary text-sm">
                        <Filter className="w-4 h-4" /> Lọc
                    </button>
                </div>
            </div>

            {/* Logs Timeline */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-400 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Đang tải...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <ScrollText className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400">Chưa có activity log nào</p>
                    </div>
                ) : (
                    <>
                        <div className="divide-y divide-white/5">
                            {logs.map((log, i) => (
                                <div key={log.id} className="px-5 py-4 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Timeline dot */}
                                        <div className="flex flex-col items-center mt-1">
                                            <div className="text-lg">{getActionIcon(log.action)}</div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-[11px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                                                    {log.entity}
                                                </span>
                                                {log.entityId && (
                                                    <code className="text-[10px] text-slate-600 font-mono">
                                                        #{log.entityId.slice(0, 8)}
                                                    </code>
                                                )}
                                            </div>

                                            {/* User info */}
                                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                                {log.user ? (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        <span className="text-slate-300 font-medium">{log.user.displayName}</span>
                                                        <span className="text-[10px] text-slate-500">({log.user.role})</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <Shield className="w-3 h-3" /> System
                                                    </span>
                                                )}
                                                {log.ipAddress && (
                                                    <span className="text-[10px] text-slate-600 font-mono">
                                                        IP: {log.ipAddress}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div className="mt-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] text-slate-500 font-mono">
                                                    {Object.entries(log.metadata)
                                                        .filter(([, v]) => v != null)
                                                        .map(([k, v], i) => (
                                                            <div key={i}>
                                                                <span className="text-slate-400">{k}:</span>{' '}
                                                                <span className="text-slate-300">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Timestamp */}
                                        <div className="text-right flex-shrink-0">
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(log.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Trang {pagination.page}/{pagination.totalPages} • {pagination.total} records
                            </span>
                            <div className="flex items-center gap-2">
                                <button disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchLogs(pagination.page + 1)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 disabled:opacity-30">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
