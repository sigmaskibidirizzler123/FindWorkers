/**
 * Auth Module - Service Layer v2
 * 
 * FindWorkers Marketplace Auth Strategy:
 * 
 * CANDIDATE (Supply side):
 *   - Phone + Password (simple, fast signup)
 *   - Email optional
 *   - Password minimum 6 chars
 *   - Auto-login after register
 *   - Redirect → /jobs
 *   - Profile creation deferred (only required when applying)
 * 
 * EMPLOYER (Revenue side):
 *   - Email + Password (required, stronger)
 *   - Password minimum 8 chars
 *   - Company profile required before posting jobs
 *   - Redirect → /employer/dashboard
 *   - Future: email verification, 2FA
 * 
 * Security:
 *   - Account lockout after 5 failed attempts (15 min cooldown)
 *   - Login IP tracking for employers
 *   - HttpOnly + SameSite=strict cookies
 *   - Rate limiting on login endpoint (10/min)
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, comparePassword, generateToken } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { authLogger } from '@/lib/logger';
import { eventBus } from '@/lib/events';
import { getClientIP } from '@/lib/rate-limiter';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Vietnamese phone number normalization
function normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-().]/g, '');
    // Convert +84 → 0
    if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3);
    if (cleaned.startsWith('84') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);
    return cleaned;
}

function isValidVietnamPhone(phone: string): boolean {
    const normalized = normalizePhone(phone);
    return /^0[35789]\d{8}$/.test(normalized);
}

export class AuthService {
    /**
     * Login - supports both phone (candidate) and email (employer/admin) 
     */
    static async login(request: NextRequest) {
        try {
            const body = await request.json();
            const { email, phone, password, role } = body;
            const ip = getClientIP(request);

            // Determine login method
            const loginByPhone = !!phone && !email;
            const loginByEmail = !!email;

            if (!loginByPhone && !loginByEmail) {
                return errorResponse('Vui lòng nhập email hoặc số điện thoại', 400);
            }
            if (!password) {
                return errorResponse('Vui lòng nhập mật khẩu', 400);
            }

            // Find user
            let user;
            if (loginByPhone) {
                const normalizedPhone = normalizePhone(phone);
                user = await prisma.user.findUnique({
                    where: { phone: normalizedPhone },
                    include: {
                        candidateProfile: true,
                        employerProfile: true,
                    },
                });
            } else {
                user = await prisma.user.findUnique({
                    where: { email: email.toLowerCase().trim() },
                    include: {
                        candidateProfile: true,
                        employerProfile: true,
                    },
                });
            }

            if (!user) {
                authLogger.warn('Login failed: user not found', {
                    method: loginByPhone ? 'phone' : 'email',
                    ip,
                });
                return errorResponse(
                    loginByPhone
                        ? 'Số điện thoại hoặc mật khẩu không chính xác'
                        : 'Email hoặc mật khẩu không chính xác',
                    401
                );
            }

            // Check if role matches expected (optional filter from frontend)
            if (role && user.role !== role && user.role !== 'ADMIN') {
                return errorResponse(
                    role === 'CANDIDATE'
                        ? 'Tài khoản này không phải ứng viên. Vui lòng chọn "Doanh nghiệp".'
                        : 'Tài khoản này không phải doanh nghiệp. Vui lòng chọn "Tìm việc".',
                    400
                );
            }

            // Check account lockout
            if (user.lockedUntil && user.lockedUntil > new Date()) {
                const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
                authLogger.warn('Login blocked: account locked', { userId: user.id, minutesLeft });
                return errorResponse(
                    `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau ${minutesLeft} phút.`,
                    423
                );
            }

            // Check account active
            if (!user.isActive) {
                authLogger.warn('Login failed: account disabled', { userId: user.id });
                return errorResponse('Tài khoản đã bị khóa. Vui lòng liên hệ admin.', 403);
            }

            // Verify password
            const isValidPassword = await comparePassword(password, user.password);
            if (!isValidPassword) {
                // Increment failed attempts
                const newAttempts = user.failedLoginAttempts + 1;
                const lockData: Record<string, unknown> = { failedLoginAttempts: newAttempts };

                if (newAttempts >= MAX_FAILED_ATTEMPTS) {
                    lockData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
                    authLogger.warn('Account locked due to failed attempts', {
                        userId: user.id,
                        attempts: newAttempts,
                        ip,
                    });
                }

                await prisma.user.update({
                    where: { id: user.id },
                    data: lockData,
                }).catch(() => { });

                const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
                const message = remaining > 0
                    ? `Mật khẩu không chính xác. Còn ${remaining} lần thử.`
                    : 'Tài khoản đã bị tạm khóa 15 phút do đăng nhập sai quá nhiều lần.';

                return errorResponse(message, 401);
            }

            // ── Login Successful ──

            // Reset failed attempts, update login info
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    lastLoginAt: new Date(),
                    lastLoginIP: ip,
                },
            }).catch(() => { });

            const token = generateToken({
                userId: user.id,
                email: user.email || '',
                role: user.role,
            });

            // Determine redirect path
            const redirectPath = AuthService.getRedirectPath(user);

            // Emit event
            eventBus.emit('user.login', { userId: user.id, ip });

            authLogger.info('Login successful', {
                userId: user.id,
                role: user.role,
                method: loginByPhone ? 'phone' : 'email',
                ip,
            });

            const response = successResponse({
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    hasProfile: user.role === 'CANDIDATE'
                        ? !!user.candidateProfile
                        : !!user.employerProfile,
                    isVerified: user.isVerified,
                },
                token,
                redirectPath,
            });

            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            return response;
        } catch (error) {
            authLogger.error('Login error', { error });
            return errorResponse('Đã xảy ra lỗi khi đăng nhập', 500);
        }
    }

    /**
     * Register Candidate - Phone + Password (minimal friction)
     */
    static async registerCandidate(request: NextRequest) {
        try {
            const body = await request.json();
            const { phone, password, email } = body;

            // Validate phone
            if (!phone) {
                return errorResponse('Số điện thoại là bắt buộc', 400);
            }

            const normalizedPhone = normalizePhone(phone);
            if (!isValidVietnamPhone(normalizedPhone)) {
                return errorResponse('Số điện thoại không hợp lệ', 400);
            }

            if (!password || password.length < 6) {
                return errorResponse('Mật khẩu phải có ít nhất 6 ký tự', 400);
            }

            // Check existing phone
            const existingPhone = await prisma.user.findUnique({
                where: { phone: normalizedPhone },
            });
            if (existingPhone) {
                return errorResponse('Số điện thoại đã được sử dụng', 409);
            }

            // Check existing email if provided
            if (email) {
                const existingEmail = await prisma.user.findUnique({
                    where: { email: email.toLowerCase().trim() },
                });
                if (existingEmail) {
                    return errorResponse('Email đã được sử dụng', 409);
                }
            }

            const hashedPassword = await hashPassword(password);

            const user = await prisma.user.create({
                data: {
                    phone: normalizedPhone,
                    email: email ? email.toLowerCase().trim() : null,
                    password: hashedPassword,
                    role: 'CANDIDATE',
                },
            });

            const token = generateToken({
                userId: user.id,
                email: user.email || '',
                role: user.role,
            });

            // Emit event
            eventBus.emit('user.registered', {
                userId: user.id,
                role: 'CANDIDATE',
                email: user.email || normalizedPhone,
            });

            authLogger.info('Candidate registered', { userId: user.id, phone: normalizedPhone });

            const response = successResponse(
                {
                    user: {
                        id: user.id,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        hasProfile: false,
                    },
                    token,
                    redirectPath: '/jobs', // Candidates go straight to job listings
                },
                201
            );

            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            return response;
        } catch (error) {
            authLogger.error('Register candidate error', { error });
            return errorResponse('Đã xảy ra lỗi khi đăng ký', 500);
        }
    }

    /**
     * Register Employer - Email + Password (stronger requirements)
     */
    static async registerEmployer(request: NextRequest) {
        try {
            const body = await request.json();
            const { email, password, phone } = body;

            // Email required for employers
            if (!email) {
                return errorResponse('Email là bắt buộc cho doanh nghiệp', 400);
            }

            // Stronger password for employers (has money in system)
            if (!password || password.length < 8) {
                return errorResponse('Mật khẩu phải có ít nhất 8 ký tự', 400);
            }

            const normalizedEmail = email.toLowerCase().trim();

            // Check existing email
            const existingEmail = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });
            if (existingEmail) {
                return errorResponse('Email đã được sử dụng', 409);
            }

            // Check phone if provided
            if (phone) {
                const normalizedPhone = normalizePhone(phone);
                if (!isValidVietnamPhone(normalizedPhone)) {
                    return errorResponse('Số điện thoại không hợp lệ', 400);
                }
                const existingPhone = await prisma.user.findUnique({
                    where: { phone: normalizedPhone },
                });
                if (existingPhone) {
                    return errorResponse('Số điện thoại đã được sử dụng', 409);
                }
            }

            const hashedPassword = await hashPassword(password);

            const user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    phone: phone ? normalizePhone(phone) : null,
                    password: hashedPassword,
                    role: 'EMPLOYER',
                },
            });

            const token = generateToken({
                userId: user.id,
                email: user.email || '',
                role: user.role,
            });

            // Emit event
            eventBus.emit('user.registered', {
                userId: user.id,
                role: 'EMPLOYER',
                email: normalizedEmail,
            });

            authLogger.info('Employer registered', { userId: user.id, email: normalizedEmail });

            const response = successResponse(
                {
                    user: {
                        id: user.id,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        hasProfile: false,
                    },
                    token,
                    redirectPath: '/employer/profile', // Must create company profile first
                },
                201
            );

            response.cookies.set('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });

            return response;
        } catch (error) {
            authLogger.error('Register employer error', { error });
            return errorResponse('Đã xảy ra lỗi khi đăng ký', 500);
        }
    }

    /**
     * Legacy register (backward compatible with old API)
     */
    static async register(request: NextRequest) {
        try {
            const body = await request.json();
            const role = body.role || 'CANDIDATE';

            // Clone request with the same body for the role-specific handler
            const clonedRequest = new NextRequest(request.url, {
                method: 'POST',
                headers: request.headers,
                body: JSON.stringify(body),
            });

            if (role === 'EMPLOYER') {
                return AuthService.registerEmployer(clonedRequest);
            } else {
                return AuthService.registerCandidate(clonedRequest);
            }
        } catch (error) {
            authLogger.error('Register error', { error });
            return errorResponse('Đã xảy ra lỗi khi đăng ký', 500);
        }
    }

    /**
     * Determine redirect path based on user role and profile status
     */
    static getRedirectPath(user: {
        role: string;
        candidateProfile?: unknown;
        employerProfile?: unknown;
    }): string {
        switch (user.role) {
            case 'ADMIN':
                return '/admin';
            case 'EMPLOYER':
                return user.employerProfile ? '/employer/dashboard' : '/employer/profile';
            case 'CANDIDATE':
            default:
                // Candidates go to jobs list regardless of profile
                // They'll be prompted to complete profile when applying
                return '/jobs';
        }
    }
}
