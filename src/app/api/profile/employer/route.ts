/**
 * Employer Profile API — Production Ready
 * 
 * GET  - Fetch employer profile
 * POST - Create employer profile (EMPLOYER only, max 1)
 * PUT  - Update employer profile (EMPLOYER only, whitelisted fields)
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

// ===============================
// GET — Fetch employer profile
// ===============================
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        const profile = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
            select: {
                id: true,
                businessName: true,
                businessType: true,
                address: true,
                location: true,
                phone: true,
                description: true,
                logoUrl: true,
                companyImages: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!profile) {
            return errorResponse('Chưa có hồ sơ doanh nghiệp', 404);
        }

        return successResponse(profile);
    } catch (error) {
        console.error('Get employer profile error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

// ===============================
// POST — Create employer profile (one-time)
// ===============================
export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        // Check duplicate
        const existing = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (existing) {
            return errorResponse('Đã có hồ sơ doanh nghiệp', 409);
        }

        const body = await request.json();
        const { businessName, businessType, address, location, phone, description, logoUrl } = body;

        // Validate required fields
        if (!businessName || !address || !location || !phone) {
            return errorResponse('Vui lòng điền đầy đủ: tên cơ sở, địa chỉ, khu vực, SĐT', 400);
        }

        const profile = await prisma.employerProfile.create({
            data: {
                userId: payload.userId,
                businessName: businessName.trim(),
                businessType: businessType?.trim() || null,
                address: address.trim(),
                location: location.trim(),
                phone: phone.trim(),
                description: description?.trim() || null,
                logoUrl: logoUrl || null,
                companyImages: body.companyImages || null,
            },
        });

        return successResponse(profile, 201);
    } catch (error) {
        console.error('Create employer profile error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}

// ===============================
// PUT — Update employer profile (whitelisted fields only)
// ===============================
export async function PUT(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Không có quyền', 403);
        }

        // Check profile exists
        const existing = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!existing) {
            return errorResponse('Chưa có hồ sơ doanh nghiệp', 404);
        }

        const body = await request.json();

        // Whitelist allowed fields — NEVER spread raw body into Prisma
        const allowedFields: Record<string, unknown> = {};
        const whitelist = [
            'businessName', 'businessType', 'address', 'location',
            'phone', 'description', 'logoUrl', 'companyImages',
        ];

        for (const field of whitelist) {
            if (body[field] !== undefined) {
                allowedFields[field] = typeof body[field] === 'string'
                    ? body[field].trim() || null
                    : body[field];
            }
        }

        const profile = await prisma.employerProfile.update({
            where: { userId: payload.userId },
            data: allowedFields,
        });

        return successResponse(profile);
    } catch (error) {
        console.error('Update employer profile error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
