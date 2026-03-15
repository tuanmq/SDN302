import api from '../axiosConfig';
import { 
  ProductBatchWithDetails,
  DisposeInventoryRequest,
  ApiResponse 
} from '../types';

export const inventoryService = {
  getInventoryByStore: async (storeId: string): Promise<ProductBatchWithDetails[]> => {
    const response = await api.get<ApiResponse<ProductBatchWithDetails[]>>(`/inventory/store/${storeId}`);
    return response.data.data;
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
