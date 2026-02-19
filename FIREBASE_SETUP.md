# 🔥 Firebase Setup — Hướng dẫn cấu hình OTP Phone Verification

## Bước 1: Tạo Firebase Project

1. Truy cập: https://console.firebase.google.com
2. Click **"Add project"** → Đặt tên: `FindWorkers`
3. Bỏ tick Google Analytics (không cần) → **Create project**

## Bước 2: Enable Phone Authentication

1. Vào **Authentication** → Tab **Sign-in method**
2. Click **Phone** → **Enable** → **Save**
3. (Optional) Thêm test phone number để dev: `+84907697043` → code: `123456`

## Bước 3: Lấy Firebase Client Config

1. Vào **Project Settings** (⚙️ icon góc trên) → Tab **General**
2. Scroll xuống **"Your apps"** → Click **Web** (icon `</>`)
3. Đặt nickname: `FindWorkers Web` → **Register app**
4. Copy các giá trị config → Paste vào file `.env.firebase` bên dưới

## Bước 4: Lấy Firebase Admin Config  

1. Vào **Project Settings** → Tab **Service accounts**
2. Click **"Generate new private key"** → Download file JSON
3. Mở file JSON → Copy các giá trị `project_id`, `client_email`, `private_key`

## Bước 5: Import vào Vercel

### Cách 1: Vercel CLI (nhanh nhất)
```bash
# Cài Vercel CLI
npm i -g vercel

# Import từ file .env.firebase
vercel env pull
# Hoặc thêm từng biến:
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
```

### Cách 2: Vercel Dashboard
1. Vào https://vercel.com → Project FindWorkers → **Settings** → **Environment Variables**
2. Copy từng dòng từ file `.env.firebase` → Paste vào
3. Click **Save** → **Redeploy**

---

## ⚠️ Lưu ý quan trọng

- `FIREBASE_ADMIN_PRIVATE_KEY` phải bọc trong dấu `"..."` và giữ nguyên `\n`
- Firebase Phone Auth FREE: **10,000 SMS/tháng** (đủ cho startup)
- Nếu muốn test local mà không tốn SMS: dùng Test Phone Number ở bước 2
