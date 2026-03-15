import api from '../axiosConfig';
import { 
  SupplyOrder,
  SupplyOrderCreateRequest,
  SupplyOrderDetailResponse,
  ReviewSupplyOrderRequest,
  ConfirmReceivedRequest,
  StockSupplyOrderRequest,
  ApiResponse 
} from '../types';

export const supplyOrderService = {
  getAllSupplyOrders: async (params?: { from?: string; to?: string }): Promise<SupplyOrder[]> => {
    const response = await api.get<ApiResponse<SupplyOrder[]>>('/supply-orders/store', { params });
    return response.data.data;
  },

  getSupplyOrderById: async (id: string): Promise<SupplyOrderDetailResponse> => {
    const response = await api.get<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}`);
    return response.data.data;
  },

  createSupplyOrder: async (orderData: SupplyOrderCreateRequest): Promise<SupplyOrder> => {
    const response = await api.post<ApiResponse<SupplyOrder>>('/supply-orders/store', orderData);
    return response.data.data;
  },

  getSupplyOrdersByStore: async (storeId: string, params?: { from?: string; to?: string }): Promise<SupplyOrder[]> => {
    const response = await api.get<ApiResponse<SupplyOrder[]>>(`/supply-orders/store/by-store/${storeId}`, { params });
    return response.data.data;
  },

  getAllSupplyOrdersCentral: async (params?: { from?: string; to?: string }): Promise<SupplyOrder[]> => {
    const response = await api.get<ApiResponse<SupplyOrder[]>>('/supply-orders/central', { params });
    return response.data.data;
  },

  getSupplyOrderByIdCentral: async (id: string): Promise<SupplyOrderDetailResponse> => {
    const response = await api.get<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}`);
    return response.data.data;
  },

  reviewSupplyOrder: async (id: string, data: ReviewSupplyOrderRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}/review`, data);
    return response.data.data;
  },

  startDelivery: async (id: string): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}/start-delivery`);
    return response.data.data;
  },

  confirmReceived: async (id: string, data: ConfirmReceivedRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}/confirm-received`, data);
    return response.data.data;
  },

  stockSupplyOrder: async (id: string, data: StockSupplyOrderRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}/stock`, data);
    return response.data.data;
  },

  cancelSupplyOrder: async (id: string): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}/cancel`);
    return response.data.data;
  },

  cancelSupplyOrderCentral: async (id: string): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}/cancel`);
    return response.data.data;
  },
};
