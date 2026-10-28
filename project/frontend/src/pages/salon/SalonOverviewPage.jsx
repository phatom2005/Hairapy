import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Scissors,
} from "lucide-react";
import { Card, Button } from "../../components/ui";
import api from "../../lib/api";

export default function SalonOverviewPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["salon-owner-stats"],
    queryFn: async () => {
      const res = await api.get("/salon-owner/stats");
      return res.data;
    },
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-line/20 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-line/20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <Card className="p-8 text-center text-mauve border border-line">
        <p className="text-sm">Không thể tải thông tin thống kê salon.</p>
        <p className="text-xs text-muted mt-1">Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.</p>
      </Card>
    );
  }

  // Tính số ngày còn lại của gói đối tác
  let daysRemaining = null;
  let isExpiringSoon = false;
  let isExpired = false;

  if (stats.partnerUntil) {
    const until = new Date(stats.partnerUntil);
    const now = new Date();
    const diffTime = until.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) {
      isExpired = true;
    } else if (daysRemaining <= 7) {
      isExpiringSoon = true;
    }
  }

  const kpiCards = [
    {
      label: "Lượt xem hồ sơ",
      value: stats.profileViews || 0,
      icon: Eye,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Chờ xác nhận",
      value: stats.pendingBookings || 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Đã hoàn thành",
      value: stats.completedBookings || 0,
      icon: CheckCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Tỉ lệ đặt / xem",
      value: `${stats.conversionRate != null ? stats.conversionRate : 0}%`,
      icon: TrendingUp,
      color: "text-pink",
      bg: "bg-pink/10 border-pink/20",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ink">
          Tổng quan Salon
        </h1>
        <p className="text-xs text-mauve mt-1">
          Theo dõi hiệu quả tiếp cận khách hàng và trạng thái yêu cầu đặt lịch.
        </p>
      </div>

      {/* Partner Expiry Banner */}
      {stats.partnerUntil && (
        <Card
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isExpired
              ? "bg-rose-500/10 border-rose-500/30 text-rose-800"
              : isExpiringSoon
              ? "bg-amber-500/10 border-amber-500/30 text-amber-800"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                isExpired
                  ? "bg-rose-500 text-white"
                  : isExpiringSoon
                  ? "bg-amber-500 text-white"
                  : "bg-emerald-500 text-white"
              }`}
            >
              {isExpired || isExpiringSoon ? (
                <AlertTriangle className="size-5" />
              ) : (
                <Sparkles className="size-5" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm">
                {isExpired
                  ? "Gói đối tác đã hết hạn"
                  : isExpiringSoon
                  ? `Gói đối tác sắp hết hạn (còn ${daysRemaining} ngày)`
                  : `Gói đối tác đang hoạt động (còn ${daysRemaining} ngày)`}
              </p>
              <p className="text-xs opacity-85 mt-0.5">
                Hiệu lực đến: {new Date(stats.partnerUntil).toLocaleDateString("vi-VN")}. Liên hệ Hairapy để gia hạn dịch vụ.
              </p>
            </div>
          </div>

          <a
            href="mailto:hairapy.exe@gmail.com?subject=Gia%20han%20goi%20doi%20tac%20Salon"
            className="px-4 py-2 rounded-xl bg-white border border-line text-xs font-bold text-ink hover:border-pink transition-colors shrink-0 text-center shadow-xs"
          >
            Liên hệ gia hạn
          </a>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <Card key={idx} className="p-5 border border-line bg-white rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-mauve">{kpi.label}</span>
              <div className={`size-8 rounded-lg flex items-center justify-center border ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="size-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-ink">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* 2 Cột: Top Styles + Lối tắt */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Top kiểu tóc được đặt nhiều nhất */}
        <Card className="p-6 border border-line bg-white rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-ink text-base flex items-center gap-2">
              <Scissors className="size-4 text-pink" />
              <span>Kiểu tóc được yêu cầu nhiều nhất</span>
            </h2>
            <Link
              to="/salon-portal/hairstyles"
              className="text-xs text-pink font-semibold hover:underline flex items-center gap-1"
            >
              Quản lý kiểu tóc →
            </Link>
          </div>

          {(!stats.topStyles || stats.topStyles.length === 0) ? (
            <div className="py-12 text-center text-mauve space-y-1">
              <p className="text-sm">Chưa có kiểu tóc nào được yêu cầu.</p>
              <p className="text-xs text-muted">Khi khách hàng gửi yêu cầu đặt lịch, danh sách kiểu tóc hot sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.topStyles.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-line/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-xs text-muted size-5 rounded-full bg-white flex items-center justify-center border border-line">
                      {idx + 1}
                    </span>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.hairstyleName}
                        className="size-10 rounded-lg object-cover bg-zinc-900 border border-line shrink-0"
                      />
                    ) : (
                      <div className="size-10 rounded-lg bg-pink/10 text-pink flex items-center justify-center shrink-0">
                        <Scissors className="size-5" />
                      </div>
                    )}
                    <p className="font-bold text-sm text-ink truncate">{item.hairstyleName}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-pink/10 text-pink font-bold text-xs shrink-0">
                    {item.bookingCount} yêu cầu
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lối tắt xử lý nhanh */}
        <Card className="p-6 border border-line bg-white rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-ink text-base mb-2">Hành động nhanh</h2>
            <p className="text-xs text-mauve mb-6 leading-relaxed">
              Bạn có <strong>{stats.pendingBookings || 0}</strong> yêu cầu đặt lịch đang chờ xác nhận từ khách hàng.
            </p>

            <div className="space-y-3">
              <Button
                to="/salon-portal/bookings?status=PENDING"
                variant="pink"
                className="w-full justify-between py-3 text-xs font-bold shadow-sm"
              >
                <span>Xử lý yêu cầu đặt lịch ngay</span>
                <ArrowRight className="size-4" />
              </Button>

              <Button
                to="/salon-portal/hairstyles"
                variant="outline"
                className="w-full justify-between py-3 text-xs font-semibold"
              >
                <span>Cập nhật bảng giá dịch vụ</span>
                <Scissors className="size-4" />
              </Button>

              <Button
                to="/salon-portal/profile"
                variant="outline"
                className="w-full justify-between py-3 text-xs font-semibold"
              >
                <span>Chỉnh sửa thông tin tiệm</span>
                <Calendar className="size-4" />
              </Button>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-divider/10 text-[11px] text-muted">
            Hairapy đối tác luôn sẵn sàng hỗ trợ 24/7 qua hotline: 0912 345 678 hoặc email hairapy.exe@gmail.com
          </div>
        </Card>
      </div>
    </div>
  );
}
