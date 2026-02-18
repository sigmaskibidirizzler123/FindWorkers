/**
 * Firebase Client SDK Configuration
 * 
 * Used in the FRONTEND for:
 * - Phone Authentication (OTP SMS)
 * - reCAPTCHA verification (built-in)
 * 
 * Setup:
 * 1. Go to https://console.firebase.google.com
 * 2. Create project → Enable Authentication → Phone provider
 * 3. Copy config to .env.local
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential, Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Lazily initialize Firebase — only when actually needed
 * This prevents build errors when Firebase env vars are not yet set
 */
function getFirebaseApp(): FirebaseApp {
    if (app) return app;

    if (!isFirebaseConfigured) {
        throw new Error(
            'Firebase chưa được cấu hình. Vui lòng thêm NEXT_PUBLIC_FIREBASE_* vào file .env'
        );
    }

    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return app;
}

function getFirebaseAuth(): Auth {
    if (auth) return auth;

    const firebaseApp = getFirebaseApp();
    auth = getAuth(firebaseApp);
    auth.languageCode = 'vi';
    return auth;
}

export {
    getFirebaseApp,
    getFirebaseAuth,
    isFirebaseConfigured,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    PhoneAuthProvider,
    signInWithCredential,
};
