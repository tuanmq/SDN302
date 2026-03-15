import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  store: mongoose.Types.ObjectId;
  batch: mongoose.Types.ObjectId;
  quantity: number;
  status: 'ACTIVE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DISPOSED';
  disposed_reason?: 'EXPIRED' | 'WRONG_DATA' | 'DEFECTIVE' | null;
  disposed_at?: Date | null;
  created_at?: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'ProductBatch', required: true },
    quantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'DISPOSED'],
      default: 'ACTIVE'
    },
    // optional; only set when status is DISPOSED
    disposed_reason: { type: String, enum: ['EXPIRED', 'WRONG_DATA', 'DEFECTIVE'] },
    disposed_at: { type: Date }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const InventoryModel = mongoose.model<IInventory>('Inventory', InventorySchema);

export interface InventoryCreateDto {
  store_id: string;
  batch_id: string;
  quantity: number;
}

export interface InventoryUpdateDto {
  quantity?: number;
  status?: 'ACTIVE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DISPOSED';
  disposed_reason?: 'EXPIRED' | 'WRONG_DATA' | 'DEFECTIVE';
  disposed_at?: Date;
}
