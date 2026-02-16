/**
 * Profile Completion Helpers
 * 
 * Centralized logic for checking if a candidate or employer
 * has completed their profile with required fields.
 * Used by: middleware, UI, API routes.
 */

// =========================================
// Candidate Profile Completion
// =========================================

export interface CandidateProfileData {
    fullName?: string | null;
    phone?: string | null;
    desiredJob?: string | null;
    shifts?: string | null;
    [key: string]: unknown;
}

export function isCandidateProfileComplete(profile: CandidateProfileData | null): boolean {
    if (!profile) return false;

    const hasFullName = !!profile.fullName?.trim();
    const hasPhone = !!profile.phone?.trim();
    const hasDesiredJob = !!profile.desiredJob?.trim();

    // Parse shifts - can be JSON string or already parsed
    let shiftsArray: string[] = [];
    if (profile.shifts) {
        if (typeof profile.shifts === 'string') {
            try {
                shiftsArray = JSON.parse(profile.shifts);
            } catch {
                shiftsArray = [];
            }
        } else if (Array.isArray(profile.shifts)) {
            shiftsArray = profile.shifts as string[];
        }
    }

    const hasShifts = shiftsArray.length > 0;

    return hasFullName && hasPhone && hasDesiredJob && hasShifts;
}

export function getCandidateCompletionStatus(profile: CandidateProfileData | null) {
    if (!profile) {
        return { isComplete: false, missing: ['fullName', 'phone', 'desiredJob', 'shifts'], percentage: 0 };
    }

    const checks = {
        fullName: !!profile.fullName?.trim(),
        phone: !!profile.phone?.trim(),
        desiredJob: !!profile.desiredJob?.trim(),
        shifts: (() => {
            let arr: string[] = [];
            if (profile.shifts) {
                if (typeof profile.shifts === 'string') {
                    try { arr = JSON.parse(profile.shifts); } catch { arr = []; }
                } else if (Array.isArray(profile.shifts)) {
                    arr = profile.shifts as string[];
                }
            }
            return arr.length > 0;
        })(),
    };

    const missing = Object.entries(checks)
        .filter(([, ok]) => !ok)
        .map(([field]) => field);

    const total = Object.keys(checks).length;
    const completed = total - missing.length;

    return {
        isComplete: missing.length === 0,
        missing,
        percentage: Math.round((completed / total) * 100),
    };
}

// =========================================
// Employer Profile Completion
// =========================================

export interface EmployerProfileData {
    businessName?: string | null;
    address?: string | null;
    phone?: string | null;
    location?: string | null;
    [key: string]: unknown;
}

export function isEmployerProfileComplete(profile: EmployerProfileData | null): boolean {
    if (!profile) return false;

    return !!(
        profile.businessName?.trim() &&
        profile.address?.trim() &&
        profile.phone?.trim() &&
        profile.location?.trim()
    );
}

export function getEmployerCompletionStatus(profile: EmployerProfileData | null) {
    if (!profile) {
        return { isComplete: false, missing: ['businessName', 'address', 'phone', 'location'], percentage: 0 };
    }

    const checks = {
        businessName: !!profile.businessName?.trim(),
        address: !!profile.address?.trim(),
        phone: !!profile.phone?.trim(),
        location: !!profile.location?.trim(),
    };

    const missing = Object.entries(checks)
        .filter(([, ok]) => !ok)
        .map(([field]) => field);

    const total = Object.keys(checks).length;
    const completed = total - missing.length;

    return {
        isComplete: missing.length === 0,
        missing,
        percentage: Math.round((completed / total) * 100),
    };
}

// =========================================
// Vietnamese field labels (for UI)
// =========================================

export const FIELD_LABELS: Record<string, string> = {
    fullName: 'Họ và tên',
    phone: 'Số điện thoại',
    desiredJob: 'Vị trí mong muốn',
    shifts: 'Ca làm việc',
    businessName: 'Tên cơ sở',
    address: 'Địa chỉ',
    location: 'Khu vực',
};
