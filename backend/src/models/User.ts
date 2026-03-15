import mongoose, { Document, Schema } from 'mongoose';

// MongoDB document interface (role_id 1=Admin, 2=Central Staff, 3=Store Staff)
export interface IUser extends Document {
  user_code: string;
  username: string;
  password: string;
  role_id: number;
  store_id?: mongoose.Types.ObjectId | null;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    user_code: { type: String, required: true, uppercase: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role_id: { type: Number, required: true }, // 1=Admin, 2=Central Staff, 3=Store Staff
    store_id: { type: Schema.Types.ObjectId, ref: 'Store', default: null },
    is_active: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);

// request/response DTOs remain similar but with string ids
export interface UserCreateDto {
  user_code: string;
  username: string;
  password: string;
  role_id: number;
  store_id?: string | null;
  is_active?: boolean;
}

export interface UserUpdateDto {
  username?: string;
  password?: string;
  role_id?: number;
  store_id?: string | null;
  is_active?: boolean;
}

export interface UserResponse {
  user_id: string;
  user_code: string;
  username: string;
  role_id: number;
  store_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}
