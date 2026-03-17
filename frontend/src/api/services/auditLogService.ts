import api from '../axiosConfig';
import type { AuditLog, AuditLogStats, AuditLogListParams } from '../types/auditLog';
import type { ApiResponse } from '../types';

export const auditLogService = {
  getLogs: async (params?: AuditLogListParams): Promise<{ data: AuditLog[]; total: number }> => {
    const response = await api.get<{ success: boolean; data: AuditLog[]; total: number }>('/audit-logs', { params });
    return { data: response.data.data ?? [], total: response.data.total ?? 0 };
  },

  getStats: async (): Promise<AuditLogStats> => {
    const response = await api.get<ApiResponse<AuditLogStats>>('/audit-logs/stats');
    return response.data.data ?? { total: 0, today: 0, thisWeek: 0, critical: 0 };
  },
};
