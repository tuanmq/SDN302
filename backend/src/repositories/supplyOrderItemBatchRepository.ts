import { SupplyOrderItemBatchModel, ISupplyOrderItemBatch } from '../models/SupplyOrderItemBatch';
import mongoose from 'mongoose';

export const create = async (data: {
  supply_order_item_id: string;
  batch_id: string;
  inventory_id: string;
  quantity: number;
}): Promise<ISupplyOrderItemBatch> => {
  const item = new SupplyOrderItemBatchModel({
    supply_order_item: data.supply_order_item_id,
    batch_id: data.batch_id,
    inventory_id: data.inventory_id,
    quantity: data.quantity
  });
  await item.save();
  return item.toObject();
};

export const findBySupplyOrderItemId = async (supplyOrderItemId: string): Promise<ISupplyOrderItemBatch[]> => {
  return SupplyOrderItemBatchModel.find({ supply_order_item: supplyOrderItemId })
    .populate('batch_id', 'batch_code')
    .lean();
};

export const findBySupplyOrderId = async (supplyOrderId: string): Promise<ISupplyOrderItemBatch[]> => {
  // require lookups via SupplyOrderModel or Aggregation
  const items = await SupplyOrderItemBatchModel.aggregate([
    {
      $lookup: {
        from: 'supplyorders',
        localField: 'supply_order_item',
        foreignField: 'items._id',
        as: 'parentOrder'
      }
    },
    { $unwind: '$parentOrder' },
    { $match: { 'parentOrder._id': new mongoose.Types.ObjectId(supplyOrderId) } }
  ]);
  return items as any;
};

export const updateReceiptedQuantity = async (itemBatchId: string, receiptedQuantity: number): Promise<ISupplyOrderItemBatch | null> => {
  return SupplyOrderItemBatchModel.findByIdAndUpdate(itemBatchId, { receipted_quantity: receiptedQuantity }, { new: true }).lean();
};

export const updateStockedQuantity = async (itemBatchId: string, stockedQuantity: number): Promise<ISupplyOrderItemBatch | null> => {
  return SupplyOrderItemBatchModel.findByIdAndUpdate(itemBatchId, { stocked_quantity: stockedQuantity }, { new: true }).lean();
};

export const findById = async (itemBatchId: string): Promise<ISupplyOrderItemBatch | null> => {
  return SupplyOrderItemBatchModel.findById(itemBatchId)
    .populate('batch_id', 'batch_code')
    .lean();
};
