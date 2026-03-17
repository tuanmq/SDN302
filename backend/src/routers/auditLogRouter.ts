import { Router, Request, Response, NextFunction } from 'express';
import auditLogController from '../controllers/auditLogController';
import { jwtMiddleware } from '../middlewares/jwtMiddleware';
import { requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(jwtMiddleware);
router.use(requireRole('1'));

// More specific route first; wrap async handlers so errors are passed to next()
router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(auditLogController.getStats(req, res)).catch(next);
});
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(auditLogController.getLogs(req, res)).catch(next);
});

export default router;
