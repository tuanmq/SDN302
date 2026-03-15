import inventoryRepository from '../repositories/inventoryRepository';
import { ProductBatchWithDetails } from '../models/ProductBatch';
import { StoreModel } from '../models/Store';

export class InventoryService {
  async getInventoryByStore(storeId: string): Promise<ProductBatchWithDetails[]> {
    await inventoryRepository.updateExpiredStatuses();
    return await inventoryRepository.findAllWithDetails(storeId);
  }

  /** Inventory for the store named "Central Kitchen" (used by Central Kitchen Inventory page). */
  async getCentralKitchenInventory(): Promise<ProductBatchWithDetails[]> {
    const central = await StoreModel.findOne({ store_name: 'Central Kitchen' }).lean();
    if (!central) return [];
    await inventoryRepository.updateExpiredStatuses();
    return await inventoryRepository.findAllWithDetails(central._id.toString());
  }

  async disposeInventory(inventoryId: string, disposedReason: string): Promise<void> {
    const inventory = await inventoryRepository.findById(inventoryId);
    if (!inventory) {
      throw new Error('Inventory not found');
    }
    if (inventory.status === 'DISPOSED') {
      throw new Error('Inventory is already disposed');
    }
    const validReasons = ['EXPIRED', 'WRONG_DATA', 'DEFECTIVE'];
    if (!validReasons.includes(disposedReason)) {
      throw new Error('Invalid disposed reason');
    }
    let finalReason = disposedReason;
    if (inventory.status === 'EXPIRED') {
      finalReason = 'EXPIRED';
    }
    await inventoryRepository.updateStatus(inventoryId, 'DISPOSED', finalReason);
  }

  async updateAllInventoryStatuses(): Promise<void> {
    await inventoryRepository.updateExpiredStatuses();
  }
}

export default new InventoryService();
