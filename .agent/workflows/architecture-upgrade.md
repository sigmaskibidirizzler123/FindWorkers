---
description: Architecture upgrade roadmap from v2 to v3 production-ready
---

# 🏗️ FindWorkers Architecture Upgrade Roadmap

## ✅ PHASE 1 - Completed: Core Infrastructure (v2.1)

### 1.1 Centralized Logger (`src/lib/logger.ts`)
- Structured JSON logging (production) + colored output (dev)
- Module-specific loggers: `apiLogger`, `authLogger`, `automationLogger`, `matchingLogger`, `notificationLogger`
- Request timing with slow-request warnings (>2s)
- Audit logging for business events

### 1.2 Rate Limiter (`src/lib/rate-limiter.ts`)
- In-memory sliding window algorithm
- Pre-built configs:
  - `authLimiter`: 10 req/min (brute-force protection)
  - `generalLimiter`: 60 req/min
  - `cronLimiter`: 5 req/min
  - `notificationLimiter`: 30 req/min
  - `uploadLimiter`: 10 req/min
- Auto-cleanup of expired entries
- `checkRateLimit()` helper for API routes
- `getClientIP()` with proxy header support (X-Forwarded-For, CF-Connecting-IP)

### 1.3 Event System (`src/lib/events.ts`)
- Type-safe event bus with `EventMap` interface
- Events: `application.created`, `application.status_changed`, `application.hired`, `job.created`, `job.updated`, `job.closed`, `job.expiring`, `user.registered`, `user.login`, `automation.cron_run`
- Async fire-and-forget execution (non-blocking)
- Retry with exponential backoff (2 retries, 100ms/200ms)
- Payload sanitization (redacts passwords/tokens)
- Future migration path: swap implementation with BullMQ/Kafka

### 1.4 RBAC System (`src/lib/rbac.ts`)
- 30+ granular permissions defined
- Role-permission matrix:
  - `CANDIDATE`: apply, profile, saved_jobs, view notifications
  - `EMPLOYER`: full job/application management, company, analytics
  - `ADMIN`: all permissions
  - `OWNER` / `HR` / `MANAGER` / `VIEWER`: company sub-roles for future team features
- `can(role, permission)`, `canAll()`, `canAny()` utilities
- `requirePermission(request, permission)` API helper

### 1.5 Error Boundary (`src/components/error-boundary.tsx`)
- React Error Boundary wrapping entire app
- Styled fallback UI with retry/back/home actions
- Dev mode: shows error details
- Production: sends error report to backend

### 1.6 Database Indexing (`prisma/schema.prisma`)
- 20+ indexes added:
  - **Job**: status, categoryId, city, branchId, employerId+status, status+isUrgent, status+isFeatured, createdAt
  - **Application**: jobId+status, candidateId+status, matchingScore, appliedAt
  - **CompanyBranch**: employerId
  - **Category**: parentId
  - **Notification**: userId+createdAt
  - **ActivityLog**: createdAt, action
- ActivityLog `archivedAt` field for log rotation

### 1.7 API Versioning (`src/app/api/v1/`)
- `/api/v1/jobs` → `JobService.list()` / `JobService.create()`
- `/api/v1/auth/login` → `AuthService.login()`
- `/api/v1/auth/register` → `AuthService.register()`
- Original `/api/` routes remain functional (backward compatible)
- All v1 routes wrapped with rate limiting + request logging

### 1.8 Modular Monolith (`src/modules/`)
```
src/modules/
  auth/
    auth.service.ts      # Login, register logic
    auth.types.ts         # Type definitions
  jobs/
    job.service.ts        # Job listing, creation logic
    job.types.ts          # Type definitions
  applications/
    application.service.ts # Apply, status update logic
  notifications/
    notification.service.ts # List, mark read
  automation/
    event-handlers.ts     # All event → side-effect wiring
  index.ts               # Module bootstrap (auto-init on server start)
```

