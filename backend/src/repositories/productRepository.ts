import { ProductModel, IProduct } from '../models/Product';

export class ProductRepository {
  private normalizeText(text: string): string {
    return text.trim().toUpperCase();
  }

  async findAll(): Promise<IProduct[]> {
    return ProductModel.find().sort({ created_at: -1 }).lean();
  }

  async findAllActive(): Promise<IProduct[]> {
    return ProductModel.find({ is_active: true }).sort({ created_at: -1 }).lean();
  }

  async findById(productId: string): Promise<IProduct | null> {
    return ProductModel.findById(productId).lean();
  }

  async findByProductCode(productCode: string): Promise<IProduct | null> {
    return ProductModel.findOne({ product_code: productCode }).lean();
  }

  async existsByNameAndUnit(productName: string, unit: string, excludeId?: string): Promise<boolean> {
    const normalizedName = this.normalizeText(productName);
    const normalizedUnit = this.normalizeText(unit);
    const filter: any = {
      product_name: normalizedName,
      unit: normalizedUnit
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    const count = await ProductModel.countDocuments(filter);
    return count > 0;
  }

  async create(productData: Partial<IProduct>): Promise<IProduct> {
    const normalizedName = this.normalizeText(productData.product_name as string);
    const normalizedUnit = this.normalizeText(productData.unit as string);
    const product = new ProductModel({
      ...productData,
      product_name: normalizedName,
      unit: normalizedUnit
    });
    await product.save();
    return product.toObject();
  }

  async update(productId: string, productData: Partial<IProduct>): Promise<IProduct | null> {
    const updates: any = {};
    if (productData.product_name !== undefined) {
      updates.product_name = this.normalizeText(productData.product_name as string);
    }
    if (productData.unit !== undefined) {
      updates.unit = this.normalizeText(productData.unit as string);
    }
    if (Object.keys(updates).length === 0) {
      return this.findById(productId);
    }
    updates.updated_at = new Date();
    return ProductModel.findByIdAndUpdate(productId, updates, { new: true }).lean();
  }

  async toggleActive(productId: string): Promise<IProduct | null> {
    const product = await ProductModel.findById(productId);
    if (!product) return null;
    product.is_active = !product.is_active;
    await product.save();
    return product.toObject();
  }

  async search(searchTerm: string): Promise<IProduct[]> {
    const regex = new RegExp(this.normalizeText(searchTerm), 'i');
    return ProductModel.find({
      $or: [
        { product_name: regex },
        { unit: regex }
      ]
    })
      .sort({ created_at: -1 })
      .lean();
  }
}

export default new ProductRepository();
