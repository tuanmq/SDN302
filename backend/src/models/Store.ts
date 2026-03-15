import mongoose, { Document, Schema } from 'mongoose';

export interface IStore extends Document {
  store_code: string;
  store_name: string;
  store_address: string;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

const StoreSchema = new Schema<IStore>(
  {
    store_code: { type: String, required: true, unique: true },
    store_name: { type: String, required: true },
    store_address: { type: String, required: true },
    is_active: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreModel = mongoose.model<IStore>('Store', StoreSchema);

export interface StoreCreateDto {
  store_code: string;
  store_name: string;
  store_address: string;
  is_active?: boolean;
}

export interface StoreUpdateDto {
  store_name?: string;
  store_address?: string;
  is_active?: boolean;
}

export interface StoreResponse {
  store_id: string;
  store_code: string;
  store_name: string;
  store_address: string;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}
