'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import NotificationBell from '@/components/notifications/notification-bell';
import {
    Search, Menu, X, User, Building2, LogOut,
    Briefcase, Heart, ChevronDown, Shield, LayoutDashboard
} from 'lucide-react';

export default function Navbar() {
    const { user, isAuthenticated, isLoading, logout } = useAuthStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        window.location.href = '/';
    };

    // Render the auth section based on loading/authenticated state
    const renderAuthSection = () => {
        // While loading, show a subtle skeleton to prevent flash of wrong buttons
        if (isLoading) {
            return (
                <div className="flex items-center gap-2">
                    <div className="w-24 h-9 rounded-xl bg-white/5 animate-pulse" />
                </div>
            );
        }

        if (isAuthenticated) {
            return (
                <div className="relative">
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                        id="user-menu-button"
                    >
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                            {user?.role === 'EMPLOYER' && (user as any)?.employerProfile?.logoUrl ? (
                                <img src={(user as any).employerProfile.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : user?.role === 'EMPLOYER' ? (
                                <Building2 className="w-4 h-4 text-white" />
                            ) : user?.role === 'ADMIN' ? (
                                <Shield className="w-4 h-4 text-white" />
                            ) : (
                                <User className="w-4 h-4 text-white" />
                            )}
                        </div>
                        <span className="text-sm font-medium text-slate-200 hidden sm:block max-w-[120px] truncate">
                            {user?.email?.split('@')[0] || user?.phone || 'User'}
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {userMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 animate-slide-up overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/5">
                                    <p className="text-sm font-medium text-white truncate">{user?.email || user?.phone}</p>
                                    <p className="text-xs text-slate-400 mt-0.5 capitalize">
                                        {user?.role === 'CANDIDATE' ? '🧑 Ứng viên' : user?.role === 'EMPLOYER' ? '🏢 Nhà tuyển dụng' : '🛡️ Admin'}
                                    </p>
                                </div>
                                <div className="py-1">
                                    {user?.role === 'CANDIDATE' && (
                                        <>
                                            <Link href="/candidate/profile" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all" onClick={() => setUserMenuOpen(false)}>
                                                <User className="w-4 h-4" /> Hồ sơ của tôi
                                            </Link>
                                            <Link href="/candidate/applications" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all" onClick={() => setUserMenuOpen(false)}>
                                                <Briefcase className="w-4 h-4" /> Đã ứng tuyển
                                            </Link>
                                            <Link href="/candidate/saved" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all" onClick={() => setUserMenuOpen(false)}>
                                                <Heart className="w-4 h-4" /> Việc đã lưu
                                            </Link>
                                        </>
                                    )}
                                    {user?.role === 'EMPLOYER' && (
                                        <>
                                            <Link href="/employer/dashboard" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all" onClick={() => setUserMenuOpen(false)}>
                                                <LayoutDashboard className="w-4 h-4" /> Dashboard
                                            </Link>
                                            <Link href="/employer/profile" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all" onClick={() => setUserMenuOpen(false)}>
                                                <Building2 className="w-4 h-4" /> Hồ sơ công ty
                                            </Link>
                                            <Link href="/employer/jobs/create" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all" onClick={() => setUserMenuOpen(false)}>
                                                <Briefcase className="w-4 h-4" /> Đăng tin mới
                                            </Link>
                                        </>
                                    )}
                                    {user?.role === 'ADMIN' && (
                                        <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all" onClick={() => setUserMenuOpen(false)}>
                                            <Shield className="w-4 h-4" /> Quản trị hệ thống
                                        </Link>
                                    )}
                                </div>
                                <div className="border-t border-white/5 py-1">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
                                        id="logout-button"
                                    >
                                        <LogOut className="w-4 h-4" /> Đăng xuất
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            );
        }

        // Not loading, not authenticated → show login/register
        return (
            <div className="flex items-center gap-2">
                <Link href="/auth/login" className="btn-secondary text-sm">
                    Đăng nhập
                </Link>
                <Link href="/auth/register" className="btn-primary text-sm hidden sm:inline-flex">
                    Đăng ký
                </Link>
            </div>
        );
    };

    return (
        <nav className="glass-nav fixed top-0 left-0 right-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-2xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">
                            Find<span className="text-blue-500">Workers</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="/jobs" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            Tìm việc
                        </Link>
                        <Link href="/categories" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                            Ngành nghề
                        </Link>
                        {isAuthenticated && user?.role === 'EMPLOYER' && (
                            <Link href="/employer/dashboard" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                                Quản lý tuyển dụng
                            </Link>
                        )}
                        {isAuthenticated && user?.role === 'ADMIN' && (
                            <Link href="/admin" className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all">
                                Quản trị
                            </Link>
                        )}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        <Link href="/jobs" className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all md:hidden">
                            <Search className="w-5 h-5" />
                        </Link>

                        {/* Notification Bell */}
                        <NotificationBell />

                        {renderAuthSection()}

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                            id="mobile-menu-toggle"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-white/5 animate-slide-up">
                    <div className="px-4 py-4 space-y-1">
                        <Link href="/jobs" className="block px-4 py-3 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-all" onClick={() => setMobileMenuOpen(false)}>
                            🔍 Tìm việc
                        </Link>
                        <Link href="/categories" className="block px-4 py-3 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-all" onClick={() => setMobileMenuOpen(false)}>
                            📂 Ngành nghề
                        </Link>
                        {isAuthenticated && user?.role === 'EMPLOYER' && (
                            <Link href="/employer/dashboard" className="block px-4 py-3 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/5 transition-all" onClick={() => setMobileMenuOpen(false)}>
                                📊 Quản lý tuyển dụng
                            </Link>
                        )}
                        {!isAuthenticated && !isLoading && (
                            <div className="pt-3 border-t border-white/5 flex gap-2">
                                <Link href="/auth/login" className="btn-secondary flex-1 justify-center text-sm" onClick={() => setMobileMenuOpen(false)}>
                                    Đăng nhập
                                </Link>
                                <Link href="/auth/register" className="btn-primary flex-1 justify-center text-sm" onClick={() => setMobileMenuOpen(false)}>
                                    Đăng ký
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
