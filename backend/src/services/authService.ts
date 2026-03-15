import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/userRepository';
import { StoreRepository } from '../repositories/storeRepository';

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    user_id: string;
    username: string;
    role_id: number;
    store_id: string | null;
  };
}

export class AuthService {
  private userRepository: UserRepository;
  private storeRepository: StoreRepository;
  private jwtSecret: string;

  constructor() {
    this.userRepository = new UserRepository();
    this.storeRepository = new StoreRepository();
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  }

  async login(loginData: LoginDto): Promise<AuthResponse> {
    const { username, password } = loginData;
    if (!username || !password) {
      throw new Error('Invalid credentials');
    }

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const hashedPassword = user.password;
    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    if (user.store_id) {
      const store = await this.storeRepository.findById(user.store_id.toString());
      if (!store || !store.is_active) {
        throw new Error('Your store is inactive. Please contact administrator.');
      }
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, hashedPassword);
    } catch {
      throw new Error('Invalid credentials');
    }
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const userId = user._id?.toString?.();
    if (!userId) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      {
        user_id: userId,
        username: user.username,
        role_id: user.role_id,
        store_id: user.store_id ? user.store_id.toString() : null,
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        user_id: userId,
        username: user.username,
        role_id: user.role_id,
        store_id: user.store_id ? user.store_id.toString() : null,
      },
    };
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
