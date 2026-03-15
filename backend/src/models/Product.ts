import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  product_code: string;
  product_name: string;
  unit: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    product_code: { type: String, required: true, unique: true },
    product_name: { type: String, required: true },
    unit: { type: String, required: true },
    is_active: { type: Boolean, default: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);

export interface ProductCreateDto {
  product_code: string;
  product_name: string;
  unit: string;
}

export interface ProductUpdateDto {
  product_name?: string;
  unit?: string;
}

export interface ProductResponse {
  product_id: string;
  product_code: string;
  product_name: string;
  unit: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
