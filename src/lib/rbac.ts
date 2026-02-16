/**
 * RBAC - Role-Based Access Control (Granular Permissions)
 * 
 * Replaces simple role string checks with a proper permission system.
 * Supports: Owner, HR, Manager roles within a company.
 * 
 * Usage:
 *   import { can, PERMISSIONS } from '@/lib/rbac';
 *   if (!can(user.role, PERMISSIONS.JOB_CREATE)) return errorResponse('No permission', 403);
 *   
 *   // Or use the middleware helper:
 *   const authError = requirePermission(request, PERMISSIONS.JOB_CREATE);
 *   if (authError) return authError;
 */

import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from './auth';
import { errorResponse } from './api-response';

// ── Permission Definitions ────────────────

export const PERMISSIONS = {
    // Job management
    JOB_CREATE: 'job:create',
    JOB_EDIT: 'job:edit',
    JOB_DELETE: 'job:delete',
    JOB_VIEW_ALL: 'job:view_all',
    JOB_CLOSE: 'job:close',

    // Application management
    APP_VIEW: 'application:view',
    APP_STATUS_UPDATE: 'application:status_update',
    APP_EXPORT: 'application:export',
    APP_SCHEDULE_INTERVIEW: 'application:schedule_interview',

    // Company management
    COMPANY_EDIT: 'company:edit',
    COMPANY_BRANCHES: 'company:branches',
    COMPANY_BILLING: 'company:billing',

    // Team management (future)
    TEAM_INVITE: 'team:invite',
    TEAM_MANAGE: 'team:manage',
    TEAM_VIEW: 'team:view',

    // Analytics
    ANALYTICS_VIEW: 'analytics:view',
    ANALYTICS_EXPORT: 'analytics:export',

    // Admin
    ADMIN_USERS: 'admin:users',
    ADMIN_JOBS: 'admin:jobs',
    ADMIN_FLAGS: 'admin:feature_flags',
    ADMIN_LOGS: 'admin:activity_logs',
    ADMIN_CATEGORIES: 'admin:categories',
    ADMIN_SYSTEM: 'admin:system',

    // Candidate
    CANDIDATE_APPLY: 'candidate:apply',
    CANDIDATE_PROFILE: 'candidate:profile',
    CANDIDATE_SAVED: 'candidate:saved_jobs',

    // Notifications
    NOTIFICATION_VIEW: 'notification:view',
    NOTIFICATION_MANAGE: 'notification:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ── Sub-Roles for Employers ────────────────

/**
 * CompanyRole defines granular permissions within a company.
 * UserRole (CANDIDATE/EMPLOYER/ADMIN) is still the top-level role.
 * CompanyRole adds granularity within EMPLOYER accounts.
 */
export type CompanyRole = 'OWNER' | 'HR' | 'MANAGER' | 'VIEWER';

// ── Role-Permission Matrix ────────────────

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    // === System roles ===
    CANDIDATE: [
        PERMISSIONS.CANDIDATE_APPLY,
        PERMISSIONS.CANDIDATE_PROFILE,
        PERMISSIONS.CANDIDATE_SAVED,
        PERMISSIONS.NOTIFICATION_VIEW,
    ],

    EMPLOYER: [
        // Full access (OWNER-level by default for backward compatibility)
        PERMISSIONS.JOB_CREATE,
        PERMISSIONS.JOB_EDIT,
        PERMISSIONS.JOB_DELETE,
        PERMISSIONS.JOB_VIEW_ALL,
        PERMISSIONS.JOB_CLOSE,
        PERMISSIONS.APP_VIEW,
        PERMISSIONS.APP_STATUS_UPDATE,
        PERMISSIONS.APP_EXPORT,
        PERMISSIONS.APP_SCHEDULE_INTERVIEW,
        PERMISSIONS.COMPANY_EDIT,
        PERMISSIONS.COMPANY_BRANCHES,
        PERMISSIONS.TEAM_VIEW,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.NOTIFICATION_VIEW,
        PERMISSIONS.NOTIFICATION_MANAGE,
    ],

    ADMIN: Object.values(PERMISSIONS), // Admin has all permissions

    // === Company sub-roles (used for future team features) ===
    OWNER: [
        ...Object.values(PERMISSIONS).filter(p =>
            p.startsWith('job:') ||
            p.startsWith('application:') ||
            p.startsWith('company:') ||
            p.startsWith('team:') ||
            p.startsWith('analytics:') ||
            p.startsWith('notification:')
        ),
        PERMISSIONS.COMPANY_BILLING,
    ],

    HR: [
        PERMISSIONS.JOB_CREATE,
        PERMISSIONS.JOB_EDIT,
        PERMISSIONS.JOB_VIEW_ALL,
        PERMISSIONS.APP_VIEW,
        PERMISSIONS.APP_STATUS_UPDATE,
        PERMISSIONS.APP_SCHEDULE_INTERVIEW,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.NOTIFICATION_VIEW,
        PERMISSIONS.NOTIFICATION_MANAGE,
    ],

    MANAGER: [
        PERMISSIONS.JOB_VIEW_ALL,
        PERMISSIONS.APP_VIEW,
        PERMISSIONS.APP_STATUS_UPDATE,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.NOTIFICATION_VIEW,
    ],

    VIEWER: [
        PERMISSIONS.JOB_VIEW_ALL,
        PERMISSIONS.APP_VIEW,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.NOTIFICATION_VIEW,
    ],
};

// ── Core Functions ────────────────

/**
 * Check if a role has a specific permission
 */
export function can(role: string, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.includes(permission);
}

/**
 * Check multiple permissions (ALL must pass)
 */
export function canAll(role: string, permissions: Permission[]): boolean {
    return permissions.every(p => can(role, p));
}

/**
 * Check multiple permissions (ANY must pass)
 */
export function canAny(role: string, permissions: Permission[]): boolean {
    return permissions.some(p => can(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: string): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}

// ── API Route Helpers ────────────────

/**
 * Verify token and check permission in one call.
 * Returns [payload, null] if authorized, [null, errorResponse] if not.
 */
export function requirePermission(
    request: NextRequest,
    permission: Permission
): [JWTPayload, null] | [null, Response] {
    const token = request.cookies.get('token')?.value;
    if (!token) {
        return [null, errorResponse('Chưa đăng nhập', 401) as unknown as Response];
    }

    const payload = verifyToken(token);
    if (!payload) {
        return [null, errorResponse('Token không hợp lệ', 401) as unknown as Response];
    }

    if (!can(payload.role, permission)) {
        return [null, errorResponse('Không có quyền thực hiện', 403) as unknown as Response];
    }

    return [payload, null];
}

/**
 * Simple role check (backward compatible)
 */
export function requireRole(
    request: NextRequest,
    ...roles: string[]
): [JWTPayload, null] | [null, Response] {
    const token = request.cookies.get('token')?.value;
    if (!token) {
        return [null, errorResponse('Chưa đăng nhập', 401) as unknown as Response];
    }

    const payload = verifyToken(token);
    if (!payload) {
        return [null, errorResponse('Token không hợp lệ', 401) as unknown as Response];
    }

    if (!roles.includes(payload.role)) {
        return [null, errorResponse('Không có quyền', 403) as unknown as Response];
    }

    return [payload, null];
}
