/**
 * Admin Analytics Dashboard API
 * GET - Return all KPIs and chart data
 */
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

function requireAdmin(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    if (!token) throw new Error('Unauthorized');
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') throw new Error('Forbidden');
    return payload;
}

export async function GET(request: NextRequest) {
    try {
        requireAdmin(request);
    } catch {
        return errorResponse('Không có quyền truy cập', 403);
    }

    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // === KPIs ===
        const [
            totalUsers,
            totalCandidates,
            totalEmployers,
            totalJobs,
            activeJobs,
            totalApplications,
            applicationsToday,
            jobsLast7Days,
            hiredCount,
            verifiedEmployers,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'CANDIDATE' } }),
            prisma.user.count({ where: { role: 'EMPLOYER' } }),
            prisma.job.count(),
            prisma.job.count({ where: { status: 'ACTIVE' } }),
            prisma.application.count(),
            prisma.application.count({ where: { appliedAt: { gte: todayStart } } }),
            prisma.job.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
            prisma.application.count({ where: { status: 'HIRED' } }),
            prisma.user.count({ where: { role: 'EMPLOYER', isVerified: true } }),
        ]);

        const hireRate = totalApplications > 0
            ? Math.round((hiredCount / totalApplications) * 100)
            : 0;

        // === Charts: Job growth by day (last 30 days) ===
        const jobsByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
            SELECT DATE("createdAt") as date, COUNT(*) as count 
            FROM jobs 
            WHERE "createdAt" >= ${thirtyDaysAgo}
            GROUP BY DATE("createdAt")
            ORDER BY date ASC
        `;

        // === Charts: Applications by day (last 30 days) ===
        const applicationsByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
            SELECT DATE("appliedAt") as date, COUNT(*) as count 
            FROM applications 
            WHERE "appliedAt" >= ${thirtyDaysAgo}
            GROUP BY DATE("appliedAt")
            ORDER BY date ASC
        `;

        // === Charts: Employer signups by week (last 12 weeks) ===
        const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
        const employersByWeek = await prisma.$queryRaw<Array<{ week: string; count: bigint }>>`
            SELECT TO_CHAR(DATE_TRUNC('week', "createdAt"), 'YYYY-MM-DD') as week, COUNT(*) as count 
            FROM users 
            WHERE role = 'EMPLOYER' AND "createdAt" >= ${twelveWeeksAgo}
            GROUP BY DATE_TRUNC('week', "createdAt")
            ORDER BY week ASC
        `;

        // === Top categories ===
        const topCategories = await prisma.category.findMany({
            include: {
                _count: { select: { jobs: true } },
            },
            orderBy: {
                jobs: { _count: 'desc' },
            },
            take: 10,
        });

        // Serialize BigInt values
        const serializeChart = (data: Array<{ [key: string]: unknown }>) =>
            data.map(item => {
                const result: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(item)) {
                    result[key] = typeof value === 'bigint' ? Number(value) : value;
                }
                return result;
            });

        return successResponse({
            kpis: {
                totalUsers,
                totalCandidates,
                totalEmployers,
                verifiedEmployers,
                totalJobs,
                activeJobs,
                totalApplications,
                applicationsToday,
                jobsLast7Days,
                hiredCount,
                hireRate,
            },
            charts: {
                jobsByDay: serializeChart(jobsByDay),
                applicationsByDay: serializeChart(applicationsByDay),
                employersByWeek: serializeChart(employersByWeek),
                topCategories: topCategories.map(c => ({
                    name: c.name,
                    jobCount: c._count.jobs,
                })),
            },
        });
    } catch (error) {
        console.error('[Admin] Analytics error:', error);
        return errorResponse('Đã xảy ra lỗi', 500);
    }
}
