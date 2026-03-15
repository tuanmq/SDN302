/**
 * Seed script: tạo Store (đúng format BE) và User cho các role.
 * - User: user_code USR-XXXX (4 chữ số), role_id 1=Admin, 2=Central Staff, 3=Store Staff.
 * - Store: store_code ST-XXX-XXXX (BE: StoreService.storeCodePattern). Cần "Central Kitchen" cho bếp trung tâm; 1 cửa hàng cho Store Staff.
 * Chạy: npm run seed:users (từ thư mục backend)
 */
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { UserModel } from '../models/User';
import { StoreModel } from '../models/Store';

dotenv.config();

// Đúng format BE: StoreService storeCodePattern = /^ST-[A-Z0-9]{3}-[A-Z0-9]{4}$/
const SEED_STORES = [
  { store_code: 'ST-CEN-0001', store_name: 'Central Kitchen', store_address: 'Bếp trung tâm', is_active: true },
  { store_code: 'ST-001-0001', store_name: 'Cửa hàng 1', store_address: 'Địa chỉ cửa hàng 1', is_active: true },
];

// Đúng format BE: UserService userCodePattern = /^USR-\d{4}$/
const SEED_USERS = [
  { user_code: 'USR-0001', username: 'admin', password: 'Admin@123', role_id: 1, store_id: null },
  { user_code: 'USR-0002', username: 'central', password: 'Central@123', role_id: 2, store_id: null },
  { user_code: 'USR-0003', username: 'store1', password: 'Store@123', role_id: 3, store_id: null }, // gán store_id = cửa hàng (không phải Central Kitchen)
];

async function seedUsers(): Promise<void> {
  await connectDatabase();

  // 1. Seed stores (bỏ qua nếu đã tồn tại theo store_code)
  for (const s of SEED_STORES) {
    const code = s.store_code.toUpperCase();
    const existing = await StoreModel.findOne({ store_code: code }).lean();
    if (existing) {
      console.log(`⏭️  Store đã tồn tại: ${s.store_name} (${code})`);
    } else {
      await StoreModel.create({ ...s, store_code: code });
      console.log(`✅ Đã tạo store: ${s.store_name} (${code})`);
    }
  }

  // Store Staff phải gán store (BE: supplyOrderController "User must be assigned to a store"). Dùng cửa hàng không phải Central Kitchen.
  const branchStore = await StoreModel.findOne({ store_name: 'Cửa hàng 1' }).lean();
  const storeIdForStaff = branchStore?._id ?? null;

  // 2. Seed users (bỏ qua nếu trùng user_code hoặc username)
  for (const u of SEED_USERS) {
    const existing = await UserModel.findOne({
      $or: [{ user_code: u.user_code.toUpperCase() }, { username: u.username }],
    });
    if (existing) {
      console.log(`⏭️  Bỏ qua (đã tồn tại): ${u.username} (${u.user_code})`);
      continue;
    }

    const store_id =
      u.role_id === 3 && storeIdForStaff
        ? new mongoose.Types.ObjectId(storeIdForStaff.toString())
        : null;

    const hashedPassword = await bcrypt.hash(u.password, 10);
    await UserModel.create({
      user_code: u.user_code.toUpperCase(),
      username: u.username,
      password: hashedPassword,
      role_id: u.role_id,
      store_id,
      is_active: true,
    });
    console.log(`✅ Đã tạo user: ${u.username} (${u.user_code}) - Role ${u.role_id}`);
  }

  console.log('\n📋 Tài khoản mẫu (chi tiết: backend/ACCOUNTS.md):');
  console.log('   Admin:         admin / Admin@123  (USR-0001)');
  console.log('   Central Staff: central / Central@123  (USR-0002)');
  console.log('   Store Staff:   store1 / Store@123  (USR-0003, gán Cửa hàng 1)');
  await mongoose.disconnect();
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
