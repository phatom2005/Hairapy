import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";
import { Card, Badge } from "../../components/ui";
import { CameraIcon, ScanIcon, UserIcon, CrownIcon, StarIcon } from "../../components/icons";

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState("30d");

  // Fetch dữ liệu thống kê từ API sử dụng useQuery để tự động quản lý loading state
  const { data: stats, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["admin-stats", period],
    queryFn: async () => {
      const { data } = await api.get(`/admin/dashboard/stats`, { params: { period } });
      return data;
    },
  });

  const error = queryError ? "Không thể tải thông tin thống kê." : null;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 text-center font-semibold">
        {error}
      </div>
    );
  }

  const PERIODS = [
    { label: "7 ngày", value: "7d" },
    { label: "30 ngày", value: "30d" },
    { label: "3 tháng", value: "90d" },
    { label: "1 năm", value: "1y" },
  ];

  // Định dạng tiền tệ VND
  const formatVND = (val) => new Intl.NumberFormat("vi-VN").format(val ?? 0) + " ₫";

  // Chuẩn bị dữ liệu cho biểu đồ sử dụng hệ thống
  const dailyData = stats?.dailyUsage || [];
  const maxCount = Math.max(...dailyData.map((d) => d.count), 5);

  // Chuẩn bị dữ liệu cho biểu đồ đăng ký mới
  const regData = stats?.registrationTrend || [];
  const maxRegCount = Math.max(...regData.map((d) => d.count), 5);

  // Chuẩn bị dữ liệu cho biểu đồ doanh thu
  const revData = stats?.revenueTrend || [];
  const maxRevCount = Math.max(...revData.map((d) => d.count), 100000);

  // Phân bố đánh giá (mảng 5 phần tử: [1★, 2★, 3★, 4★, 5★])
  const ratingDist = stats?.ratingDistribution && stats.ratingDistribution.length === 5
    ? stats.ratingDistribution
    : [0, 0, 0, 0, 0];
  const ratingCount = stats?.ratingCount ?? 0;
  const ratingAverage = stats?.ratingAverage ?? 0;
  const ratingTotalStars = stats?.ratingTotalStars ?? 0;

  // Hàm định dạng ngày/tháng dựa trên độ chi tiết granularity
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const granularity = stats?.granularity || "day";
    if (granularity === "day") {
      const parts = dateStr.split("-");
      if (parts.length >= 3) {
        return `${parts[2]}/${parts[1]}`; // dd/MM
      }
    } else if (granularity === "month") {
      const parts = dateStr.split("-");
      if (parts.length >= 2) {
        return `${parts[1]}/${parts[0]}`; // MM/YYYY
      }
    }
    return dateStr;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-3xl font-bold text-ink">Tổng quan hệ thống</h2>
        <p className="text-sm text-mauve">Cập nhật lúc: {new Date().toLocaleDateString("vi-VN")}</p>
      </div>

      {/* Grid 4 Cards: Doanh thu, Giao dịch, Đánh giá, Tổng sao */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="flex flex-col justify-between border border-divider/10 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Tổng doanh thu</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CrownIcon size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-ink">{formatVND(stats?.totalRevenue ?? 0)}</h3>
            <p className="text-xs font-semibold text-muted mt-1">
              Trong kỳ: <span className="text-emerald-700 font-bold">{formatVND(stats?.revenueInPeriod ?? 0)}</span>
            </p>
          </div>
        </Card>

        {/* Transactions */}
        <Card className="flex flex-col justify-between border border-divider/10 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Số giao dịch</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CrownIcon size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-ink">{stats?.paidTransactions ?? 0} thành công</h3>
            <p className="text-xs font-semibold text-muted mt-1">
              Tổng: {stats?.totalTransactions ?? 0} · Chờ: {stats?.pendingTransactions ?? 0} · Huỷ: {stats?.cancelledTransactions ?? 0}
            </p>
          </div>
        </Card>

        {/* Rating Average */}
        <Card className="flex flex-col justify-between border border-divider/10 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Đánh giá trung bình</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <StarIcon size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-ink flex items-center gap-1.5">
              <span>{ratingAverage}</span>
              <span className="text-sm font-bold text-muted">/ 5 ★</span>
            </h3>
            <p className="text-xs font-semibold text-muted mt-1">
              {ratingCount} lượt đánh giá
            </p>
          </div>
        </Card>

        {/* Rating Total Stars */}
        <Card className="flex flex-col justify-between border border-divider/10 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Tổng số sao</p>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <StarIcon size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-ink">{ratingTotalStars} ★</h3>
            <p className="text-xs font-semibold text-muted mt-1">
              5★: {ratingDist[4]} · 1★: {ratingDist[0]}
            </p>
          </div>
        </Card>
      </div>

      {/* Grid 4 Cards: Hệ thống & Người dùng */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <UserIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Người dùng</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.totalUsers ?? 0}</h3>
          </div>
        </Card>

        {/* AI Scans Today */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-pink/10 text-pink">
            <CameraIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Quét hôm nay</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.scansToday ?? 0}</h3>
          </div>
        </Card>

        {/* Swaps Today */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-lime/20 text-[#6a8b0d]">
            <ScanIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Thử tóc hôm nay</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.swapsToday ?? 0}</h3>
          </div>
        </Card>

        {/* Active Premium */}
        <Card className="flex items-center gap-5 border border-divider/10">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-600">
            <CrownIcon size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Gói Premium Active</p>
            <h3 className="text-3xl font-extrabold text-ink mt-0.5">{stats?.activeSubscriptions ?? 0}</h3>
          </div>
        </Card>
      </div>

      {/* Period Filter Pill Selector */}
      <div className="flex justify-start gap-2 bg-canvas p-1 rounded-full border border-divider/10 max-w-max">
        {PERIODS.map((p) => {
          const isActive = period === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                isActive ? "bg-white text-ink shadow border border-divider/5" : "text-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Biểu đồ Doanh thu theo thời gian */}
      <Card className="border border-divider/10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-ink text-lg">Doanh thu theo thời gian</h4>
            <p className="text-xs text-muted">
              Doanh thu từ các gói đăng ký trả phí trong {PERIODS.find((p) => p.value === period)?.label.toLowerCase() || period} qua
            </p>
          </div>
          <Badge variant="new">{formatVND(stats?.revenueInPeriod ?? 0)}</Badge>
        </div>

        {revData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Area */}
            <div className="flex h-56 items-end gap-1.5 border-b border-l border-line pb-2 pt-6 px-4">
              {revData.map((d, idx) => {
                const heightPercent = maxRevCount > 0 ? (d.count / maxRevCount) * 100 : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all duration-300 relative group"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none z-10">
                      {formatDateLabel(d.date)}: {formatVND(d.count)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between text-[10px] font-bold text-muted px-4">
              <span>{formatDateLabel(revData[0]?.date)}</span>
              <span>{formatDateLabel(revData[Math.floor(revData.length / 2)]?.date)}</span>
              <span>{formatDateLabel(revData[revData.length - 1]?.date)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Grid: Hoạt động hệ thống & Phân bố đánh giá */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Chart (Chiếm 2 cột) */}
        <Card className="border border-divider/10 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-ink text-lg">Hoạt động hệ thống</h4>
              <p className="text-xs text-muted">
                Tổng lượt quét & thử kiểu tóc trong {PERIODS.find((p) => p.value === period)?.label.toLowerCase() || period} qua
              </p>
            </div>
            <Badge variant="new">{PERIODS.find((p) => p.value === period)?.label || period}</Badge>
          </div>

          {dailyData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chart Area */}
              <div className="flex h-56 items-end gap-1.5 border-b border-l border-line pb-2 pt-6 px-4">
                {dailyData.map((d, idx) => {
                  const heightPercent = (d.count / maxCount) * 100;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-brand rounded-t-md hover:bg-pink transition-all duration-300 relative group"
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none z-10">
                        {formatDateLabel(d.date)}: {d.count} lượt
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis Labels */}
              <div className="flex justify-between text-[10px] font-bold text-muted px-4">
                <span>{formatDateLabel(dailyData[0]?.date)}</span>
                <span>{formatDateLabel(dailyData[Math.floor(dailyData.length / 2)]?.date)}</span>
                <span>{formatDateLabel(dailyData[dailyData.length - 1]?.date)}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Khối Phân bố đánh giá (Chiếm 1 cột) */}
        <Card className="border border-divider/10 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-ink text-lg">Phân bố đánh giá</h4>
                <p className="text-xs text-muted">Theo xếp hạng từ 5★ đến 1★</p>
              </div>
              <span className="text-sm font-extrabold text-amber-500 flex items-center gap-1">
                {ratingAverage} ★
              </span>
            </div>

            {ratingCount === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted">
                Chưa có dữ liệu
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDist[star - 1] ?? 0;
                  const pct = ratingCount > 0 ? Math.round((count / ratingCount) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-8 font-bold text-ink flex items-center gap-0.5">
                        {star} <span className="text-amber-500">★</span>
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-line overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-medium text-muted">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-line flex justify-between items-center text-xs font-semibold text-muted">
            <span>Tổng cộng</span>
            <span className="font-bold text-ink">{ratingCount} đánh giá ({ratingTotalStars} ★)</span>
          </div>
        </Card>
      </div>

      {/* User Registration Trend Chart */}
      <Card className="border border-divider/10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-ink text-lg">Đăng ký người dùng mới</h4>
            <p className="text-xs text-muted">
              Số lượng tài khoản đăng ký mới trong {PERIODS.find((p) => p.value === period)?.label.toLowerCase() || period} qua
            </p>
          </div>
          <Badge variant="new">Tài khoản mới</Badge>
        </div>

        {regData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart Area */}
            <div className="flex h-56 items-end gap-1.5 border-b border-l border-line pb-2 pt-6 px-4">
              {regData.map((d, idx) => {
                const heightPercent = (d.count / maxRegCount) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-lime rounded-t-md hover:bg-brand transition-all duration-300 relative group"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap pointer-events-none z-10">
                      {formatDateLabel(d.date)}: {d.count} tài khoản
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis Labels */}
            <div className="flex justify-between text-[10px] font-bold text-muted px-4">
              <span>{formatDateLabel(regData[0]?.date)}</span>
              <span>{formatDateLabel(regData[Math.floor(regData.length / 2)]?.date)}</span>
              <span>{formatDateLabel(regData[regData.length - 1]?.date)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Summary Box */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-canvas border border-divider/20 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tổng lượt Quét AI</p>
          <p className="text-2xl font-black text-magenta mt-1">{stats?.totalScans ?? 0} lượt</p>
        </Card>
        <Card className="bg-canvas border border-divider/20 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Tổng lượt Thử kiểu tóc</p>
          <p className="text-2xl font-black text-brand mt-1">{stats?.totalSwaps ?? 0} lượt</p>
        </Card>
        <Card className="bg-canvas border border-divider/20 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Số lượng Quản trị viên</p>
          <p className="text-2xl font-black text-ink mt-1">{stats?.totalAdmins ?? 0} Admin</p>
        </Card>
      </div>
    </div>
  );
}