### 1.9 Prisma 7 Driver Adapter (`src/lib/prisma.ts`)
- Uses `@prisma/adapter-pg` with `pg.Pool`
- Connection pooling: max 10, idle timeout 30s, connect timeout 5s
- Proper singleton with global caching

## 🔜 PHASE 2 - WebSocket + Search (v2.2)

### 2.1 Replace Notification Polling with SSE
```
# Install
npm install eventsource

# Create: src/app/api/notifications/stream/route.ts
# Use Server-Sent Events for real-time notifications
# This reduces load from 5000 req/min → 0 req/min (connection-based)
```

### 2.2 Full-Text Search
```
# Option A: PostgreSQL full-text search (simple, no extra infra)
# Add tsvector columns to Job model

# Option B: Meilisearch (advanced, needs separate service)
# npm install meilisearch
# Create: src/lib/search.ts
```

### 2.3 Background Job Queue
```
# For heavy tasks (matching score, email, image resize)
# npm install bullmq
# Create: src/lib/queue.ts
# Workers run in separate process
```

## 🔜 PHASE 3 - Observability (v2.3)

### 3.1 Error Tracking
```
# npm install @sentry/nextjs
# Wrap API routes with Sentry
# Auto-capture unhandled errors
```

### 3.2 Database Monitoring
```
# Add Prisma query logging
# Track slow queries (>500ms)
# Dashboard: query count, avg latency, error rate
```

### 3.3 Health Check Endpoint
```
# GET /api/health
# Returns: DB status, uptime, memory usage, event handler count
```

## 🔜 PHASE 4 - Security Hardening (v2.4)

### 4.1 CSRF Protection
### 4.2 Input Validation (zod schemas)
### 4.3 SQL Injection Prevention (Prisma handles this)
### 4.4 API Key Management
### 4.5 Backup Strategy (daily pg_dump)

## 📊 Current Architecture Diagram

```
┌─────────────────────────────────────────┐
│               CLIENT (Browser)           │
│  React + Zustand + ErrorBoundary        │
└────────────────┬────────────────────────┘
                 │ HTTP
                 ▼
┌─────────────────────────────────────────┐
│         NEXT.JS APP ROUTER              │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │Middleware │  │   Rate Limiter       │ │
│  │(auth)     │  │   (per-endpoint)     │ │
│  └──────────┘  └──────────────────────┘ │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │      API Routes (v1 + legacy)      │ │
│  │  /api/v1/jobs  /api/v1/auth       │ │
│  │  /api/jobs     /api/auth           │ │
│  └────────────┬───────────────────────┘ │
│               │                         │
│  ┌────────────▼───────────────────────┐ │
│  │     SERVICE LAYER (Modules)        │ │
│  │  AuthService  JobService           │ │
│  │  ApplicationService                │ │
│  │  NotificationService               │ │
│  └────────────┬───────────────────────┘ │
│               │                         │
│  ┌────────────▼───────────────────────┐ │
│  │        EVENT BUS                    │ │
│  │  application.created → handlers    │ │
│  │  application.hired → handlers      │ │
│  │  job.created → handlers            │ │
│  │  user.registered → handlers        │ │
│  └────────────┬───────────────────────┘ │
│               │                         │
│  ┌────────────▼───────────────────────┐ │
│  │   AUTOMATION (Event Handlers)      │ │
│  │  MatchingScore  Notifications      │ │
│  │  ActivityLog    AutoClose          │ │
│  │  FeatureFlags                      │ │
│  └────────────┬───────────────────────┘ │
│               │                         │
│  ┌────────────▼───────────────────────┐ │
│  │   PRISMA + PG ADAPTER             │ │
│  │   Connection Pool (max 10)         │ │
│  └────────────┬───────────────────────┘ │
└───────────────┴─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│         POSTGRESQL DATABASE             │
│  20+ Optimized Indexes                  │
│  Activity Log Rotation                  │
└─────────────────────────────────────────┘
```
