# central-kitchen-be
Backend service for Central Kitchen System

## Chạy ứng dụng

1. **Khởi động MongoDB** (bắt buộc trước khi chạy backend):
   - Cài đặt MongoDB và đảm bảo service đang chạy (ví dụ: `mongod` hoặc Windows: `net start MongoDB`).
   - Hoặc dùng [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) và cấu hình `MONGODB_URI` trong `.env`.
2. Cấu hình `.env` (ít nhất `MONGODB_URI` hoặc `DATABASE_URL`).
3. `npm run dev` hoặc `npm run build` rồi `npm start`.
