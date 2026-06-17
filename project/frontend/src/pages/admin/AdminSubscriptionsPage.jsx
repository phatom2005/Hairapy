import { useEffect, useState, useCallback } from "react";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscriptions = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      size: 10,
      status: statusFilter || undefined,
    };
    api
      .get("/admin/subscriptions", { params })
      .then((res) => {
        setSubscriptions(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [statusFilter, page]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Hủy gói subscription
  const handleCancelSubscription = (subId, email) => {
    if (!window.confirm(`Bạn có chắc chắn muốn hủy gói dịch vụ hoạt động của người dùng ${email}?`)) {
      return;
    }

    setActionLoading(true);
    api
      .put(`/admin/subscriptions/${subId}/cancel`)
      .then(() => {
        setActionLoading(false);
        fetchSubscriptions();
      })
      .catch((err) => {
        setActionLoading(false);
        console.error(err);
        alert("Hủy gói đăng ký thất bại.");
      });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN");
  };

  // Render Badge màu cao cấp tương ứng trạng thái
  const renderStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            Đang hoạt động
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            Hết hạn
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Quản lý đăng ký dịch vụ</h2>
          <p className="text-sm text-mauve">Danh sách và trạng thái các gói thành viên trả phí</p>
        </div>
        <div className="w-full sm:w-48">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Trạng thái</span>
            <select
              className="w-full rounded-2xl border-2 border-line bg-white py-2.5 px-4 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động (ACTIVE)</option>
              <option value="EXPIRED">Hết hạn (EXPIRED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            Không tìm thấy thông tin đăng ký dịch vụ nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Gói dịch vụ</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Ngày bắt đầu</th>
                  <th className="px-6 py-4">Ngày kết hạn</th>
                  <th className="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-ink">{sub.id}</td>
                    <td className="px-6 py-4 font-semibold text-ink">{sub.userName || "-"}</td>
                    <td className="px-6 py-4 text-mauve">{sub.userEmail}</td>
                    <td className="px-6 py-4">
                      <span className="font-extrabold text-magenta text-xs tracking-wider">
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">{renderStatusBadge(sub.status)}</td>
                    <td className="px-6 py-4 text-muted">{formatDate(sub.startDate)}</td>
                    <td className="px-6 py-4 text-muted">{formatDate(sub.endDate)}</td>
                    <td className="px-6 py-4 text-center">
                      {sub.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-4 py-1.5 text-xs rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={actionLoading}
                          onClick={() => handleCancelSubscription(sub.id, sub.userEmail)}
                        >
                          Hủy gói
                        </Button>
                      ) : (
                        <span className="text-xs text-muted font-bold">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
