/**
 * Feature Flag System
 * Controls feature rollout without code changes
 * 
 * Usage:
 *   if (await isFeatureEnabled('matching_score_v2')) { ... }
 *   if (await isFeatureEnabled('auto_screening')) { ... }
 */
import prisma from './prisma';

// In-memory cache for feature flags (5 min TTL)
let flagCache: Map<string, boolean> = new Map();
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
    // Check cache first
    if (Date.now() - cacheTimestamp < CACHE_TTL && flagCache.has(key)) {
        return flagCache.get(key) ?? false;
    }

    try {
        const flag = await prisma.featureFlag.findUnique({
            where: { key },
        });

        const isEnabled = flag?.isEnabled ?? false;
        flagCache.set(key, isEnabled);
        cacheTimestamp = Date.now();

        return isEnabled;
    } catch {
        // If DB is unavailable, return false (safe default)
        return false;
    }
}

/**
 * Invalidate the cache (call after flag updates)
 */
export function invalidateFlagCache() {
    flagCache = new Map();
    cacheTimestamp = 0;
}

/**
 * Predefined feature flags for the system
 */
export const FEATURE_FLAGS = {
    MATCHING_SCORE: 'matching_score',
    AUTO_SCREENING: 'auto_screening',
    AUTO_CLOSE_JOBS: 'auto_close_jobs',
    NOTIFICATIONS: 'notifications',
    AI_RECOMMENDATIONS: 'ai_recommendations',
    MULTI_BRANCH: 'multi_branch',
    KPI_DASHBOARD: 'kpi_dashboard',
    CANDIDATE_PREFERRED_CATEGORIES: 'candidate_preferred_categories',
} as const;
