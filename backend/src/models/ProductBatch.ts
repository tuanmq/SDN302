import mongoose, { Document, Schema } from 'mongoose';

export interface IProductBatch extends Document {
  batch_code: string;
  product: mongoose.Types.ObjectId;
  production_date?: Date | null;
  expired_date?: Date | null;
  status: 'PLANNED' | 'PRODUCED' | 'STOCKED' | 'CANCELLED';
  planned_quantity: number;
  produced_quantity?: number | null;
  created_at?: Date;
}

const ProductBatchSchema = new Schema<IProductBatch>(
  {
    batch_code: { type: String, required: true, unique: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    production_date: { type: Date, default: null },
    expired_date: { type: Date, default: null },
    status: { type: String, enum: ['PLANNED', 'PRODUCED', 'STOCKED', 'CANCELLED'], default: 'PLANNED' },
    planned_quantity: { type: Number, required: true },
    produced_quantity: { type: Number, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const ProductBatchModel = mongoose.model<IProductBatch>('ProductBatch', ProductBatchSchema);

export interface ProductBatchCreateDto {
  batch_code: string;
  product_id: string;
  planned_quantity: number;
}

export interface ProductBatchUpdateDto {
  production_date?: Date;
  expired_date?: Date;
  status?: 'PLANNED' | 'PRODUCED' | 'STOCKED' | 'CANCELLED';
  produced_quantity?: number;
}

export interface ProductBatchWithDetails {
  batch_id: string;
  batch_code: string;
  product_id: string;
  product_name: string;
  unit: string;
  production_date?: Date | null;
  expired_date?: Date | null;
  status: 'PLANNED' | 'PRODUCED' | 'STOCKED' | 'CANCELLED';
  planned_quantity: number;
  produced_quantity?: number | null;
  inventory_id?: string;
  inventory_quantity?: number;
  inventory_status?: string;
  created_at: Date;
}
