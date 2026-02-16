/**
 * Prisma Client - Singleton Implementation (SQLite)
 * 
 * Uses SQLite for development simplicity (zero-config database).
 * Switched from PostgreSQL to ensure immediate functionality
 * without requiring external database server installation.
 * Downgraded to v6 Client for better compatibility.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Create or reuse PrismaClient
// Standard Prisma Client v6 initialization works out of the box with SQLite URL
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
