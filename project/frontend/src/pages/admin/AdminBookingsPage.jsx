import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Filter,
  TickCircle,
  CloseCircle,
  Danger,
  Buildings,
  Scissor,
  User,
  Call,
  Image,
  MagicStar,
} from "iconsax-reactjs";
import api from "../../lib/api";
import { Card, Button, Input } from "../../components/ui";

const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ xác nhận" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "COMPLETED", label: "Hoàn thành" },
  { key: "CANCELLED", label: "Khách hủy" },
  { key: "REJECTED", label: "Từ chối" },
  { key: "NO_SHOW", label: "Không đến" },
];

export default function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Lightbox xem ảnh try-on tóc của khách
  const [lightboxImage, setLightboxImage] = useState(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["admin-bookings", page, statusFilter],
    queryFn: async () => {
      const params = { page, size: 10 };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const res = await api.get("/admin/bookings", { params });
      return res.data;
    },
    staleTime: 30_000,
  });

  const bookings = data?.content || [];
  const totalPages = data?.totalPages || 1;

  const formatVnd = (v) =>
    v == null ? "Theo thỏa thuận" : `${Number(v).toLocaleString("vi-VN")}đ`;

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300 font-medium text-[11px]">
            <Clock size={12} />
            Chờ xác nhận
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/60 border border-blue-800 text-blue-300 font-semibold text-[11px]">
            <TickCircle size={12} variant="Bold" />
            Đã xác nhận
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-semibold text-[11px]">
            <TickCircle size={12} variant="Bold" />
            Hoàn thành
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-800 text-red-300 font-medium text-[11px]">
            <CloseCircle size={12} variant="Bold" />
            Salon từ chối
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-card border border-line text-muted font-medium text-[11px]">
            <CloseCircle size={12} variant="Bold" />
            Khách hủy
          </span>
        );
      case "NO_SHOW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 font-medium text-[11px]">
            <Danger size={12} variant="Bold" />
            Không đến
          </span>
        );
      default:
        return <span className="text-xs text-muted">{status}</span>;
    }
  };

  // Lọc theo search input (phía client với trang hiện tại)
  const filteredBookings = bookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      (b.customerPhone && b.customerPhone.includes(q)) ||
      (b.salonName && b.salonName.toLowerCase().includes(q)) ||
      (b.hairstyleName && b.hairstyleName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink flex items-center gap-2">
            <Calendar size={28} className="text-primary" />
            Lịch hẹn toàn hệ thống
          </h2>
          <p className="text-sm text-mauve">
            Theo dõi và giám sát toàn bộ yêu cầu đặt lịch làm tóc giữa khách hàng và các salon đối tác.
          </p>
        </div>

        {/* Input tìm kiếm nhanh */}
        <div className="w-full sm:w-64">
          <Input
            type="text"
            placeholder="Tìm theo khách, SĐT, salon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Tabs lọc trạng thái */}
      <div className="flex flex-wrap items-center gap-1.5 bg-card border border-line rounded-xl p-1 text-xs">
        <Filter size={16} className="text-muted ml-2 mr-1 shrink-0" />
        {STATUS_TABS.map((tab) => (
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

      {/* Bảng danh sách booking */}
      <Card
        className="overflow-hidden border border-divider/10"
        padded={false}
      >
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted space-y-2">
            <Calendar size={32} className="opacity-30" />
            <p>Không tìm thấy lịch hẹn nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-4">Mã / Ngày đặt</th>
                  <th className="px-5 py-4">Khách hàng</th>
                  <th className="px-5 py-4">Salon tiếp nhận</th>
                  <th className="px-5 py-4">Kiểu tóc & Ảnh mẫu</th>
                  <th className="px-5 py-4">Thời gian hẹn</th>
                  <th className="px-5 py-4">Giá ước tính</th>
                  <th className="px-5 py-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredBookings.map((item) => {
                  const appointmentDate = new Date(item.appointmentTime);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-canvas/50 transition-colors"
                    >
                      {/* Mã booking & Ngày tạo */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-mono font-bold text-ink">
                          #{item.id}
                        </div>
                        <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                          <Clock size={12} />
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </td>

                      {/* Khách hàng */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-semibold text-ink flex items-center gap-1">
                          <User size={14} className="text-muted" />
                          {item.customerName || "Khách ẩn danh"}
                        </div>
                        {item.customerPhone && (
                          <div className="text-muted text-[11px] flex items-center gap-1 mt-0.5">
                            <Call size={12} />
                            {item.customerPhone}
                          </div>
                        )}
                        {item.notes && (
                          <div
                            className="text-[10px] text-muted italic truncate max-w-[160px] mt-0.5"
                            title={item.notes}
                          >
                            "{item.notes}"
                          </div>
                        )}
                      </td>

                      {/* Salon */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="font-semibold text-ink flex items-center gap-1.5">
                          <Buildings size={14} className="text-primary shrink-0" />
                          {item.salonName}
                        </div>
                        <div className="text-muted text-[11px] mt-0.5">
                          {item.salonDistrict || item.salonAddress}
                        </div>
                      </td>

                      {/* Kiểu tóc & Ảnh try-on */}
                      <td className="px-5 py-3.5 text-xs">
                        <div className="flex items-center gap-2">
                          {item.tryOnImageUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setLightboxImage(item.tryOnImageUrl)
                              }
                              className="relative group w-10 h-10 rounded-lg overflow-hidden border border-line shrink-0"
                              title="Bấm để xem ảnh ghép tóc của khách"
                            >
                              <img
                                src={item.tryOnImageUrl}
                                alt="Try on"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Image size={14} className="text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-card border border-line flex items-center justify-center text-muted shrink-0">
                              <Scissor size={16} className="opacity-40" />
                            </div>
                          )}

                          <div>
                            <div className="font-medium text-ink flex items-center gap-1">
                              {item.hairstyleName || "Tư vấn tại tiệm"}
                              {item.tryOnImageUrl && (
                                <MagicStar
                                  size={12}
                                  variant="Bold"
                                  className="text-primary"
                                  title="Đã thử tóc AI"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Thời gian hẹn */}
                      <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                        <div className="font-semibold text-primary">
                          {appointmentDate.toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-muted text-[11px]">
                          {appointmentDate.toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      {/* Giá */}
                      <td className="px-5 py-3.5 text-xs font-mono font-medium text-ink whitespace-nowrap">
                        {formatVnd(item.estimatedPrice)}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                        {getStatusBadge(item.status)}
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

      {/* Lightbox xem ảnh ghép tóc của khách */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-card border border-line rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-line flex items-center justify-between">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <MagicStar size={14} variant="Bold" className="text-primary" />
                Ảnh kết quả thử tóc của khách hàng
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface transition-colors"
              >
                <CloseCircle size={16} />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/50">
              <img
                src={lightboxImage}
                alt="Try On Result"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
