"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
    Search, MapPin, ArrowRight, Sparkles, Heart, Shield,
    ChefHat, Hotel, Briefcase, Users, Star, Zap
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    radius: number; alpha: number; hue: number;
}

// ─── Particle Canvas ──────────────────────────────────────────────────────────
function ParticleCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: -9999, y: -9999 });
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const init = () => {
            const mobile = window.innerWidth < 768;
            const count = Math.min(
                Math.floor((canvas.width * canvas.height) / (mobile ? 14000 : 7500)),
                mobile ? 40 : 80
            );
            particlesRef.current = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.32,
                vy: (Math.random() - 0.5) * 0.32,
                radius: Math.random() * 1.6 + 0.4,
                alpha: Math.random() * 0.45 + 0.12,
                hue: 200 + Math.random() * 60,
            }));
        };

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            init();
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const ps = particlesRef.current;
            const m = mouseRef.current;

            for (let i = 0; i < ps.length; i++) {
                const p = ps[i];
                const dx = m.x - p.x, dy = m.y - p.y;
                const d = Math.sqrt(dx * dx + dy * dy);

                if (d < 120 && d > 0) {
                    const f = (120 - d) / 120;
                    p.vx -= (dx / d) * f * 0.022;
                    p.vy -= (dy / d) * f * 0.022;
                }

                p.x += p.vx; p.y += p.vy;
                p.vx *= 0.99; p.vy *= 0.99;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue},70%,70%,${p.alpha})`;
                ctx.fill();

                for (let j = i + 1; j < ps.length; j++) {
                    const q = ps[j];
                    const ddx = p.x - q.x, ddy = p.y - q.y;
                    const d2 = Math.sqrt(ddx * ddx + ddy * ddy);
                    if (d2 < 100) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2},70%,70%,${(1 - d2 / 100) * 0.1})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            rafRef.current = requestAnimationFrame(draw);
        };

        const onMove = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseleave", onLeave);
        resize();
        draw();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseleave", onLeave);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden />;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
    const [n, setN] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            let v = 0;
            const step = to / 60;
            const t = setInterval(() => {
                v += step;
                if (v >= to) { setN(to); clearInterval(t); }
                else setN(Math.floor(v));
            }, 16);
            obs.disconnect();
        }, { threshold: 0.5 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [to]);

    return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

// ─── Magnetic Button ──────────────────────────────────────────────────────────
function MagneticButton({ children, href, className = "" }: { children: React.ReactNode; href: string; className?: string }) {
    const ref = useRef<HTMLAnchorElement>(null);

    const onMove = useCallback((e: React.MouseEvent) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.2;
        const y = (e.clientY - (r.top + r.height / 2)) * 0.2;
        el.style.transform = `translate(${x}px,${y}px)`;
    }, []);

    const onLeave = useCallback(() => {
        if (ref.current) ref.current.style.transform = "";
    }, []);

    return (
        <Link ref={ref} href={href} onMouseMove={onMove} onMouseLeave={onLeave} className={className}>
            {children}
        </Link>
    );
}

// ─── Floating Job Tags ────────────────────────────────────────────────────────
const JOB_TAGS = [
    "🍳 Phụ bếp", "🏨 Lễ tân", "🍽️ Phục vụ", "💆 Spa",
    "🛒 Bán hàng", "🏗️ Xây dựng", "📊 Kế toán", "🚗 Tài xế",
    "🧹 Housekeeping", "💼 Quản lý", "🎯 Marketing", "👨‍🍳 Đầu bếp",
];

function FloatingTags() {
    return (
        <div className="fw-hero__tags" aria-hidden>
            {JOB_TAGS.map((tag, i) => (
                <span
                    key={tag}
                    className="fw-hero__tag"
                    style={{
                        left: `${3 + ((i * 7.8 + i * i * 0.3) % 88)}%`,
                        top: `${8 + ((i * 8.2 + i * 1.1) % 82)}%`,
                        animationDelay: `${i * 0.55}s`,
                        animationDuration: `${10 + (i % 4) * 2}s`,
                    }}
                >
                    {tag}
                </span>
            ))}
        </div>
    );
}

// ─── Main Hero Component ──────────────────────────────────────────────────────
export default function FindWorkersHero() {
    const [typed, setTyped] = useState("");
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const tagline = "Tuyển dụng & Tìm việc tại Phú Quốc";

    useEffect(() => {
        let i = 0;
        const id = setInterval(() => {
            if (i <= tagline.length) setTyped(tagline.slice(0, i++));
            else clearInterval(id);
        }, 55);
        return () => clearInterval(id);
    }, []);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (searchLocation) params.set('city', searchLocation);
        window.location.href = `/jobs?${params.toString()}`;
    };

    const stats = [
        { label: "Việc làm", to: 500, suffix: "+", icon: Briefcase },
        { label: "Doanh nghiệp", to: 120, suffix: "+", icon: Hotel },
        { label: "Ứng viên", to: 2000, suffix: "+", icon: Users },
        { label: "Tuyển thành công", to: 850, suffix: "+", icon: Star },
    ];

    return (
        <section className="fw-hero">
            {/* Background layers */}
            <div className="fw-hero__grid" />
            <div className="fw-hero__aurora" />
            <ParticleCanvas />
            <FloatingTags />
            <div className="fw-hero__vignette" />

            <div className="fw-hero__inner">

                {/* Badge */}
                <span className="fw-hero__badge">
                    <i className="fw-hero__badge-dot" />
                    <Sparkles className="w-3.5 h-3.5" />
                    Nền tảng #1 tại Phú Quốc · Miễn phí 100%
                </span>

                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-4">
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-2xl" style={{ filter: 'drop-shadow(0 0 30px rgba(59,130,246,0.3))' }}>
                        Find<span className="text-blue-500">Workers</span>
                    </h1>
                </div>

                {/* Typewriter tagline */}
                <p className="fw-hero__tagline" aria-live="polite">
                    {typed}<span className="fw-hero__cursor" aria-hidden>|</span>
                </p>

                {/* Description */}
                <p className="fw-hero__desc">
                    Kết nối <strong>ứng viên</strong> với các <strong>nhà tuyển dụng uy tín</strong> tại Phú Quốc.
                    Ứng tuyển chỉ với <strong>1 chạm</strong>, tìm việc phù hợp trong vòng <strong>5 phút</strong>.
                </p>

                {/* ─── Search Bar ─── */}
                <div className="fw-hero__search">
                    <div className="fw-hero__search-inner">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm công việc, vị trí, công ty..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full py-3.5 pl-12 pr-4 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
                                id="hero-search-input"
                            />
                        </div>
                        <div className="hidden sm:block w-px h-8 bg-white/10" />
                        <div className="flex-1 relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Khu vực: Dương Đông, An Thới..."
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full py-3.5 pl-12 pr-4 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
                                id="hero-location-input"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="fw-hero__search-btn"
                            id="hero-search-button"
                        >
                            <Search className="w-5 h-5" />
                            <span className="hidden sm:inline">Tìm kiếm</span>
                        </button>
                    </div>
                </div>

                {/* Quick tags */}
                <div className="flex flex-wrap justify-center gap-2 mt-5">
                    <span className="text-sm text-slate-500">Phổ biến:</span>
                    {['Phục vụ', 'Phụ bếp', 'Bán hàng', 'Lễ tân', 'Thu ngân'].map((tag) => (
                        <Link
                            key={tag}
                            href={`/jobs?search=${tag}`}
                            className="px-3 py-1 text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 hover:border-white/15"
                        >
                            {tag}
                        </Link>
                    ))}
                </div>

                {/* CTAs */}
                <div className="fw-hero__actions">
                    <MagneticButton href="/auth/register?role=CANDIDATE" className="fw-hero__btn-primary">
                        <Heart className="w-5 h-5" />
                        Tìm việc ngay
                        <ArrowRight className="w-4 h-4" />
                    </MagneticButton>

                    <MagneticButton href="/auth/register?role=EMPLOYER" className="fw-hero__btn-ghost">
                        <Shield className="w-4 h-4" />
                        Đăng tin tuyển dụng
                    </MagneticButton>
                </div>

                {/* Stats */}
                <div className="fw-hero__stats">
                    {stats.map((s) => (
                        <div key={s.label} className="fw-hero__stat">
                            <s.icon className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                            <strong className="fw-hero__stat-n"><Counter to={s.to} suffix={s.suffix} /></strong>
                            <span className="fw-hero__stat-l">{s.label}</span>
                        </div>
                    ))}
                </div>

            </div>

            <div className="fw-hero__fade" />
        </section>
    );
}
