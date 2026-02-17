/**
 * Module Index - Initializes all modules on app startup
 * 
 * Import this file once to bootstrap the event system.
 * In Next.js, import in layout.tsx or a server-side initialization point.
 */

import { registerEventHandlers } from './automation/event-handlers';
import { registerWebhookHandlers } from '@/lib/webhook-handlers';
import { automationLogger } from '@/lib/logger';

let initialized = false;

export function initializeModules() {
    if (initialized) return;

    automationLogger.info('Initializing modules...');

    // Register all event handlers
    registerEventHandlers();

    // Register webhook handlers (FindWorkers → n8n → Telegram/Messenger)
    registerWebhookHandlers();

    initialized = true;
    automationLogger.info('Modules initialized successfully');
}

// Auto-initialize on import (server-side only)
if (typeof window === 'undefined') {
    initializeModules();
}
