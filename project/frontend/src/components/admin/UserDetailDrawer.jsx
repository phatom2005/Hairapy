import { useEffect, useState } from "react";
import { Add, TickCircle, CloseCircle } from "iconsax-reactjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Badge, Button } from "../ui";
import { PLAN_LABEL } from "../../lib/plans";
import GrantSubscriptionForm from "./GrantSubscriptionForm";

const PAYMENT_STATUS_MAP = {
  PAID: { label: "Đã thanh toán", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  PENDING: { label: "Chờ thanh toán", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  CANCELLED: { label: "Đã huỷ", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
};

export default function UserDetailDrawer({ userId, onClose }) {
  const queryClient = useQueryClient();
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Đóng khi bấm Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Query overview
  const { data: overview, isLoading, error } = useQuery({
    queryKey: ["admin-user-overview", userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await api.get(`/admin/users/${userId}/overview`);
      return res.data;
    },
    enabled: !!userId,
  });

  if (!userId) return null;

  const user = overview?.user;
  const usage = overview?.todayUsage;
  const subscriptions = overview?.subscriptions || [];
  const payments = overview?.recentPayments || [];
  const swaps = overview?.recentSwaps || [];

  const handleVerifyEmail = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await api.post(`/admin/users/${userId}/verify-email`);
      setActionMessage("Đã xác minh email thành công.");
      queryClient.invalidateQueries({ queryKey: ["admin-user-overview", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      console.error(err);
      setActionMessage(err.response?.data?.message || "Xác minh email thất bại.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundUsage = async (feature) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await api.post(`/admin/users/${userId}/refund-usage?feature=${feature}`);
      setActionMessage(res.data?.message || "Đã hoàn 1 lượt thành công.");
      queryClient.invalidateQueries({ queryKey: ["admin-user-overview", userId] });
    } catch (err) {
      console.error(err);
      setActionMessage(err.response?.data?.error || "Không thể hoàn lượt (user chưa dùng hôm nay).");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer Panel */}
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-ink">Chi tiết người dùng</h2>
            {user?.role && (
              <Badge variant={user.role === "ADMIN" ? "new" : "premium"}>
                {user.role}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-mauve hover:bg-line/40 hover:text-ink transition cursor-pointer"
          >
            <Add size={22} className="rotate-45" />
          </button>
        </div>

        {/* Nội dung Drawer */}
        <div className="flex-1 p-6 space-y-6">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="size-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-600">
              Không thể tải thông tin người dùng.
            </div>
          ) : user ? (
            <>
              {/* Thông báo thao tác */}
              {actionMessage && (
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-xs font-semibold text-primary">
                  {actionMessage}
                </div>
              )}

              {/* Thông tin cơ bản & Gói */}
              <div className="rounded-3xl border border-line bg-canvas p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {user.fullName || "Chưa đặt tên"}
                    </h3>
                    <p className="text-xs text-mauve">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {PLAN_LABEL[user.plan] || user.plan}
                    </span>
                    <p className="text-[11px] text-muted mt-1">
                      {user.planEndDate ? `Hết hạn: ${formatDate(user.planEndDate)}` : "Vô thời hạn"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60 text-xs">
                  <div>
                    <span className="text-muted">Đăng nhập: </span>
                    <span className="font-semibold text-ink">{user.provider || "LOCAL"}</span>
                  </div>
                  <div>
                    <span className="text-muted">Email: </span>
                    {user.emailVerified ? (
                      <span className="font-semibold text-emerald-600"><TickCircle size={14} variant="Bold" className="mr-1 inline -mt-0.5" />Đã xác minh</span>
                    ) : (
                      <span className="font-semibold text-amber-600"><CloseCircle size={14} variant="Bold" className="mr-1 inline -mt-0.5" />Chưa xác minh</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted">Ngày tạo: </span>
                    <span className="font-semibold text-ink">{formatDate(user.createdAt)}</span>
                  </div>
                  {user.deleted && (
                    <div className="text-red-500 font-bold">
                      [Tài khoản đã xoá]
                    </div>
                  )}
                </div>

                {/* Các nút thao tác nhanh */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {!user.emailVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={handleVerifyEmail}
                      className="text-xs"
                    >
                      Xác minh email thủ công
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setShowGrantForm(!showGrantForm)}
                    className="text-xs font-bold"
                  >
                    {showGrantForm ? "Đóng form cấp gói" : "Cấp / Gia hạn gói"}
                  </Button>
                </div>
              </div>

              {/* Form Cấp/Gia hạn gói */}
              {showGrantForm && (
                <div className="rounded-3xl border-2 border-primary/30 bg-primary/5 p-5">
                  <h4 className="font-display font-bold text-ink text-sm mb-3">
                    Cấp hoặc Gia hạn gói dịch vụ
                  </h4>
                  <GrantSubscriptionForm
                    initialEmail={user.email}
                    lockEmail={true}
                    onSuccess={() => {
                      setShowGrantForm(false);
                      setActionMessage("Đã cấp gói thành công cho người dùng.");
                      queryClient.invalidateQueries({ queryKey: ["admin-user-overview", userId] });
                      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                    }}
                    onCancel={() => setShowGrantForm(false)}
                  />
                </div>
              )}

              {/* Lượt dùng hôm nay + Nút Hoàn lượt */}
              <div className="rounded-3xl border border-line bg-canvas p-5">
                <h4 className="font-display font-bold text-ink text-sm mb-3">
                  Lượt dùng hôm nay (Giờ VN)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Quét mặt */}
                  <div className="rounded-2xl border border-divider/10 bg-white p-3.5 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted">Lưu lịch sử quét</p>
                      <p className="text-base font-bold text-ink mt-0.5">
                        {usage?.faceScan?.used ?? 0} / {usage?.faceScan?.limit ?? 5}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || (usage?.faceScan?.used ?? 0) <= 0}
                      onClick={() => handleRefundUsage("FACE_SCAN")}
                      className="text-[11px] py-1 px-2"
                    >
                      Hoàn 1 lượt
                    </Button>
                  </div>

                  {/* Thử kiểu tóc */}
                  <div className="rounded-2xl border border-divider/10 bg-white p-3.5 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted">Thử kiểu tóc AI</p>
                      <p className="text-base font-bold text-ink mt-0.5">
                        {usage?.hairSwap?.used ?? 0} / {usage?.hairSwap?.limit ?? 1}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || (usage?.hairSwap?.used ?? 0) <= 0}
                      onClick={() => handleRefundUsage("HAIR_SWAP")}
                      className="text-[11px] py-1 px-2"
                    >
                      Hoàn 1 lượt
                    </Button>
                  </div>

                  {/* AI Stylist */}
                  <div className="rounded-2xl border border-divider/10 bg-white p-3.5 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted">Tư vấn AI Stylist</p>
                      <p className="text-base font-bold text-ink mt-0.5">
                        {usage?.aiStylist?.used ?? 0} / {usage?.aiStylist?.limit ?? 5}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || (usage?.aiStylist?.used ?? 0) <= 0}
                      onClick={() => handleRefundUsage("AI_STYLIST")}
                      className="text-[11px] py-1 px-2"
                    >
                      Hoàn 1 lượt
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lịch sử gói dịch vụ */}
              <div className="rounded-3xl border border-line bg-canvas p-5">
                <h4 className="font-display font-bold text-ink text-sm mb-3">
                  Lịch sử gói dịch vụ ({subscriptions.length})
                </h4>
                {subscriptions.length === 0 ? (
                  <p className="text-xs text-muted italic">Chưa có bản ghi gói dịch vụ nào.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th className="py-2">Gói</th>
                          <th className="py-2">Trạng thái</th>
                          <th className="py-2">Bắt đầu</th>
                          <th className="py-2">Kết thúc</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {subscriptions.map((s) => (
                          <tr key={s.id}>
                            <td className="py-2 font-bold text-ink">{PLAN_LABEL[s.plan] || s.plan}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-600"
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-2 text-mauve">{formatDate(s.startDate)}</td>
                            <td className="py-2 text-mauve">{formatDate(s.endDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 10 Giao dịch gần nhất */}
              <div className="rounded-3xl border border-line bg-canvas p-5">
                <h4 className="font-display font-bold text-ink text-sm mb-3">
                  10 Giao dịch thanh toán gần nhất
                </h4>
                {payments.length === 0 ? (
                  <p className="text-xs text-muted italic">Chưa có giao dịch thanh toán nào.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-line text-muted">
                          <th className="py-2">Mã đơn</th>
                          <th className="py-2">Gói</th>
                          <th className="py-2">Số tiền</th>
                          <th className="py-2">Trạng thái</th>
                          <th className="py-2">Ngày tạo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {payments.map((p) => {
                          const st = PAYMENT_STATUS_MAP[p.status] || { label: p.status, color: "bg-gray-100 text-gray-700" };
                          return (
                            <tr key={p.id}>
                              <td className="py-2 font-mono text-[11px] text-ink font-semibold">#{p.orderCode}</td>
                              <td className="py-2 font-bold text-ink">{PLAN_LABEL[p.plan] || p.plan}</td>
                              <td className="py-2 font-semibold text-ink">{Number(p.amount).toLocaleString("vi-VN")}đ</td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${st.color}`}>
                                  {st.label}
                                </span>
                              </td>
                              <td className="py-2 text-mauve">{formatDate(p.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 10 Ảnh thử tóc gần nhất */}
              <div className="rounded-3xl border border-line bg-canvas p-5">
                <h4 className="font-display font-bold text-ink text-sm mb-3">
                  10 Lần thử tóc gần nhất
                </h4>
                {swaps.length === 0 ? (
                  <p className="text-xs text-muted italic">Chưa có ảnh thử tóc nào.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {swaps.map((item) => (
                      <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-line bg-white">
                        <img
                          src={item.resultImageUrl || item.originalImageUrl}
                          alt={item.hairstyleName || "Ảnh thử tóc"}
                          className="aspect-square w-full object-cover transition group-hover:scale-105"
                          onError={(e) => { e.target.src = "https://placehold.co/100x100?text=Swap"; }}
                        />
                        <div className="p-1.5 text-center">
                          <p className="text-[11px] font-bold text-ink truncate" title={item.hairstyleName}>
                            {item.hairstyleName || "Kiểu tóc"}
                          </p>
                          <p className="text-[10px] text-muted">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
