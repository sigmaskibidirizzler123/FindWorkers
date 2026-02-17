# 🔔 FindWorkers Automation - Setup Guide

## Kiến Trúc Tổng Thể (Level 2 - Direct Webhook)

```
FindWorkers App
    ↓ (Event Bus)
WebhookService  ──POST──→  n8n Webhook
                                ↓
                           Filter + Format
                                ↓
                         Telegram / Messenger
                                ↓
                    Bạn nhận thông báo real-time 🎉
```

**Không cần Gmail!** Hệ thống bắn event trực tiếp từ ứng dụng.

---

## 📋 Bước 1: Cấu hình Environment Variables

Thêm vào **Vercel Environment Variables** (hoặc `.env`):

```env
# n8n Webhook URL (lấy từ n8n sau khi tạo workflow)
N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/findworkers-events

# Secret để xác thực (tùy chọn, khuyên dùng)
WEBHOOK_SECRET=your-secret-key-here

# Backup webhook (tùy chọn)
# N8N_WEBHOOK_URL_BACKUP=https://backup-n8n.com/webhook/findworkers-events
```

---

## 📋 Bước 2: Tạo Telegram Bot

1. Mở Telegram, tìm **@BotFather**
2. Gửi `/newbot`
3. Đặt tên: `FindWorkers Alert Bot`
4. Nhận **Bot Token** (dạng `123456:ABC-DEF...`)
5. Mở bot vừa tạo, gửi `/start`
6. Truy cập: `https://api.telegram.org/bot<TOKEN>/getUpdates`
7. Tìm `chat.id` → Đây là **CHAT_ID** của bạn

---

## 📋 Bước 3: Import n8n Workflows

### Workflow 1: Real-time Notifications
1. Mở n8n → **Import from file**
2. Chọn file: `docs/n8n-workflows/findworkers-notifications.json`
3. Thay thế:
   - `YOUR_TELEGRAM_CHAT_ID` → Chat ID từ Bước 2
   - `YOUR_TELEGRAM_CREDENTIAL_ID` → Credential ID trong n8n
4. **Activate** workflow
5. Copy **Webhook URL** → Paste vào `N8N_WEBHOOK_URL` (Bước 1)

### Workflow 2: Daily Summary (9PM hàng ngày)
1. Import file: `docs/n8n-workflows/findworkers-daily-summary.json`
2. Thay thế Chat ID và credential
3. Set environment variable trong n8n:
   - `FINDWORKERS_API_URL` = `https://find-workers.vercel.app`
   - `WEBHOOK_SECRET` = Secret từ Bước 1
4. **Activate** workflow

---

## 📋 Bước 4: Test

### Test Webhook connectivity:
```bash
curl https://find-workers.vercel.app/api/webhooks/n8n
# Expected: {"success":true,"data":{"status":"ok",...}}
```

### Test Daily Summary:
```bash
curl -X POST https://find-workers.vercel.app/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{"action":"daily_summary"}'
```

### Test n8n Webhook (gửi event giả):
```bash
curl -X POST https://your-n8n.com/webhook/findworkers-events \
  -H "Content-Type: application/json" \
  -d '{
    "event": "application.new",
    "timestamp": "2024-01-01T00:00:00Z",
    "data": {
      "message": "🔥 TEST: Ứng viên mới apply!"
    }
  }'
```

---

## 🔄 Events Được Gửi Tự Động

| Event | Khi nào | Thông tin |
|-------|---------|-----------|
| `application.new` | Ứng viên apply job | Tên, SĐT, Job, Employer |
| `application.hired` | Employer tuyển ứng viên | Tên UV, Job, Employer |
| `employer.registered` | Employer tự đăng ký | Tên DN, SĐT, Địa chỉ |
| `employer.created_by_admin` | Admin tạo employer | Tên DN, SĐT, Địa chỉ |
| `job.created` | Employer đăng tin | Tên tin, Employer, Lương |
| `system.error` | Lỗi hệ thống | Loại lỗi, Message, Severity |
| `daily.summary` | n8n gọi báo cáo ngày | Tổng hợp số liệu |

---

## 🏗️ Cấu Trúc Files

```
src/lib/
├── webhook.ts              # WebhookService - gửi events ra ngoài
├── webhook-handlers.ts     # Kết nối EventBus → WebhookService
├── events.ts               # EventBus (đã có sẵn)
└── logger.ts               # Logger (đã có sẵn)

src/app/api/webhooks/
└── n8n/route.ts            # API cho n8n gọi ngược vào

docs/n8n-workflows/
├── findworkers-notifications.json    # Workflow real-time alerts
└── findworkers-daily-summary.json    # Workflow báo cáo ngày
```

---

## 🚀 Nâng Cấp Tiếp Theo

1. **Messenger thay Telegram**: Thêm Facebook Graph API node trong n8n
2. **VIP Priority**: Thêm filter trong n8n cho employer VIP
3. **Anti-spam**: Thêm Function node check duplicate
4. **BullMQ Queue**: Chuyển từ HTTP webhook sang message queue
5. **Multiple channels**: Gửi cả Telegram + Email + SMS
