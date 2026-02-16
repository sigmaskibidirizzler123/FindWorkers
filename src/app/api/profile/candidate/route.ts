/**
 * Candidate Profile API — Production Ready
 * 
 * GET  - Fetch candidate profile (any authenticated user can view own)
 * POST - Create candidate profile (CANDIDATE only, max 1)
 * PUT  - Update candidate profile (CANDIDATE only, whitelisted fields)
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// ===============================
// GET — Fetch candidate profile
// ===============================
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload) return errorResponse('Token không hợp lệ', 401);

        const profile = await prisma.candidateProfile.findUnique({
            where: { userId: payload.userId },
            include: {
                user: {
                    select: { email: true, avatarUrl: true },
                },
                applications: {
                    include: {
                        job: {
                            select: {
                                id: true,
                                title: true,
                                status: true,
                                employer: {
                                    select: { businessName: true, logoUrl: true },
                                },
                            },
                        },
                    },
                    orderBy: { appliedAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!profile) {
            return errorResponse('Chưa có hồ sơ', 404);
        }

        return successResponse(profile);
    } catch (error) {
        console.error('Get candidate profile error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

// ===============================
// POST — Create candidate profile (one-time)
// ===============================
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'CANDIDATE') {
            return errorResponse('Không có quyền', 403);
        }

        // Check duplicate
        const existing = await prisma.candidateProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (existing) {
            return errorResponse('Đã có hồ sơ, vui lòng cập nhật', 409);
        }

        const body = await request.json();
        const { fullName, phone, currentLocation, desiredJob, experienceMonths, shifts, availableImmediately, description } = body;

        // Validate required
        if (!fullName || !phone) {
            return errorResponse('Họ tên và số điện thoại là bắt buộc', 400);
        }

        // Parse shifts safely
        let parsedShifts = '[]';
        if (shifts) {
            if (typeof shifts === 'string') {
                parsedShifts = shifts;
            } else if (Array.isArray(shifts)) {
                parsedShifts = JSON.stringify(shifts);
            }
        }

        const profile = await prisma.candidateProfile.create({
            data: {
                userId: payload.userId,
                fullName: fullName.trim(),
                phone: phone.trim(),
                currentLocation: currentLocation?.trim() || null,
                desiredJob: desiredJob?.trim() || null,
                experienceMonths: experienceMonths ? parseInt(experienceMonths) : 0,
                shifts: parsedShifts,
                availableImmediately: !!availableImmediately,
                description: description?.trim() || null,
            },
        });

        return successResponse(profile, 201);
    } catch (error) {
        console.error('Create candidate profile error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

// ===============================
// PUT — Update candidate profile (whitelisted fields only)
// ===============================
export async function PUT(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'CANDIDATE') {
            return errorResponse('Không có quyền', 403);
        }

        const body = await request.json();

        // Whitelist allowed fields — NEVER spread raw body into Prisma
        const allowedFields: Record<string, unknown> = {};
        const whitelist = [
            'fullName', 'phone', 'currentLocation', 'desiredJob',
            'experienceMonths', 'shifts', 'availableImmediately', 'description', 'avatarUrl',
        ];

        for (const field of whitelist) {
            if (body[field] !== undefined) {
                switch (field) {
                    case 'experienceMonths':
                        allowedFields[field] = body[field] !== null ? parseInt(body[field]) : 0;
                        break;
                    case 'availableImmediately':
                        allowedFields[field] = !!body[field];
                        break;
                    case 'shifts':
                        if (typeof body[field] === 'string') {
                            allowedFields[field] = body[field];
                        } else if (Array.isArray(body[field])) {
                            allowedFields[field] = JSON.stringify(body[field]);
                        }
                        break;
                    case 'fullName':
                    case 'phone':
                    case 'currentLocation':
                    case 'desiredJob':
                    case 'description':
                    case 'avatarUrl':
                        allowedFields[field] = body[field]?.trim() || null;
                        break;
                    default:
                        allowedFields[field] = body[field];
                }
            }
        }

        const profile = await prisma.candidateProfile.update({
            where: { userId: payload.userId },
            data: allowedFields,
        });

        return successResponse(profile);
    } catch (error) {
        console.error('Update candidate profile error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
