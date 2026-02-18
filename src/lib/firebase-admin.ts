/**
 * Firebase Admin SDK Configuration
 * 
 * Used in the BACKEND for:
 * - Verifying Firebase ID tokens (after phone OTP)
 * - Server-side user management
 * 
 * Setup:
 * 1. Firebase Console → Project Settings → Service Accounts
 * 2. Generate new private key → Download JSON
 * 3. Copy values to .env
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

function getAdminApp(): App {
    if (adminApp) return adminApp;

    if (getApps().length > 0) {
        adminApp = getApps()[0];
        return adminApp;
    }

    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.warn('[Firebase Admin] Missing credentials — verification will be skipped');
        adminApp = initializeApp({
            projectId: projectId || 'findworkers-dev',
        });
        return adminApp;
    }

    adminApp = initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });

    return adminApp;
}

function getAdminAuth(): Auth {
    if (adminAuth) return adminAuth;
    adminAuth = getAuth(getAdminApp());
    return adminAuth;
}

/**
 * Verify a Firebase ID token and return the decoded token
 * Returns null if verification fails
 */
export async function verifyFirebaseToken(idToken: string) {
    try {
        const auth = getAdminAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('[Firebase Admin] Token verification failed:', error);
        return null;
    }
}

/**
 * Get Firebase user by phone number
 */
export async function getFirebaseUserByPhone(phone: string) {
    try {
        const auth = getAdminAuth();
        return await auth.getUserByPhoneNumber(phone);
    } catch {
        return null;
    }
}
