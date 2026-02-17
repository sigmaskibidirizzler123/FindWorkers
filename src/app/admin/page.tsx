'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Shield, ToggleLeft, ToggleRight, Users, Briefcase,
    Building2, Bell, BarChart3, Activity, Plus, Settings,
    Database, Layers, ArrowRight, RefreshCw, TrendingUp,
    Phone, Mail, Lock, MapPin, Loader2, CheckCircle2,
    Copy, X, AlertCircle, UserPlus
} from 'lucide-react';

interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string | null;
    isEnabled: boolean;
}

interface CreatedEmployer {
    credentials: {
        phone: string;
        email: string | null;
        password: string;
    };
    profile: {
        businessName: string;
        location: string;
    };
}

interface EmployerItem {
    id: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
    employerProfile: {
        id: string;
        businessName: string;
        businessType: string | null;
        location: string;
        phone: string;
    } | null;
}

const DEFAULT_FLAGS = [
    { key: 'matching_score', name: 'Matching Score', description: 'Tính điểm phù hợp ứng viên - job' },
    { key: 'auto_screening', name: 'Auto Screening', description: 'Câu hỏi sàng lọc tự động cho ứng viên' },
    { key: 'auto_close_jobs', name: 'Auto Close Jobs', description: 'Tự động đóng tin khi đủ người' },
    { key: 'notifications', name: 'Notifications', description: 'Hệ thống thông báo cho user' },
    { key: 'ai_recommendations', name: 'AI Recommendations', description: 'Gợi ý việc/ứng viên bằng AI' },
    { key: 'multi_branch', name: 'Multi Branch', description: 'Hỗ trợ nhiều chi nhánh cho doanh nghiệp' },
    { key: 'kpi_dashboard', name: 'KPI Dashboard', description: 'Dashboard hiệu quả tuyển dụng' },
    { key: 'candidate_preferred_categories', name: 'Preferred Categories', description: 'Ứng viên chọn ngành mong muốn' },
];

const ADMIN_LINKS = [
    { icon: Users, label: 'Quản lý người dùng', href: '/admin/users', color: 'from-blue-500 to-cyan-500', desc: 'Xem, khóa, phân quyền tài khoản' },
    { icon: Briefcase, label: 'Quản lý tin tuyển dụng', href: '/admin/jobs', color: 'from-purple-500 to-pink-500', desc: 'Kiểm duyệt, xóa tin vi phạm' },
    { icon: Building2, label: 'Quản lý doanh nghiệp', href: '/admin/companies', color: 'from-amber-500 to-orange-500', desc: 'Xác minh, quản lý hồ sơ DN' },
    { icon: Layers, label: 'Quản lý danh mục', href: '/admin/categories', color: 'from-green-500 to-emerald-500', desc: 'Thêm, sửa ngành nghề' },
    { icon: BarChart3, label: 'Thống kê hệ thống', href: '/admin/analytics', color: 'from-indigo-500 to-violet-500', desc: 'Biểu đồ, KPIs toàn hệ thống' },
    { icon: Activity, label: 'Activity Logs', href: '/admin/logs', color: 'from-rose-500 to-red-500', desc: 'Lịch sử hoạt động, audit trail' },
];

const BUSINESS_TYPES = [
    'Khách sạn', 'Nhà hàng', 'Cafe', 'Resort', 'Spa', 'Karaoke',
    'Bar/Pub', 'Siêu thị', 'Cửa hàng', 'Xây dựng', 'Vận tải', 'Khác'
];

const LOCATIONS = [
    'Dương Đông', 'An Thới', 'Dương Tơ', 'Cửa Dương', 'Cửa Cạn',
    'Gành Dầu', 'Bãi Thơm', 'Phú Quốc', 'Hàm Ninh', 'Thổ Châu'
];

