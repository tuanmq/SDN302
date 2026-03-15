import mongoose from 'mongoose';
import { SupplyOrderModel, ISupplyOrder } from '../models/SupplyOrder';
import { SupplyOrderItemBatchModel } from '../models/SupplyOrderItemBatch';
import { InventoryModel } from '../models/Inventory';

export class SupplyOrderRepository {
  async create(supplyOrderCode: string, storeId: string, createdBy: string): Promise<ISupplyOrder> {
    const order = new SupplyOrderModel({
      supply_order_code: supplyOrderCode,
      store: storeId,
      status: 'SUBMITTED',
      created_by: createdBy,
      items: []
    });
    await order.save();
    return order.toObject();
  }

  async findBySupplyOrderCode(supplyOrderCode: string): Promise<ISupplyOrder | null> {
    return SupplyOrderModel.findOne({ supply_order_code: supplyOrderCode }).lean();
  }

  async createItem(orderId: string, productId: string, requestedQuantity: number) {
    const order = await SupplyOrderModel.findById(orderId);
    if (!order) throw new Error('Order not found');
    // cast values to satisfy schema types
    order.items.push({
      product: new mongoose.Types.ObjectId(productId) as any,
      requested_quantity: requestedQuantity,
      status: 'PENDING'
    } as any);
    await order.save();
    return order.items[order.items.length - 1];
  }

  async findByIdWithItems(orderId: string): Promise<any | null> {
    const order = await SupplyOrderModel.findById(orderId)
      .populate('store', 'store_name')
      .populate('created_by', 'username')
      .populate('items.product', 'product_name product_code unit')
      .lean();
    if (!order) return null;
    for (const item of order.items) {
      const itemBatches = await SupplyOrderItemBatchModel.find({ supply_order_item: item._id })
        .populate('batch_id', 'batch_code')
        .lean();
      (item as any).batches = itemBatches.map((b: any) => {
        const batchCode = b.batch_id?.batch_code ?? (typeof b.batch_id === 'object' && b.batch_id !== null ? (b.batch_id as any).batch_code : null);
        return {
          _id: b._id?.toString?.() ?? b._id,
          item_batch_id: b._id?.toString?.() ?? b._id,
          supply_order_item: b.supply_order_item?.toString?.() ?? b.supply_order_item,
          batch_id: b.batch_id?._id?.toString?.() ?? b.batch_id?.toString?.() ?? b.batch_id,
          batch_code: batchCode != null ? String(batchCode) : '',
          inventory_id: b.inventory_id?.toString?.() ?? b.inventory_id,
          quantity: Number(b.quantity) ?? 0,
          receipted_quantity: b.receipted_quantity != null ? Number(b.receipted_quantity) : null,
          stocked_quantity: b.stocked_quantity != null ? Number(b.stocked_quantity) : null,
          created_at: b.created_at
        };
      });
    }
    return order;
  }

  private buildDateFilter(from?: Date, to?: Date): Record<string, unknown> {
    const filter: Record<string, unknown> = {};
    if (from || to) {
      filter.created_at = {} as Record<string, Date>;
      if (from) {
        const start = new Date(from);
        start.setUTCHours(0, 0, 0, 0);
        (filter.created_at as Record<string, Date>).$gte = start;
      }
      if (to) {
        const end = new Date(to);
        end.setUTCHours(23, 59, 59, 999);
        (filter.created_at as Record<string, Date>).$lte = end;
      }
    }
    return filter;
  }

  async findByStoreId(storeId: string, from?: Date, to?: Date): Promise<any[]> {
    const baseFilter: Record<string, unknown> = { store: storeId };
    const dateFilter = this.buildDateFilter(from, to);
    const filter = Object.keys(dateFilter).length ? { ...baseFilter, ...dateFilter } : baseFilter;

    const orders = await SupplyOrderModel.find(filter)
      .sort({ created_at: -1 })
      .populate('store', 'store_name')
      .populate('created_by', 'username')
      .populate('items.product', 'product_name product_code unit')
      .lean();

    for (const order of orders) {
      for (const item of order.items) {
        item.batches = await SupplyOrderItemBatchModel.find({ supply_order_item: item._id }).lean();
      }
    }
    return orders;
  }

  async findAll(from?: Date, to?: Date): Promise<any[]> {
    const dateFilter = this.buildDateFilter(from, to);
    const filter = Object.keys(dateFilter).length ? dateFilter : {};

    const orders = await SupplyOrderModel.find(filter)
      .sort({ created_at: -1 })
      .populate('store', 'store_name')
      .populate('created_by', 'username')
      .populate('items.product', 'product_name product_code unit')
      .lean();

    for (const order of orders) {
      for (const item of order.items) {
        item.batches = await SupplyOrderItemBatchModel.find({ supply_order_item: item._id }).lean();
      }
    }

    return orders;
  }

  async updateStatus(orderId: string, status: string): Promise<ISupplyOrder | null> {
    return SupplyOrderModel.findByIdAndUpdate(orderId, { status }, { new: true }).lean();
  }

  async findById(orderId: string): Promise<ISupplyOrder | null> {
    return SupplyOrderModel.findById(orderId).lean();
  }

  async updateItem(itemId: string, approvedQuantity: number | null, status: string) {
    const order = await SupplyOrderModel.findOne({ 'items._id': itemId });
    if (!order) return null;
    const item: any = (order.items as any).id(itemId);
    if (item) {
      item.approved_quantity = approvedQuantity;
      item.status = status;
      await order.save();
      return item;
    }
    return null;
  }

  async getItemsByOrderId(orderId: string) {
    const order = await SupplyOrderModel.findById(orderId).lean();
    return order ? order.items : [];
  }

  async getBatchesForProduct(productId: string): Promise<{ inventory_id: string; batch_id: string; quantity: number }[]> {
    const { StoreModel } = await import('../models/Store');
    const { ProductBatchModel } = await import('../models/ProductBatch');
    const centralStore = await StoreModel.findOne({ store_name: 'Central Kitchen' }).lean();
    if (!centralStore) return [];

    const batchIds = await ProductBatchModel.find({ product: productId }).distinct('_id');
    const inventories = await InventoryModel.find({
      batch: { $in: batchIds },
      store: centralStore._id,
      quantity: { $gt: 0 }
    })
      .populate('batch', 'expired_date')
      .sort({ 'batch.expired_date': 1 })
      .lean();

    return inventories.map((inv: any) => ({
      inventory_id: inv._id.toString(),
      batch_id: (inv.batch && inv.batch._id ? inv.batch._id : inv.batch).toString(),
      quantity: inv.quantity
    }));
  }

  async deductInventory(inventoryId: string, quantity: number): Promise<void> {
    await InventoryModel.findByIdAndUpdate(inventoryId, { $inc: { quantity: -quantity } });
  }

  async addInventoryToStore(batchId: string, storeId: string, quantity: number): Promise<void> {
    const inv = await InventoryModel.findOne({ batch: batchId, store: storeId });
    if (inv) {
      inv.quantity += quantity;
      await inv.save();
    } else {
      const newInv = new InventoryModel({ batch: batchId, store: storeId, quantity, status: 'ACTIVE' });
      await newInv.save();
    }
  }
}

export default new SupplyOrderRepository();