// Authentication related types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: string;
    username: string;
    role_id: number;
    store_id: string | null;
  };
}