export default function AdminDashboardPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // ═══ CREATE EMPLOYER STATE ═══
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createdResult, setCreatedResult] = useState<CreatedEmployer | null>(null);
    const [copied, setCopied] = useState('');
    const [employers, setEmployers] = useState<EmployerItem[]>([]);
    const [loadingEmployers, setLoadingEmployers] = useState(false);

    const [newEmployer, setNewEmployer] = useState({
        businessName: '',
        phone: '',
        email: '',
        password: '123456',
        businessType: '',
        location: 'Phú Quốc',
        address: '',
    });

    // System stats from API
    const [systemStats, setSystemStats] = useState({
        totalUsers: 0,
        totalJobs: 0,
        totalCompanies: 0,
        totalApplications: 0,
        activeToday: 0,
        jobsCreatedToday: 0,
    });

    useEffect(() => {
        fetchFlags();
        fetchEmployers();
        fetchStats();
    }, []);

    // ═══ FETCH REAL STATS ═══
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/analytics', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                const k = data.data.kpis;
                setSystemStats({
                    totalUsers: k.totalUsers || 0,
                    totalJobs: k.totalJobs || 0,
                    totalCompanies: k.totalEmployers || 0,
                    totalApplications: k.totalApplications || 0,
                    activeToday: k.applicationsToday || 0,
                    jobsCreatedToday: k.jobsLast7Days || 0,
                });
            }
        } catch { /* silent */ }
    };

    // ═══ EMPLOYER MANAGEMENT ═══
    const fetchEmployers = async () => {
        setLoadingEmployers(true);
        try {
            const res = await fetch('/api/admin/create-employer', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setEmployers(data.data.employers);
            }
        } catch { /* silent */ }
        setLoadingEmployers(false);
    };

    const handleCreateEmployer = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');

        if (!newEmployer.businessName.trim() || !newEmployer.phone.trim()) {
            setCreateError('Vui lòng nhập tên doanh nghiệp và số điện thoại');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/admin/create-employer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newEmployer),
            });

            const data = await res.json();

            if (data.success) {
                setCreatedResult(data.data);
                setNewEmployer({
                    businessName: '', phone: '', email: '', password: '123456',
                    businessType: '', location: 'Phú Quốc', address: '',
                });
                fetchEmployers(); // Refresh list
            } else {
                setCreateError(data.error || 'Đã xảy ra lỗi');
            }
        } catch {
            setCreateError('Lỗi kết nối');
        }
        setCreating(false);
    };

    const copyToClipboard = useCallback((text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        setTimeout(() => setCopied(''), 2000);
    }, []);

    const generateShareMessage = useCallback((result: CreatedEmployer) => {
        const login = result.credentials.email || result.credentials.phone;
        return `Chào anh/chị,\n\nEm đã tạo tài khoản tuyển dụng miễn phí cho ${result.profile.businessName} trên FindWorkers Phú Quốc.\n\n🔑 Thông tin đăng nhập:\n• Tài khoản: ${login}\n• Mật khẩu: ${result.credentials.password}\n• Website: https://findworkers.vn\n\nAnh/chị đăng nhập để xem hồ sơ ứng viên nhé!\n\n— Nhật Minh, FindWorkers`;
    }, []);

    // ═══ FEATURE FLAGS ═══
    const fetchFlags = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/feature-flags', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setFlags(data.data);
            } else {
                setFlags(DEFAULT_FLAGS.map((f, i) => ({ ...f, id: `default-${i}`, isEnabled: false })));
            }
        } catch {
            setFlags(DEFAULT_FLAGS.map((f, i) => ({ ...f, id: `default-${i}`, isEnabled: false })));
        }
        setIsLoading(false);
    };

    const toggleFlag = async (flag: FeatureFlag) => {
        try {
            const res = await fetch('/api/admin/feature-flags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    key: flag.key,
                    name: flag.name,
                    description: flag.description,
                    isEnabled: !flag.isEnabled,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setFlags((prev) =>
                    prev.map((f) => (f.key === flag.key ? { ...f, isEnabled: !f.isEnabled } : f))
                );
            }
        } catch { /* silent */ }
    };

    const triggerCron = async () => {
        try {
            await fetch('/api/automation/cron', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'findworkers-cron-secret'}`,
                },
            });
            alert('✅ Automation tasks triggered successfully!');
        } catch {
            alert('❌ Failed to trigger automation');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-purple-400" />
                        Admin Panel
                    </h1>
                    <p className="text-slate-400 mt-1">Quản trị hệ thống FindWorkers</p>
                </div>
                <button
                    onClick={triggerCron}
                    className="btn-secondary text-sm"
                    id="trigger-cron-btn"
                >
                    <RefreshCw className="w-4 h-4" /> Chạy Automation
                </button>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[
                    { label: 'Tổng Users', value: systemStats.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-400' },
                    { label: 'Tổng Jobs', value: systemStats.totalJobs.toLocaleString(), icon: Briefcase, color: 'text-purple-400' },
                    { label: 'Doanh nghiệp', value: systemStats.totalCompanies.toLocaleString(), icon: Building2, color: 'text-cyan-400' },
                    { label: 'Ứng tuyển', value: systemStats.totalApplications.toLocaleString(), icon: TrendingUp, color: 'text-green-400' },
                    { label: 'Active hôm nay', value: systemStats.activeToday.toLocaleString(), icon: Activity, color: 'text-amber-400' },
                    { label: 'Tin mới hôm nay', value: systemStats.jobsCreatedToday.toString(), icon: Plus, color: 'text-pink-400' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-4 text-center">
                        <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                        <div className="text-xl font-bold text-white">{stat.value}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* ⚡ CREATE EMPLOYER — CONCIERGE MVP CORE TOOL   */}
            {/* ═══════════════════════════════════════════════ */}
            <div className="glass-card overflow-hidden mb-8 border-purple-500/20">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white">⚡ Cấp tài khoản Doanh nghiệp</h2>
                            <p className="text-xs text-slate-400">Tạo tài khoản cho khách sạn, nhà hàng, resort tại Phú Quốc</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setShowCreateForm(!showCreateForm); setCreatedResult(null); setCreateError(''); }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${showCreateForm
                            ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20'
                            }`}
                    >
                        {showCreateForm ? <><X className="w-4 h-4" /> Đóng</> : <><Plus className="w-4 h-4" /> Tạo mới</>}
                    </button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                    <div className="p-5 border-b border-white/5">
                        {/* Success Result */}
                        {createdResult && (
                            <div className="mb-6 p-5 rounded-2xl bg-green-500/10 border border-green-500/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    <h3 className="font-bold text-green-400">✅ Tạo thành công!</h3>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                                        <div>
                                            <span className="text-xs text-slate-500">Doanh nghiệp</span>
                                            <p className="text-white font-semibold">{createdResult.profile.businessName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                                        <div>
                                            <span className="text-xs text-slate-500">📱 Tài khoản (SĐT)</span>
                                            <p className="text-white font-mono">{createdResult.credentials.phone}</p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(createdResult.credentials.phone, 'phone')}
                                            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                                        >
                                            {copied === 'phone' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {createdResult.credentials.email && (
                                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                                            <div>
                                                <span className="text-xs text-slate-500">📧 Email</span>
                                                <p className="text-white font-mono">{createdResult.credentials.email}</p>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(createdResult.credentials.email!, 'email')}
                                                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                                            >
                                                {copied === 'email' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                                        <div>
                                            <span className="text-xs text-slate-500">🔑 Mật khẩu</span>
                                            <p className="text-white font-mono text-lg">{createdResult.credentials.password}</p>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(createdResult.credentials.password, 'pass')}
                                            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                                        >
                                            {copied === 'pass' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Copy full share message */}
                                <button
                                    onClick={() => copyToClipboard(generateShareMessage(createdResult), 'msg')}
                                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    {copied === 'msg' ? (
                                        <><CheckCircle2 className="w-4 h-4" /> Đã copy!</>
                                    ) : (
                                        <><Copy className="w-4 h-4" /> 📋 Copy tin nhắn gửi khách</>
                                    )}
                                </button>

                                <button
                                    onClick={() => setCreatedResult(null)}
                                    className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                                >
                                    + Tạo tài khoản khác
                                </button>
                            </div>
                        )}

                        {/* Create Form */}
                        {!createdResult && (
                            <form onSubmit={handleCreateEmployer} className="space-y-4">
                                {createError && (
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        {createError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Business Name */}
                                    <div>
                                        <label className="input-label">
                                            <Building2 className="w-4 h-4 inline mr-1" /> Tên doanh nghiệp *
                                        </label>
                                        <input
                                            type="text"
                                            value={newEmployer.businessName}
                                            onChange={(e) => setNewEmployer({ ...newEmployer, businessName: e.target.value })}
                                            className="input-field"
                                            placeholder="VD: Khách sạn Mường Thanh Phú Quốc"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="input-label">
                                            <Phone className="w-4 h-4 inline mr-1" /> SĐT chủ doanh nghiệp *
                                        </label>
                                        <input
                                            type="tel"
                                            value={newEmployer.phone}
                                            onChange={(e) => setNewEmployer({ ...newEmployer, phone: e.target.value })}
                                            className="input-field"
                                            placeholder="0912345678"
                                            required
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="input-label">
                                            <Mail className="w-4 h-4 inline mr-1" /> Email <span className="text-slate-500 text-xs">(không bắt buộc)</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={newEmployer.email}
                                            onChange={(e) => setNewEmployer({ ...newEmployer, email: e.target.value })}
                                            className="input-field"
                                            placeholder="hr@khachsan.com"
                                        />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="input-label">
                                            <Lock className="w-4 h-4 inline mr-1" /> Mật khẩu mặc định
                                        </label>
                                        <input
                                            type="text"
                                            value={newEmployer.password}
                                            onChange={(e) => setNewEmployer({ ...newEmployer, password: e.target.value })}
                                            className="input-field font-mono"
                                            placeholder="123456"
                                        />
                                    </div>

                                    {/* Business Type */}
                                    <div>
                                        <label className="input-label">
                                            <Briefcase className="w-4 h-4 inline mr-1" /> Loại hình
                                        </label>
                                        <select
                                            value={newEmployer.businessType}
                                            onChange={(e) => setNewEmployer({ ...newEmployer, businessType: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="">-- Chọn loại hình --</option>
                                            {BUSINESS_TYPES.map((t) => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Location */}
                                    <div>
                                        <label className="input-label">
                                            <MapPin className="w-4 h-4 inline mr-1" /> Khu vực
                                        </label>
                                        <select
                                            value={newEmployer.location}
                                            onChange={(e) => setNewEmployer({ ...newEmployer, location: e.target.value })}
                                            className="input-field"
                                        >
                                            {LOCATIONS.map((l) => (
                                                <option key={l} value={l}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="input-label">
                                        <MapPin className="w-4 h-4 inline mr-1" /> Địa chỉ chi tiết <span className="text-slate-500 text-xs">(không bắt buộc)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newEmployer.address}
                                        onChange={(e) => setNewEmployer({ ...newEmployer, address: e.target.value })}
                                        className="input-field"
                                        placeholder="VD: 118 Trần Hưng Đạo, TT. Dương Đông"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-base hover:from-purple-500 hover:to-indigo-500 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {creating ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Đang tạo...</>
                                    ) : (
                                        <><UserPlus className="w-5 h-5" /> Cấp tài khoản</>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* Existing Employers List */}
                <div className="divide-y divide-white/5">
                    {loadingEmployers ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
                        </div>
                    ) : employers.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            Chưa có doanh nghiệp nào. Bấm &quot;Tạo mới&quot; để bắt đầu!
                        </div>
                    ) : (
                        employers.map((emp) => (
                            <div key={emp.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {emp.employerProfile?.businessName || 'Chưa có profile'}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            {emp.phone && <span>📱 {emp.phone}</span>}
                                            {emp.email && <span>📧 {emp.email}</span>}
                                            {emp.employerProfile?.location && (
                                                <span>📍 {emp.employerProfile.location}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {emp.employerProfile?.businessType && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            {emp.employerProfile.businessType}
                                        </span>
                                    )}
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${emp.isVerified
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        }`}>
                                        {emp.isVerified ? '✅ Đã xác minh' : '⏳ Chưa xác minh'}
                                    </span>
                                    <span className="text-[10px] text-slate-600">
                                        {new Date(emp.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Admin Navigation Cards */}
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" /> Quản lý
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {ADMIN_LINKS.map((link, i) => (
                    <Link
                        key={i}
                        href={link.href}
                        className="glass-card p-5 group hover:border-blue-500/20"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                <link.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                    {link.label}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">{link.desc}</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Feature Flags */}
            <div className="glass-card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                            <Database className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-white">Feature Flags</h2>
                            <p className="text-xs text-slate-400">Bật/tắt tính năng mà không cần deploy</p>
                        </div>
                    </div>
                    <button onClick={fetchFlags} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="divide-y divide-white/5">
                    {(flags.length > 0 ? flags : DEFAULT_FLAGS.map((f, i) => ({ ...f, id: `default-${i}`, isEnabled: false }))).map((flag) => (
                        <div
                            key={flag.key}
                            className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white text-sm">{flag.name}</span>
                                    <code className="text-[11px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{flag.key}</code>
                                </div>
                                {flag.description && (
                                    <p className="text-xs text-slate-400 mt-0.5">{flag.description}</p>
                                )}
                            </div>
                            <button
                                onClick={() => toggleFlag(flag)}
                                className="flex-shrink-0 ml-4 transition-colors"
                                id={`toggle-flag-${flag.key}`}
                            >
                                {flag.isEnabled ? (
                                    <ToggleRight className="w-8 h-8 text-green-400" />
                                ) : (
                                    <ToggleLeft className="w-8 h-8 text-slate-500" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
