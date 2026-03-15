import mongoose, { Document, Schema } from 'mongoose';

// embedded within SupplyOrder
export interface ISupplyOrderItem {
  _id?: mongoose.Types.ObjectId; // ObjectId for each subdocument item
  product: mongoose.Types.ObjectId;
  requested_quantity: number;
  approved_quantity?: number | null;
  status: string;
  batches?: mongoose.Types.ObjectId[]; // references to SupplyOrderItemBatch documents if needed
}

export const SupplyOrderItemSchema = new Schema<ISupplyOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    requested_quantity: { type: Number, required: true },
    approved_quantity: { type: Number, default: null },
    status: { type: String, default: 'PENDING' },
    batches: [{ type: Schema.Types.ObjectId, ref: 'SupplyOrderItemBatch' }]
  }
  // subdocuments will have their own _id by default
);

export interface SupplyOrderItemCreateDto {
  supply_order_id: string;
  product_id: string;
  requested_quantity: number;
}
