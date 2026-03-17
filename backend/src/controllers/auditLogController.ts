import { Request, Response } from 'express';
import auditLogService from '../services/auditLogService';

export class AuditLogController {
  getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const action = req.query.action as string | undefined;
      const user_id = req.query.user_id as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const search = req.query.search as string | undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

      const result = await auditLogService.getLogs({
        action,
        user_id,
        from,
        to,
        search,
        page,
        limit,
      });

      res.json({
        success: true,
        data: result.logs,
        total: result.total,
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  getStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = await auditLogService.getStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get audit stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}

export default new AuditLogController();
