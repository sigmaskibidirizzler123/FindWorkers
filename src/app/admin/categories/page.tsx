'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Layers, Plus, Loader2, RefreshCw, Edit3, Trash2,
    CheckCircle2, XCircle, Briefcase, Save, FolderTree
} from 'lucide-react';

interface CategoryItem {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    parentId: string | null;
    parent?: { id: string; name: string } | null;
    _count: { jobs: number };
}

const ICONS = ['🍽️', '🏨', '☕', '🧹', '🛎️', '👨‍🍳', '🍷', '🏗️', '🚗', '💆', '🎤', '📦', '🛒', '💼', '🔧', '📋', '🎯', '⭐'];

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', icon: '', parentId: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState('');

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/categories', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setCategories(data.data.flat);
            }
        } catch { /* silent */ }
        setLoading(false);
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Tên danh mục là bắt buộc');
            return;
        }

        setSaving(true);
        setError('');
        try {
            if (editId) {
                // Update
                const res = await fetch('/api/admin/categories', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ id: editId, ...formData }),
                });
                const data = await res.json();
                if (!data.success) {
                    setError(data.error);
                    setSaving(false);
                    return;
                }
            } else {
                // Create
                const res = await fetch('/api/admin/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(formData),
                });
                const data = await res.json();
                if (!data.success) {
                    setError(data.error);
                    setSaving(false);
                    return;
                }
            }

            setShowForm(false);
            setEditId(null);
            setFormData({ name: '', icon: '', parentId: '' });
            fetchCategories();
        } catch {
            setError('Lỗi kết nối');
        }
        setSaving(false);
    };

    const handleEdit = (cat: CategoryItem) => {
        setEditId(cat.id);
        setFormData({ name: cat.name, icon: cat.icon || '', parentId: cat.parentId || '' });
        setShowForm(true);
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa danh mục này?')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/categories?id=${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                fetchCategories();
            } else {
                alert(data.error);
            }
        } catch { alert('Lỗi kết nối'); }
        setDeletingId('');
    };

    const parentCategories = categories.filter(c => !c.parentId);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin" className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Layers className="w-7 h-7 text-green-400" />
                        Quản lý danh mục
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">{categories.length} danh mục • Thêm, sửa ngành nghề</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchCategories} className="btn-secondary text-sm">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => { setShowForm(!showForm); setEditId(null); setFormData({ name: '', icon: '', parentId: '' }); setError(''); }}
                        className="btn-primary text-sm"
                    >
                        <Plus className="w-4 h-4" /> Thêm mới
                    </button>
                </div>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="glass-card p-5 mb-6 animate-slide-up">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        {editId ? <Edit3 className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4 text-green-400" />}
                        {editId ? 'Sửa danh mục' : 'Thêm danh mục mới'}
                    </h3>
                    {error && (
                        <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="input-label">Tên danh mục *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    placeholder="VD: Phục vụ"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="input-label">Icon</label>
                                <div className="flex gap-1.5 flex-wrap mt-1">
                                    {ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, icon })}
                                            className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all border ${formData.icon === icon
                                                    ? 'bg-blue-500/20 border-blue-500/40 scale-110'
                                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Danh mục cha</label>
                                <select
                                    value={formData.parentId}
                                    onChange={e => setFormData({ ...formData, parentId: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="">— Không có (root) —</option>
                                    {parentCategories.filter(c => c.id !== editId).map(c => (
                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="submit" disabled={saving} className="btn-primary text-sm">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editId ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setEditId(null); setError(''); }}
                                className="btn-secondary text-sm"
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Categories List */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-green-400 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Đang tải...</p>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="p-12 text-center">
                        <Layers className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-400">Chưa có danh mục nào</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {categories.map(cat => (
                            <div key={cat.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cat.parentId ? 'bg-white/5 ml-6' : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                                    }`}>
                                    {cat.icon || (cat.parentId ? <FolderTree className="w-4 h-4 text-slate-500" /> : '📂')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-medium">{cat.name}</h3>
                                        <code className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">{cat.slug}</code>
                                        {cat.parent && (
                                            <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                                                ↳ {cat.parent.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> {cat._count.jobs} jobs
                                    </span>
                                    <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-blue-400 transition-colors" title="Sửa">
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        disabled={deletingId === cat.id || cat._count.jobs > 0}
                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 disabled:opacity-30 transition-colors"
                                        title={cat._count.jobs > 0 ? 'Không thể xóa (có tin)' : 'Xóa'}
                                    >
                                        {deletingId === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
