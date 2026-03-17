import mongoose from 'mongoose';
import { AuditLogModel, IAuditLog, AuditLogCreateDto } from '../models/AuditLog';
import { SupplyOrderModel } from '../models/SupplyOrder';

/** Single activity record from any table that has created_by + created_at */
export interface ActivityLogEntry {
  created_at: Date;
  user_id: string | null;
  username: string;
  action: string;
  resource: string;
  resource_id: string;
  details: string;
}

export class AuditLogRepository {
  /**
   * Get activity history from all tables that have created_by and created_at.
   * Currently: SupplyOrder. Easy to extend with more models later.
   */
  async getActivityFromCreatedByTables(options: {
    user_id?: string;
    from?: Date;
    to?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: ActivityLogEntry[]; total: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const supplyOrderFilter: Record<string, unknown> = {};
    if (options.user_id) {
      try {
        supplyOrderFilter.created_by = new mongoose.Types.ObjectId(options.user_id);
      } catch {
        return { logs: [], total: 0 };
      }
    }
    if (options.from || options.to) {
      supplyOrderFilter.created_at = {} as Record<string, Date>;
      if (options.from) (supplyOrderFilter.created_at as Record<string, Date>).$gte = options.from;
      if (options.to) (supplyOrderFilter.created_at as Record<string, Date>).$lte = options.to;
    }
    if (options.search && options.search.trim()) {
      const term = (options.search.trim() as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      supplyOrderFilter.supply_order_code = { $regex: term, $options: 'i' };
    }

    const [orders, total] = await Promise.all([
      SupplyOrderModel.find(supplyOrderFilter)
        .populate('created_by', 'username')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupplyOrderModel.countDocuments(supplyOrderFilter),
    ]);

    const logs: ActivityLogEntry[] = (orders as any[]).map((order) => {
      const createdBy = order.created_by;
      const username = createdBy?.username ?? (typeof createdBy === 'string' ? createdBy : '—');
      const userId = createdBy?._id?.toString?.() ?? createdBy?.toString?.() ?? null;
      return {
        created_at: order.created_at,
        user_id: userId,
        username: typeof username === 'string' ? username : '—',
        action: 'CREATE',
        resource: 'SupplyOrder',
        resource_id: order._id?.toString?.() ?? '',
        details: order.supply_order_code ?? '',
      };
    });

    return { logs, total };
  }

  async create(dto: AuditLogCreateDto): Promise<IAuditLog> {
    const doc = new AuditLogModel({
      user_id: dto.user_id ? new mongoose.Types.ObjectId(dto.user_id) : null,
      username: dto.username,
      action: dto.action,
      resource: dto.resource,
      details: dto.details ?? '',
      ip_address: dto.ip_address ?? null,
    });
    await doc.save();
    return doc.toObject();
  }

  async findMany(options: {
    action?: string;
    user_id?: string;
    from?: Date;
    to?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: IAuditLog[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (options.action) filter.action = options.action;
    if (options.user_id) {
      try {
        filter.user_id = new mongoose.Types.ObjectId(options.user_id);
      } catch {
        // invalid ObjectId – return no results
        return { logs: [], total: 0 };
      }
    }

    if (options.from || options.to) {
      filter.created_at = {} as Record<string, Date>;
      if (options.from) (filter.created_at as Record<string, Date>).$gte = options.from;
      if (options.to) {
        const end = new Date(options.to);
        end.setUTCHours(23, 59, 59, 999);
        (filter.created_at as Record<string, Date>).$lte = end;
      }
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      filter.$or = [
        { username: { $regex: term, $options: 'i' } },
        { resource: { $regex: term, $options: 'i' } },
        { details: { $regex: term, $options: 'i' } },
      ];
    }

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLogModel.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
      AuditLogModel.countDocuments(filter),
    ]);

    return { logs, total };
  }

  async countAll(): Promise<number> {
    return AuditLogModel.countDocuments();
  }

  async countByAction(action: string): Promise<number> {
    return AuditLogModel.countDocuments({ action });
  }

  async countSince(date: Date): Promise<number> {
    return AuditLogModel.countDocuments({ created_at: { $gte: date } });
  }
}

export default new AuditLogRepository();
