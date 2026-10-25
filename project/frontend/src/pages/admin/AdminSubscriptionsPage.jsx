import { useEffect, useState, useCallback, useRef } from "react";
import { Add } from "iconsax-reactjs";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import GrantSubscriptionForm from "../../components/admin/GrantSubscriptionForm";
import UserDetailDrawer from "../../components/admin/UserDetailDrawer";
import { PLAN_LABEL } from "../../lib/plans";

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [confirmCancelSub, setConfirmCancelSub] = useState(null); // { subId, email }

  // Debounce search keyword
  const debounceTimerRef = useRef(null);
  const handleKeywordChange = (e) => {
    const val = e.target.value;
    setKeywordInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setKeyword(val.trim());
      setPage(0);
    }, 350);
  };

  const fetchSubscriptions = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      size: 10,
      status: statusFilter || undefined,
      keyword: keyword || undefined,
    };
    api
      .get("/admin/subscriptions", { params })
      .then((res) => {
        setSubscriptions(res.data.content || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalElements(res.data.totalElements || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách gói đăng ký:", err);
        setLoading(false);
      });
  }, [statusFilter, keyword, page]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchSubscriptions();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchSubscriptions]);

  // Hủy gói subscription
  const handleCancelSubscription = (subId, email) => {
    setConfirmCancelSub({ subId, email });
  };

  const handleConfirmCancel = async (reason) => {
    if (!confirmCancelSub) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/subscriptions/${confirmCancelSub.subId}/cancel`, { reason });
      setConfirmCancelSub(null);
      fetchSubscriptions();
    } catch (err) {
      console.error("Lỗi khi hủy gói đăng ký:", err);
      alert(err.response?.data?.message || err.response?.data?.error || "Hủy gói đăng ký thất bại.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN");
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            Đang hoạt động
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
            Hết hạn
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
            Đã hủy
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
      {/* Header & Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">Quản lý đăng ký dịch vụ</h2>
          <p className="text-sm text-mauve">Danh sách và trạng thái các gói thành viên trả phí ({totalElements} bản ghi)</p>
        </div>
        <Button className="rounded-2xl px-5 py-2.5 text-sm font-bold shrink-0 self-start sm:self-auto" onClick={() => setShowGrantModal(true)}>
          + Cấp gói thủ công
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="border border-divider/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search keyword */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Tìm theo email hoặc họ tên khách hàng..."
              value={keywordInput}
              onChange={handleKeywordChange}
              className="w-full rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
            />
          </div>

          {/* Status filter */}
          <div className="w-full sm:w-56">
            <select
              className="w-full rounded-2xl border-2 border-line bg-white py-2 px-3 text-sm font-semibold text-ink outline-none transition focus:border-brand"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
              <option value="EXPIRED">Hết hạn (EXPIRED)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>
        </div>
      </Card>

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
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Khách hàng</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Gói dịch vụ</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4">Ngày bắt đầu</th>
                  <th className="px-5 py-4">Ngày hết hạn</th>
                  <th className="px-5 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-ink">#{sub.id}</td>
                    <td className="px-5 py-4 font-semibold text-ink">{sub.userName || "—"}</td>
                    <td className="px-5 py-4">
                      {sub.userId ? (
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(sub.userId)}
                          className="text-left font-medium text-brand hover:underline cursor-pointer"
                          title="Bấm để xem chi tiết người dùng"
                        >
                          {sub.userEmail}
                        </button>
                      ) : (
                        <span className="text-mauve">{sub.userEmail}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-extrabold text-magenta text-xs tracking-wider">
                        {PLAN_LABEL[sub.plan] || sub.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4">{renderStatusBadge(sub.status)}</td>
                    <td className="px-5 py-4 text-muted">{formatDate(sub.startDate)}</td>
                    <td className="px-5 py-4 text-muted font-medium">{formatDate(sub.endDate)}</td>
                    <td className="px-5 py-4 text-center">
                      {sub.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-3 py-1.5 text-xs rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          disabled={actionLoading}
                          onClick={() => handleCancelSubscription(sub.id, sub.userEmail)}
                        >
                          Hủy gói
                        </Button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages} (Tổng: {totalElements} kết quả)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-2 rounded-xl text-xs"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Grant Subscription Modal using GrantSubscriptionForm */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-ink">Cấp / Gia hạn gói dịch vụ</h3>
                <p className="text-xs text-mauve">Cấp gói dịch vụ thủ công cho người dùng</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGrantModal(false)}
                className="text-muted hover:text-ink text-xl font-bold p-1"
              >
                <Add size={22} className="rotate-45" />
              </button>
            </div>

            <GrantSubscriptionForm
              showCancel
              onCancel={() => setShowGrantModal(false)}
              onSubmitted={() => {
                setShowGrantModal(false);
                fetchSubscriptions();
              }}
            />
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={fetchSubscriptions}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmCancelSub}
        title="Hủy gói dịch vụ"
        message={`Bạn có chắc chắn muốn hủy gói dịch vụ hoạt động của người dùng ${confirmCancelSub?.email}?`}
        confirmText="Hủy gói"
        danger
        requireReason
        reasonPlaceholder="Nhập lý do hủy gói (ví dụ: Khách yêu cầu hoàn tiền)..."
        loading={actionLoading}
        onConfirm={handleConfirmCancel}
        onCancel={() => setConfirmCancelSub(null)}
      />
    </div>
  );
}
