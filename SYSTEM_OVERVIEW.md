# 🏗️ FINDWORKERS — Mô Tả Toàn Bộ Hệ Thống

> **Nền tảng tuyển dụng lao động phổ thông tại Phú Quốc**  
> Version: v4 Production | Deploy: Vercel | DB: Neon PostgreSQL

---

## 📋 TỔNG QUAN

**FindWorkers** là nền tảng kết nối nhà tuyển dụng (khách sạn, nhà hàng, resort, quán cafe...) tại **Phú Quốc** với ứng viên lao động phổ thông (phục vụ, pha chế, lễ tân, bếp, housekeeping...).

### Đặc điểm chính:
- 🎯 **Thị trường ngách**: Chỉ tập trung Phú Quốc — lao động blue-collar
- 📱 **Mobile-first**: Đăng ký bằng SĐT + OTP, không cần email
- ⚡ **Nhanh chóng**: Ứng viên ứng tuyển trong 30 giây, nhà tuyển dụng đăng tin trong 60 giây
- 🔒 **Bảo mật**: OTP 4 tầng, JWT HttpOnly, blacklist, rate limiting
- 🤖 **Tự động hóa**: Email thông báo, Discord webhook, matching score

---

## 🛠️ TECH STACK

| Layer | Technology | Mô tả |
|-------|-----------|-------|
| **Framework** | Next.js 16.1.6 | Full-stack React framework (App Router) |
| **Language** | TypeScript | Type-safe toàn bộ |
| **Database** | PostgreSQL (Neon) | Cloud PostgreSQL, serverless |
| **ORM** | Prisma 6.19 | Schema-first, type-safe queries |
| **Auth** | JWT + OTP | HttpOnly cookies, 7-day expiry |
| **SMS** | SpeedSMS / Console fallback | Gửi OTP qua SMS |
| **Email** | Gmail SMTP (Nodemailer) | Thông báo ứng viên |
| **Hosting** | Vercel | Auto-deploy from GitHub |
| **State** | Zustand | Client-side auth store |
| **Icons** | Lucide React | SVG icon library |
| **Docker** | PostgreSQL local dev | docker-compose.yml |

---

## 👥 3 ROLE TRONG HỆ THỐNG

### 1️⃣ CANDIDATE (Ứng viên)
- Đăng ký bằng **SĐT + OTP + mật khẩu** (3 bước)
- Tạo profile: tên, vị trí, kinh nghiệm, ca làm việc
- Xem danh sách việc làm active
- Ứng tuyển nhanh (Quick Apply) — không cần đăng nhập
- Ứng tuyển chính thức — cần tài khoản
- Xem trạng thái đơn ứng tuyển
- Lưu việc làm yêu thích

### 2️⃣ EMPLOYER (Nhà tuyển dụng)
- Tài khoản được **Admin cấp** (không tự đăng ký)
- Đăng tin tuyển dụng (CRUD)
- Dùng Job Templates để đăng tin nhanh
- Quản lý chi nhánh (multi-location)
- Xem & duyệt đơn ứng tuyển
- Nhận thông báo qua email + in-app khi có ứng viên mới

### 3️⃣ ADMIN
- Dashboard quản trị toàn bộ
- Quản lý Users, Jobs, Categories, Companies
- Tạo tài khoản Employer
- Feature flags
- Activity logs & Analytics
- Blacklist (IP, phone, email, device)

---

## 🔐 HỆ THỐNG XÁC THỰC (AUTH)

### Flow đăng ký Candidate (3 bước):
```
📱 Bước 1: Nhập SĐT
   → Kiểm tra 4 tầng (Format → Metadata → Carrier → OTP)
   → Hiện tên nhà mạng real-time
   → Gửi OTP 6 số qua SMS (SpeedSMS)
   → Fallback: hiện OTP trên màn hình nếu SMS fail

🔢 Bước 2: Nhập mã OTP
   → Max 5 lần thử, block 15 phút khi sai quá
   → Resend tối đa 3 lần, cooldown 60 giây
   → IP rate limit: 5 requests/giờ

🔒 Bước 3: Đặt mật khẩu
   → Tạo tài khoản + auto-login
   → JWT cookie HttpOnly, 7 ngày
   → Redirect → /jobs
```

