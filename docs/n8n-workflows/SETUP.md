# 🔔 FindWorkers Automation - Setup Guide

## Kiến Trúc Tổng Thể

```
FindWorkers App
    ↓ (Event Bus)
WebhookService  ──POST──→  n8n Webhook
                                ↓
                           Filter + Format
                                ↓
                          Discord Webhook
                                ↓
                    Bạn nhận thông báo real-time 🎉
```

**Không cần Gmail!** Hệ thống bắn event trực tiếp.

---

## 📋 Bước 1: Tạo Discord Webhook (30 giây)

1. Mở **Discord** → Tạo server hoặc dùng server có sẵn
2. Vào channel bạn muốn nhận thông báo (ví dụ: `#findworkers-alerts`)
3. Click **⚙️ Edit Channel** → **Integrations** → **Webhooks**
4. Click **New Webhook**
5. Đặt tên: `FindWorkers Bot`
6. **Copy Webhook URL** → Lưu lại

URL sẽ có dạng:
```
https://discord.com/api/webhooks/1234567890/abcdefghijk...
```

---

## 📋 Bước 2: Cấu hình Environment Variables

Thêm vào **Vercel Environment Variables**:

```env
# n8n Webhook URL (lấy từ n8n sau khi import workflow)
N8N_WEBHOOK_URL=https://your-n8n-domain.com/webhook/findworkers-events

# Secret để xác thực (tùy chọn nhưng khuyên dùng)
WEBHOOK_SECRET=your-secret-key-here
```

Trong **n8n Environment Variables**:
```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
FINDWORKERS_API_URL=https://find-workers.vercel.app
WEBHOOK_SECRET=your-secret-key-here
```

---

## 📋 Bước 3: Import n8n Workflows

### Workflow 1: Real-time Notifications
1. Mở n8n → **Import from file**
2. Chọn: `docs/n8n-workflows/findworkers-notifications.json`
3. Set n8n env: `DISCORD_WEBHOOK_URL` = URL từ Bước 1
4. **Activate** workflow
5. Copy **Webhook URL** từ node "🔔 Webhook Trigger"
6. Paste vào Vercel env: `N8N_WEBHOOK_URL`

### Workflow 2: Daily Summary (9PM hàng ngày)
1. Import: `docs/n8n-workflows/findworkers-daily-summary.json`
2. Set n8n env: `DISCORD_WEBHOOK_URL` + `FINDWORKERS_API_URL`
3. **Activate** workflow

---

## 📋 Bước 4: Test

### Test API:
```bash
curl https://find-workers.vercel.app/api/webhooks/n8n
# → {"success":true,"data":{"status":"ok",...}}
```

### Test Daily Summary:
```bash
curl -X POST https://find-workers.vercel.app/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -d '{"action":"daily_summary"}'
```

### Test Discord trực tiếp:
```bash
curl -X POST YOUR_DISCORD_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "username": "FindWorkers Test",
    "embeds": [{
      "title": "🔥 Test Alert!",
      "description": "Nếu thấy message này = Discord webhook hoạt động!",
      "color": 16744448
    }]
  }'
```

---

## 🔄 Events Tự Động

| Event | Khi nào | Discord Color |
|-------|---------|---------------|
| 🔥 `application.new` | Ứng viên apply job | 🟠 Orange |
| ✅ `application.hired` | Tuyển thành công | 🟢 Green |
| 🏢 `employer.registered` | DN đăng ký mới | 🔵 Blue |
| 💼 `job.created` | Đăng tin mới | 🔵 Blue |
| 🚨 `system.error` | Lỗi hệ thống | 🔴 Red |
| 📊 `daily.summary` | Báo cáo 9PM | 🟣 Purple |

---

## 🎨 Discord Embed Preview

Thông báo sẽ hiển thị dạng **rich embed**:

```
╔══════════════════════════════════╗
║ 🔥 Ứng Viên Mới Apply!         ║
║                                  ║
║ 👤 Ứng viên: Nguyễn Văn A       ║
║ 💼 Vị trí:   Phục vụ bàn        ║
║ 📱 SĐT:      0907xxxxxx         ║
║ 🏢 DN:       Quán Cafe ABC      ║
║                                  ║
║ FindWorkers Alert System         ║
╚══════════════════════════════════╝
```

---

## 🏗️ Cấu Trúc Files

```
src/lib/
├── webhook.ts              # WebhookService - gửi events
├── webhook-handlers.ts     # EventBus → WebhookService
├── events.ts               # EventBus (đã có)
└── logger.ts               # Logger (đã có)

src/app/api/webhooks/
└── n8n/route.ts            # API cho n8n callback

docs/n8n-workflows/
├── findworkers-notifications.json   # Real-time alerts → Discord
├── findworkers-daily-summary.json   # Báo cáo ngày → Discord
└── SETUP.md                         # File này
```

---

## ⚡ Không dùng n8n? Gửi thẳng Discord!

Nếu không muốn dùng n8n, bạn có thể gửi trực tiếp đến Discord bằng cách:

1. Đặt env: `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`
2. WebhookService sẽ tự gửi trực tiếp (không cần n8n trung gian)

---

## 🚀 Nâng Cấp Tiếp Theo

1. **Thêm channel riêng**: `#applications`, `#employers`, `#system-alerts`
2. **Zalo OA**: Thêm Zalo notification cho thị trường VN
3. **BullMQ Queue**: Message queue cho high-traffic
4. **AI Filter**: Dùng OpenAI trong n8n lọc spam
5. **VIP Priority**: Alert riêng cho employer VIP
