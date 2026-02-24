'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import FindWorkersHero from '@/components/ui/findworkers-hero';
import {
  Search, MapPin, Briefcase, Users, Building2, TrendingUp,
  ChefHat, UtensilsCrossed, Hotel, ShoppingBag, Wrench,
  Home, Monitor, Star, Clock, Zap, ArrowRight, CheckCircle2,
  Sparkles, Shield, Heart, Loader2
} from 'lucide-react';

const CATEGORIES = [
  { icon: UtensilsCrossed, name: 'Nhà hàng', color: 'from-orange-500 to-red-500' },
  { icon: Hotel, name: 'Khách sạn', color: 'from-blue-500 to-cyan-500' },
  { icon: ChefHat, name: 'F&B', color: 'from-amber-500 to-orange-500' },
  { icon: ShoppingBag, name: 'Bán lẻ', color: 'from-pink-500 to-rose-500' },
  { icon: Wrench, name: 'Xây dựng', color: 'from-emerald-500 to-green-500' },
  { icon: Home, name: 'Giúp việc', color: 'from-violet-500 to-purple-500' },
  { icon: Monitor, name: 'Văn phòng', color: 'from-sky-500 to-blue-500' },
  { icon: Briefcase, name: 'Khác', color: 'from-indigo-500 to-violet-500' },
];

interface FeaturedJob {
  id: string;
  title: string;
  location: string;
  city: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  isUrgent: boolean;
  isFeatured: boolean;
  employer: {
    businessName: string;
    logoUrl: string | null;
  };
}

function formatSalary(min: number | null, max: number | null, negotiable: boolean) {
  if (negotiable) return 'Thỏa thuận';
  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `Từ ${fmt(min)}`;
  if (max) return `Đến ${fmt(max)}`;
  return 'Thỏa thuận';
}

export default function HomePage() {
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Fetch real jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/jobs?sort=newest&page=1&limit=6');
        const data = await res.json();
        if (data.success) {
          setFeaturedJobs(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  return (
    <div>
      {/* ═══════ NEW PREMIUM HERO ═══════ */}
      <FindWorkersHero />

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Khám phá theo <span className="gradient-text">ngành nghề</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Tìm việc làm phù hợp với chuyên ngành của bạn
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, i) => (
            <Link
              key={i}
              href={`/jobs?search=${cat.name}`}
              className="glass-card p-6 text-center group cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                <cat.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1">{cat.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Jobs — Real Data */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Việc làm <span className="gradient-text">mới nhất</span>
            </h2>
            <p className="text-slate-400">Các cơ hội việc làm mới được đăng tuyển</p>
          </div>
          <Link href="/jobs" className="btn-secondary hidden md:inline-flex">
            Xem tất cả <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingJobs ? (
          <div className="glass-card p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
            <p className="text-slate-400">Đang tải...</p>
          </div>
        ) : featuredJobs.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Chưa có việc làm nào</h3>
            <p className="text-slate-400 mb-6">Hãy là người đầu tiên đăng tin tuyển dụng!</p>
            <Link href="/auth/register?role=EMPLOYER" className="btn-primary inline-flex">
              Đăng tin ngay <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredJobs.map((job, i) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="glass-card p-6 group animate-slide-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center overflow-hidden">
                    {job.employer?.logoUrl ? (
                      <img src={job.employer.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    {job.isUrgent && (
                      <span className="badge badge-urgent">
                        <Zap className="w-3 h-3 mr-1" /> Gấp
                      </span>
                    )}
                    {job.isFeatured && (
                      <span className="badge badge-featured">
                        <Star className="w-3 h-3 mr-1" /> Hot
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-sm text-slate-400 mb-3">{job.employer?.businessName || 'Doanh nghiệp'}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    {job.city || job.location}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="text-lg font-bold text-green-400">
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryNegotiable)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-8 md:hidden">
          <Link href="/jobs" className="btn-primary">
            Xem tất cả việc làm <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Cách <span className="gradient-text">hoạt động</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Chỉ 3 bước đơn giản để bắt đầu tìm việc hoặc tuyển dụng
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Tạo tài khoản',
              description: 'Đăng ký miễn phí với email hoặc số điện thoại. Hoàn thành hồ sơ trong 2 phút.',
              icon: Users,
              color: 'from-blue-500 to-cyan-500',
            },
            {
              step: '02',
              title: 'Tìm kiếm & Kết nối',
              description: 'Ứng viên tìm việc phù hợp. Doanh nghiệp đăng tin và tìm ứng viên chất lượng.',
              icon: Search,
              color: 'from-purple-500 to-pink-500',
            },
            {
              step: '03',
              title: 'Ứng tuyển & Tuyển',
              description: 'Ứng tuyển 1 chạm. Theo dõi trạng thái real-time. Kết nối nhanh chóng.',
              icon: CheckCircle2,
              color: 'from-green-500 to-emerald-500',
            },
          ].map((item, i) => (
            <div key={i} className="glass-card p-8 text-center relative overflow-hidden group">
              <div className="absolute top-4 right-4 text-6xl font-black text-white/[0.03]">
                {item.step}
              </div>
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
              <p className="text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="glass-card p-10 md:p-16 text-center relative overflow-hidden glow-purple">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Đăng ký ngay để tìm việc hoặc tuyển dụng tại Phú Quốc!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register?role=CANDIDATE" className="btn-primary px-8 py-4 text-base">
                <Heart className="w-5 h-5" /> Tìm việc ngay
              </Link>
              <Link href="/auth/register?role=EMPLOYER" className="btn-secondary px-8 py-4 text-base">
                <Shield className="w-5 h-5" /> Đăng tin tuyển dụng
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
