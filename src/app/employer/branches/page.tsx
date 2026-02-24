'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    GitBranch, Plus, MapPin, Phone, User, Building2,
    ArrowLeft, Loader2, Pencil, Trash2, X, CheckCircle2,
    AlertCircle, Star, Briefcase
} from 'lucide-react';

interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    managerName: string | null;
    managerPhone: string | null;
    isMain: boolean;
    createdAt: string;
    _count: { jobs: number };
}

const INITIAL_FORM = {
    name: '',
    address: '',
    phone: '',
    managerName: '',
    managerPhone: '',
    isMain: false,
};

export default function EmployerBranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/employer/branches', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setBranches(data.data);
            }
        } catch {
            console.error('Failed to fetch branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBranches(); }, []);

    const handleSubmit = async () => {
        setError('');
        if (!formData.name.trim()) {
            setError('Vui lòng nhập tên chi nhánh');
            return;
        }
        if (!formData.address.trim()) {
            setError('Vui lòng nhập địa chỉ');
            return;
        }

        setSaving(true);
        try {
            const url = editingId
                ? `/api/employer/branches/${editingId}`
                : '/api/employer/branches';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(editingId ? 'Đã cập nhật chi nhánh!' : 'Đã thêm chi nhánh mới!');
                setShowForm(false);
                setEditingId(null);
                setFormData(INITIAL_FORM);
                await fetchBranches();
                setTimeout(() => setSuccess(''), 2000);
            } else {
                setError(data.error || 'Đã xảy ra lỗi');
            }
        } catch {
            setError('Lỗi kết nối');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (branch: Branch) => {
        setEditingId(branch.id);
        setFormData({
            name: branch.name,
            address: branch.address,
            phone: branch.phone || '',
            managerName: branch.managerName || '',
            managerPhone: branch.managerPhone || '',
            isMain: branch.isMain,
        });
        setShowForm(true);
        setError('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa chi nhánh này?')) return;
        setDeleting(id);
        try {
            const res = await fetch(`/api/employer/branches/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Đã xóa chi nhánh!');
                await fetchBranches();
                setTimeout(() => setSuccess(''), 2000);
            } else {
                setError(data.error || 'Không thể xóa');
            }
        } catch {
            setError('Lỗi kết nối');
        } finally {
            setDeleting(null);
        }
    };

    const cancelForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData(INITIAL_FORM);
        setError('');
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/employer/dashboard" className="text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                            <GitBranch className="w-7 h-7 text-blue-400" />
                            Quản lý Chi nhánh
                        </h1>
                    </div>
                    <p className="text-slate-400 text-sm ml-7">
                        Quản lý các chi nhánh, cơ sở kinh doanh của doanh nghiệp
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditingId(null); setFormData(INITIAL_FORM); setError(''); }}
                    className="btn-primary text-sm"
                >
                    <Plus className="w-4 h-4" /> Thêm chi nhánh
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
            )}
            {success && (
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
                </div>
            )}

            {/* ── Form Modal ── */}
            {showForm && (
                <div className="glass-card p-6 mb-6 animate-slide-up border border-blue-500/20">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-400" />
                            {editingId ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}
                        </h2>
                        <button onClick={cancelForm} className="text-slate-400 hover:text-white p-1">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Tên chi nhánh *</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="VD: Chi nhánh Dương Đông"
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Số điện thoại</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="0912 345 678"
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Địa chỉ *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="VD: 123 Trần Hưng Đạo, TT. Dương Đông"
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">Tên quản lý</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.managerName}
                                        onChange={e => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
                                        placeholder="Họ và tên"
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="input-label">SĐT quản lý</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="tel"
                                        value={formData.managerPhone}
                                        onChange={e => setFormData(prev => ({ ...prev, managerPhone: e.target.value }))}
                                        placeholder="0912 345 678"
                                        className="input-field pl-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* isMain toggle */}
                        <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800/80 transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.isMain}
                                onChange={e => setFormData(prev => ({ ...prev, isMain: e.target.checked }))}
                                className="w-4 h-4 rounded accent-blue-500"
                            />
                            <div>
                                <span className="text-sm font-medium text-white flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-400" /> Chi nhánh chính
                                </span>
                                <p className="text-xs text-slate-500">Đánh dấu đây là cơ sở chính của doanh nghiệp</p>
                            </div>
                        </label>

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={cancelForm} className="btn-secondary text-sm">Hủy</button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                className="btn-primary text-sm disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        {editingId ? 'Lưu thay đổi' : 'Thêm chi nhánh'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Branch List ── */}
            {loading ? (
                <div className="glass-card p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Đang tải...</p>
                </div>
            ) : branches.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Chưa có chi nhánh nào</h3>
                    <p className="text-slate-400 mb-6 text-sm">
                        Thêm chi nhánh để quản lý nhiều cơ sở kinh doanh.<br />
                        Mỗi chi nhánh có thể có quản lý riêng và danh sách tin tuyển dụng riêng.
                    </p>
                    <button
                        onClick={() => { setShowForm(true); setEditingId(null); setFormData(INITIAL_FORM); }}
                        className="btn-primary inline-flex"
                    >
                        <Plus className="w-4 h-4" /> Thêm chi nhánh đầu tiên
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {branches.map((branch, i) => (
                        <div
                            key={branch.id}
                            className="glass-card p-5 animate-slide-up"
                            style={{ animationDelay: `${i * 0.05}s` }}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${branch.isMain
                                            ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                                            : 'bg-gradient-to-br from-slate-700 to-slate-600'
                                        }`}>
                                        {branch.isMain ? (
                                            <Star className="w-5 h-5 text-white" />
                                        ) : (
                                            <Building2 className="w-5 h-5 text-slate-300" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-white text-lg">{branch.name}</h3>
                                            {branch.isMain && (
                                                <span className="badge text-[11px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                    ★ Chính
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {branch.address}
                                            </span>
                                            {branch.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {branch.phone}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" /> {branch._count.jobs} tin tuyển dụng
                                            </span>
                                        </div>
                                        {(branch.managerName || branch.managerPhone) && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                <User className="w-3 h-3" />
                                                <span>Quản lý: {branch.managerName || '—'}</span>
                                                {branch.managerPhone && <span>• {branch.managerPhone}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleEdit(branch)}
                                        className="btn-secondary text-xs py-1.5 px-3"
                                        title="Chỉnh sửa"
                                    >
                                        <Pencil className="w-3 h-3" /> Sửa
                                    </button>
                                    <button
                                        onClick={() => handleDelete(branch.id)}
                                        disabled={deleting === branch.id}
                                        className="btn-secondary text-xs py-1.5 px-3 !text-red-400 hover:!bg-red-500/10 disabled:opacity-50"
                                        title="Xóa"
                                    >
                                        {deleting === branch.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3 h-3" />
                                        )}
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