### Flow đăng nhập:
```
📱 Nhập SĐT + Mật khẩu → JWT cookie → Redirect theo role
```

### Bảo mật:
| Tính năng | Chi tiết |
|-----------|---------|
| JWT | HttpOnly cookie, 7-day expiry, signed with JWT_SECRET |
| Password | bcrypt hash |
| Rate Limiting | Sliding window, per-IP, per-endpoint |
| OTP | 6 số, 5 phút expiry, in-memory store |
| Blacklist | Block IP, phone, email, device |
| RBAC | Role-based access control (CANDIDATE, EMPLOYER, ADMIN) |
| Middleware | Auth check trên mọi protected route |
| Phone Validator | 4-layer: Format → Metadata → Carrier → Risk Score |

---

## 📊 DATABASE SCHEMA (15 Models)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│    User      │────▶│ CandidateProfile │     │  Category   │
│  (Auth)      │     │  (Ứng viên)      │     │  (Ngành)    │
│              │     └──────────────────┘     └──────┬──────┘
│  - phone     │                                     │
│  - password  │     ┌──────────────────┐     ┌──────▼──────┐
│  - role      │────▶│ EmployerProfile  │────▶│    Job      │
│  - JWT       │     │  (Nhà tuyển dụng)│     │  (Việc)     │
└──────┬───────┘     └───────┬──────────┘     └──────┬──────┘
       │                     │                       │
       │              ┌──────▼──────┐         ┌──────▼──────┐
       │              │CompanyBranch│         │ Application │
       │              │  (Chi nhánh)│         │ (Đơn ứng    │
       │              └─────────────┘         │  tuyển)     │
       │                                      └──────┬──────┘
       │                                             │
  ┌────▼────┐  ┌────────────┐  ┌──────────────┐    │
  │SavedJob │  │Notification│  │ScreeningQ/A  │◀───┘
  │(Lưu tin)│  │(Thông báo) │  │(Câu hỏi sàng │
  └─────────┘  └────────────┘  │ lọc)          │
                               └───────────────┘
```

### Các model phụ trợ:
| Model | Mô tả |
|-------|-------|
| `JobTemplate` | Template đăng tin nhanh (FNB, Hotel, Retail...) |
| `QuickApplication` | Ứng tuyển nhanh không cần đăng nhập |
| `Skill` / `JobSkill` | Skills cho từng job listing |
| `FeatureFlag` | Bật/tắt tính năng từ admin |
| `ActivityLog` | Log mọi hành động trong hệ thống |
| `PhoneChangeLog` | Audit trail khi đổi SĐT |
| `Blacklist` | Block IP/Phone/Email/Device |

---

## 🌐 API ENDPOINTS (14 nhóm)

### Auth (`/api/auth/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/send-otp` | Gửi OTP qua SMS (4-layer validation) |
| POST | `/verify-otp` | Xác thực OTP |
| POST | `/resend-otp` | Gửi lại OTP |
| POST | `/register` | Đăng ký (Candidate phone+pw, Employer email+pw) |
| POST | `/login` | Đăng nhập |
| POST | `/logout` | Đăng xuất (xóa cookie) |
| GET | `/me` | Lấy thông tin user hiện tại |
| POST | `/verify-email` | Xác thực email |
| POST | `/verify-phone` | Xác thực phone (Firebase) |

### Jobs (`/api/jobs/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/jobs` | Danh sách việc làm (public, filter, search) |
| GET | `/jobs/[id]` | Chi tiết 1 job |
| POST | `/jobs` | Tạo job mới (employer) |
| PUT | `/jobs/[id]` | Cập nhật job |

### Employer (`/api/employer/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/PUT | `/employer/profile` | Profile nhà tuyển dụng |
| GET | `/employer/jobs` | Jobs của employer |
| GET | `/employer/applications` | Đơn ứng tuyển |

