'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, BarChart3, Loader2, RefreshCw, Users, Briefcase,
    Building2, TrendingUp, CheckCircle2, Activity, Calendar,
    Target, Award, PieChart, Zap
} from 'lucide-react';

interface KPIs {
    totalUsers: number;
    totalCandidates: number;
    totalEmployers: number;
    verifiedEmployers: number;
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    applicationsToday: number;
    jobsLast7Days: number;
    hiredCount: number;
    hireRate: number;
}

interface ChartPoint {
    date?: string;
    week?: string;
    count: number;
}

interface TopCategory {
    name: string;
    jobCount: number;
}

export default function AdminAnalyticsPage() {
    const [kpis, setKpis] = useState<KPIs | null>(null);
    const [charts, setCharts] = useState<{
        jobsByDay: ChartPoint[];
        applicationsByDay: ChartPoint[];
        employersByWeek: ChartPoint[];
        topCategories: TopCategory[];
    } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/analytics', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setKpis(data.data.kpis);
                setCharts(data.data.charts);
            }
        } catch { /* silent */ }
        setLoading(false);
    };

    useEffect(() => { fetchAnalytics(); }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SimpleBarChart = ({ data, labelKey, valueKey, color, maxBars = 14 }: {
        data: any[];
        labelKey: string;
        valueKey: string;
        color: string;
        maxBars?: number;
    }) => {
        const sliced = data.slice(-maxBars);
        const maxVal = Math.max(...sliced.map(d => Number(d[valueKey]) || 0), 1);

        return (
            <div className="flex items-end gap-1 h-32">
                {sliced.map((d, i) => {
                    const val = Number(d[valueKey]) || 0;
                    const height = Math.max((val / maxVal) * 100, 4);
                    const label = String(d[labelKey] || '');
                    const shortLabel = label.slice(5); // Remove year prefix

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10">
                                {label}: {val}
                            </div>
                            <div
                                className={`w-full rounded-t-sm transition-all group-hover:opacity-80 ${color}`}
                                style={{ height: `${height}%`, minHeight: '4px' }}
                            />
                            {i % Math.ceil(sliced.length / 7) === 0 && (
                                <span className="text-[9px] text-slate-600 whitespace-nowrap">{shortLabel}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/admin" className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-indigo-400" />
                        Thống kê hệ thống
                    </h1>
                </div>
                <div className="text-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto mb-4" />
                    <p className="text-slate-400">Đang tải dữ liệu thống kê...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/admin" className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="w-7 h-7 text-indigo-400" />
                        Thống kê hệ thống
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">KPIs & biểu đồ toàn hệ thống</p>
                </div>
                <button onClick={fetchAnalytics} className="btn-secondary text-sm">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {kpis && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Tổng Users', value: kpis.totalUsers, icon: Users, color: 'text-blue-400', gradient: 'from-blue-500/20 to-cyan-500/20' },
                            { label: 'Candidates', value: kpis.totalCandidates, icon: Users, color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-teal-500/20' },
                            { label: 'Employers', value: kpis.totalEmployers, icon: Building2, color: 'text-amber-400', gradient: 'from-amber-500/20 to-orange-500/20' },
                            { label: 'DN Xác minh', value: kpis.verifiedEmployers, icon: CheckCircle2, color: 'text-green-400', gradient: 'from-green-500/20 to-emerald-500/20' },
                            { label: 'Tổng Jobs', value: kpis.totalJobs, icon: Briefcase, color: 'text-purple-400', gradient: 'from-purple-500/20 to-indigo-500/20' },
                            { label: 'Jobs Active', value: kpis.activeJobs, icon: Zap, color: 'text-pink-400', gradient: 'from-pink-500/20 to-rose-500/20' },
                            { label: 'Tổng Ứng tuyển', value: kpis.totalApplications, icon: TrendingUp, color: 'text-indigo-400', gradient: 'from-indigo-500/20 to-violet-500/20' },
                            { label: 'Apply hôm nay', value: kpis.applicationsToday, icon: Activity, color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-green-500/20' },
                        ].map((kpi, i) => (
                            <div key={i} className="glass-card p-5 group">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                                    </div>
                                    <span className="text-xs text-slate-400">{kpi.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-white">{kpi.value.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    {/* Highlight KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="glass-card p-6 text-center border-green-500/20">
                            <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <p className="text-3xl font-bold text-green-400">{kpis.hireRate}%</p>
                            <p className="text-sm text-slate-400 mt-1">Tỷ lệ tuyển thành công</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{kpis.hiredCount} / {kpis.totalApplications} ứng tuyển</p>
                        </div>
                        <div className="glass-card p-6 text-center border-blue-500/20">
                            <Calendar className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                            <p className="text-3xl font-bold text-blue-400">{kpis.jobsLast7Days}</p>
                            <p className="text-sm text-slate-400 mt-1">Tin mới 7 ngày qua</p>
                        </div>
                        <div className="glass-card p-6 text-center border-purple-500/20">
                            <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                            <p className="text-3xl font-bold text-purple-400">{kpis.applicationsToday}</p>
                            <p className="text-sm text-slate-400 mt-1">Ứng tuyển hôm nay</p>
                        </div>
                    </div>
                </>
            )}

            {charts && (
                <>
                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Jobs by Day */}
                        <div className="glass-card p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-purple-400" />
                                Job tăng trưởng (30 ngày)
                            </h3>
                            {charts.jobsByDay.length > 0 ? (
                                <SimpleBarChart data={charts.jobsByDay} labelKey="date" valueKey="count" color="bg-purple-500" />
                            ) : (
                                <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
                            )}
                        </div>

                        {/* Applications by Day */}
                        <div className="glass-card p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                Ứng tuyển theo ngày (30 ngày)
                            </h3>
                            {charts.applicationsByDay.length > 0 ? (
                                <SimpleBarChart data={charts.applicationsByDay} labelKey="date" valueKey="count" color="bg-blue-500" />
                            ) : (
                                <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
                            )}
                        </div>

                        {/* Employers by Week */}
                        <div className="glass-card p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-amber-400" />
                                DN đăng ký theo tuần (12 tuần)
                            </h3>
                            {charts.employersByWeek.length > 0 ? (
                                <SimpleBarChart data={charts.employersByWeek} labelKey="week" valueKey="count" color="bg-amber-500" maxBars={12} />
                            ) : (
                                <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
                            )}
                        </div>

                        {/* Top Categories */}
                        <div className="glass-card p-5">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-green-400" />
                                Top ngành hot nhất
                            </h3>
                            {charts.topCategories.length > 0 ? (
                                <div className="space-y-2.5">
                                    {charts.topCategories.slice(0, 8).map((cat, i) => {
                                        const maxJobs = Math.max(...charts.topCategories.map(c => c.jobCount), 1);
                                        const pct = (cat.jobCount / maxJobs) * 100;
                                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-green-500', 'bg-cyan-500', 'bg-red-500', 'bg-indigo-500'];
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400 w-4 text-right">{i + 1}</span>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-sm text-white">{cat.name}</span>
                                                        <span className="text-xs text-slate-400">{cat.jobCount} jobs</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-32 flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
