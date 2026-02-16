---
description: How to set up and manage the database
---

# Database Setup Workflow

// turbo-all

## Prerequisites
- PostgreSQL installed and running
- `.env` file configured with `DATABASE_URL`

## Steps

### 1. Push Schema to Database
```bash
cd c:\Users\PC\Desktop\FindWorkers\findworkers-app && npx prisma db push
```

### 2. Generate Prisma Client
```bash
cd c:\Users\PC\Desktop\FindWorkers\findworkers-app && npx prisma generate
```

### 3. Seed Database
```bash
cd c:\Users\PC\Desktop\FindWorkers\findworkers-app && npx tsx prisma/seed.ts
```

### 4. Open Prisma Studio (Optional)
```bash
cd c:\Users\PC\Desktop\FindWorkers\findworkers-app && npx prisma studio
```

### Quick Setup (All-in-one)
```bash
cd c:\Users\PC\Desktop\FindWorkers\findworkers-app && npm run db:setup
```
