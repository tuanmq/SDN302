export type BatchStatus = 'PLANNED' | 'PRODUCED' | 'STOCKED' | 'CANCELLED';

export interface ProductBatch {
  batch_id: string;
  batch_code: string;
  product_id: string;
  production_date?: string | null;
  expired_date?: string | null;
  status: BatchStatus;
  planned_quantity: number;
  produced_quantity?: number | null;
  created_at?: string;
}

export interface ProductBatchWithDetails {
  batch_id: string;
  batch_code: string;
  product_id: string;
  product_code?: string;
  product_name: string;
  product_is_active?: boolean;
  unit: string;
  production_date?: string | null;
  expired_date?: string | null;
  status: BatchStatus;
  planned_quantity: number;
  produced_quantity?: number | null;
  inventory_id?: string;
  inventory_quantity?: number;
  inventory_status?: string;
  inventory_disposed_reason?: string;
  created_at: string;
}

export interface ProductBatchCreateRequest {
  batch_code: string;
  product_id: string | number;  // string for MongoDB _id
  planned_quantity: number;
}

export interface BatchPlansCreateRequest {
  batches: ProductBatchCreateRequest[];
}

export interface ProduceBatchRequest {
  produced_quantity: number;
  production_date: string;
  expired_date: string;
}

export interface StockBatchRequest {
  stocked_quantity: number;
}

export interface DisposeBatchRequest {
  disposed_reason: 'EXPIRED' | 'WRONG_DATA' | 'DEFECTIVE';
}
