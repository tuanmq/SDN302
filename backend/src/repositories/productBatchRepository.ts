import mongoose from 'mongoose';
import { ProductBatchModel, IProductBatch } from '../models/ProductBatch';

export class ProductBatchRepository {
  async findById(batchId: string): Promise<IProductBatch | null> {
    return ProductBatchModel.findById(batchId).lean();
  }

  async findByBatchCode(batchCode: string): Promise<IProductBatch | null> {
    return ProductBatchModel.findOne({ batch_code: batchCode }).lean();
  }

  async create(batchData: Partial<IProductBatch> & { product_id?: string }): Promise<IProductBatch> {
    const { product_id, ...rest } = batchData as any;
    const batch = new ProductBatchModel({
      ...rest,
      product: product_id ? new mongoose.Types.ObjectId(product_id) : batchData.product,
      status: 'PLANNED'
    });
    await batch.save();
    return batch.toObject();
  }

  async update(batchId: string, updateData: Partial<IProductBatch>): Promise<IProductBatch | null> {
    const updates: any = { ...updateData };
    if (Object.keys(updates).length === 0) {
      return this.findById(batchId);
    }
    return ProductBatchModel.findByIdAndUpdate(batchId, updates, { new: true }).lean();
  }

  async delete(batchId: string): Promise<boolean> {
    const res = await ProductBatchModel.findByIdAndDelete(batchId);
    return res !== null;
  }

  // returns batches with product name/unit information similar to previous SQL join
  async findAllPlans(): Promise<any[]> {
    return ProductBatchModel.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product_info'
        }
      },
      { $unwind: { path: '$product_info', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          batch_id: '$_id',
          batch_code: 1,
          product_id: '$product_info._id',
          product_is_active: '$product_info.is_active',
          status: 1,
          planned_quantity: 1,
          produced_quantity: 1,
          production_date: 1,
          expired_date: 1,
          created_at: 1,
          product_name: '$product_info.product_name',
          unit: '$product_info.unit'
        }
      },
      { $sort: { created_at: -1 } }
    ]);
  }
}

export default new ProductBatchRepository();
