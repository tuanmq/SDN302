import mongoose, { Document, Schema } from 'mongoose';
import { SupplyOrderItemSchema, ISupplyOrderItem } from './SupplyOrderItem';

export interface ISupplyOrder extends Document {
  supply_order_code: string;
  store: mongoose.Types.ObjectId;
  status: 'SUBMITTED' | 'APPROVED' | 'PARTLY_APPROVED' | 'REJECTED' | 'DELIVERING' | 'RECEIPTED' | 'STOCKED' | 'CANCELLED';
  created_at: Date;
  created_by: mongoose.Types.ObjectId;
  items: ISupplyOrderItem[];
}

const SupplyOrderSchema = new Schema<ISupplyOrder>(
  {
    supply_order_code: { type: String, required: true, unique: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    status: { type: String, default: 'SUBMITTED' },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [SupplyOrderItemSchema], default: [] }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const SupplyOrderModel = mongoose.model<ISupplyOrder>('SupplyOrder', SupplyOrderSchema);

export interface SupplyOrderCreateDto {
  supply_order_code: string;
  items: {
    product_id: string;
    requested_quantity: number;
  }[];
}
