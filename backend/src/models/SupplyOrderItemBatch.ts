import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplyOrderItemBatch extends Document {
  supply_order_item: mongoose.Types.ObjectId;
  batch_id: mongoose.Types.ObjectId;
  inventory_id: mongoose.Types.ObjectId;
  quantity: number;
  receipted_quantity?: number | null;
  stocked_quantity?: number | null;
  created_at: Date;
}

const SupplyOrderItemBatchSchema = new Schema<ISupplyOrderItemBatch>(
  {
    supply_order_item: { type: Schema.Types.ObjectId, ref: 'SupplyOrderItem', required: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'ProductBatch', required: true },
    inventory_id: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    quantity: { type: Number, required: true },
    receipted_quantity: { type: Number, default: null },
    stocked_quantity: { type: Number, default: null }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const SupplyOrderItemBatchModel = mongoose.model<ISupplyOrderItemBatch>('SupplyOrderItemBatch', SupplyOrderItemBatchSchema);

export interface CreateSupplyOrderItemBatchRequest {
  supply_order_item_id: string;
  batch_id: string;
  inventory_id: string;
  quantity: number;
}

export interface UpdateReceiptedQuantityRequest {
  item_batch_id: string;
  receipted_quantity: number;
}

export interface UpdateStockedQuantityRequest {
  item_batch_id: string;
  stocked_quantity: number;
}
