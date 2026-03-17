import auditLogRepository from '../repositories/auditLogRepository';
import { AuditLogCreateDto } from '../models/AuditLog';
import { SupplyOrderModel } from '../models/SupplyOrder';

export class AuditLogService {
  async createLog(dto: AuditLogCreateDto): Promise<void> {
    await auditLogRepository.create(dto);
  }

  /**
   * Get activity log from tables that have created_by and created_at (e.g. SupplyOrder).
   * Returns unified list: user, action, resource, details, created_at.
   */
  async getLogs(params: {
    action?: string;
    user_id?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const from = params.from ? new Date(params.from) : undefined;
    let to: Date | undefined;
    if (params.to) {
      to = new Date(params.to);
      to.setUTCHours(23, 59, 59, 999);
    }

    const result = await auditLogRepository.getActivityFromCreatedByTables({
      user_id: params.user_id,
      from,
      to,
      search: params.search,
      page: params.page,
      limit: params.limit,
    });

    const logs = result.logs.map((log) => ({
      audit_log_id: `${log.resource}_${log.resource_id}_${log.created_at?.toISOString?.() ?? ''}`,
      user_id: log.user_id,
      username: log.username,
      action: log.action,
      resource: log.resource,
      resource_id: log.resource_id,
      details: log.details,
      ip_address: null,
      created_at: log.created_at,
    }));

    return { logs, total: result.total };
  }

  /** Stats based on activity from created_by/created_at tables (e.g. SupplyOrder count). */
  async getStats(): Promise<{ total: number; today: number; thisWeek: number; critical: number }> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [total, today, thisWeek] = await Promise.all([
      SupplyOrderModel.countDocuments(),
      SupplyOrderModel.countDocuments({ created_at: { $gte: startOfToday } }),
      SupplyOrderModel.countDocuments({ created_at: { $gte: startOfWeek } }),
    ]);

    return { total, today, thisWeek, critical: 0 };
  }
}

export default new AuditLogService();
