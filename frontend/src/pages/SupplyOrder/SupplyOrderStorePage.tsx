import { useState, useEffect } from 'react';
import { supplyOrderService } from '@/api/services/supplyOrderService';
import { productService } from '@/api/services/productService';
import { 
  SupplyOrder, 
  SupplyOrderCreateRequest, 
  Product,
  SupplyOrderDetailResponse
} from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { PlusIcon, TrashIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface OrderItem {
  product_id: string;
  requested_quantity: number;
  product_name?: string;
  unit?: string;
}

const SupplyOrderStorePage = () => {
  const { isAdmin, isStoreStaff } = useAuth();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplyOrderDetailResponse | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ product_id: '', requested_quantity: 1 }]);
  const [confirmingReceived, setConfirmingReceived] = useState<string | null>(null);
  const [supplyOrderCode, setSupplyOrderCode] = useState('');
  const [showConfirmReceivedModal, setShowConfirmReceivedModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [receiptedQuantities, setReceiptedQuantities] = useState<{ [key: string]: number }>({});
  const [stockedQuantities, setStockedQuantities] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await supplyOrderService.getAllSupplyOrders();
      setOrders(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load supply orders');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productService.getActiveProducts();
      console.log('Loaded products:', data); 
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError('Failed to load products');
    }
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: '', requested_quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: number | string) => {
    const newItems = [...orderItems];
    (newItems[index] as any)[field] = value;
    setOrderItems(newItems);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!supplyOrderCode || !supplyOrderCode.trim()) {
      setError('Supply order code is required');
      return;
    }

    const supplyOrderCodeRegex = /^SO-\d{6}-\d{4}$/;
    const upperSupplyOrderCode = supplyOrderCode.toUpperCase();

    if (!supplyOrderCodeRegex.test(upperSupplyOrderCode)) {
      setError('Supply order code must follow format: SO-YYYYMM-XXXX');
      return;
    }

    const validItems = orderItems.filter(item => String(item.product_id).trim() !== '' && item.requested_quantity > 0);
    
    if (validItems.length === 0) {
      setError('Please add at least one valid item');
      return;
    }

    const productIds = validItems.map(item => item.product_id);
    const uniqueProductIds = new Set(productIds);
    if (productIds.length !== uniqueProductIds.size) {
      setError('Cannot select the same product twice');
      return;
    }

    try {
      const requestData: SupplyOrderCreateRequest = {
        supply_order_code: upperSupplyOrderCode,
        items: validItems.map(item => ({
          product_id: String(item.product_id),
          requested_quantity: item.requested_quantity
        }))
      };

      await supplyOrderService.createSupplyOrder(requestData);
      setShowCreateModal(false);
      setOrderItems([{ product_id: '', requested_quantity: 1 }]);
      setSupplyOrderCode('');
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create supply order');
    }
  };

  const handleViewDetails = async (orderId: string) => {
    if (!orderId) return;
    try {
      const data = await supplyOrderService.getSupplyOrderById(orderId);
      setSelectedOrder(data);
      setShowDetailModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order details');
    }
  };

  const handleOpenConfirmReceivedModal = async (orderId: string) => {
    if (!orderId) return;
    try {
      const data = await supplyOrderService.getSupplyOrderById(orderId);
      setSelectedOrder(data);
      
      const initialQuantities: { [key: string]: number } = {};
      data.items.forEach(item => {
        if (item.batches && item.batches.length > 0) {
          item.batches.forEach(batch => {
            initialQuantities[String(batch.item_batch_id)] = batch.quantity;
          });
        }
      });
      setReceiptedQuantities(initialQuantities);
      setShowConfirmReceivedModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order details');
    }
  };

  const handleConfirmReceived = async () => {
    if (!selectedOrder) return;
    const orderId = getOrderId(selectedOrder);
    if (!orderId) return;

    try {
      setConfirmingReceived(orderId);
      setError('');
      
      const batches = Object.entries(receiptedQuantities).map(([batchId, quantity]) => ({
        item_batch_id: batchId,
        receipted_quantity: quantity
      }));

      await supplyOrderService.confirmReceived(orderId, { batches });
      setShowConfirmReceivedModal(false);
      setSelectedOrder(null);
      setReceiptedQuantities({});
      await loadOrders();
      alert('Order confirmed as received successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm received');
    } finally {
      setConfirmingReceived(null);
    }
  };

  const handleOpenStockModal = async (orderId: string) => {
    if (!orderId) return;
    try {
      const data = await supplyOrderService.getSupplyOrderById(orderId);
      
      const hasReceiptedBatches = data.items.some(item => 
        item.batches && item.batches.some(batch => 
          batch.receipted_quantity && batch.receipted_quantity > 0
        )
      );
      
      if (!hasReceiptedBatches) {
        setError('Cannot stock this order: No batches with receipted quantity > 0');
        alert('Cannot stock this order: No items were received (receipted quantity = 0)');
        return;
      }
      
      setSelectedOrder(data);
      
      const initialQuantities: { [key: string]: number } = {};
      data.items.forEach(item => {
        if (item.batches && item.batches.length > 0) {
          item.batches.forEach(batch => {
            if (batch.receipted_quantity && batch.receipted_quantity > 0) {
              initialQuantities[String(batch.item_batch_id)] = batch.receipted_quantity;
            }
          });
        }
      });
      setStockedQuantities(initialQuantities);
      setShowStockModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order details');
    }
  };

  const handleStock = async () => {
    if (!selectedOrder) return;
    const orderId = getOrderId(selectedOrder);
    if (!orderId) return;

    try {
      setError('');
      
      const batches = Object.entries(stockedQuantities).map(([batchId, quantity]) => ({
        item_batch_id: batchId,
        stocked_quantity: quantity
      }));

      await supplyOrderService.stockSupplyOrder(orderId, { batches });
      setShowStockModal(false);
      setSelectedOrder(null);
      setStockedQuantities({});
      await loadOrders();
      alert('Order stocked successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to stock order');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!orderId) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      setError('');
      await supplyOrderService.cancelSupplyOrder(orderId);
      await loadOrders();
      alert('Order cancelled successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'SUBMITTED':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'APPROVED':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'PARTLY_APPROVED':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'REJECTED':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'DELIVERING':
        return `${baseClass} bg-purple-100 text-purple-800`;
      case 'RECEIPTED':
        return `${baseClass} bg-indigo-100 text-indigo-800`;
      case 'STOCKED':
        return `${baseClass} bg-teal-100 text-teal-800`;
      case 'CANCELLED':
        return `${baseClass} bg-gray-100 text-gray-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'Submitted';
      case 'APPROVED': return 'Approved';
      case 'PARTLY_APPROVED': return 'Partly Approved';
      case 'REJECTED': return 'Rejected';
      case 'DELIVERING': return 'Delivering';
      case 'RECEIPTED': return 'Receipted';
      case 'STOCKED': return 'Stocked';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /** Order id from API: MongoDB returns _id, legacy may use supply_order_id */
  const getOrderId = (order: SupplyOrder | SupplyOrderDetailResponse): string =>
    String((order as any)._id ?? order.supply_order_id ?? '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Supply Order - Store</h1>
            <p className="text-gray-600 mt-1">
              {isAdmin ? 'View all store supply orders (Read-only)' : 'Manage your store supply orders'}
            </p>
          </div>
          {isStoreStaff && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Supply Order</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supply Order Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Store
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No supply orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const orderId = getOrderId(order);
                const storeName = order.store_name ?? (order as any).store?.store_name ?? `Store ${order.store_id ?? (order as any).store?._id ?? ''}`;
                const createdByUsername = order.created_by_username ?? (order as any).created_by?.username ?? `User ${order.created_by ?? (order as any).created_by?._id ?? ''}`;
                return (
                <tr key={orderId} className="hover:bg-gray-50">

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-700">
                    {order.supply_order_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {storeName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {createdByUsername}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(order.status)}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const orderHasInactiveProduct = order.items?.some((i: any) => i.product_is_active === false);
                        return (
                          <>
                            <button
                              onClick={() => handleViewDetails(orderId)}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                            >
                              <EyeIcon className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            {isStoreStaff && order.status === 'DELIVERING' && (
                              <button
                                onClick={() => !orderHasInactiveProduct && handleOpenConfirmReceivedModal(orderId)}
                                disabled={!!orderHasInactiveProduct}
                                className={orderHasInactiveProduct ? 'px-3 py-1 bg-gray-400 text-white rounded cursor-not-allowed text-xs font-semibold' : 'px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold'}
                                title={orderHasInactiveProduct ? 'Order contains inactive product(s). Cannot confirm received.' : undefined}
                              >
                                Confirm Received
                              </button>
                            )}
                            {isStoreStaff && order.status === 'RECEIPTED' && order.items && order.items.some(item => 
                              item.batches && item.batches.some(batch => batch.receipted_quantity && batch.receipted_quantity > 0)
                            ) && (
                              <button
                                onClick={() => !orderHasInactiveProduct && handleOpenStockModal(orderId)}
                                disabled={!!orderHasInactiveProduct}
                                className={orderHasInactiveProduct ? 'px-3 py-1 bg-gray-400 text-white rounded cursor-not-allowed text-xs font-semibold' : 'px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-semibold'}
                                title={orderHasInactiveProduct ? 'Order contains inactive product(s). Cannot stock.' : undefined}
                              >
                                Stock
                              </button>
                            )}
                          </>
                        );
                      })()}
                      {isStoreStaff && (order.status === 'APPROVED' || order.status === 'PARTLY_APPROVED') && (
                        <button
                          onClick={() => handleCancelOrder(orderId)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Create Supply Order</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setOrderItems([{ product_id: '', requested_quantity: 1 }]);
                  setSupplyOrderCode('');
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateOrder}>
              <div className="space-y-4">
                {/* Supply Order Code Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supply Order Code *
                  </label>
                  <input
                    type="text"
                    value={supplyOrderCode}
                    onChange={(e) => setSupplyOrderCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="SO-YYYYMM-XXXX (e.g., SO-202602-0001)"
                    maxLength={15}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: SO-YYYYMM-XXXX (auto uppercase)</p>
                </div>

                <p className="text-sm text-gray-600">Available products: {products.length}</p>
                {orderItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product
                      </label>
                      <select
                        value={item.product_id ?? ''}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => {
                          const id = (product as any)._id ?? product.product_id;
                          return (
                            <option key={id} value={String(id)}>
                              {product.product_code} - {product.product_name} ({product.unit})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.requested_quantity}
                        onChange={(e) => handleItemChange(index, 'requested_quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="mt-6 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Another Item</span>
              </button>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setOrderItems([{ product_id: '', requested_quantity: 1 }]);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Supply Order Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Order ID</p>
                <p className="text-lg font-semibold">#{getOrderId(selectedOrder).slice(-6)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Supply Order Code</p>
                <p className="text-lg font-bold text-indigo-700">{selectedOrder.supply_order_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={getStatusBadgeClass(selectedOrder.status)}>
                  {getStatusText(selectedOrder.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Store</p>
                <p className="text-lg font-semibold">
                  {selectedOrder.store_name ?? (selectedOrder as any).store?.store_name ?? `Store ${selectedOrder.store_id ?? (selectedOrder as any).store?._id ?? ''}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created By</p>
                <p className="text-lg font-semibold">
                  {selectedOrder.created_by_username ?? (selectedOrder as any).created_by?.username ?? `User ${selectedOrder.created_by ?? (selectedOrder as any).created_by?._id ?? ''}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created At</p>
                <p className="text-lg font-semibold">{formatDate(selectedOrder.created_at)}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Order Items & Batch Allocations</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Batch Code
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Requested Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Approved Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Receipted Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Stocked Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(selectedOrder.items || []).map((item: any) => {
                      const itemId = item.supply_order_item_id ?? item._id;
                      const productCode = item.product_code ?? item.product?.product_code ?? '-';
                      const productName = item.product_name ?? item.product?.product_name ?? `Product ${item.product_id ?? item.product?._id ?? ''}`;
                      const unit = item.unit ?? item.product?.unit ?? '-';
                      const hasBatches = item.batches && item.batches.length > 0;

                      if (!hasBatches) {
                        return (
                          <tr key={itemId}>
                            <td className="px-4 py-3 text-sm font-bold text-blue-700">
                              {productCode}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {productName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{unit}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 italic">-</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.requested_quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.approved_quantity ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">-</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">-</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.status || 'Pending'}
                            </td>
                          </tr>
                        );
                      }

                      return item.batches.map((batch: any, batchIndex: number) => {
                        const batchId = batch.item_batch_id ?? batch._id ?? batchIndex;
                        const batchCode = batch.batch_code ?? (batch.batch_id && typeof batch.batch_id === 'object' ? batch.batch_id.batch_code : null) ?? (batch.batch_id ? `Batch ${batch.batch_id}` : '-');
                        const approvedQty = batch.quantity != null ? Number(batch.quantity) : '-';
                        const receiptedQty = batch.receipted_quantity != null ? Number(batch.receipted_quantity) : '-';
                        const stockedQty = batch.stocked_quantity != null ? Number(batch.stocked_quantity) : '-';
                        return (
                          <tr key={`${itemId}-${batchId}`} className={batchIndex > 0 ? 'bg-gray-50' : ''}>
                            {batchIndex === 0 ? (
                              <>
                                <td rowSpan={item.batches.length} className="px-4 py-3 text-sm font-bold text-blue-700 border-r border-gray-200">
                                  {productCode}
                                </td>
                                <td rowSpan={item.batches.length} className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                                  {productName}
                                </td>
                                <td rowSpan={item.batches.length} className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                                  {unit}
                                </td>
                              </>
                            ) : null}
                            <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                              {batchCode}
                            </td>
                            {batchIndex === 0 ? (
                              <td rowSpan={item.batches.length} className="px-4 py-3 text-sm text-gray-900 text-right border-l border-gray-200">
                                {item.requested_quantity}
                              </td>
                            ) : null}
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {approvedQty}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={batch.receipted_quantity != null ? 'font-semibold text-green-700' : 'text-gray-500'}>
                                {receiptedQty}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={batch.stocked_quantity != null ? 'font-semibold text-indigo-700' : 'text-gray-500'}>
                                {stockedQty}
                              </span>
                            </td>
                            {batchIndex === 0 ? (
                              <td rowSpan={item.batches.length} className="px-4 py-3 text-sm text-gray-500 border-l border-gray-200">
                                {item.status || 'Pending'}
                              </td>
                            ) : null}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Received Modal */}
      {showConfirmReceivedModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Confirm Received</h2>
              <button
                onClick={() => {
                  setShowConfirmReceivedModal(false);
                  setSelectedOrder(null);
                  setReceiptedQuantities({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            {selectedOrder?.items?.some((i: any) => i.product_is_active === false) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-sm">
                This order contains inactive product(s). Confirm received is disabled. Activate products in Product Management first.
              </div>
            )}

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Supply Order:</strong> {selectedOrder.supply_order_code}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Enter the actual quantity received for each batch. This can be different from approved quantity due to shipping issues.
              </p>
            </div>

            <div className="space-y-4">
              {selectedOrder.items
                .filter(item => item.batches && item.batches.length > 0)
                .map((item) => (
                  <div key={item.supply_order_item_id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="mb-3 pb-2 border-b border-gray-300">
                      <p className="font-bold text-gray-900 text-lg">{item.product_name}</p>
                      <p className="text-sm text-gray-600">{item.product_code}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {item.batches!.map((batch) => (
                        <div key={batch.item_batch_id} className="p-3 bg-white rounded border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-purple-700">{batch.batch_code || `Batch ${batch.batch_id}`}</p>
                            </div>
                            <p className="text-sm text-gray-600">
                              Approved: <span className="font-semibold">{batch.quantity} {item.unit}</span>
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700 w-40">
                              Receipted Quantity:
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={batch.quantity}
                              value={receiptedQuantities[batch.item_batch_id] || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                const maxValue = batch.quantity;
                                setReceiptedQuantities({
                                  ...receiptedQuantities,
                                  [batch.item_batch_id]: Math.min(value, maxValue)
                                });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-600 w-16">{item.unit}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Range: 0 - {batch.quantity} {item.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleConfirmReceived}
                disabled={confirmingReceived !== null || !!selectedOrder?.items?.some((i: any) => i.product_is_active === false)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {confirmingReceived ? 'Processing...' : 'Confirm Received'}
              </button>
              <button
                onClick={() => {
                  setShowConfirmReceivedModal(false);
                  setSelectedOrder(null);
                  setReceiptedQuantities({});
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Stock to Inventory</h2>
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedOrder(null);
                  setStockedQuantities({});
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            {selectedOrder?.items?.some((i: any) => i.product_is_active === false) && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-sm">
                This order contains inactive product(s). Stock is disabled. Activate products in Product Management first.
              </div>
            )}

            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded">
              <p className="text-sm text-indigo-800">
                <strong>Supply Order:</strong> {selectedOrder.supply_order_code}
              </p>
              <p className="text-sm text-indigo-700 mt-1">
                Enter the quantity to add to your store inventory per batch. This can be less than receipted if some items are damaged.
              </p>
            </div>

            <div className="space-y-4">
              {selectedOrder.items
                .filter(item => item.batches && item.batches.some(b => b.receipted_quantity && b.receipted_quantity > 0))
                .map((item) => (
                  <div key={item.supply_order_item_id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="mb-3 pb-2 border-b border-gray-300">
                      <p className="font-bold text-gray-900 text-lg">{item.product_name}</p>
                      <p className="text-sm text-gray-600">{item.product_code}</p>
                    </div>
                    
                    <div className="space-y-3">
                      {item.batches!
                        .filter(batch => batch.receipted_quantity && batch.receipted_quantity > 0)
                        .map((batch) => (
                          <div key={batch.item_batch_id} className="p-3 bg-white rounded border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-purple-700">{batch.batch_code || `Batch ${batch.batch_id}`}</p>
                              </div>
                              <p className="text-sm text-gray-600">
                                Receipted: <span className="font-semibold">{batch.receipted_quantity} {item.unit}</span>
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700 w-40">
                                Stocked Quantity:
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={batch.receipted_quantity || 0}
                                value={stockedQuantities[batch.item_batch_id] || 0}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  const maxValue = batch.receipted_quantity || 0;
                                  setStockedQuantities({
                                    ...stockedQuantities,
                                    [batch.item_batch_id]: Math.min(value, maxValue)
                                  });
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <span className="text-sm text-gray-600 w-16">{item.unit}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Range: 0 - {batch.receipted_quantity} {item.unit}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleStock}
                disabled={!!selectedOrder?.items?.some((i: any) => i.product_is_active === false)}
                className={selectedOrder?.items?.some((i: any) => i.product_is_active === false) ? 'flex-1 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed' : 'flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700'}
              >
                Stock to Inventory
              </button>
              <button
                onClick={() => {
                  setShowStockModal(false);
                  setSelectedOrder(null);
                  setStockedQuantities({});
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyOrderStorePage;
