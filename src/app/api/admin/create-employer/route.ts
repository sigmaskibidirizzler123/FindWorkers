/**
 * Admin API: Create Employer Account
 * POST /api/admin/create-employer
 * 
 * Admin-only endpoint to provision employer accounts.
 * Creates User + EmployerProfile in one step.
 * 
 * Body: { businessName, phone, email?, password?, location?, address? }
 */
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
    try {
        // Only ADMIN can access
        await requireRole(['ADMIN']);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const body = await request.json();
        const { businessName, phone, email, password, location, address, businessType } = body;

        // Validate required fields
        if (!businessName || !phone) {
            return errorResponse('Tên doanh nghiệp và số điện thoại là bắt buộc', 400);
        }

        // Normalize phone
        const normalizedPhone = phone.replace(/\s/g, '').replace(/^(\+84)/, '0');

        // Check if phone already exists
        const existingPhone = await prisma.user.findUnique({
            where: { phone: normalizedPhone },
        });
        if (existingPhone) {
            return errorResponse('Số điện thoại đã được sử dụng', 409);
        }

        // Check if email already exists (if provided)
        if (email) {
            const normalizedEmail = email.toLowerCase().trim();
            const existingEmail = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });
            if (existingEmail) {
                return errorResponse('Email đã được sử dụng', 409);
            }
        }

        // Default password or custom password
        const rawPassword = password || '123456';
        const hashedPassword = await hashPassword(rawPassword);

        // Create User + EmployerProfile in transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    email: email ? email.toLowerCase().trim() : null,
                    phone: normalizedPhone,
                    password: hashedPassword,
                    role: 'EMPLOYER',
                    isActive: true,
                    isVerified: true, // Admin-provisioned = auto verified
                },
            });

            // 2. Create EmployerProfile immediately
            const profile = await tx.employerProfile.create({
                data: {
                    userId: user.id,
                    businessName: businessName.trim(),
                    businessType: businessType || null,
                    address: address || 'Phú Quốc',
                    location: location || 'Phú Quốc',
                    phone: normalizedPhone,
                },
            });

            return { user, profile };
        });

        console.log(`✅ [Admin] Created employer: ${businessName} (${normalizedPhone})`);

        return successResponse({
            message: 'Tạo tài khoản doanh nghiệp thành công!',
            credentials: {
                phone: normalizedPhone,
                email: email || null,
                password: rawPassword, // Return raw password so admin can share it
            },
            user: {
                id: result.user.id,
                role: result.user.role,
                isVerified: result.user.isVerified,
            },
            profile: {
                id: result.profile.id,
                businessName: result.profile.businessName,
                location: result.profile.location,
            },
        }, 201);

    } catch (error) {
        console.error('[Admin] Create employer error:', error);
        return errorResponse('Đã xảy ra lỗi khi tạo tài khoản', 500);
    }
}

/**
 * GET /api/admin/create-employer
 * List all employer accounts for admin overview
 */
export async function GET() {
    try {
        await requireRole(['ADMIN']);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const employers = await prisma.user.findMany({
            where: { role: 'EMPLOYER' },
            select: {
                id: true,
                email: true,
                phone: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                employerProfile: {
                    select: {
                        id: true,
                        businessName: true,
                        businessType: true,
                        location: true,
                        phone: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return successResponse({
            employers,
            total: employers.length,
        });
    } catch (error) {
        console.error('[Admin] List employers error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
