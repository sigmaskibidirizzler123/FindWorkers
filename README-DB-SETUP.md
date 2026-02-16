# 🛠️ Hướng dẫn cài đặt Database cho FindWorkers

Hệ thống báo lỗi đăng ký vì **chưa có Database** để lưu thông tin người dùng.
Bạn cần cài đặt PostgreSQL để chạy ứng dụng này.

## Cách 1: Cài đặt trực tiếp trên Windows (Khuyên dùng nếu không biết Docker)

1. **Tải về:**
   - Truy cập: [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Chọn bản mới nhất (ví dụ 16.x) và tải về.

2. **Cài đặt:**
   - Chạy file cài đặt. Giữ các tùy chọn mặc định.
   - **QUAN TRỌNG:** Khi đến bước đặt mật khẩu cho `postgres` superuser, hãy đặt là **`password`** (hoặc nhớ mật khẩu bạn đặt).

3. **Cấu hình:**
   - Mở file `.env` trong thư mục dự án.
   - Sửa dòng `DATABASE_URL` nếu mật khẩu của bạn khác `password`:
     ```env
     DATABASE_URL="postgresql://postgres:MAT_KHAU_CUA_BAN@localhost:5432/findworkers?schema=public"
     ```

4. **Khởi tạo Database:**
   - Mở terminal tại thư mục dự án, chạy lệnh:
     ```bash
     npx prisma migrate dev --name init_db
     ```
   - Lệnh này sẽ tạo các bảng (User, Job, Profile...) trong database.

5. **Chạy lại ứng dụng:**
   - Tắt terminal đang chạy `npm run dev` (Ctrl+C).
   - Chạy lại `npm run dev`.
   - Đăng ký thử tài khoản mới.

## Cách 2: Dùng Docker (Nhanh nhất nếu đã có Docker)

Nếu bạn đã cài Docker Desktop, chỉ cần chạy lệnh sau tại thư mục dự án:

```bash
docker-compose up -d
```
(Tôi đã tạo sẵn file `docker-compose.yml` cho bạn).

Sau đó chạy lệnh khởi tạo database:
```bash
npx prisma migrate dev --name init_db
```
