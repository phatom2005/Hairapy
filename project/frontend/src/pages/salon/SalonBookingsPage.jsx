import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Call,
  User,
  MagicStar,
  TickCircle,
  CloseCircle,
  Danger,
  Eye,
  SearchNormal1,
} from "iconsax-reactjs";
import { Card, Button, Input } from "../../components/ui";
import api from "../../lib/api";

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "COMPLETED", label: "Đã hoàn thành" },
  { key: "NO_SHOW", label: "Khách không đến" },
  { key: "REJECTED", label: "Đã từ chối" },
  { key: "CANCELLED", label: "Đã huỷ" },
];

const STATUS_CONFIG = {
  PENDING: { label: "Chờ xác nhận", badge: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  CONFIRMED: { label: "Đã xác nhận", badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  COMPLETED: { label: "Đã hoàn thành", badge: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  NO_SHOW: { label: "Khách không đến", badge: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30" },
  REJECTED: { label: "Đã từ chối", badge: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  CANCELLED: { label: "Đã huỷ", badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

export default function SalonBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const currentTab = searchParams.get("status") || "ALL";
  const [searchQuery, setSearchQuery] = useState("");

  // Modal xem ảnh thử tóc phóng to
  const [lightboxImage, setLightboxImage] = useState(null);

  // Modal cập nhật trạng thái
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    booking: null,
    targetStatus: "",
    title: "",
    defaultNote: "",
  });
  const [actionNote, setActionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);

  const { data: bookings = [], isLoading, isError } = useQuery({
    queryKey: ["salon-owner-bookings"],
    queryFn: async () => {
      const res = await api.get("/salon-owner/bookings");
      return res.data || [];
    },
    staleTime: 15_000,
  });

  const handleTabChange = (status) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (status === "ALL") next.delete("status");
      else next.set("status", status);
      return next;
    });
  };

  const openActionModal = (booking, targetStatus) => {
    let title = "";
    let defaultNote = "";

    if (targetStatus === "CONFIRMED") {
      title = "Xác nhận lịch hẹn";
      defaultNote = "Salon đã xác nhận lịch hẹn của bạn. Vui lòng đến đúng giờ để tiệm phục vụ chu đáo nhất!";
    } else if (targetStatus === "REJECTED") {
      title = "Từ chối lịch hẹn";
      defaultNote = "Salon hiện đã kín lịch vào khung giờ này, rất mong quý khách thông cảm và chọn thời gian khác.";
    } else if (targetStatus === "COMPLETED") {
      title = "Đánh dấu hoàn thành";
      defaultNote = "Dịch vụ đã hoàn tất thành công.";
    } else if (targetStatus === "NO_SHOW") {
      title = "Đánh dấu khách không đến (No-show)";
      defaultNote = "Khách hàng không đến theo lịch hẹn đã đặt.";
    } else if (targetStatus === "CANCELLED") {
      title = "Huỷ lịch hẹn";
      defaultNote = "Lịch hẹn đã được huỷ.";
    }

    setActionNote(defaultNote);
    setActionError(null);
    setActionModal({
      isOpen: true,
      booking,
      targetStatus,
      title,
      defaultNote,
    });
  };

  const handleConfirmAction = async () => {
    if (!actionModal.booking || !actionModal.targetStatus) return;

    setSubmitting(true);
    setActionError(null);

    try {
      await api.put(`/salon-owner/bookings/${actionModal.booking.id}/status`, {
        status: actionModal.targetStatus,
        salonNote: actionNote.trim() || null,
      });

      queryClient.invalidateQueries({ queryKey: ["salon-owner-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["salon-owner-stats"] });
      setActionModal({ isOpen: false, booking: null, targetStatus: "", title: "", defaultNote: "" });
    } catch (err) {
      setActionError(err.response?.data?.error || "Cập nhật trạng thái thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc theo tab status và từ khoá tìm kiếm
  const filteredBookings = bookings.filter((b) => {
    if (currentTab !== "ALL" && b.status !== currentTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = b.customerName?.toLowerCase().includes(q);
      const matchPhone = b.customerPhone?.includes(q);
      const matchStyle = b.hairstyleName?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchStyle) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
            Quản lý yêu cầu đặt lịch
          </h1>
          <p className="text-xs text-mauve mt-1">
            Xem thông tin khách hàng, ảnh kiểu tóc mong muốn và phản hồi trạng thái lịch hẹn.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <div className="relative">
            <SearchNormal1 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT, kiểu..."
              className="pl-9 text-xs py-2"
            />
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-line text-xs">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "ALL"
            ? bookings.length
            : bookings.filter((b) => b.status === tab.key).length;
          const isActive = currentTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? "bg-pink text-white shadow-xs"
                  : "bg-white text-mauve hover:text-ink hover:bg-canvas border border-line"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-canvas text-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-line/20 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <Card className="p-8 text-center text-mauve border border-line">
          <p className="text-sm">Không thể tải danh sách lịch hẹn.</p>
        </Card>
      ) : filteredBookings.length === 0 ? (
        <Card className="p-12 text-center text-mauve border border-dashed border-line rounded-2xl space-y-2">
          <Calendar size={40} className="text-muted mx-auto" />
          <p className="font-bold text-ink">Không có yêu cầu đặt lịch nào</p>
          <p className="text-xs text-muted">
            {searchQuery
              ? "Không tìm thấy yêu cầu phù hợp với từ khoá tìm kiếm."
              : "Chưa có yêu cầu đặt lịch nào trong mục này."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => {
            const cfg = STATUS_CONFIG[b.status] || {
              label: b.status,
              badge: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
            };

            return (
              <Card
                key={b.id}
                className="p-5 border border-line bg-white rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Cột trái: Khách hàng + Thời gian + Kiểu tóc */}
                <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
                  {/* Thumbnail ảnh thử tóc */}
                  {b.tryOnImageUrl ? (
                    <div className="relative group shrink-0 size-20 sm:size-24 rounded-xl overflow-hidden border border-pink/30 bg-zinc-900 cursor-pointer">
                      <img
                        src={b.tryOnImageUrl}
                        alt="Ảnh thử tóc"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxImage(b.tryOnImageUrl)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        title="Xem ảnh phóng to"
                      >
                        <Eye size={20} />
                      </button>
                      <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-pink px-1 rounded text-white shadow">
                        Ảnh thử
                      </span>
                    </div>
                  ) : (
                    <div className="shrink-0 size-20 sm:size-24 rounded-xl border border-line bg-canvas flex items-center justify-center text-muted">
                      <User size={32} className="text-muted" />
                    </div>
                  )}

                  {/* Thông tin chi tiết */}
                  <div className="space-y-1.5 min-w-0 flex-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-ink text-sm sm:text-base">{b.customerName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-mauve">
                      <p className="flex items-center gap-1">
                        <Call size={14} className="text-pink" />
                        <a href={`tel:${b.customerPhone}`} className="text-ink font-bold hover:underline">
                          {b.customerPhone}
                        </a>
                      </p>
                      <p className="flex items-center gap-1 font-semibold text-ink">
                        <Clock size={14} className="text-pink" />
                        <span>{new Date(b.preferredTime).toLocaleString("vi-VN")}</span>
                      </p>
                    </div>

                    {(b.hairstyleName || b.faceShape) && (
                      <p className="flex items-center gap-1 text-muted">
                        <MagicStar size={14} variant="Bold" className="text-pink shrink-0" />
                        <span>Kiểu: <strong className="text-ink">{b.hairstyleName || "Theo ảnh thử"}</strong></span>
                        {b.faceShape && <span>• Dáng mặt: <strong className="text-ink">{b.faceShape}</strong></span>}
                      </p>
                    )}

                    {b.note && (
                      <p className="text-muted italic bg-canvas/80 p-2 rounded-lg text-[11px]">
                        Ghi chú của khách: &quot;{b.note}&quot;
                      </p>
                    )}

                    {b.salonNote && (
                      <p className="text-pink font-medium bg-pink/10 p-2 rounded-lg text-[11px] border border-pink/20">
                        Phản hồi từ salon: &quot;{b.salonNote}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Cột phải: Các nút thao tác */}
                <div className="flex flex-wrap md:flex-col gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-divider/10">
                  {b.status === "PENDING" && (
                    <>
                      <Button
                        type="button"
                        onClick={() => openActionModal(b, "CONFIRMED")}
                        variant="pink"
                        size="sm"
                        className="text-xs px-4 py-2 font-bold shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <TickCircle size={14} variant="Bold" />
                        <span>Xác nhận lịch</span>
                      </Button>

                      <button
                        type="button"
                        onClick={() => openActionModal(b, "REJECTED")}
                        className="px-3 py-2 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CloseCircle size={14} variant="Bold" />
                        <span>Từ chối</span>
                      </button>
                    </>
                  )}

                  {b.status === "CONFIRMED" && (
                    <>
                      <button
                        type="button"
                        onClick={() => openActionModal(b, "COMPLETED")}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <TickCircle size={14} variant="Bold" />
                        <span>Hoàn thành</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openActionModal(b, "NO_SHOW")}
                        className="px-3 py-1.5 rounded-xl border border-line bg-canvas hover:bg-line text-mauve text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Khách không đến
                      </button>

                      <button
                        type="button"
                        onClick={() => openActionModal(b, "CANCELLED")}
                        className="text-xs text-rose-500 hover:underline px-2 py-1 text-center cursor-pointer"
                      >
                        Huỷ lịch
                      </button>
                    </>
                  )}

                  {/* Nút gọi điện nhanh */}
                  <a
                    href={`tel:${b.customerPhone}`}
                    className="px-3 py-1.5 rounded-xl border border-line bg-white hover:border-pink text-xs font-semibold text-ink flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Call size={12} /> Gọi khách
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Cập Nhật Trạng Thái */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 border border-line">
            <h3 className="font-display text-lg font-bold text-ink">
              {actionModal.title}
            </h3>

            <p className="text-xs text-mauve">
              Khách hàng: <strong>{actionModal.booking?.customerName}</strong> ({actionModal.booking?.customerPhone})
            </p>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Ghi chú / Phản hồi gửi tới khách hàng (tùy chọn)
              </label>
              <textarea
                rows="3"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Nhập ghi chú gửi khách..."
                className="w-full rounded-2xl border border-line bg-canvas p-3 text-xs text-ink outline-none focus:border-pink resize-none"
              />
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-center gap-2">
                <Danger size={16} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, booking: null, targetStatus: "", title: "", defaultNote: "" })}
                className="flex-1 py-2.5 rounded-xl border border-line text-xs font-semibold text-mauve hover:bg-canvas transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <Button
                type="button"
                onClick={handleConfirmAction}
                variant="pink"
                disabled={submitting}
                className="flex-1 py-2.5 text-xs font-bold shadow-md justify-center"
              >
                {submitting ? "Đang xử lý..." : "Xác nhận cập nhật"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Xem Ảnh Phóng To */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-lg max-h-[90vh] overflow-hidden rounded-3xl border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Ảnh thử tóc phóng to" className="w-full h-auto max-h-[85vh] object-contain" />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 size-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer"
            >
              <CloseCircle size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
