---
description: How to safely update features without breaking existing UI
---

# Safe Update Workflow

This workflow ensures you never lose existing UI/functionality when adding new features.

## Prerequisites
- Git initialized in the project
- All current work committed

## Steps

### 1. Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```
Never work directly on `main` or `develop`.

### 2. Develop on Feature Branch
- Only modify files related to your feature
- Create new components instead of editing existing ones
- Use CSS modules or scoped styles for new components
- If modifying shared components (layout, navbar), test thoroughly

### 3. Use Feature Flags for New Features
Instead of replacing old UI, gate new features:
```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

// In API routes:
if (await isFeatureEnabled('new_feature')) {
  // New behavior
} else {
  // Old behavior
}
```

// turbo
### 4. Test Locally
```bash
npm run dev
```
Check all existing pages still work:
- Homepage: http://localhost:3000
- Jobs: http://localhost:3000/jobs
- Categories: http://localhost:3000/categories
- Auth: http://localhost:3000/auth/login
- Employer Dashboard: http://localhost:3000/employer/dashboard

// turbo
### 5. Build Check
```bash
npm run build
```
Must pass with no errors before merging.

### 6. Merge to Develop
```bash
git checkout develop
git merge feature/your-feature-name
```
Test again on develop branch.

### 7. Deploy to Staging
Test all features on staging environment.

### 8. Merge to Main (Production)
```bash
git checkout main
git merge develop
```
Only after staging is verified.

### 9. Rollback if Issues
```bash
git revert HEAD
```
Or toggle feature flags off in Admin Panel (/admin).