### Admin (`/api/admin/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/users` | Quản lý users |
| GET | `/admin/jobs` | Quản lý jobs |
| GET | `/admin/analytics` | Thống kê |
| GET | `/admin/logs` | Activity logs |
| POST | `/admin/create-employer` | Tạo tài khoản employer |
| CRUD | `/admin/categories` | Quản lý danh mục |
| CRUD | `/admin/companies` | Quản lý doanh nghiệp |
| GET/PUT | `/admin/feature-flags` | Feature flags |

### Khác
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/apply-quick` | Ứng tuyển nhanh (không cần login) |
| GET | `/categories` | Danh sách ngành nghề |
| POST | `/upload` | Upload file (avatar, CCCD) |
| GET/PUT | `/profile` | Profile ứng viên |
| GET | `/notifications` | Thông báo in-app |
| GET | `/job-templates` | Templates đăng tin nhanh |
| POST | `/webhooks` | Webhook receiver |
| POST | `/automation` | Automation tasks |

---

## 📱 FRONTEND PAGES (11 trang)

### Public:
| Route | Mô tả |
|-------|-------|
| `/` | Landing page — giới thiệu FindWorkers |
| `/jobs` | Danh sách việc làm (tìm kiếm, lọc) |
| `/jobs/[id]` | Chi tiết việc làm + nút ứng tuyển |
| `/auth/register` | Đăng ký 3 bước (OTP) |
| `/auth/login` | Đăng nhập |
| `/categories` | Danh sách ngành nghề |

### Candidate:
| Route | Mô tả |
|-------|-------|
| `/candidate/profile` | Hồ sơ ứng viên |
| `/candidate/applications` | Các đơn đã ứng tuyển |

### Employer:
| Route | Mô tả |
|-------|-------|
| `/employer/dashboard` | Dashboard nhà tuyển dụng |
| `/employer/jobs` | Quản lý tin tuyển dụng |
| `/employer/profile` | Hồ sơ doanh nghiệp |

### Admin:
| Route | Mô tả |
|-------|-------|
| `/admin` | Dashboard admin (Users, Jobs, Categories, Analytics, Logs, Companies) |

---

## 🔧 LIBRARIES & SERVICES (`src/lib/`)

| File | Chức năng |
|------|----------|
| `auth.ts` | JWT generation/verification, password hashing |
| `phone-validator.ts` | **4-layer phone validation** (Format→Metadata→Carrier→Risk) |
| `otp-store.ts` | In-memory OTP storage + rate limiting |
| `sms.ts` | SMS providers (SpeedSMS, Twilio, eSMS, Console) |
| `rate-limiter.ts` | Sliding window rate limiter |
| `rbac.ts` | Role-based access control |
| `blacklist.ts` | IP/Phone/Email blacklisting |
| `prisma.ts` | Prisma client singleton |
| `mailer.ts` | Gmail SMTP email sending |
| `discord.ts` | Discord webhook notifications |
| `webhook.ts` | Webhook management |
| `webhook-handlers.ts` | Webhook event handlers |
| `events.ts` | Event bus (pub/sub) |
| `notifications.ts` | In-app notification system |
| `matching-score.ts` | AI matching score (ứng viên ↔ việc làm) |
| `automation.ts` | Cron/automation tasks |
| `logger.ts` | API request/response logging |
| `feature-flags.ts` | Feature toggle system |
| `profile-helpers.ts` | Profile completion helpers |
| `api-response.ts` | Standardized API response format |
| `firebase.ts` | Firebase client config |
| `firebase-admin.ts` | Firebase admin SDK |

---

## 📨 HỆ THỐNG THÔNG BÁO

### 1. Email (Gmail SMTP)
- Gửi thông báo khi có ứng viên mới ứng tuyển
- CC cho employer
- Template HTML đẹp

### 2. Discord Webhooks
- `#ban-tin-doanh-nghiep` — Tin tuyển dụng mới
- `#tin-tuyen-dung-moi` — Duyệt/từ chối ứng viên
- `#thong-bao-ung-tuyen` — Ứng viên mới ứng tuyển

