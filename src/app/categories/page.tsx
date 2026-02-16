'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ChevronRight, Loader2, Briefcase
} from 'lucide-react';

interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    children: {
        id: string;
        name: string;
        slug: string;
        icon: string | null;
        _count: { jobs: number };
    }[];
    _count: { jobs: number };
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await fetch('/api/categories');
                const data = await res.json();
                if (data.success) {
                    setCategories(data.data);
                }
            } catch (error) {
                console.error('Fetch categories error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="mb-10">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                    Ngành nghề <span className="gradient-text">tuyển dụng</span>
                </h1>
                <p className="text-slate-400">Tìm việc theo ngành nghề phù hợp với bạn</p>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-20">
                    <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Chưa có ngành nghề nào</h3>
                    <p className="text-slate-400">Hệ thống đang được cập nhật</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {categories.map((cat, i) => (
                        <div
                            key={cat.id}
                            className="glass-card overflow-hidden animate-slide-up"
                            style={{ animationDelay: `${i * 0.08}s` }}
                        >
                            <div className="p-6 border-b border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{cat.icon || '📂'}</span>
                                        <h2 className="text-xl font-bold text-white">{cat.name}</h2>
                                    </div>
                                    <Link
                                        href={`/jobs?category=${cat.id}`}
                                        className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                    >
                                        Xem tất cả <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>

                            {cat.children.length > 0 && (
                                <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {cat.children.map((child) => (
                                        <Link
                                            key={child.id}
                                            href={`/jobs?category=${child.id}`}
                                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{child.icon || '📌'}</span>
                                                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                                                    {child.name}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-500">{child._count.jobs}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
