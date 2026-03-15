import productBatchRepository from '../repositories/productBatchRepository';
import inventoryRepository from '../repositories/inventoryRepository';
import { StoreModel } from '../models/Store';
import { ProductBatchCreateDto, ProductBatchWithDetails, IProductBatch } from '../models/ProductBatch';

export class ProductBatchService {
  async getAllBatchesWithDetails(storeId: string = ''): Promise<ProductBatchWithDetails[]> {
    await inventoryRepository.updateExpiredStatuses();
    return await inventoryRepository.findAllWithDetails(storeId);
  }

  async getBatchesByStore(storeId: string): Promise<ProductBatchWithDetails[]> {
    await inventoryRepository.updateExpiredStatuses();
    return await inventoryRepository.findAllWithDetails(storeId);
  }

  async createBatchPlans(batchesData: ProductBatchCreateDto[]): Promise<IProductBatch[]> {
    const batchCodes = batchesData.map(b => b.batch_code.toUpperCase());
    const duplicates = batchCodes.filter((code, index) => batchCodes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate batch codes in request: ${duplicates.join(', ')}`);
    }

    for (const batchData of batchesData) {
      await this.validateBatchPlan(batchData);
    }

    const createdBatches: IProductBatch[] = [];

    for (const batchData of batchesData) {
      const batch = await productBatchRepository.create(batchData as any);
      createdBatches.push(batch);
    }

    return createdBatches;
  }

  async produceBatch(batchId: string, producedQuantity: number, productionDate: Date, expiredDate: Date): Promise<IProductBatch> {
    const batch = await productBatchRepository.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'PLANNED') {
      throw new Error('Only PLANNED batches can be produced');
    }

    if (producedQuantity <= 0 || producedQuantity > batch.planned_quantity!) {
      throw new Error(`Produced quantity must be between 1 and ${batch.planned_quantity}`);
    }

    const prodDate = new Date(productionDate);
    const expDate = new Date(expiredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    prodDate.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);

    if (prodDate > today) {
      throw new Error('Production date cannot be in the future');
    }

    if (expDate <= today) {
      throw new Error('Expired date must be after today');
    }

    if (expDate <= prodDate) {
      throw new Error('Expired date must be after production date');
    }

    const updatedBatch = await productBatchRepository.update(batchId, {
      produced_quantity: producedQuantity,
      production_date: productionDate,
      expired_date: expiredDate,
      status: 'PRODUCED'
    } as any);

    if (!updatedBatch) {
      throw new Error('Failed to update batch');
    }

    return updatedBatch;
  }

  async stockBatch(batchId: string, stockedQuantity: number): Promise<IProductBatch> {
    const batch = await productBatchRepository.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'PRODUCED') {
      throw new Error('Only PRODUCED batches can be stocked');
    }

    if (!batch.produced_quantity || stockedQuantity <= 0 || stockedQuantity > batch.produced_quantity) {
      throw new Error(`Stocked quantity must be between 1 and ${batch.produced_quantity}`);
    }

    const centralStore = await StoreModel.findOne({ store_name: 'Central Kitchen' }).lean();
    if (!centralStore) {
      throw new Error('Central Kitchen store not found. Please create it first.');
    }
    const centralStoreId = centralStore._id.toString();
    const existingInventory = await inventoryRepository.findByStoreAndBatch(centralStoreId, batchId);
    if (existingInventory) {
      throw new Error('Batch has already been stocked');
    }

    await inventoryRepository.create({
      store: centralStore._id,
      batch: batchId,
      quantity: stockedQuantity
    } as any);

    const updatedBatch = await productBatchRepository.update(batchId, {
      status: 'STOCKED'
    } as any);

    if (!updatedBatch) {
      throw new Error('Failed to update batch');
    }

    return updatedBatch;
  }

  async cancelBatch(batchId: string): Promise<IProductBatch> {
    const batch = await productBatchRepository.findById(batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }

    if (batch.status !== 'PLANNED' && batch.status !== 'PRODUCED') {
      throw new Error('Only PLANNED or PRODUCED batches can be cancelled');
    }

    const updatedBatch = await productBatchRepository.update(batchId, {
      status: 'CANCELLED'
    } as any);

    if (!updatedBatch) {
      throw new Error('Failed to update batch');
    }

    return updatedBatch;
  }

  async getAllBatchPlans(): Promise<any[]> {
    // use mongoose aggregation instead of raw SQL
    return productBatchRepository.findAllPlans ? await productBatchRepository.findAllPlans() : [];
  }

  private async validateBatchPlan(batchData: ProductBatchCreateDto): Promise<void> {
    if (!batchData.batch_code) {
      throw new Error('Batch code is required');
    }

    const batchCodeRegex = /^BATCH-\d{6}-[A-Z0-9]{3}$/;
    const upperBatchCode = batchData.batch_code.toUpperCase();

    if (!batchCodeRegex.test(upperBatchCode)) {
      throw new Error('Batch code must follow format: BATCH-YYYYMM-XXX');
    }

    batchData.batch_code = upperBatchCode;

    const existingBatch = await productBatchRepository.findByBatchCode(upperBatchCode);
    if (existingBatch) {
      throw new Error(`Batch code ${upperBatchCode} already exists`);
    }

    if (!batchData.planned_quantity || batchData.planned_quantity <= 0) {
      throw new Error('Planned quantity must be greater than 0');
    }

    if (!Number.isInteger(batchData.planned_quantity)) {
      throw new Error('Planned quantity must be an integer');
    }
  }

  private async validateBatch(batchData: ProductBatchCreateDto): Promise<void> {
    if (!batchData.batch_code) {
      throw new Error('Batch code is required');
    }

    const batchCodeRegex = /^BATCH-\d{6}-[A-Z0-9]{3}$/;
    const upperBatchCode = batchData.batch_code.toUpperCase();

    if (!batchCodeRegex.test(upperBatchCode)) {
      throw new Error('Batch code must follow format: BATCH-YYYYMM-XXX');
    }

    batchData.batch_code = upperBatchCode;

    const existingBatch = await productBatchRepository.findByBatchCode(upperBatchCode);
    if (existingBatch) {
      throw new Error(`Batch code ${upperBatchCode} already exists`);
    }

    if (!batchData.planned_quantity || batchData.planned_quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (!Number.isInteger(batchData.planned_quantity)) {
      throw new Error('Quantity must be an integer');
    }
  }
}

export default new ProductBatchService();
