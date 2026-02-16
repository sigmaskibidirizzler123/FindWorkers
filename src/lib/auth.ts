import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'findworkers-secret';

export interface JWTPayload {
    userId: string;
    email: string; // Can be empty string for phone-only candidates
    role: string;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function comparePassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export async function getCurrentUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) return null;

        const payload = verifyToken(token);
        if (!payload) return null;

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                email: true,
                phone: true,
                role: true,
                avatarUrl: true,
                isActive: true,
                createdAt: true,
                candidateProfile: { select: { id: true, fullName: true } },
                employerProfile: { select: { id: true, businessName: true } },
            },
        });

        if (!user || !user.isActive) return null;

        return {
            ...user,
            hasProfile: user.role === 'CANDIDATE'
                ? !!user.candidateProfile
                : user.role === 'EMPLOYER'
                    ? !!user.employerProfile
                    : true, // Admin always "has profile"
        };
    } catch {
        return null;
    }
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}

export async function requireRole(roles: string[]) {
    const user = await requireAuth();
    if (!roles.includes(user.role)) {
        throw new Error('Forbidden');
    }
    return user;
}
