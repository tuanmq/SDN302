import api from '../axiosConfig';
import { 
  ProductBatchWithDetails,
  DisposeInventoryRequest,
  ApiResponse 
} from '../types';

export interface InventoryByStoreResponse {
  batches: ProductBatchWithDetails[];
  store_name: string | null;
}

export const inventoryService = {
  getInventoryByStore: async (storeId: string): Promise<InventoryByStoreResponse> => {
    const response = await api.get<ApiResponse<ProductBatchWithDetails[]> & { store_name?: string | null }>(`/inventory/store/${storeId}`);
    return {
      batches: response.data.data,
      store_name: response.data.store_name ?? null,
    };
  },

  getCentralKitchenInventory: async (): Promise<ProductBatchWithDetails[]> => {
    const response = await api.get<ApiResponse<ProductBatchWithDetails[]>>('/inventory/central');
    return response.data.data;
  },

  disposeInventory: async (inventoryId: string, disposeData: DisposeInventoryRequest): Promise<void> => {
    await api.put(`/inventory/${inventoryId}/dispose`, disposeData);
  },

  updateStatuses: async (): Promise<void> => {
    await api.post('/inventory/update-statuses');
  },
};
