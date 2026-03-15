import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { supplyOrderService } from '@/api/services/supplyOrderService';
import { inventoryService } from '@/api/services/inventoryService';
import { productService } from '@/api/services/productService';
import { storeService } from '@/api/services/storeService';
import type { SupplyOrder } from '@/api/types/supplyOrder';
import type { ProductBatchWithDetails } from '@/api/types/productBatch';
import type { Product } from '@/api/types/product';
import type { Store } from '@/api/types/store';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PARTLY_APPROVED: 'Duyệt một phần',
  REJECTED: 'Từ chối',
  DELIVERING: 'Đang giao',
  RECEIPTED: 'Đã nhận',
  STOCKED: 'Đã nhập kho',
  CANCELLED: 'Đã hủy',
};

const CHART_COLORS = ['#0d9488', '#475569', '#eab308', '#dc2626', '#2563eb', '#7c3aed', '#0891b2', '#64748b'];

export type DateFilterType = 'day' | 'month' | 'year';

/** Trả về from/to (YYYY-MM-DD) theo loại lọc để gọi API chính xác */
function getDateRange(filter: DateFilterType): { from: string; to: string } {
  const toDate = new Date();
  let fromDate = new Date();
  if (filter === 'day') {
    fromDate.setDate(toDate.getDate() - 30);
  } else if (filter === 'month') {
    fromDate = new Date(toDate.getFullYear(), toDate.getMonth() - 11, 1);
    fromDate.setHours(0, 0, 0, 0);
  } else {
    fromDate = new Date(toDate.getFullYear() - 4, 0, 1);
    fromDate.setHours(0, 0, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    from: `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`,
    to: `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`,
  };
}

function useDashboardData(roleId: number, storeId: number | null, from?: string, to?: string) {
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [inventory, setInventory] = useState<ProductBatchWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = from && to ? { from, to } : undefined;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (roleId === 1 || roleId === 2) {
          const [ordersRes, invRes, prodRes, storesRes] = await Promise.all([
            supplyOrderService.getAllSupplyOrdersCentral(params),
            inventoryService.getCentralKitchenInventory(),
            productService.getActiveProducts(),
            roleId === 1 ? storeService.getStores({ is_active: true }).then((r) => r.data ?? []) : Promise.resolve([]),
          ]);
          if (!cancelled) {
            setOrders(Array.isArray(ordersRes) ? ordersRes : []);
            setInventory(Array.isArray(invRes) ? invRes : []);
            setProducts(Array.isArray(prodRes) ? prodRes : []);
            setStores(Array.isArray(storesRes) ? storesRes : []);
          }
        } else {
          if (storeId == null) {
            if (!cancelled) setOrders([]);
            setInventory([]);
            setProducts([]);
            setStores([]);
          } else {
            const [ordersRes, invRes] = await Promise.all([
              supplyOrderService.getAllSupplyOrders(params),
              inventoryService.getInventoryByStore(String(storeId)),
            ]);
            if (!cancelled) {
              setOrders(Array.isArray(ordersRes) ? ordersRes : []);
              setInventory(Array.isArray(invRes) ? invRes : []);
              setProducts([]);
              setStores([]);
            }
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [roleId, storeId, from, to]);

  return { orders, inventory, products, stores, loading, error };
}

function aggregateOrdersByStatus(orders: SupplyOrder[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const s = o.status || 'UNKNOWN';
    map[s] = (map[s] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({
    name: STATUS_LABELS[name] || name,
    statusKey: name,
    value,
  }));
}

function aggregateOrdersByStore(orders: SupplyOrder[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const label = (o as { store_name?: string }).store_name || String(o.store_id ?? 'Khác');
    map[label] = (map[label] || 0) + 1;
  });
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

/** Định dạng ngày dd/MM/yyyy để dễ đọc */
function formatDateLabel(date: Date): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/** Đơn cung ứng theo từng ngày (ngày/tháng/năm) – dùng giờ địa phương để khớp với bảng "Đơn gần đây" */
function aggregateOrdersByDay(orders: SupplyOrder[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const d = o.created_at ? new Date(o.created_at) : new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const key = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [y, m, day] = key.split('-').map(Number);
      const date = new Date(y, m - 1, day);
      return { name: formatDateLabel(date), key, orders: count, fullDate: key };
    });
}

/** Đơn cung ứng theo tháng (MM/yyyy) */
function aggregateOrdersByMonth(orders: SupplyOrder[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const d = o.created_at ? new Date(o.created_at) : new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const [y, m] = key.split('-');
      return { name: `${m}/${y}`, key, orders: count };
    });
}

/** Đơn cung ứng theo năm */
function aggregateOrdersByYear(orders: SupplyOrder[]) {
  const map: Record<string, number> = {};
  orders.forEach((o) => {
    const d = o.created_at ? new Date(o.created_at) : new Date();
    const key = String(d.getFullYear());
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ name: key, key, orders: count }));
}

function topProductsByRequestedQuantity(orders: SupplyOrder[], limit = 8) {
  const map: Record<string, { name: string; requested: number }> = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const name = item.product_name || item.product_code || item.product_id || 'Khác';
      if (!map[name]) map[name] = { name, requested: 0 };
      map[name].requested += item.requested_quantity || 0;
    });
  });
  return Object.values(map)
    .sort((a, b) => b.requested - a.requested)
    .slice(0, limit)
    .map((x) => ({ name: x.name.length > 20 ? x.name.slice(0, 18) + '…' : x.name, quantity: x.requested }));
}

