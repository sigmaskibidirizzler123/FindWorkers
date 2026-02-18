/**
 * Blacklist Service
 * 
 * Check and manage blocked IPs, phones, emails, and devices.
 * Integrates with registration, login, and application flows.
 */

import prisma from '@/lib/prisma';

type BlacklistType = 'ip' | 'phone' | 'email' | 'device';

/**
 * Check if a value is blacklisted
 */
export async function isBlacklisted(type: BlacklistType, value: string): Promise<boolean> {
    const entry = await prisma.blacklist.findUnique({
        where: { type_value: { type, value } },
    });

    if (!entry || !entry.isActive) return false;

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
        // Auto-deactivate expired entries
        await prisma.blacklist.update({
            where: { id: entry.id },
            data: { isActive: false },
        }).catch(() => { });
        return false;
    }

    return true;
}

/**
 * Check multiple blacklist types at once
 */
export async function checkBlacklists(checks: { type: BlacklistType; value: string }[]): Promise<{
    blocked: boolean;
    blockedType?: string;
    reason?: string;
}> {
    for (const check of checks) {
        if (!check.value) continue;

        const entry = await prisma.blacklist.findUnique({
            where: { type_value: { type: check.type, value: check.value } },
        });

        if (entry && entry.isActive) {
            // Check expiry
            if (entry.expiresAt && entry.expiresAt < new Date()) {
                await prisma.blacklist.update({
                    where: { id: entry.id },
                    data: { isActive: false },
                }).catch(() => { });
                continue;
            }

            return {
                blocked: true,
                blockedType: check.type,
                reason: entry.reason || undefined,
            };
        }
    }

    return { blocked: false };
}

/**
 * Add to blacklist
 */
export async function addToBlacklist(
    type: BlacklistType,
    value: string,
    reason?: string,
    blockedBy?: string,
    expiresInHours?: number
) {
    const expiresAt = expiresInHours
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : null;

    return prisma.blacklist.upsert({
        where: { type_value: { type, value } },
        update: { isActive: true, reason, blockedBy, expiresAt },
        create: { type, value, reason, blockedBy, expiresAt },
    });
}

/**
 * Remove from blacklist
 */
export async function removeFromBlacklist(type: BlacklistType, value: string) {
    return prisma.blacklist.updateMany({
        where: { type, value },
        data: { isActive: false },
    });
}

/**
 * Get all active blacklist entries
 */
export async function getBlacklist(type?: BlacklistType) {
    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;

    return prisma.blacklist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });
}
