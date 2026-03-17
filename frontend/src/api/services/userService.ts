import api from '../axiosConfig';
import { 
  LoginRequest, 
  LoginResponse, 
  User, 
  UserCreateRequest, 
  UserUpdateRequest,
  ApiResponse 
} from '../types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials, { timeout: 20000 });
    const body = response.data as { success?: boolean; data?: LoginResponse; token?: string; user?: LoginResponse['user'] };
    const payload = body.data ?? (body.token && body.user ? { token: body.token, user: body.user } : null);
    if (!payload?.token || !payload?.user) {
      throw new Error('Invalid response from server');
    }
    return payload;
  },
};

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/users');
    return response.data.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await api.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.data;
  },

  createUser: async (userData: UserCreateRequest): Promise<User> => {
    const response = await api.post<ApiResponse<User>>('/users', userData);
    return response.data.data;
  },

  updateUser: async (id: string, userData: UserUpdateRequest): Promise<User> => {
    const response = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};
