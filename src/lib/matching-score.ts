/**
 * Matching Score Engine
 * Calculates compatibility between candidates and jobs
 * 
 * Score formula:
 * - Industry/Category match: 40%
 * - Experience match: 30%  
 * - Location match: 20%
 * - Shift compatibility: 10%
 * 
 * Total: 0-100 points
 */

interface CandidateData {
    experienceMonths: number;
    currentLocation?: string | null;
    shifts?: string; // JSON array string for candidate's available shifts
    preferredCategoryIds?: string[];
}

interface JobData {
    experienceRequired: number;
    city?: string | null;
    location?: string | null;
    shift?: string | null;
    shifts?: string; // JSON array string e.g. '["MORNING","AFTERNOON"]'
    salaryMin?: number | null;
    salaryMax?: number | null;
    categoryId?: string | null;
}

/**
 * Calculate overall matching score between a candidate and a job
 */
export function calculateMatchingScore(candidate: CandidateData, job: JobData): number {
    const categoryScore = calculateCategoryScore(candidate, job);
    const experienceScore = calculateExperienceScore(candidate, job);
    const locationScore = calculateLocationScore(candidate, job);
    const shiftScore = calculateShiftScore(candidate, job);

    // Weighted formula
    const total = Math.round(
        categoryScore * 0.4 +
        experienceScore * 0.3 +
        locationScore * 0.2 +
        shiftScore * 0.1
    );

    return Math.min(100, Math.max(0, total));
}

/**
 * Category matching (40% weight)
 * Does the candidate want to work in this category?
 */
function calculateCategoryScore(candidate: CandidateData, job: JobData): number {
    if (!job.categoryId || !candidate.preferredCategoryIds?.length) return 50;

    if (candidate.preferredCategoryIds.includes(job.categoryId)) return 100;

    return 20; // No match
}

/**
 * Experience matching (30% weight)
 * Does the candidate have enough experience?
 * Uses months for blue-collar precision
 */
function calculateExperienceScore(candidate: CandidateData, job: JobData): number {
    if (job.experienceRequired === 0) return 80; // No experience required

    // Convert candidate months to years for comparison
    const candidateYears = candidate.experienceMonths / 12;
    const diff = candidateYears - job.experienceRequired;

    if (diff >= 0) return 100;       // Meets or exceeds
    if (diff >= -0.5) return 80;     // Almost there (within 6 months)
    if (diff >= -1) return 50;       // 1 year short
    return 20;                       // Significantly under
}

/**
 * Location matching (20% weight)
 * Is the candidate near the job?
 */
function calculateLocationScore(candidate: CandidateData, job: JobData): number {
    if (!candidate.currentLocation) return 50; // No info

    const candidateLoc = candidate.currentLocation.toLowerCase().trim();
    const jobLocation = (job.location || '').toLowerCase().trim();
    const jobCity = (job.city || '').toLowerCase().trim();

    if (candidateLoc === jobLocation || candidateLoc === jobCity) return 100; // Same area
    if (jobLocation.includes(candidateLoc) || candidateLoc.includes(jobLocation)) return 80; // Partial match
    if (jobCity.includes(candidateLoc) || candidateLoc.includes(jobCity)) return 60; // City match

    return 20; // Different
}

/**
 * Shift compatibility (10% weight)
 * Can the candidate work the required shifts?
 * Supports multi-shift matching (JSON arrays)
 */
function calculateShiftScore(candidate: CandidateData, job: JobData): number {
    // Parse candidate shifts from JSON
    let candidateShifts: string[] = [];
    if (candidate.shifts) {
        try {
            const parsed = JSON.parse(candidate.shifts);
            if (Array.isArray(parsed)) candidateShifts = parsed;
        } catch { /* ignore */ }
    }

    if (candidateShifts.length === 0) return 50; // No candidate info

    // FLEXIBLE = always match
    if (candidateShifts.includes('FLEXIBLE')) return 100;

    // Parse job shifts
    let jobShifts: string[] = [];
    if (job.shifts) {
        try {
            const parsed = JSON.parse(job.shifts);
            if (Array.isArray(parsed)) jobShifts = parsed;
        } catch { /* ignore */ }
    }
    if (jobShifts.length === 0 && job.shift) {
        jobShifts = [job.shift];
    }

    if (jobShifts.length === 0) return 50; // No job shift info

    // Check overlap between candidate and job shifts
    const overlap = candidateShifts.some(s => jobShifts.includes(s));
    return overlap ? 100 : 20;
}

export default calculateMatchingScore;
