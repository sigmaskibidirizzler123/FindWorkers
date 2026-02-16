# Hướng dẫn cài đặt N8N Webhook — Tự động gửi thông tin ứng viên qua Gmail

## Bước 1: Cài đặt N8N

### Cách 1: Self-hosted (Docker)
```bash
docker run -d --name n8n -p 5678:5678 n8nio/n8n
```

### Cách 2: N8N Cloud
- Đăng ký tại https://app.n8n.cloud

---

## Bước 2: Tạo Workflow

Trong n8n, tạo workflow mới với các node sau:

### Node 1: **Webhook** (Trigger)
- HTTP Method: `POST`
- Path: `quick-apply`
- Authentication: None (hoặc thêm Header Auth nếu cần bảo mật)
- Sau khi tạo, copy **Production URL** (VD: `https://your-n8n.app.n8n.cloud/webhook/quick-apply`)

### Node 2: **Send Email** (Gmail)
- Kết nối Gmail của bạn: `Luongnguyennhatminh2009@gmail.com`
- **To Email**: `Luongnguyennhatminh2009@gmail.com`
- **Subject**: `[FindWorkers] Ứng viên mới: {{ $json.fullName }} - {{ $json.jobTitle }}`
- **Email Format**: HTML
- **HTML Body**:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #6366f1;">🔔 Ứng viên mới trên FindWorkers</h2>
  
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; background: #f9f9f9; font-weight: bold;">Vị trí</td>
      <td style="padding: 8px; border: 1px solid #eee;">{{ $json.jobTitle }}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; background: #f9f9f9; font-weight: bold;">Công ty</td>
      <td style="padding: 8px; border: 1px solid #eee;">{{ $json.companyName }}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; background: #f9f9f9; font-weight: bold;">Họ tên</td>
      <td style="padding: 8px; border: 1px solid #eee;">{{ $json.fullName }}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; background: #f9f9f9; font-weight: bold;">SĐT</td>
      <td style="padding: 8px; border: 1px solid #eee;">{{ $json.phone }}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; background: #f9f9f9; font-weight: bold;">Email</td>
      <td style="padding: 8px; border: 1px solid #eee;">{{ $json.email }}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #eee; background: #f9f9f9; font-weight: bold;">CCCD</td>
      <td style="padding: 8px; border: 1px solid #eee;">{{ $json.cccd }}</td>
    </tr>
  </table>
  
  {{#if $json.cccdImageUrl}}
  <h3>📷 CCCD Mặt trước:</h3>
  <img src="{{ $json.cccdImageUrl }}" style="max-width: 400px; border-radius: 8px; border: 1px solid #ddd;" />
  {{/if}}
  
  <p style="color: #888; font-size: 12px; margin-top: 20px;">
    Thời gian ứng tuyển: {{ $json.appliedAt }}<br>
    ID: {{ $json.applicationId }}
  </p>
</div>
```

---

## Bước 3: Kết nối với FindWorkers

1. Copy **Webhook Production URL** từ n8n
2. Mở file `.env` trong dự án FindWorkers  
3. Paste URL vào `N8N_WEBHOOK_URL`:

```env
N8N_WEBHOOK_URL="https://your-n8n.app.n8n.cloud/webhook/quick-apply"
```

4. Restart server: `npm run dev`

---

## Bước 4: Test

1. Mở trang chi tiết việc làm
2. Bấm "Ứng tuyển ngay"
3. Điền form và gửi
4. Kiểm tra Gmail → Bạn sẽ nhận được email với thông tin ứng viên!

---

## Dữ liệu gửi đến Webhook

Mỗi khi có ứng viên mới, FindWorkers sẽ gửi JSON này đến webhook:

```json
{
  "applicationId": "clxxxxxx",
  "jobTitle": "Phụ bếp",
  "companyName": "Cafe Bida Nhật Minh",
  "fullName": "Nguyễn Văn A",
  "phone": "0901234567",
  "email": "nguyenvana@gmail.com",
  "cccd": "012345678901",
  "cccdImageUrl": "http://yoursite.com/uploads/cccd/cccd_xxx.jpg",
  "appliedAt": "2026-02-16T13:00:00.000Z"
}
```
