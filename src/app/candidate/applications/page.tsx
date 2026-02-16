'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import {
    Briefcase, Clock, MapPin, Building2, Loader2,
    CheckCircle2, XCircle, Calendar, MessageCircle
} from 'lucide-react';

interface Application {
    id: string;
    status: string;
    coverLetter: string | null;
    note: string | null;
    appliedAt: string;
    job: {
        id: string;
        title: string;
        location: string;
        salaryMin: number | null;
        salaryMax: number | null;
        employer: {
            companyName: string;
            logoUrl: string | null;
        };
    };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; class: string }> = {
    APPLIED: { label: 'Đã gửi', icon: Clock, class: 'status-applied' },
    SHORTLISTED: { label: 'Được chọn', icon: CheckCircle2, class: 'status-shortlisted' },
    INTERVIEW: { label: 'Phỏng vấn', icon: Calendar, class: 'status-interview' },
    REJECTED: { label: 'Từ chối', icon: XCircle, class: 'status-rejected' },
    HIRED: { label: 'Được tuyển', icon: CheckCircle2, class: 'status-hired' },
};

export default function CandidateApplicationsPage() {
    const { user } = useAuthStore();
    const [profile, setProfile] = useState<{ applications: Application[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/profile/candidate', { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setProfile(data.data);
                }
            } catch (error) {
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (user?.role !== 'CANDIDATE') {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <p className="text-slate-400">Trang này chỉ dành cho ứng viên</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    const applications = profile?.applications || [];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Đã <span className="gradient-text">ứng tuyển</span>
                </h1>
                <p className="text-slate-400">{applications.length} đơn ứng tuyển</p>
            </div>

            {applications.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Chưa có đơn ứng tuyển nào</h3>
                    <p className="text-slate-400 mb-6">Tìm việc phù hợp và ứng tuyển ngay!</p>
                    <Link href="/jobs" className="btn-primary inline-flex">
                        Tìm việc ngay
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {applications.map((app, i) => {
                        const statusConf = STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED;
                        const StatusIcon = statusConf.icon;

                        return (
                            <div
                                key={app.id}
                                className="glass-card p-6 animate-slide-up"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center flex-shrink-0">
                                        {app.job.employer.logoUrl ? (
                                            <img src={app.job.employer.logoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/jobs/${app.job.id}`}
                                            className="text-base font-semibold text-white hover:text-blue-400 transition-colors"
                                        >
                                            {app.job.title}
                                        </Link>
                                        <p className="text-sm text-slate-400 mt-0.5">{app.job.employer.companyName}</p>
                                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3.5 h-3.5" /> {app.job.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> {new Date(app.appliedAt).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`badge ${statusConf.class} flex items-center gap-1`}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            {statusConf.label}
                                        </span>
                                    </div>
                                </div>

                                {app.note && (
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2">
                                        <MessageCircle className="w-4 h-4 text-slate-500 mt-0.5" />
                                        <p className="text-sm text-slate-400">{app.note}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
