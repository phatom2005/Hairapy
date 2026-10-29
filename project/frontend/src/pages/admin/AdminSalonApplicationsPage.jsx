import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DocumentText,
  TickCircle,
  CloseCircle,
  Clock,
  Filter,
  Buildings,
  Danger,
  Call,
  Location,
  User,
} from "iconsax-reactjs";
import api from "../../lib/api";
import { Card, Button } from "../../components/ui";

export default function AdminSalonApplicationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["admin-salon-applications", page, statusFilter],
    queryFn: async () => {
      const params = { page, size: 10 };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const res = await api.get("/admin/salon-applications", { params });
      return res.data;
    },
    staleTime: 30_000,
  });

  const applications = data?.content || [];
  const totalPages = data?.totalPages || 1;

  // Modal Duyệt đơn
  const [approveModal, setApproveModal] = useState({
    open: false,
    app: null,
    mode: "NEW", // 'NEW' (tạo salon mới) hoặc 'EXISTING' (chọn salon có sẵn)
    existingSalons: [],
    selectedSalonId: "",
    loadingSalons: false,
    processing: false,
    error: "",
  });

  // Modal Từ chối đơn
  const [rejectModal, setRejectModal] = useState({
    open: false,
    app: null,
    reason: "",
    processing: false,
    error: "",
  });

  // Notification toast
  const [notification, setNotification] = useState(null);

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Mở modal duyệt đơn
  const handleOpenApprove = async (app) => {
    setApproveModal({
      open: true,
      app,
      mode: "NEW",
      existingSalons: [],
      selectedSalonId: "",
      loadingSalons: true,
      processing: false,
      error: "",
    });

    try {
      // Lấy danh sách salon để nếu admin muốn gán vào salon có sẵn
      const res = await api.get("/admin/salons", { params: { size: 100 } });
      const available = (res.data.content || []).filter((s) => !s.ownerEmail);
      setApproveModal((prev) => ({
        ...prev,
        existingSalons: available,
        loadingSalons: false,
      }));
    } catch (err) {
      console.error(err);
      setApproveModal((prev) => ({ ...prev, loadingSalons: false }));
    }
  };

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    setApproveModal((prev) => ({ ...prev, processing: true, error: "" }));

    try {
      const payload = {};
      if (
        approveModal.mode === "EXISTING" &&
        approveModal.selectedSalonId
      ) {
        payload.salonId = Number(approveModal.selectedSalonId);
      }

      await api.post(
        `/admin/salon-applications/${approveModal.app.id}/approve`,
        payload
      );

      setApproveModal((prev) => ({ ...prev, open: false, processing: false }));
      showToast(
        "success",
        `Đã duyệt đơn đăng ký của "${approveModal.app.salonName}"!`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-salon-applications"] });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Duyệt đơn thất bại.";
      setApproveModal((prev) => ({ ...prev, processing: false, error: msg }));
    }
  };

  // Mở modal từ chối
  const handleOpenReject = (app) => {
    setRejectModal({
      open: true,
      app,
      reason: "",
      processing: false,
      error: "",
    });
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason.trim()) {
      setRejectModal((prev) => ({
        ...prev,
        error: "Vui lòng nhập lý do từ chối để thông báo cho đối tác.",
      }));
      return;
    }

    setRejectModal((prev) => ({ ...prev, processing: true, error: "" }));
    try {
      await api.post(
        `/admin/salon-applications/${rejectModal.app.id}/reject`,
        { reason: rejectModal.reason.trim() }
      );

      setRejectModal((prev) => ({ ...prev, open: false, processing: false }));
      showToast(
        "success",
        `Đã từ chối đơn đăng ký của "${rejectModal.app.salonName}".`
      );
      queryClient.invalidateQueries({ queryKey: ["admin-salon-applications"] });
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Từ chối đơn thất bại.";
      setRejectModal((prev) => ({ ...prev, processing: false, error: msg }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm transition-all duration-300 ${
            notification.type === "success"
              ? "bg-emerald-950 border border-emerald-800 text-emerald-200"
              : "bg-red-950 border border-red-800 text-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <TickCircle size={20} variant="Bold" className="text-emerald-400 shrink-0" />
          ) : (
            <Danger size={20} variant="Bold" className="text-red-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <DocumentText size={28} className="text-primary" />
            Đơn đăng ký Đối tác
          </h2>
          <p className="text-sm text-mauve">
            Xem xét và phê duyệt hồ sơ đăng ký tham gia mạng lưới salon đối tác của Hairapy.
          </p>
        </div>

        {/* Lọc trạng thái */}
        <div className="flex items-center gap-2 bg-card border border-line rounded-xl p-1 text-xs">
          <Filter size={16} className="text-muted ml-2 shrink-0" />
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "PENDING", label: "Chờ duyệt" },
            { key: "APPROVED", label: "Đã duyệt" },
            { key: "REJECTED", label: "Đã từ chối" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-black font-semibold shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <Card
        className="overflow-hidden border border-divider/10"
        padded={false}
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted space-y-2">
            <DocumentText size={32} className="opacity-30" />
            <p>Không có đơn đăng ký nào trong danh mục này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-4">Salon đăng ký</th>
                  <th className="px-5 py-4">Người đại diện</th>
                  <th className="px-5 py-4">Địa chỉ & Khu vực</th>
                  <th className="px-5 py-4">Kinh nghiệm & Ghi chú</th>
                  <th className="px-5 py-4">Ngày gửi</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-center">Xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {applications.map((item) => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-canvas/50 transition-colors"
                    >
                      {/* Salon Name & Phone */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-ink flex items-center gap-1.5">
                          <Buildings size={16} className="text-primary shrink-0" />
                          {item.salonName}
                        </div>
                        <div className="text-xs text-muted mt-0.5 flex items-center gap-1">
                          <Call size={12} />
                          {item.phone}
                        </div>
                      </td>

                      {/* Người gửi */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-medium text-ink flex items-center gap-1">
                          <User size={14} className="text-muted" />
                          {item.userFullName || "Khách hàng"}
                        </div>
                        <div className="text-muted font-mono text-[11px]">
                          {item.userEmail}
                        </div>
                      </td>

                      {/* Địa chỉ */}
                      <td className="px-5 py-3.5 text-xs text-mauve">
                        <div className="font-medium text-ink">{item.district}</div>
                        <div
                          className="text-muted truncate max-w-[180px] flex items-center gap-1"
                          title={item.address}
                        >
                          <Location size={12} className="shrink-0" />
                          {item.address}
                        </div>
                      </td>

                      {/* Ghi chú */}
                      <td className="px-5 py-3.5 text-xs text-muted max-w-xs">
                        <p className="line-clamp-2" title={item.experience}>
                          {item.experience || "—"}
                        </p>
                      </td>

                      {/* Ngày gửi */}
                      <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                        <span className="text-[10px] text-muted/60">
                          {new Date(item.createdAt).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                        {item.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300 font-medium text-[11px]">
                            <Clock size={12} />
                            Chờ duyệt
                          </span>
                        )}
                        {item.status === "APPROVED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-semibold text-[11px]">
                            <TickCircle size={12} variant="Bold" />
                            Đã duyệt
                          </span>
                        )}
                        {item.status === "REJECTED" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-950/60 border border-red-800 text-red-300 font-medium text-[11px]">
                            <CloseCircle size={12} variant="Bold" />
                            Từ chối
                          </span>
                        )}
                      </td>

                      {/* Nút hành động */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {item.status === "PENDING" ? (
                          <div className="flex justify-center items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="brand"
                              className="px-2.5 py-1 text-xs rounded-lg flex items-center gap-1"
                              onClick={() => handleOpenApprove(item)}
                            >
                              <TickCircle size={12} variant="Bold" />
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2.5 py-1 text-xs rounded-lg text-red-500 hover:text-red-400 hover:border-red-500/50 flex items-center gap-1"
                              onClick={() => handleOpenReject(item)}
                            >
                              <CloseCircle size={12} variant="Bold" />
                              Từ chối
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted/60">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-semibold text-muted">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-1.5 rounded-xl text-xs"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="px-4 py-1.5 rounded-xl text-xs"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DUYỆT ĐƠN */}
      {approveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-md p-6 border border-line space-y-4 my-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <TickCircle size={20} variant="Bold" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Phê duyệt đơn đối tác</h3>
                <p className="text-xs text-muted">
                  Salon: <strong className="text-ink">{approveModal.app?.salonName}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-4">
              <div className="p-3 rounded-xl bg-card border border-line text-xs space-y-1">
                <div>
                  <strong>Người gửi:</strong> {approveModal.app?.userFullName} ({approveModal.app?.userEmail})
                </div>
                <div>
                  <strong>SĐT:</strong> {approveModal.app?.phone}
                </div>
                <div>
                  <strong>Địa chỉ:</strong> {approveModal.app?.address},{" "}
                  {approveModal.app?.district}
                </div>
              </div>

              {/* Tuỳ chọn tạo salon mới hoặc gán vào salon có sẵn */}
              <div>
                <label className="block text-xs font-semibold text-muted mb-2">
                  Phương thức tạo hồ sơ salon
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-xs text-ink cursor-pointer p-2.5 rounded-xl border border-line hover:border-primary/50 transition-colors bg-card/40">
                    <input
                      type="radio"
                      name="approveMode"
                      value="NEW"
                      checked={approveModal.mode === "NEW"}
                      onChange={() =>
                        setApproveModal({ ...approveModal, mode: "NEW" })
                      }
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold block text-primary">
                        Tạo salon mới tự động
                      </span>
                      <span className="text-muted text-[11px]">
                        Hệ thống sẽ tạo 1 salon mới từ thông tin đơn đăng ký và kích hoạt 30 ngày dùng thử Gói Đối tác.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-ink cursor-pointer p-2.5 rounded-xl border border-line hover:border-primary/50 transition-colors bg-card/40">
                    <input
                      type="radio"
                      name="approveMode"
                      value="EXISTING"
                      checked={approveModal.mode === "EXISTING"}
                      onChange={() =>
                        setApproveModal({ ...approveModal, mode: "EXISTING" })
                      }
                      className="mt-0.5 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="font-semibold block text-ink">
                        Gán vào salon có sẵn (chưa có chủ)
                      </span>
                      <span className="text-muted text-[11px]">
                        Chọn một salon đã có sẵn trong danh mục hệ thống để chuyển giao cho chủ này quản lý.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {approveModal.mode === "EXISTING" && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Chọn salon trống chủ sở hữu
                  </label>
                  {approveModal.loadingSalons ? (
                    <div className="text-xs text-muted">Đang tải salon...</div>
                  ) : approveModal.existingSalons.length === 0 ? (
                    <div className="text-xs text-amber-400 p-2 rounded-lg bg-amber-950/40 border border-amber-800">
                      Không có salon nào chưa có chủ sở hữu. Vui lòng chọn "Tạo salon mới tự động".
                    </div>
                  ) : (
                    <select
                      value={approveModal.selectedSalonId}
                      onChange={(e) =>
                        setApproveModal({
                          ...approveModal,
                          selectedSalonId: e.target.value,
                        })
                      }
                      className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:border-primary"
                    >
                      <option value="">-- Chọn salon --</option>
                      {approveModal.existingSalons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.district} - {s.address})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {approveModal.error && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                  {approveModal.error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-line/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setApproveModal({ ...approveModal, open: false })
                  }
                  disabled={approveModal.processing}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={
                    approveModal.processing ||
                    (approveModal.mode === "EXISTING" &&
                      !approveModal.selectedSalonId)
                  }
                  className="text-xs"
                >
                  {approveModal.processing ? "Đang duyệt..." : "Xác nhận duyệt"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL TỪ CHỐI ĐƠN */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 border border-line space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-center text-red-400">
                <CloseCircle size={20} variant="Bold" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Từ chối đơn đối tác</h3>
                <p className="text-xs text-muted">
                  Salon: <strong className="text-ink">{rejectModal.app?.salonName}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Lý do từ chối (sẽ được gửi email cho người nộp đơn) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={rejectModal.reason}
                  onChange={(e) =>
                    setRejectModal({ ...rejectModal, reason: e.target.value })
                  }
                  placeholder="Ví dụ: Thông tin liên hệ chưa chính xác hoặc địa bàn chưa nằm trong diện hỗ trợ của Hairapy đợt này..."
                  className="w-full bg-surface border border-line rounded-xl p-3 text-xs text-ink focus:outline-none focus:border-primary resize-y"
                />
              </div>

              {rejectModal.error && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200">
                  {rejectModal.error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-line/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setRejectModal({ ...rejectModal, open: false })
                  }
                  disabled={rejectModal.processing}
                  className="text-xs"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={rejectModal.processing}
                  className="text-xs bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900"
                >
                  {rejectModal.processing ? "Đang xử lý..." : "Xác nhận từ chối"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