### 3. In-App Notifications
- Real-time notification cho employer/candidate
- Các loại: APPLICATION_NEW, APPLICATION_STATUS, JOB_MATCH, JOB_EXPIRING, INTERVIEW_SCHEDULED, SYSTEM, REMINDER

---

## 📱 PHONE VALIDATOR — 4 Tầng Kiểm Tra

```
Tầng 1️⃣ FORMAT         → Regex, E.164, length     (~60% accuracy)
Tầng 2️⃣ METADATA       → isPossibleNumber          (~85% accuracy)
Tầng 3️⃣ CARRIER LOOKUP → 8 nhà mạng VN + risk     (~95% accuracy)
Tầng 4️⃣ OTP            → SMS thật → xác thực SIM   (~99% accuracy)
```

### 8 Nhà mạng được nhận diện:
| Nhà mạng | Đầu số | Icon |
|----------|--------|------|
| Viettel | 032-039, 086, 096-098 | 🔴 |
| Mobifone | 070, 076-079, 089, 090, 093 | 🔵 |
| Vinaphone | 081-085, 088, 091, 094 | 🟢 |
| Vietnamobile | 052, 056, 058, 092 | 🟠 |
| Gmobile | 059, 099 | 🟣 |
| Reddi | 055 | 🔶 |
| Wintel | 057 | 🟤 |
| iTelecom | 087 | 🟧 |

---

## 🚀 DEPLOYMENT

### Production:
- **Platform**: Vercel (auto-deploy from GitHub `main` branch)
- **Database**: Neon PostgreSQL (managed, serverless)
- **Domain**: `find-workers-tau.vercel.app`
- **GitHub**: `sigmaskibidirizzler123/FindWorkers`

### Environment Variables (Production):
| Variable | Mô tả |
|----------|-------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret key cho JWT signing |
| `SMS_PROVIDER` | `speedsms` (production) / `console` (dev) |
| `SPEEDSMS_TOKEN` | SpeedSMS API token |
| `SPEEDSMS_SENDER` | SpeedSMS sender name |
| `SMTP_USER` | Gmail address for sending |
| `SMTP_PASSWORD` | Gmail app password |
| `NOTIFY_EMAIL` | Email nhận thông báo |
| `CRON_SECRET` | Secret cho automation tasks |
| `DISCORD_WEBHOOK_*` | Discord webhook URLs |

### Dev Setup:
```bash
# 1. Clone & install
git clone https://github.com/sigmaskibidirizzler123/FindWorkers.git
cd findworkers-app
npm install

# 2. Database
docker-compose up -d        # PostgreSQL local
npx prisma db push          # Sync schema
npx tsx prisma/seed.ts      # Seed data

# 3. Run
npm run dev                 # http://localhost:3000
```

---

## 📈 METRICS & SCALE

| Metric | Chi tiết |
|--------|---------|
| Database Models | 15 |
| API Endpoints | ~35 |
| Frontend Pages | 11 |
| Library Modules | 22 |
| Schema Version | v4 |
| Auth Methods | Phone OTP + Password |
| SMS Providers | 4 (SpeedSMS, Twilio, eSMS, Console) |
| Notification Channels | 3 (Email, Discord, In-App) |
| User Roles | 3 (Candidate, Employer, Admin) |

---

*Last updated: 2026-02-19 | FindWorkers v4 Production*
