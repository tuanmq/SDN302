import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { UserRepository } from '../repositories/userRepository';
import { UserCreateDto, UserUpdateDto, UserResponse } from '../models/User';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers(): Promise<UserResponse[]> {
    const users = await this.userRepository.findAll();
    return users.map(this.toUserResponse);
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.userRepository.findById(userId);
    return user ? this.toUserResponse(user) : null;
  }

  async createUser(userData: UserCreateDto): Promise<UserResponse> {
    const userCodePattern = /^USR-\d{4}$/;
    if (!userData.user_code || !userCodePattern.test(userData.user_code.toUpperCase())) {
      throw new Error('Invalid user_code format. Expected format: USR-XXXX');
    }

    userData.user_code = userData.user_code.toUpperCase();

    const existingUserCode = await this.userRepository.findByUserCode(userData.user_code);
    if (existingUserCode) {
      throw new Error('User code already exists');
    }

    const existingUser = await this.userRepository.findByUsername(userData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await this.userRepository.create({
      ...userData,
      role_id: userData.role_id,
      store_id: userData.store_id ? new mongoose.Types.ObjectId(userData.store_id) : null,
      password: hashedPassword,
    });

    return this.toUserResponse(user);
  }

  async updateUser(userId: string, userData: UserUpdateDto): Promise<UserResponse | null> {
    if ('user_code' in userData) {
      throw new Error('Cannot modify user_code after creation');
    }

    if (userData.username) {
      const existingUser = await this.userRepository.findByUsername(userData.username);
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new Error('Username already exists');
      }
    }

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // convert store_id if provided (role_id stays number)
    if (userData.store_id !== undefined) {
      (userData as any).store_id = userData.store_id ? new mongoose.Types.ObjectId(userData.store_id) : null;
    }

    const user = await this.userRepository.update(userId, userData as any);
    return user ? this.toUserResponse(user) : null;
  }

  async deleteUser(userId: string): Promise<boolean> {
    return await this.userRepository.delete(userId);
  }

  private toUserResponse(user: any): UserResponse {
    return {
      user_id: user._id.toString(),
      user_code: user.user_code,
      username: user.username,
      role_id: user.role_id,
      store_id: user.store_id?.toString() || null,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
