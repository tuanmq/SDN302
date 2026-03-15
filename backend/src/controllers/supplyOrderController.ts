import { Request, Response } from 'express';
import supplyOrderService from '../services/supplyOrderService';
import { SupplyOrderCreateDto } from '../models/SupplyOrder';

interface AuthRequest extends Request {
  // user attached by jwtMiddleware, fields may be strings
  user?: any;
}

/** Chuẩn hóa order từ Mongoose (populate store, created_by, items.product) sang format API cho FE */
function mapOrderForResponse(order: any): any {
  if (!order) return order;
  const storeObj = order.store;
  const storeId = storeObj && typeof storeObj === 'object'
    ? (storeObj._id ?? storeObj)?.toString?.() ?? ''
    : (order.store_id ?? (order.store?.toString?.() ?? order.store ?? ''));
  const storeName = storeObj && typeof storeObj === 'object' && (storeObj.store_name != null)
    ? storeObj.store_name
    : (order.store_name ?? '');

  const createdByObj = order.created_by;
  const createdById = createdByObj && typeof createdByObj === 'object'
    ? (createdByObj._id ?? createdByObj)?.toString?.() ?? ''
    : (order.created_by?.toString?.() ?? order.created_by ?? '');
  const createdByUsername = createdByObj && typeof createdByObj === 'object' && (createdByObj.username != null)
    ? createdByObj.username
    : (order.created_by_username ?? '');

  const items = Array.isArray(order.items) ? order.items.map((item: any) => {
    const productObj = item.product;
    const productId = productObj && typeof productObj === 'object'
      ? (productObj._id ?? productObj)?.toString?.() ?? ''
      : (item.product_id ?? (item.product?.toString?.() ?? item.product ?? ''));
    const productName = productObj && typeof productObj === 'object' ? (productObj.product_name ?? '') : (item.product_name ?? '');
    const productCode = productObj && typeof productObj === 'object' ? (productObj.product_code ?? '') : (item.product_code ?? '');
    const unit = productObj && typeof productObj === 'object' ? (productObj.unit ?? '') : (item.unit ?? '');
    return {
      ...item,
      supply_order_item_id: item.supply_order_item_id ?? item._id?.toString?.() ?? item._id,
      product_id: productId,
      product_name: productName,
      product_code: productCode,
      unit,
    };
  }) : (order.items ?? []);

  return {
    ...order,
    store_id: storeId,
    store_name: storeName,
    created_by: createdById,
    created_by_username: createdByUsername,
    items,
  };
}

/** Parse query params from, to (YYYY-MM-DD) for date filter */
function parseDateRange(req: Request): { from?: Date; to?: Date } {
  const fromStr = req.query.from as string | undefined;
  const toStr = req.query.to as string | undefined;
  let from: Date | undefined;
  let to: Date | undefined;
  if (fromStr) {
    from = new Date(fromStr);
    if (Number.isNaN(from.getTime())) from = undefined;
  }
  if (toStr) {
    to = new Date(toStr);
    if (Number.isNaN(to.getTime())) to = undefined;
  }
  return { from, to };
}

export class SupplyOrderController {
  createSupplyOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (user.role_id === 1) {
        res.status(403).json({
          success: false,
          message: 'Admin cannot create supply orders (read-only access)',
        });
        return;
      }

      if (!user.store_id) {
        res.status(403).json({
          success: false,
          message: 'User must be assigned to a store to create supply orders',
        });
        return;
      }

      const orderData: SupplyOrderCreateDto = req.body;

