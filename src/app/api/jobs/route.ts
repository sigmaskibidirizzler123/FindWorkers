import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { webhookService } from '@/lib/webhook';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '12');
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const city = searchParams.get('city') || '';
        const jobType = searchParams.get('jobType') || '';
        const shift = searchParams.get('shift') || '';
        const salaryMin = searchParams.get('salaryMin');
        const salaryMax = searchParams.get('salaryMax');
        const isUrgent = searchParams.get('isUrgent');
        const noExperience = searchParams.get('noExperience');
        const sort = searchParams.get('sort') || 'newest';

        const where: Record<string, unknown> = {
            status: 'ACTIVE',
        };

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
                { employer: { businessName: { contains: search } } },
            ];
        }

        if (category) {
            where.categoryId = category;
        }

        if (city) {
            where.city = { contains: city };
        }

        if (jobType) {
            where.jobType = jobType;
        }

        if (shift) {
            where.shift = shift;
        }

        if (salaryMin) {
            where.salaryMax = { gte: parseInt(salaryMin) };
        }

        if (salaryMax) {
            where.salaryMin = { lte: parseInt(salaryMax) };
        }

        if (isUrgent === 'true') {
            where.isUrgent = true;
        }

        if (noExperience === 'true') {
            where.experienceRequired = 0;
        }

        const orderBy: Record<string, string> = {};
        switch (sort) {
            case 'salary_high':
                orderBy.salaryMax = 'desc';
                break;
            case 'salary_low':
                orderBy.salaryMin = 'asc';
                break;
            case 'popular':
                orderBy.viewCount = 'desc';
                break;
            default:
                orderBy.createdAt = 'desc';
        }

        const [jobs, total] = await Promise.all([
            prisma.job.findMany({
                where,
                include: {
                    employer: {
                        select: {
                            businessName: true,
                            logoUrl: true,
                            location: true,
                        },
                    },
                    category: {
                        select: {
                            name: true,
                            slug: true,
                        },
                    },
                    _count: {
                        select: {
                            applications: true,
                        },
                    },
                },
                orderBy: [
                    { isFeatured: 'desc' },
                    orderBy,
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.job.count({ where }),
        ]);

        return paginatedResponse(jobs, total, page, limit);
    } catch (error) {
        console.error('Get jobs error:', error);
        return errorResponse('Đã xảy ra lỗi khi tải danh sách việc làm', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const token = request.cookies.get('token')?.value;
        if (!token) return errorResponse('Chưa đăng nhập', 401);

        const payload = verifyToken(token);
        if (!payload || payload.role !== 'EMPLOYER') {
            return errorResponse('Chỉ nhà tuyển dụng mới có thể đăng tin', 403);
        }

        const employer = await prisma.employerProfile.findUnique({
            where: { userId: payload.userId },
        });

        if (!employer) {
            return errorResponse('Vui lòng tạo hồ sơ công ty trước', 400);
        }

        const body = await request.json();
        const {
            title, description, requirements, benefits,
            salaryMin, salaryMax, salaryNegotiable,
            location, district, city,
            jobType, shift, shifts, experienceRequired,
            genderRequirement, positions, categoryId,
            isUrgent, expiresAt,
        } = body;

        if (!title || !description) {
            return errorResponse('Thiếu thông tin bắt buộc: Tiêu đề hoặc Mô tả', 400);
        }

        // Validate shifts array
        const validShiftTypes = ['MORNING', 'AFTERNOON', 'NIGHT', 'ROTATING', 'PART_TIME'];
        const validShiftEnums = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'FLEXIBLE'];
        let shiftsArray: string[] = [];

        if (Array.isArray(shifts)) {
            shiftsArray = shifts.filter((s: string) => validShiftTypes.includes(s));
        }

        // Map new shift types to legacy Shift enum for backward compatibility
        const shiftMapping: Record<string, string> = {
            'MORNING': 'MORNING',
            'AFTERNOON': 'AFTERNOON',
            'NIGHT': 'NIGHT',
            'ROTATING': 'FLEXIBLE',
            'PART_TIME': 'FLEXIBLE',
        };

        // Determine legacy shift value
        let legacyShift = shift;
        if (!legacyShift && shiftsArray.length > 0) {
            legacyShift = shiftMapping[shiftsArray[0]] || null;
        }
        // Validate legacy shift value
        if (legacyShift && !validShiftEnums.includes(legacyShift)) {
            legacyShift = null;
        }

        // Parse safely helper
        const safeInt = (val: any) => {
            const parsed = parseInt(val);
            return isNaN(parsed) ? null : parsed;
        };

        const jobLocation = location || employer.address || employer.location || 'Phú Quốc'; // Fallback location

        // Map shifts properly
        // ... (existing logic logic kept but simplified below) ...

        const job = await prisma.job.create({
            data: {
                employerId: employer.id,
                title,
                description,
                requirements,
                benefits,
                salaryMin: safeInt(salaryMin),
                salaryMax: safeInt(salaryMax),
                salaryNegotiable: salaryNegotiable || false,
                location: jobLocation,
                district,
                city: city || 'Phú Quốc',
                jobType: jobType || 'FULLTIME',
                shift: legacyShift || null,
                shifts: JSON.stringify(shiftsArray),
                experienceRequired: safeInt(experienceRequired) || 0,
                genderRequirement,
                positions: safeInt(positions) || 1,
                categoryId: categoryId || null,
                isUrgent: isUrgent || false,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            include: {
                employer: {
                    select: {
                        businessName: true,
                        logoUrl: true,
                    },
                },
                category: true,
            },
        });

        // 🔔 Notify admin via Discord when employer creates a job
        const salary = (job as any).salaryMin && (job as any).salaryMax
            ? `${((job as any).salaryMin / 1_000_000).toFixed(1)}M - ${((job as any).salaryMax / 1_000_000).toFixed(1)}M`
            : 'Thỏa thuận';

        const discordUrl = process.env.DISCORD_WEBHOOK_URL
            || 'https://discord.com/api/webhooks/1473167290622283882/1qljsLDIUUMmthj4sZu6-CbGvkszIQwfpNtjcJmBK2Gyf6ipZ6CpIJcNpDU23FCw7ES7';

        fetch(discordUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'FindWorkers Bot',
                embeds: [{
                    title: '💼 Tin Tuyển Dụng Mới!',
                    description: `📌 ${job.title}\n🏢 ${job.employer.businessName}\n📍 ${(job as any).location || 'Phú Quốc'}\n💰 ${salary}`,
                    color: 5793266,
                    timestamp: new Date().toISOString(),
                    footer: { text: 'FindWorkers Alert System' },
                }],
            }),
        })
            .then(res => console.log('[Discord] Sent! Status:', res.status))
            .catch(err => console.error('[Discord] Failed:', err.message));

        return successResponse(job, 201);
    } catch (error: any) {
        console.error('Create job error:', error);
        // Return detailed error for debugging (remove in final production if sensitive)
        return errorResponse(`Lỗi tạo tin: ${error.message || error}`, 500);
    }
}

