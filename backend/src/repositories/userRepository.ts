import { UserModel, IUser } from '../models/User';

export class UserRepository {
  async findAll(): Promise<IUser[]> {
    return UserModel.find().sort({ created_at: -1 }).lean();
  }

  async findById(userId: string): Promise<IUser | null> {
    return UserModel.findById(userId).lean();
  }

  async findByUsername(username: string): Promise<IUser | null> {
    if (!username || typeof username !== 'string') return null;
    const trimmed = username.trim();
    if (!trimmed) return null;
    return UserModel.findOne({ username: new RegExp('^' + trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }).lean();
  }

  async findByUserCode(userCode: string): Promise<IUser | null> {
    return UserModel.findOne({ user_code: userCode.toUpperCase() }).lean();
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new UserModel(userData);
    await user.save();
    return user.toObject();
  }

  async update(userId: string, userData: Partial<IUser>): Promise<IUser | null> {
    const updated = await UserModel.findByIdAndUpdate(userId, userData, { new: true }).lean();
    return updated;
  }

  async delete(userId: string): Promise<boolean> {
    const res = await UserModel.findByIdAndDelete(userId);
    return res !== null;
  }
}
