/** Action derived from created_by/created_at tables (e.g. CREATE when record was created) */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';

export interface AuditLog {
  audit_log_id: string;
  user_id: string | null;
  username: string;
  action: AuditAction;
  resource: string;
  resource_id?: string;
  details: string;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogStats {
  total: number;
  today: number;
  thisWeek: number;
  critical: number;
}

export interface AuditLogListParams {
  action?: string;
  user_id?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}
