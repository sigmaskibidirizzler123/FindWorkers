import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, MessageCircle } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="border-t border-white/5 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <img
                                src="/logo.svg"
                                alt="FindWorkers"
                                className="h-10 w-auto object-contain"
                            />
                        </Link>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Nền tảng kết nối việc làm thông minh. Tìm việc nhanh, tuyển dụng hiệu quả.
                        </p>
                        <div className="flex gap-3">
                            <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                                <Facebook className="w-4 h-4" />
                            </a>
                            <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-green-400 hover:bg-green-400/10 transition-all">
                                <MessageCircle className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* For Candidates */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Ứng viên</h3>
                        <ul className="space-y-3">
                            <li><Link href="/jobs" className="text-sm text-slate-400 hover:text-white transition-colors">Tìm việc làm</Link></li>
                            <li><Link href="/categories" className="text-sm text-slate-400 hover:text-white transition-colors">Ngành nghề</Link></li>
                            <li><Link href="/auth/register" className="text-sm text-slate-400 hover:text-white transition-colors">Tạo tài khoản</Link></li>
                            <li><Link href="/candidate/profile" className="text-sm text-slate-400 hover:text-white transition-colors">Hồ sơ cá nhân</Link></li>
                        </ul>
                    </div>

                    {/* For Employers */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Nhà tuyển dụng</h3>
                        <ul className="space-y-3">
                            <li><Link href="/employer/jobs/create" className="text-sm text-slate-400 hover:text-white transition-colors">Đăng tin tuyển dụng</Link></li>
                            <li><Link href="/employer/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">Quản lý tin</Link></li>
                            <li><Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Bảng giá</Link></li>
                            <li><Link href="/auth/register" className="text-sm text-slate-400 hover:text-white transition-colors">Đăng ký doanh nghiệp</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Liên hệ</h3>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2 text-sm text-slate-400">
                                <Mail className="w-4 h-4 text-blue-400" /> Luongnguyennhatminh2009@gmail.com
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-400">
                                <Phone className="w-4 h-4 text-green-400" /> 0907697043
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-400">
                                <MapPin className="w-4 h-4 text-red-400" /> TP. Phú Quốc, Việt Nam
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                        © 2024 FindWorkers. Tất cả quyền được bảo lưu.
                    </p>
                    <div className="flex gap-6">
                        <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Điều khoản</Link>
                        <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Bảo mật</Link>
                        <Link href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Cookie</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
