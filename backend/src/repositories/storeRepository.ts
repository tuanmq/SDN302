import { StoreModel, IStore } from '../models/Store';

export class StoreRepository {
  async findAll(params?: { search?: string; is_active?: boolean }): Promise<IStore[]> {
    const filter: any = {};
    if (params?.search) {
      const regex = new RegExp(params.search, 'i');
      filter.$or = [
        { store_code: regex },
        { store_name: regex },
        { store_address: regex }
      ];
    }
    if (params?.is_active !== undefined) {
      filter.is_active = params.is_active;
    }
    return StoreModel.find(filter).sort({ created_at: -1 }).lean();
  }

  async findById(storeId: string): Promise<IStore | null> {
    return StoreModel.findById(storeId).lean();
  }

  async findByName(storeName: string): Promise<IStore | null> {
    return StoreModel.findOne({ store_name: storeName }).lean();
  }

  async findByStoreCode(storeCode: string): Promise<IStore | null> {
    return StoreModel.findOne({ store_code: storeCode }).lean();
  }

  async create(storeData: Partial<IStore>): Promise<IStore> {
    const store = new StoreModel(storeData);
    await store.save();
    return store.toObject();
  }

  async update(storeId: string, storeData: Partial<IStore>): Promise<IStore | null> {
    const updated = await StoreModel.findByIdAndUpdate(storeId, storeData, { new: true }).lean();
    return updated;
  }

  async updateStatus(storeId: string, is_active: boolean): Promise<IStore | null> {
    const updated = await StoreModel.findByIdAndUpdate(storeId, { is_active }, { new: true }).lean();
    return updated;
  }

  async delete(storeId: string): Promise<boolean> {
    const res = await StoreModel.findByIdAndDelete(storeId);
    return res !== null;
  }

  async hasUsers(storeId: string): Promise<boolean> {
    // check whether any user references this store
    const { UserModel } = await import('../models/User');
    const count = await UserModel.countDocuments({ store_id: storeId });
    return count > 0;
  }
}
