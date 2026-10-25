import { useEffect, useState, useCallback } from "react";
import { Danger } from "iconsax-reactjs";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import UserDetailDrawer from "../../components/admin/UserDetailDrawer";
import { PLAN_LABEL } from "../../lib/plans";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalAmountPaid: 0,
    paidCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [confirmMarkPaidItem, setConfirmMarkPaidItem] = useState(null); // { id, orderCode, email }

  const formatVND = (amount) => new Intl.NumberFormat("vi-VN").format(amount ?? 0) + " ₫";

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    const pad = (n) => String(n).padStart(2, "0");
    const d = pad(date.getDate());
    const m = pad(date.getMonth() + 1);
    const y = date.getFullYear();
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${d}/${m}/${y} ${h}:${min}`;
  };

  // Lấy dữ liệu summary theo bộ lọc ngày
  const fetchSummary = useCallback(() => {
    setSummaryLoading(true);
    const params = {
      from: fromDate || undefined,
      to: toDate || undefined,
    };
    api
      .get("/admin/payments/summary", { params })
      .then((res) => {
        setSummary(res.data);
        setSummaryLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi tải tóm tắt thanh toán:", err);
        setSummaryLoading(false);
      });
  }, [fromDate, toDate]);

  // Lấy danh sách giao dịch phân trang và có lọc
  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      size: 10,
      status: statusFilter || undefined,
      plan: planFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      keyword: keyword.trim() || undefined,
    };
    api
      .get("/admin/payments", { params })
      .then((res) => {
        setPayments(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi tải lịch sử thanh toán:", err);
        setLoading(false);
      });
  }, [page, statusFilter, planFilter, fromDate, toDate, keyword]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchSummary();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchSummary]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchPayments();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchPayments]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setKeyword(searchInput);
    setPage(0);
  };

  const handleResetFilters = () => {
    setStatusFilter("");
    setPlanFilter("");
    setFromDate("");
    setToDate("");
    setKeyword("");
    setSearchInput("");
    setPage(0);
  };

  // Đối soát đơn hàng với cổng PayOS
  const handleReconcile = async (paymentId, orderCode) => {
    setActionLoadingId(paymentId);
    try {
      const res = await api.post(`/admin/payments/${paymentId}/reconcile`);
      alert(`Đối soát #${orderCode} thành công. Trạng thái hiện tại: ${res.data.status}`);
      fetchPayments();
      fetchSummary();
    } catch (err) {
      console.error("Lỗi đối soát PayOS:", err);
      alert(err.response?.data?.message || err.response?.data?.error || "Đối soát PayOS thất bại.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xác nhận đã thanh toán thủ công
  const handleConfirmMarkPaid = async (note) => {
    if (!confirmMarkPaidItem) return;
    setActionLoadingId(confirmMarkPaidItem.id);
    try {
      await api.post(`/admin/payments/${confirmMarkPaidItem.id}/mark-paid`, { note });
      setConfirmMarkPaidItem(null);
      fetchPayments();
      fetchSummary();
    } catch (err) {
      console.error("Lỗi đánh dấu thanh toán:", err);
      alert(err.response?.data?.message || err.response?.data?.error || "Xác nhận thanh toán thất bại.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            Thành công
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            Chờ xử lý
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            Đã huỷ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-bold text-gray-600 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-ink">Lịch sử thanh toán</h2>
        <p className="text-sm text-mauve">Quản lý và tra cứu các giao dịch thanh toán gói qua cổng PayOS</p>
      </div>

      {/* 4 Thẻ Summary phía trên */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-divider/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Doanh thu thu được</p>
          <h3 className="text-2xl font-black text-emerald-700 mt-1">
            {summaryLoading ? "..." : formatVND(summary.totalAmountPaid)}
          </h3>
          <p className="text-[11px] text-muted mt-1">Theo khoảng ngày đang lọc</p>
        </Card>

        <Card className="border border-divider/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Giao dịch thành công</p>
          <h3 className="text-2xl font-black text-ink mt-1">
            {summaryLoading ? "..." : summary.paidCount}
          </h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Trạng thái PAID</p>
        </Card>

        <Card className="border border-divider/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Đang chờ xử lý</p>
          <h3 className="text-2xl font-black text-amber-600 mt-1">
            {summaryLoading ? "..." : summary.pendingCount}
          </h3>
          <p className="text-[11px] text-amber-600 font-semibold mt-1">Trạng thái PENDING</p>
        </Card>

        <Card className="border border-divider/10 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Giao dịch đã hủy</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">
            {summaryLoading ? "..." : summary.cancelledCount}
          </h3>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">Trạng thái CANCELLED</p>
        </Card>
      </div>

      {/* Bộ lọc */}
      <Card className="border border-divider/10 p-5">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Trạng thái */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Trạng thái</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PAID">Thành công (PAID)</option>
                <option value="PENDING">Chờ xử lý (PENDING)</option>
                <option value="CANCELLED">Đã huỷ (CANCELLED)</option>
              </select>
            </label>

            {/* Gói */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Gói</span>
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              >
                <option value="">Tất cả gói</option>
                <option value="PRO">Gói Tuần (PRO)</option>
                <option value="PREMIUM">Gói Tháng (PREMIUM)</option>
              </select>
            </label>

            {/* Từ ngày */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Từ ngày</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              />
            </label>

            {/* Đến ngày */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Đến ngày</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              />
            </label>

            {/* Ô tìm kiếm */}
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Tìm kiếm</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Email hoặc mã đơn..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
                />
                <Button type="submit" size="sm" className="rounded-2xl px-3 py-2 text-xs font-bold">
                  Tìm
                </Button>
              </div>
            </label>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-line text-xs">
            <span className="text-muted font-medium">
              Tìm thấy <strong className="text-ink">{totalElements}</strong> giao dịch
            </span>
            {(statusFilter || planFilter || fromDate || toDate || keyword) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="font-bold text-magenta hover:underline cursor-pointer"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        </form>
      </Card>

      {/* Bảng danh sách giao dịch */}
      <Card className="overflow-hidden border border-divider/10" padded={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted">
            Không tìm thấy giao dịch nào phù hợp
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-4">Mã đơn</th>
                  <th className="px-5 py-4">Người dùng</th>
                  <th className="px-5 py-4">Gói</th>
                  <th className="px-5 py-4">Số tiền</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-center">Đã cấp gói</th>
                  <th className="px-5 py-4">Thời gian tạo</th>
                  <th className="px-5 py-4">Thời gian thanh toán</th>
                  <th className="px-5 py-4">Mã GD PayOS</th>
                  <th className="px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-ink">#{p.orderCode}</td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-ink">{p.userName || "—"}</div>
                      {p.userId ? (
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(p.userId)}
                          className="text-xs font-medium text-brand hover:underline cursor-pointer text-left block"
                          title="Bấm để xem chi tiết người dùng"
                        >
                          {p.userEmail}
                        </button>
                      ) : (
                        <div className="text-xs text-mauve">{p.userEmail}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-magenta text-xs tracking-wider">
                        {PLAN_LABEL[p.plan] || p.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-ink">{formatVND(p.amount)}</td>
                    <td className="px-5 py-4">{renderStatusBadge(p.status)}</td>
                    <td className="px-5 py-4 text-center">
                      {p.subscriptionGranted ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                          Đã cấp
                        </span>
                      ) : p.status === "PAID" ? (
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-black text-rose-700 border border-rose-300 animate-pulse">
                          <Danger size={12} variant="Bold" className="mr-1" />Chưa cấp
                        </span>
                      ) : (
                        <span className="text-xs text-muted font-bold">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">{formatDateTime(p.createdAt)}</td>
                    <td className="px-5 py-4 text-xs text-muted">{formatDateTime(p.paidAt)}</td>
                    <td className="px-5 py-4 font-mono text-xs text-mauve">
                      {p.payosTransactionId || "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {p.status === "PENDING" || p.status === "CANCELLED" ? (
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2.5 py-1 text-xs rounded-xl font-bold hover:border-brand cursor-pointer whitespace-nowrap"
                            disabled={actionLoadingId === p.id}
                            onClick={() => handleReconcile(p.id, p.orderCode)}
                          >
                            {actionLoadingId === p.id ? "Đang xử lý..." : "Đối soát PayOS"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2.5 py-1 text-xs rounded-xl font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer whitespace-nowrap"
                            disabled={actionLoadingId === p.id}
                            onClick={() => setConfirmMarkPaidItem({ id: p.id, orderCode: p.orderCode, email: p.userEmail })}
                          >
                            Xác nhận đã thanh toán
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted font-bold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages} (Tổng: {totalElements} kết quả)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs font-bold"
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            >
              Trang trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs font-bold"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={() => {
            fetchPayments();
            fetchSummary();
          }}
        />
      )}

      {/* Confirm mark paid Dialog */}
      <ConfirmDialog
        open={!!confirmMarkPaidItem}
        title="Xác nhận đã thanh toán"
        message={`Xác nhận thanh toán thủ công cho đơn #${confirmMarkPaidItem?.orderCode} (${confirmMarkPaidItem?.email})? Hệ thống sẽ cập nhật trạng thái PAID và cấp gói dịch vụ tương ứng.`}
        confirmText="Xác nhận đã thanh toán"
        requireReason
        reasonPlaceholder="Nhập ghi chú đối soát/thanh toán (bắt buộc)..."
        loading={actionLoadingId === confirmMarkPaidItem?.id}
        onConfirm={handleConfirmMarkPaid}
        onCancel={() => setConfirmMarkPaidItem(null)}
      />
    </div>
  );
}
