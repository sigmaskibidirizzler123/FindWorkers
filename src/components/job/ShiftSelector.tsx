'use client';

import { Clock } from 'lucide-react';

// Valid shift types for multi-select
export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'ROTATING' | 'PART_TIME';

export interface ShiftOption {
    value: ShiftType;
    label: string;
    timeRange: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
}

export const SHIFT_OPTIONS: ShiftOption[] = [
    {
        value: 'MORNING',
        label: 'Ca Sáng',
        timeRange: '6h - 14h',
        icon: '🟢',
        color: 'text-emerald-300',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        glowColor: 'shadow-emerald-500/20',
    },
    {
        value: 'AFTERNOON',
        label: 'Ca Chiều',
        timeRange: '14h - 22h',
        icon: '🟡',
        color: 'text-amber-300',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        glowColor: 'shadow-amber-500/20',
    },
    {
        value: 'NIGHT',
        label: 'Ca Đêm',
        timeRange: '22h - 6h',
        icon: '🔴',
        color: 'text-red-300',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        glowColor: 'shadow-red-500/20',
    },
    {
        value: 'ROTATING',
        label: 'Xoay ca',
        timeRange: 'Thay đổi',
        icon: '🔄',
        color: 'text-blue-300',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        glowColor: 'shadow-blue-500/20',
    },
    {
        value: 'PART_TIME',
        label: 'Part-time',
        timeRange: 'Linh hoạt',
        icon: '⏱',
        color: 'text-violet-300',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/30',
        glowColor: 'shadow-violet-500/20',
    },
];

interface ShiftSelectorProps {
    selectedShifts: ShiftType[];
    onChange: (shifts: ShiftType[]) => void;
    error?: string;
}

export default function ShiftSelector({ selectedShifts, onChange, error }: ShiftSelectorProps) {
    const toggleShift = (shift: ShiftType) => {
        if (selectedShifts.includes(shift)) {
            onChange(selectedShifts.filter((s) => s !== shift));
        } else {
            onChange([...selectedShifts, shift]);
        }
    };

    return (
        <div className="shift-selector-container">
            <div className="shift-selector-header">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="input-label !mb-0">Ca làm việc</span>
                {selectedShifts.length > 0 && (
                    <span className="shift-count-badge">
                        {selectedShifts.length} ca
                    </span>
                )}
            </div>

            <div className="shift-chips-grid">
                {SHIFT_OPTIONS.map((option) => {
                    const isSelected = selectedShifts.includes(option.value);

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleShift(option.value)}
                            className={`shift-chip ${isSelected ? 'shift-chip-selected' : ''} ${isSelected ? option.borderColor : ''} ${isSelected ? option.bgColor : ''}`}
                            id={`shift-${option.value}`}
                        >
                            <span className="shift-chip-icon">{option.icon}</span>
                            <div className="shift-chip-content">
                                <span className={`shift-chip-label ${isSelected ? option.color : ''}`}>
                                    {option.label}
                                </span>
                                <span className="shift-chip-time">{option.timeRange}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {error && (
                <p className="text-red-400 text-xs mt-1.5">{error}</p>
            )}
        </div>
    );
}

// Utility function to get shift display info
export function getShiftDisplayInfo(shiftValue: string): ShiftOption | undefined {
    return SHIFT_OPTIONS.find((s) => s.value === shiftValue);
}

// Render shift badges for display (e.g., in dashboard, job cards)
export function ShiftBadges({ shifts }: { shifts: string[] }) {
    if (!shifts || shifts.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5">
            {shifts.map((shift) => {
                const info = getShiftDisplayInfo(shift);
                if (!info) return null;

                return (
                    <span
                        key={shift}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${info.bgColor} ${info.borderColor} ${info.color}`}
                    >
                        <span className="text-xs">{info.icon}</span>
                        {info.label}
                    </span>
                );
            })}
        </div>
    );
}