      if (!orderData || typeof orderData !== 'object') {
        res.status(400).json({
          success: false,
          message: 'Invalid request body',
        });
        return;
      }
      if (!orderData.supply_order_code || !String(orderData.supply_order_code).trim()) {
        res.status(400).json({
          success: false,
          message: 'Supply order code is required',
        });
        return;
      }
      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Supply order must have at least one item',
        });
        return;
      }

      const supplyOrder = await supplyOrderService.createSupplyOrder(
        user.store_id as string,
        user.user_id as string,
        orderData
      );

      res.status(201).json({
        success: true,
        data: mapOrderForResponse(supplyOrder),
        message: 'Supply order created successfully',
      });
    } catch (error: any) {
      console.error('Create supply order error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create supply order',
      });
    }
  };

  getSupplyOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const orderId = (req.params.id as string)?.trim?.();

      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const order = await supplyOrderService.getSupplyOrderById(orderId);

      // order.store may be populated { _id, store_name } so use store._id when store_id not set
      const orderStoreId = String(order.store_id ?? order.store?._id ?? '').trim();
      const userStoreId = String(user.store_id ?? '').trim();
      if (user.role_id === 3 && orderStoreId !== userStoreId) {
        res.status(403).json({
          success: false,
          message: 'You can only view orders from your store',
        });
        return;
      }

      const raw = { ...order, supply_order_id: order.supply_order_id ?? order._id?.toString?.() ?? order._id };
      const data = mapOrderForResponse(raw);
      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Get supply order error:', error);
      if (error.message === 'Supply order not found') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  getAllSupplyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { from, to } = parseDateRange(req);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      let orders;
      if (user.role_id === 1) {
        orders = await supplyOrderService.getAllSupplyOrders(from, to);
      } else if (user.role_id === 3 && user.store_id) {
        orders = await supplyOrderService.getSupplyOrdersByStore(user.store_id.toString(), from, to);
      } else {
        res.status(403).json({
          success: false,
          message: 'Access denied or user not assigned to a store',
        });
        return;
      }

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error('Get all supply orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  getAllSupplyOrdersCentral = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { from, to } = parseDateRange(req);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (user.role_id === 1 || user.role_id === 2) {
        const orders = await supplyOrderService.getAllSupplyOrders(from, to);
        const data = Array.isArray(orders)
          ? orders.map((o: any) => mapOrderForResponse({ ...o, supply_order_id: o.supply_order_id ?? o._id?.toString?.() ?? o._id }))
          : orders;
        res.json({
          success: true,
          data,
        });
      } else {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
    } catch (error) {
      console.error('Get all supply orders central error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  getSupplyOrdersByStore = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { from, to } = parseDateRange(req);

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      const storeId = req.params.storeId as string;
      if (!storeId) {
        res.status(400).json({
          success: false,
          message: 'Invalid store ID',
        });
        return;
      }

      if (user.role_id !== 1) {
        res.status(403).json({
          success: false,
          message: 'Only admin can view orders from specific stores',
        });
        return;
      }

      const orders = await supplyOrderService.getSupplyOrdersByStore(storeId, from, to);
      const data = Array.isArray(orders) ? orders.map((o: any) => mapOrderForResponse({ ...o, supply_order_id: o.supply_order_id ?? o._id?.toString?.() ?? o._id })) : orders;

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Get supply orders by store error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  reviewSupplyOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (user.role_id !== 2) {
        res.status(403).json({
          success: false,
          message: 'Only Central Staff can review supply orders',
        });
        return;
      }

      const orderId = (req.params.id as string)?.trim?.();
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Items array is required',
        });
        return;
      }

      const order = await supplyOrderService.reviewSupplyOrder(orderId, items);

      res.json({
        success: true,
        data: mapOrderForResponse(order),
        message: 'Supply order reviewed successfully',
      });
    } catch (error: any) {
      console.error('Review supply order error:', error);
      const statusCode = error.message.includes('not found') ? 404 :
                         error.message.includes('Only Central Staff') ? 403 :
                         error.message.includes('SUBMITTED') ? 400 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to review supply order',
      });
    }
  };

  startDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (user.role_id !== 2) {
        res.status(403).json({
          success: false,
          message: 'Only Central Staff can start delivery',
        });
        return;
      }

      const orderId = (req.params.id as string)?.trim?.();
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const order = await supplyOrderService.startDelivery(orderId);

      res.json({
        success: true,
        data: mapOrderForResponse(order),
        message: 'Delivery started successfully',
      });
    } catch (error: any) {
      console.error('Start delivery error:', error);
      const statusCode = error.message.includes('not found') ? 404 :
                         error.message.includes('Only Central Staff') ? 403 :
                         error.message.includes('APPROVED') ? 400 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to start delivery',
      });
    }
  };

  confirmReceived = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (user.role_id !== 3) {
        res.status(403).json({
          success: false,
          message: 'Only Store Staff can confirm received',
        });
        return;
      }

      const orderId = (req.params.id as string)?.trim?.();
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const { batches } = req.body;
      if (!batches || !Array.isArray(batches) || batches.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Batches array with receipted quantities is required',
        });
        return;
      }

      const order = await supplyOrderService.confirmReceived(orderId, batches);

      res.json({
        success: true,
        data: mapOrderForResponse(order),
        message: 'Order confirmed as received successfully',
      });
    } catch (error: any) {
      console.error('Confirm received error:', error);
      const statusCode = error.message.includes('not found') ? 404 :
                         error.message.includes('Only Store Staff') ? 403 :
                         error.message.includes('DELIVERING') ? 400 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to confirm received',
      });
    }
  };

  stockSupplyOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (user.role_id !== 3) {
        res.status(403).json({
          success: false,
          message: 'Only Store Staff can stock orders',
        });
        return;
      }

      const orderId = (req.params.id as string)?.trim?.();
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const { batches } = req.body;
      if (!batches || !Array.isArray(batches) || batches.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Batches array with stocked quantities is required',
        });
        return;
      }

      const order = await supplyOrderService.stockSupplyOrder(orderId, batches);

      res.json({
        success: true,
        data: mapOrderForResponse(order),
        message: 'Order stocked successfully',
      });
    } catch (error: any) {
      console.error('Stock order error:', error);
      const statusCode = error.message.includes('not found') ? 404 :
                         error.message.includes('Only Store Staff') ? 403 :
                         error.message.includes('RECEIPTED') ? 400 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to stock order',
      });
    }
  };

  cancelSupplyOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      if (user.role_id !== 2 && user.role_id !== 3) {
        res.status(403).json({
          success: false,
          message: 'Only Central Staff or Store Staff can cancel orders',
        });
        return;
      }

      const orderId = (req.params.id as string)?.trim?.();
      if (!orderId || orderId === 'undefined' || orderId === 'null') {
        res.status(400).json({
          success: false,
          message: 'Invalid order ID',
        });
        return;
      }

      const order = await supplyOrderService.cancelSupplyOrder(orderId);

      res.json({
        success: true,
        data: mapOrderForResponse(order),
        message: 'Supply order cancelled successfully',
      });
    } catch (error: any) {
      console.error('Cancel order error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to cancel order',
      });
    }
  };
}

export default new SupplyOrderController();
