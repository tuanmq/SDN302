# Tài khoản mẫu theo từng role (khớp với Backend)

Sau khi chạy `npm run seed:users` trong thư mục `backend`, script sẽ tạo **Store** (nếu chưa có) rồi tạo **User** theo đúng định dạng và ràng buộc của BE.

---

## Định dạng theo Backend

- **User** (models/User.ts, services/userService.ts):
  - `user_code`: bắt buộc, unique, format **USR-XXXX** (X là chữ số, 4 ký tự).
  - `username`, `password`, `role_id`: bắt buộc. Mật khẩu được hash bằng bcrypt (salt 10).
  - `role_id`: **1** = Admin, **2** = Central Staff, **3** = Store Staff.
  - `store_id`: không bắt buộc khi tạo user. Với **Store Staff (3)**, BE yêu cầu có `store_id` khi tạo đơn cung ứng (supplyOrderController: "User must be assigned to a store to create supply orders"). Seed gán sẵn Store Staff vào store "Cửa hàng 1".
- **Store** (models/Store.ts, services/storeService.ts):
  - `store_code`: bắt buộc, unique, format **ST-XXX-XXXX** (ví dụ ST-CEN-0001, ST-001-0001).
  - `store_name`, `store_address`: bắt buộc; `store_name` unique.
  - BE dùng store có `store_name: 'Central Kitchen'` cho bếp trung tâm (inventory, product batch, supply order). Seed tạo sẵn "Central Kitchen" và "Cửa hàng 1".
- **Auth** (services/authService.ts): Đăng nhập kiểm tra `is_active`; nếu user có `store_id` thì store phải tồn tại và `is_active`, nếu không sẽ báo "Your store is inactive. Please contact administrator."

---

## Bảng tài khoản seed

| Role            | role_id | user_code | Username  | Password      | store_id (seed)     |
|-----------------|--------:|-----------|-----------|---------------|---------------------|
| **Admin**       | 1       | USR-0001  | `admin`   | `Admin@123`   | null                |
| **Central Staff** | 2     | USR-0002  | `central` | `Central@123` | null                |
| **Store Staff** | 3       | USR-0003  | `store1`  | `Store@123`   | Cửa hàng 1 (ST-001-0001) |

---

## Store được seed (nếu chưa tồn tại)

| store_code   | store_name       | store_address        |
|--------------|------------------|----------------------|
| ST-CEN-0001  | Central Kitchen  | Bếp trung tâm        |
| ST-001-0001  | Cửa hàng 1       | Địa chỉ cửa hàng 1   |

---

## Cách chạy seed

1. Cấu hình `.env` (backend): có `MONGODB_URI` hoặc `DATABASE_URL`.
2. Trong thư mục `backend`:
   ```bash
   npm run seed:users
   ```
3. Script: tạo store theo `store_code` (bỏ qua nếu đã có), tạo user theo `user_code`/`username` (bỏ qua nếu đã có). Store Staff được gán vào store "Cửa hàng 1".

---

**Bảo mật:** Các mật khẩu trên chỉ dùng cho dev/demo; nên đổi mật khẩu khi dùng môi trường thật.
