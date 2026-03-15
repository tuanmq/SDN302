import { InventoryModel, IInventory } from '../models/Inventory';
import mongoose from 'mongoose';
import { ProductBatchModel } from '../models/ProductBatch';
import { StoreModel } from '../models/Store';

export class InventoryRepository {
  calculateStatus(expiredDate: Date): 'ACTIVE' | 'NEAR_EXPIRY' | 'EXPIRED' {
    const now = new Date();
    const expired = new Date(expiredDate);

    now.setHours(0, 0, 0, 0);
    expired.setHours(0, 0, 0, 0);

    const diffTime = expired.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'EXPIRED';
    } else if (diffDays <= 3) {
      return 'NEAR_EXPIRY';
    } else {
      return 'ACTIVE';
    }
  }

  async findAll(): Promise<IInventory[]> {
    return InventoryModel.find().sort({ created_at: -1 }).lean();
  }

  async findById(inventoryId: string): Promise<IInventory | null> {
    return InventoryModel.findById(inventoryId).lean();
  }

  async findByStoreAndBatch(storeId: string, batchId: string): Promise<IInventory | null> {
    return InventoryModel.findOne({ store: storeId, batch: batchId }).lean();
  }

  async create(inventoryData: Partial<IInventory>): Promise<IInventory> {
    const inventory = new InventoryModel({
      ...inventoryData,
      status: 'ACTIVE'
    });
    await inventory.save();
    return inventory.toObject();
  }

  async update(inventoryId: string, inventoryData: Partial<IInventory>): Promise<IInventory | null> {
    return InventoryModel.findByIdAndUpdate(inventoryId, inventoryData, { new: true }).lean();
  }
  async getAvailableQuantityByProduct(productId: string): Promise<number> {
    const centralStore = await StoreModel.findOne({ store_name: 'Central Kitchen' }).lean();
    if (!centralStore) return 0;

    const inventories = await InventoryModel.aggregate([
      { $match: { store: centralStore._id } },
      {
        $lookup: {
          from: 'productbatches',
          localField: 'batch',
          foreignField: '_id',
          as: 'batch'
        }
      },
      { $unwind: '$batch' },
      { $match: { 'batch.product': new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    return inventories[0]?.total || 0;
  }
  async delete(inventoryId: string): Promise<boolean> {
    const res = await InventoryModel.findByIdAndDelete(inventoryId);
    return res !== null;
  }

  async findAllWithDetails(storeId: string): Promise<any[]> {
    let storeObjectId: mongoose.Types.ObjectId;
    try {
      storeObjectId = new mongoose.Types.ObjectId(storeId);
    } catch {
      return [];
    }
    return InventoryModel.aggregate([
      { $match: { store: storeObjectId } },
      {
        $lookup: {
          from: 'productbatches',
          localField: 'batch',
          foreignField: '_id',
          as: 'batch'
        }
      },
      { $unwind: '$batch' },
      {
        $lookup: {
          from: 'products',
          localField: 'batch.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          batch_id: '$batch._id',
          batch_code: '$batch.batch_code',
          product_id: '$product._id',
          product_name: '$product.product_name',
          product_code: '$product.product_code',
          unit: '$product.unit',
          production_date: '$batch.production_date',
          expired_date: '$batch.expired_date',
          created_at: '$batch.created_at',
          inventory_id: '$_id',
          inventory_quantity: '$quantity',
          inventory_status: '$status',
          inventory_disposed_reason: '$disposed_reason',
          inventory_disposed_at: '$disposed_at'
        }
      },
      { $sort: { 'batch.created_at': -1 } }
    ]);
  }

  async updateStatus(inventoryId: string, status: string, disposedReason?: string): Promise<IInventory | null> {
    const update: any = { status };
    if (status === 'DISPOSED' && disposedReason) {
      update.disposed_reason = disposedReason;
      update.disposed_at = new Date();
    }
    return InventoryModel.findByIdAndUpdate(inventoryId, update, { new: true }).lean();
  }

  async updateExpiredStatuses(): Promise<void> {
    // run three updates using aggregation or just loop through documents
    const batches = await ProductBatchModel.find();
    const now = new Date();

    for (const batch of batches) {
      const status = this.calculateStatus(batch.expired_date || now);
      await InventoryModel.updateMany(
        { batch: batch._id, status: { $nin: ['DISPOSED'] } },
        { status }
      );
    }
  }
}

export default new InventoryRepository();