export default function DashboardPage() {
  const { user } = useAuth();
  const roleId = user?.role_id ?? 0;
  const storeId = user?.store_id ?? null;
  const [dateFilter, setDateFilter] = useState<DateFilterType>('day');

  const { from, to } = useMemo(() => getDateRange(dateFilter), [dateFilter]);
  const { orders, inventory, products, stores, loading, error } = useDashboardData(roleId, storeId, from, to);

  const byStatus = useMemo(() => aggregateOrdersByStatus(orders), [orders]);
  const byStore = useMemo(() => aggregateOrdersByStore(orders), [orders]);
  const byDay = useMemo(() => aggregateOrdersByDay(orders), [orders]);
  const byMonth = useMemo(() => aggregateOrdersByMonth(orders), [orders]);
  const byYear = useMemo(() => aggregateOrdersByYear(orders), [orders]);
  const topProducts = useMemo(() => topProductsByRequestedQuantity(orders), [orders]);

  const chartTimeData = useMemo(() => {
    if (dateFilter === 'month') return byMonth;
    if (dateFilter === 'year') return byYear;
    return byDay;
  }, [dateFilter, byDay, byMonth, byYear]);

  const chartTimeLabel =
    dateFilter === 'day' ? 'ngày (dd/MM/yyyy)' : dateFilter === 'month' ? 'tháng (MM/yyyy)' : 'năm';

  const barChartData = useMemo(() => {
    if (roleId === 1 && byStore.length > 0) {
      return byStore.map((x) => ({ name: x.name, count: x.value }));
    }
    return topProducts.map((x) => ({ name: x.name, count: x.quantity }));
  }, [roleId, byStore, topProducts]);

  const barChartLabel = roleId === 1 && byStore.length > 0 ? 'Số đơn' : 'Số lượng yêu cầu';

  const totalOrders = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'SUBMITTED').length;
  const inProgressCount = orders.filter((o) =>
    ['APPROVED', 'PARTLY_APPROVED', 'DELIVERING', 'RECEIPTED'].includes(o.status)
  ).length;
  const completedCount = orders.filter((o) => o.status === 'STOCKED').length;
  const lowStockCount = inventory.filter(
    (i) => (i.inventory_status === 'NEAR_EXPIRY' || i.inventory_status === 'EXPIRED') && (i.inventory_quantity ?? 0) > 0
  ).length;
  const activeProductsCount = products.length;

  const roleTitle =
    roleId === 1 ? 'Tổng quan hệ thống' : roleId === 2 ? 'Bếp trung tâm' : 'Cửa hàng của tôi';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard – {roleTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Xin chào, {user?.username}!</p>
        </div>
      </div>

      {/* KPI Cards - style like reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-500">Tổng đơn cung ứng</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full"
              style={{ width: totalOrders ? Math.min(100, (totalOrders / 50) * 100) : 0 }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-500">Chờ duyệt</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: totalOrders ? (pendingCount / totalOrders) * 100 : 0 }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-500">Đang xử lý</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{inProgressCount}</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: totalOrders ? (inProgressCount / totalOrders) * 100 : 0 }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-500">Đã hoàn thành</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: totalOrders ? (completedCount / totalOrders) * 100 : 0 }}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-500">Cảnh báo tồn kho</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{lowStockCount}</p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full"
              style={{ width: lowStockCount ? Math.min(100, lowStockCount * 10) : 0 }}
            />
          </div>
        </div>
      </div>

      {/* Admin: extra card for products/stores */}
      {(roleId === 1 || roleId === 2) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-500">Sản phẩm đang kinh doanh</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeProductsCount}</p>
          </div>
          {roleId === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-medium text-gray-500">Cửa hàng đang hoạt động</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stores.length}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut: Orders by status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Đơn cung ứng theo trạng thái</h3>
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: unknown) => [`${Number(value)} đơn`, 'Số đơn']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">Chưa có dữ liệu</div>
          )}
        </div>

        {/* Bar: Top products (or by store for Admin) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {roleId === 1 && byStore.length > 0 ? 'Đơn cung ứng theo cửa hàng' : 'Sản phẩm được yêu cầu nhiều nhất'}
          </h3>
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart layout="vertical" margin={{ left: 8, right: 24 }} data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name={barChartLabel} fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-gray-400">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* Time series: Đơn cung ứng theo ngày / tháng / năm – lọc và gọi API đúng khoảng from/to */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Đơn cung ứng theo thời gian</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Khoảng: {from} → {to} (lọc theo {chartTimeLabel})
            </p>
          </div>
          <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              type="button"
              onClick={() => setDateFilter('day')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === 'day' ? 'bg-white text-teal-700 shadow shadow-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Theo ngày
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === 'month' ? 'bg-white text-teal-700 shadow shadow-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Theo tháng
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('year')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateFilter === 'year' ? 'bg-white text-teal-700 shadow shadow-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Theo năm
            </button>
          </div>
        </div>
        {chartTimeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartTimeData} margin={{ top: 8, right: 24, left: 8, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                angle={chartTimeData.length > 14 ? -35 : 0}
                textAnchor={chartTimeData.length > 14 ? 'end' : 'middle'}
              />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value: unknown) => [Number(value ?? 0), 'Số đơn']}
                labelFormatter={(label, payload) => (payload?.[0]?.payload?.fullDate ? `Ngày ${label}` : label)}
              />
              <Legend />
              <Bar dataKey="orders" name="Số đơn" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="orders" name="Xu hướng" stroke="#dc2626" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[320px] flex items-center justify-center text-gray-400">Không có đơn trong khoảng đã chọn</div>
        )}
      </div>

      {/* Recent orders table - compact */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Đơn gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Chưa có đơn nào</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã đơn</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cửa hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.slice(0, 8).map((o) => (
                  <tr key={o._id ?? o.supply_order_id ?? o.supply_order_code}>
                    <td className="px-6 py-3 text-sm text-gray-900">{o.supply_order_code}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{o.store_name ?? '-'}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('vi-VN') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
