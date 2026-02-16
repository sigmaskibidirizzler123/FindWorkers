'use client';

import { useState, useEffect } from 'react';
import { FileText, Loader2, Check, DollarSign, Sparkles } from 'lucide-react';

interface TemplatePreview {
    id: string;
    title: string;
    category: string;
    categoryId: string | null;
    defaultSalaryMin: number | null;
    defaultSalaryMax: number | null;
    suggestedShifts: string | null;
}

interface TemplateDetail {
    id: string;
    title: string;
    description: string;
    requirements: string;
    benefits: string;
    defaultSalaryMin: number | null;
    defaultSalaryMax: number | null;
    suggestedShifts: string | null;
    category: string;
    categoryId: string | null;
}

interface TemplateSelectorProps {
    onSelectTemplate: (template: TemplateDetail) => void;
    selectedTemplateId?: string | null;
}

const TEMPLATE_ICONS: Record<string, string> = {
    'Phụ bếp': '🍳',
    'Phục vụ bàn': '🍽️',
    'Tạp vụ': '🧹',
    'Lễ tân': '💁',
    'Bảo vệ': '🛡️',
};

function formatSalary(value: number | null): string {
    if (!value) return '';
    return value.toLocaleString('vi-VN') + 'đ';
}

export default function TemplateSelector({ onSelectTemplate, selectedTemplateId }: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<TemplatePreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await fetch('/api/job-templates?category=FNB');
                const data = await res.json();
                if (data.success) {
                    setTemplates(data.data);
                }
            } catch (error) {
                console.error('Failed to load templates:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const handleSelectTemplate = async (templateId: string) => {
        if (loadingId) return;
        setLoadingId(templateId);

        try {
            const res = await fetch(`/api/job-templates/${templateId}`);
            const data = await res.json();
            if (data.success) {
                onSelectTemplate(data.data);
            }
        } catch (error) {
            console.error('Failed to load template detail:', error);
        } finally {
            setLoadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="template-selector-container">
                <div className="template-selector-header">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Đang tải mẫu có sẵn...</span>
                </div>
                <div className="template-grid">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="template-card-skeleton">
                            <div className="skeleton-icon" />
                            <div className="skeleton-text" />
                            <div className="skeleton-text-sm" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (templates.length === 0) return null;

    return (
        <div className="template-selector-container">
            <div className="template-selector-header">
                <div className="template-header-left">
                    <div className="template-icon-badge">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="template-title">Chọn mẫu có sẵn</h3>
                        <p className="template-subtitle">Điền nhanh trong 10 giây — bạn có thể chỉnh sửa sau</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsVisible(!isVisible)}
                    className="template-toggle-btn"
                >
                    {isVisible ? 'Ẩn' : 'Hiện'}
                </button>
            </div>

            {isVisible && (
                <div className="template-grid">
                    {templates.map((template, index) => {
                        const isSelected = selectedTemplateId === template.id;
                        const isLoading = loadingId === template.id;
                        const icon = TEMPLATE_ICONS[template.title] || '📋';

                        return (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => handleSelectTemplate(template.id)}
                                disabled={!!loadingId}
                                className={`template-card ${isSelected ? 'template-card-selected' : ''}`}
                                style={{ animationDelay: `${index * 60}ms` }}
                                id={`template-${template.id}`}
                            >
                                {isSelected && (
                                    <div className="template-check">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}

                                <div className="template-card-icon">
                                    {isLoading ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                    ) : (
                                        <span className="text-2xl">{icon}</span>
                                    )}
                                </div>

                                <span className="template-card-title">{template.title}</span>

                                {(template.defaultSalaryMin || template.defaultSalaryMax) && (
                                    <div className="template-card-salary">
                                        <DollarSign className="w-3 h-3" />
                                        <span>
                                            {formatSalary(template.defaultSalaryMin)}
                                            {template.defaultSalaryMin && template.defaultSalaryMax && ' - '}
                                            {formatSalary(template.defaultSalaryMax)}
                                        </span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
