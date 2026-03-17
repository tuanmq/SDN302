import { useEffect, useState, useCallback } from 'react';
import { auditLogService } from '@/api/services/auditLogService';
import { userService } from '@/api/services/userService';
import type { AuditLog, AuditLogStats } from '@/api/types/auditLog';
import type { User } from '@/api/types/user';

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả thao tác' },
  { value: 'CREATE', label: 'Tạo mới' },
];

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  DELETE: 'Xóa',
};

/** Hiển thị tên tài nguyên theo resource type từ bảng có created_by */
const RESOURCE_LABELS: Record<string, string> = {
  SupplyOrder: 'Đơn cung ứng',
};

function formatDate(d: string | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchStats = useCallback(async () => {
    try {
      const data = await auditLogService.getStats();
      setStats(data);
    } catch {
      setStats({ total: 0, today: 0, thisWeek: 0, critical: 0 });
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
        ...(search.trim() && { search: search.trim() }),
        ...(actionFilter && { action: actionFilter }),
        ...(userIdFilter && { user_id: userIdFilter }),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
      };
      const { data, total: totalCount } = await auditLogService.getLogs(params);
      setLogs(data);
      setTotal(totalCount);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được lịch sử');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, actionFilter, userIdFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const list = await userService.getAllUsers();
        setUsers(list ?? []);
      } catch {
        setUsers([]);
      }
    };
    loadUsers();
  }, []);

  const handleExport = () => {
    const headers = ['Thời gian', 'User', 'Hành động', 'Tài nguyên', 'Mã / Chi tiết'];
    const rows = logs.map((l) => [
      formatDate(l.created_at),
      l.username,
      ACTION_LABELS[l.action] ?? l.action,
      RESOURCE_LABELS[l.resource] ?? l.resource,
      l.details || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử thao tác (Audit Log)</h1>
        <button
          type="button"
          onClick={handleExport}
          disabled={logs.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Xuất CSV
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Lịch sử user thực hiện hành động theo thời gian, dựa trên các bảng có <strong>created_by</strong> và <strong>created_at</strong>.
      </p>

      {stats !== null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-500">Tổng số bản ghi</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-500">Hôm nay</p>
            <p className="text-2xl font-semibold text-blue-600 mt-1">{stats.today}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-500">Tuần này</p>
            <p className="text-2xl font-semibold text-green-600 mt-1">{stats.thisWeek}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-500">Thao tác xóa</p>
            <p className="text-2xl font-semibold text-red-600 mt-1">{stats.critical}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <input
            type="text"
            placeholder="Tìm theo mã đơn, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả user</option>
            {users.map((u) => (
              <option key={String(u.user_id ?? u.user_code)} value={String(u.user_id ?? (u as unknown as { _id?: string })._id ?? '')}>
                {u.username} ({u.user_code ?? ''})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setPage(1)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium"
          >
            Lọc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border-b border-red-100">{error}</div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài nguyên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã / Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Đang tải...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Chưa có bản ghi nào</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.audit_log_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                        log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{RESOURCE_LABELS[log.resource] ?? log.resource}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-medium" title={log.details}>{log.details || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
