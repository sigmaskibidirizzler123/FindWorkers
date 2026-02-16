'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Bell, X, CheckCheck, Clock, Briefcase, Star, Calendar, AlertCircle } from 'lucide-react';

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
    APPLICATION_NEW: Briefcase,
    APPLICATION_STATUS: Star,
    JOB_MATCH: Star,
    JOB_EXPIRING: Clock,
    INTERVIEW_SCHEDULED: Calendar,
    REMINDER: AlertCircle,
    SYSTEM: Bell,
};

export default function NotificationBell() {
    const { isAuthenticated } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchNotifications = async () => {
            try {
                const res = await fetch('/api/notifications?limit=10', { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setNotifications(data.data.notifications);
                    setUnreadCount(data.data.unreadCount);
                }
            } catch {
                // silent fail
            }
        };

        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ markAllRead: true }),
            });
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const timeAgo = (dateStr: string) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        return `${Math.floor(diff / 86400)} ngày trước`;
    };

    if (!isAuthenticated) return null;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                id="notification-bell"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center min-w-[18px] h-[18px] animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-slide-up overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-blue-400" />
                            <span className="font-semibold text-white text-sm">Thông báo</span>
                            {unreadCount > 0 && (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                                    {unreadCount} mới
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                                >
                                    <CheckCheck className="w-3.5 h-3.5 inline mr-1" />
                                    Đọc hết
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1 scroll-hidden">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">Chưa có thông báo</p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const IconComponent = TYPE_ICONS[n.type] || Bell;
                                return (
                                    <div
                                        key={n.id}
                                        className={`relative ${!n.isRead ? 'bg-blue-500/[0.03]' : ''}`}
                                    >
                                        {n.link ? (
                                            <Link
                                                href={n.link}
                                                onClick={() => setOpen(false)}
                                                className="block px-4 py-3 hover:bg-white/[0.03] transition-colors"
                                            >
                                                <NotificationContent
                                                    n={n}
                                                    IconComponent={IconComponent}
                                                    timeAgo={timeAgo}
                                                />
                                            </Link>
                                        ) : (
                                            <div className="px-4 py-3">
                                                <NotificationContent
                                                    n={n}
                                                    IconComponent={IconComponent}
                                                    timeAgo={timeAgo}
                                                />
                                            </div>
                                        )}
                                        {!n.isRead && (
                                            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-400" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function NotificationContent({
    n,
    IconComponent,
    timeAgo,
}: {
    n: Notification;
    IconComponent: React.ElementType;
    timeAgo: (d: string) => string;
}) {
    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <IconComponent className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white leading-snug">{n.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[11px] text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
            </div>
        </div>
    );
}
