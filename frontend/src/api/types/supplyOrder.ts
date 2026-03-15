export type SupplyOrderStatus = 
  | 'SUBMITTED' 
  | 'APPROVED' 
  | 'PARTLY_APPROVED' 
  | 'REJECTED' 
  | 'DELIVERING' 
  | 'RECEIPTED'
  | 'STOCKED'
  | 'CANCELLED';

export type SupplyOrderItemStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'PARTLY_APPROVED'
  | 'REJECTED';

export interface SupplyOrderItemBatch {
  item_batch_id: string;
  supply_order_item_id: string;
  batch_id: string;
  inventory_id: string;
  quantity: number; 
  receipted_quantity: number | null;
  stocked_quantity: number | null;
  created_at: string;
  batch_code?: string;
  product_name?: string;
}

export interface SupplyOrderItem {
  supply_order_item_id: string;
  supply_order_id: string;
  product_id: string;
  requested_quantity: number;
  approved_quantity: number | null;
  status: SupplyOrderItemStatus;
  product_code?: string;
  product_name?: string;
  unit?: string;
  available_quantity?: number;
  batches?: SupplyOrderItemBatch[];
}

export interface SupplyOrder {
  supply_order_id?: string;  // optional; MongoDB returns _id
  _id?: string;              // MongoDB document id
  supply_order_code: string;
  store_id: string;
  status: SupplyOrderStatus;
  created_at: string;
  created_by: string;
  store_name?: string;
  created_by_username?: string;
  items?: SupplyOrderItem[];
}

export interface SupplyOrderItemCreateRequest {
  product_id: string;
  requested_quantity: number;
}

export interface SupplyOrderCreateRequest {
  supply_order_code: string;
  items: SupplyOrderItemCreateRequest[];
}

export interface SupplyOrderDetailResponse extends SupplyOrder {
  items: SupplyOrderItem[];
  /** MongoDB: same as _id when supply_order_id not set */
  supply_order_id?: string;
}

export interface ReviewItemRequest {
  supply_order_item_id: string;
  action: 'APPROVE' | 'PARTLY_APPROVE' | 'REJECT';
  approved_quantity?: number;
}

export interface ReviewSupplyOrderRequest {
  items: ReviewItemRequest[];
}

export interface ConfirmReceivedBatchRequest {
  item_batch_id: string;
  receipted_quantity: number;
}

export interface ConfirmReceivedRequest {
  batches: ConfirmReceivedBatchRequest[];
}

export interface StockBatchRequest {
  item_batch_id: string;
  stocked_quantity: number;
}

export interface StockSupplyOrderRequest {
  batches: StockBatchRequest[];
}
