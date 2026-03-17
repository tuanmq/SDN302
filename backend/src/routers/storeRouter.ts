import { Router } from 'express';
import { StoreController } from '../controllers/storeController';
import { jwtMiddleware } from '../middlewares/jwtMiddleware';
import { requireRole } from '../middlewares/authMiddleware';

const router = Router();
const storeController = new StoreController();

router.use(jwtMiddleware);

// Admin-only routes
router.get('/', requireRole('1'), storeController.getAllStores);
router.post('/', requireRole('1'), storeController.createStore);
router.put('/:id', requireRole('1'), storeController.updateStore);
router.patch('/:id/status', requireRole('1'), storeController.toggleStoreStatus);
router.delete('/:id', requireRole('1'), storeController.deleteStore);

// View single store: allow Admin, Central Staff, Store Staff
router.get('/:id', requireRole('1', '2', '3'), storeController.getStoreById);

export default router;
